package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"golang.org/x/crypto/bcrypt"
)

type AuthUsecase struct {
	salonRepo        repository.SalonRepository
	planRepo         repository.PlanRepository
	subscriptionRepo repository.SubscriptionRepository
	staffRepo        repository.StaffRepository
	invitationRepo   repository.InvitationRepository
	mailer           Mailer
	jwtSecret        string
}

type Mailer interface {
	SendInvitation(ctx context.Context, to, salonName, inviteURL string) error
}

func NewAuthUsecase(
	salonRepo repository.SalonRepository,
	planRepo repository.PlanRepository,
	subscriptionRepo repository.SubscriptionRepository,
	staffRepo repository.StaffRepository,
	invitationRepo repository.InvitationRepository,
	mailer Mailer,
	jwtSecret string,
) *AuthUsecase {
	return &AuthUsecase{
		salonRepo:        salonRepo,
		planRepo:         planRepo,
		subscriptionRepo: subscriptionRepo,
		staffRepo:        staffRepo,
		invitationRepo:   invitationRepo,
		mailer:           mailer,
		jwtSecret:        jwtSecret,
	}
}

// RegisterInput はオーナーがオンライン契約時に入力する情報
type RegisterInput struct {
	SalonName     string
	OwnerName     string
	OwnerEmail    string
	OwnerPassword string
}

// Register サロン新規登録（オーナーアカウント作成 + サブスクリプション開始）
func (u *AuthUsecase) Register(ctx context.Context, in RegisterInput) (*model.Staff, error) {
	// メールアドレス重複チェック
	if existing, _ := u.staffRepo.FindByEmail(ctx, in.OwnerEmail); existing != nil {
		return nil, apierror.ErrConflict
	}

	// デフォルトプラン取得（後でプラン選択機能を追加）
	plan, err := u.planRepo.FindDefault(ctx)
	if err != nil {
		return nil, fmt.Errorf("Register: find plan: %w", err)
	}

	// サロン作成
	salon := &model.Salon{Name: in.SalonName}
	if err := u.salonRepo.Create(ctx, salon); err != nil {
		return nil, fmt.Errorf("Register: create salon: %w", err)
	}

	// サブスクリプション作成
	sub := &model.Subscription{SalonID: salon.ID, PlanID: plan.ID, Status: model.SubscriptionActive}
	if err := u.subscriptionRepo.Create(ctx, sub); err != nil {
		return nil, fmt.Errorf("Register: create subscription: %w", err)
	}

	// パスワードハッシュ化
	hash, err := bcrypt.GenerateFromPassword([]byte(in.OwnerPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("Register: hash password: %w", err)
	}

	// オーナースタッフ作成
	owner := &model.Staff{
		SalonID:      salon.ID,
		Name:         in.OwnerName,
		Email:        in.OwnerEmail,
		PasswordHash: string(hash),
		Role:         model.StaffRoleOwner,
	}
	if err := u.staffRepo.Create(ctx, owner); err != nil {
		return nil, fmt.Errorf("Register: create owner: %w", err)
	}

	return owner, nil
}

// LoginInput はログイン時の入力
type LoginInput struct {
	Email    string
	Password string
}

// Login メール + パスワード認証、JWT を返す
func (u *AuthUsecase) Login(ctx context.Context, in LoginInput) (string, error) {
	staff, err := u.staffRepo.FindByEmail(ctx, in.Email)
	if err != nil {
		return "", apierror.ErrUnauthorized
	}

	if err := bcrypt.CompareHashAndPassword([]byte(staff.PasswordHash), []byte(in.Password)); err != nil {
		return "", apierror.ErrUnauthorized
	}

	token, err := u.generateJWT(staff)
	if err != nil {
		return "", fmt.Errorf("Login: generate jwt: %w", err)
	}

	return token, nil
}

// InviteInput はスタッフ招待時の入力
type InviteInput struct {
	SalonID        uint64
	InviterStaffID uint64
	Email          string
	Role           model.StaffRole
	FrontendURL    string
}

// Invite スタッフ招待メール送信（人数上限チェックあり）
func (u *AuthUsecase) Invite(ctx context.Context, in InviteInput) error {
	// 人数上限チェック
	sub, err := u.subscriptionRepo.FindBySalonID(ctx, in.SalonID)
	if err != nil {
		return fmt.Errorf("Invite: find subscription: %w", err)
	}
	plan, err := u.planRepo.FindByID(ctx, sub.PlanID)
	if err != nil {
		return fmt.Errorf("Invite: find plan: %w", err)
	}
	if plan.MaxStaffCount != nil {
		count, err := u.staffRepo.CountBySalonID(ctx, in.SalonID)
		if err != nil {
			return fmt.Errorf("Invite: count staff: %w", err)
		}
		if count >= int(*plan.MaxStaffCount) {
			return apierror.ErrStaffLimitExceed
		}
	}

	// 招待トークン生成（24時間有効）
	token, err := generateToken()
	if err != nil {
		return fmt.Errorf("Invite: generate token: %w", err)
	}
	inv := &model.Invitation{
		SalonID:          in.SalonID,
		InvitedByStaffID: in.InviterStaffID,
		Email:            in.Email,
		Token:            token,
		Role:             in.Role,
		Status:           model.InvitationPending,
		ExpiresAt:        time.Now().Add(24 * time.Hour),
	}
	if err := u.invitationRepo.Create(ctx, inv); err != nil {
		return fmt.Errorf("Invite: create invitation: %w", err)
	}

	salon, err := u.salonRepo.FindByID(ctx, in.SalonID)
	if err != nil {
		return fmt.Errorf("Invite: find salon: %w", err)
	}

	inviteURL := fmt.Sprintf("%s/accept-invitation?token=%s", in.FrontendURL, token)
	if err := u.mailer.SendInvitation(ctx, in.Email, salon.Name, inviteURL); err != nil {
		return fmt.Errorf("Invite: send mail: %w", err)
	}

	return nil
}

// AcceptInvitationInput は招待承諾時の入力
type AcceptInvitationInput struct {
	Token    string
	Name     string
	Password string
}

// AcceptInvitation 招待トークンを検証してスタッフアカウントを作成
func (u *AuthUsecase) AcceptInvitation(ctx context.Context, in AcceptInvitationInput) (*model.Staff, error) {
	inv, err := u.invitationRepo.FindByToken(ctx, in.Token)
	if err != nil {
		return nil, apierror.ErrInvalidToken
	}
	if inv.Status != model.InvitationPending || inv.ExpiresAt.Before(time.Now()) {
		return nil, apierror.ErrInvalidToken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("AcceptInvitation: hash: %w", err)
	}

	staff := &model.Staff{
		SalonID:      inv.SalonID,
		Name:         in.Name,
		Email:        inv.Email,
		PasswordHash: string(hash),
		Role:         inv.Role,
	}
	if err := u.staffRepo.Create(ctx, staff); err != nil {
		return nil, fmt.Errorf("AcceptInvitation: create staff: %w", err)
	}

	_ = u.invitationRepo.UpdateStatus(ctx, inv.ID, model.InvitationAccepted)

	return staff, nil
}

func (u *AuthUsecase) generateJWT(s *model.Staff) (string, error) {
	claims := jwt.MapClaims{
		"staff_id": s.ID,
		"salon_id": s.SalonID,
		"role":     s.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(u.jwtSecret))
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
