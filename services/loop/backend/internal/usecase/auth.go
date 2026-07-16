package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
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
	accountRepo      repository.CygnusAccountRepository
	membershipRepo   repository.SalonMembershipRepository
	resetTokenRepo   repository.PasswordResetTokenRepository
	storeRepo        repository.StoreRepository
	bhRepo           repository.BusinessHoursRepository
	mailer           Mailer
	jwtSecret        string
}

type Mailer interface {
	SendInvitation(ctx context.Context, to, salonName, inviteURL string) error
	SendPasswordReset(ctx context.Context, to, resetURL string) error
}

func NewAuthUsecase(
	salonRepo repository.SalonRepository,
	planRepo repository.PlanRepository,
	subscriptionRepo repository.SubscriptionRepository,
	staffRepo repository.StaffRepository,
	invitationRepo repository.InvitationRepository,
	accountRepo repository.CygnusAccountRepository,
	membershipRepo repository.SalonMembershipRepository,
	resetTokenRepo repository.PasswordResetTokenRepository,
	storeRepo repository.StoreRepository,
	bhRepo repository.BusinessHoursRepository,
	mailer Mailer,
	jwtSecret string,
) *AuthUsecase {
	return &AuthUsecase{
		salonRepo:        salonRepo,
		planRepo:         planRepo,
		subscriptionRepo: subscriptionRepo,
		staffRepo:        staffRepo,
		invitationRepo:   invitationRepo,
		accountRepo:      accountRepo,
		membershipRepo:   membershipRepo,
		resetTokenRepo:   resetTokenRepo,
		storeRepo:        storeRepo,
		bhRepo:           bhRepo,
		mailer:           mailer,
		jwtSecret:        jwtSecret,
	}
}

type RegisterInput struct {
	SalonName     string
	StoreNames    []string
	OwnerName     string
	OwnerEmail    string
	OwnerPassword string
}

// Register サロン新規登録。staffs + cygnus_accounts + salon_memberships を同時に作成し、JWTを返す。
func (u *AuthUsecase) Register(ctx context.Context, in RegisterInput) (string, error) {
	if existing, _ := u.staffRepo.FindByEmail(ctx, in.OwnerEmail); existing != nil {
		return "", apierror.ErrConflict
	}

	plan, err := u.planRepo.FindDefault(ctx)
	if err != nil {
		return "", fmt.Errorf("Register: find plan: %w", err)
	}

	salon := &model.Salon{Name: in.SalonName}
	if err := u.salonRepo.Create(ctx, salon); err != nil {
		return "", fmt.Errorf("Register: create salon: %w", err)
	}

	sub := &model.Subscription{SalonID: salon.ID, PlanID: plan.ID, Status: model.SubscriptionActive}
	if err := u.subscriptionRepo.Create(ctx, sub); err != nil {
		return "", fmt.Errorf("Register: create subscription: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.OwnerPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("Register: hash password: %w", err)
	}

	// 店舗を作成する（1件以上必須）
	var validStoreNames []string
	for _, sn := range in.StoreNames {
		if sn != "" {
			validStoreNames = append(validStoreNames, sn)
		}
	}
	if len(validStoreNames) == 0 {
		return "", fmt.Errorf("Register: at least one store name is required")
	}
	var firstStoreID uint64
	for i, sn := range validStoreNames {
		store := &model.Store{SalonID: salon.ID, Name: sn}
		if err := u.storeRepo.Create(ctx, store); err != nil {
			return "", fmt.Errorf("Register: create store: %w", err)
		}
		_ = u.bhRepo.Upsert(ctx, &model.BusinessHours{
			StoreID:   store.ID,
			OpenTime:  "09:00:00",
			CloseTime: "19:00:00",
		})
		if i == 0 {
			firstStoreID = store.ID
		}
	}

	owner := &model.Staff{
		SalonID:      salon.ID,
		StoreID:      &firstStoreID,
		Name:         in.OwnerName,
		Email:        in.OwnerEmail,
		PasswordHash: string(hash),
		Role:         model.StaffRoleOwner,
	}
	if err := u.staffRepo.Create(ctx, owner); err != nil {
		return "", fmt.Errorf("Register: create owner: %w", err)
	}

	// cygnus_accounts — STUDIOで先に作成済みの場合は使い回す
	account, err := u.accountRepo.FindByEmail(ctx, in.OwnerEmail)
	if err != nil {
		cygnusID, err := u.generateUniqueCygnusID(ctx)
		if err != nil {
			return "", fmt.Errorf("Register: generate cygnus id: %w", err)
		}
		account = &model.CygnusAccount{
			CygnusID:     cygnusID,
			Email:        in.OwnerEmail,
			PasswordHash: string(hash),
			DisplayName:  in.OwnerName,
		}
		if err := u.accountRepo.Create(ctx, account); err != nil {
			return "", fmt.Errorf("Register: create cygnus account: %w", err)
		}
	}
	if err := u.staffRepo.LinkCygnusAccount(ctx, owner.ID, account.ID); err != nil {
		return "", fmt.Errorf("Register: link cygnus account: %w", err)
	}
	owner.CygnusAccountID = &account.ID

	// salon_memberships — 既存の場合は重複作成しない
	if _, err := u.membershipRepo.FindByAccountAndSalon(ctx, account.ID, salon.ID); err != nil {
		membership := &model.SalonMembership{
			CygnusAccountID: account.ID,
			SalonID:         salon.ID,
			Role:            model.StaffRoleOwner,
			IsActive:        true,
		}
		if err := u.membershipRepo.Create(ctx, membership); err != nil {
			return "", fmt.Errorf("Register: create membership: %w", err)
		}
	}

	token, err := u.generateJWT(owner, salon.Name)
	if err != nil {
		return "", fmt.Errorf("Register: generate jwt: %w", err)
	}
	return token, nil
}

type LoginInput struct {
	Email    string
	Password string
}

func (u *AuthUsecase) Login(ctx context.Context, in LoginInput) (string, error) {
	staff, err := u.staffRepo.FindByEmail(ctx, in.Email)
	if err != nil {
		return "", apierror.ErrUnauthorized
	}

	// cygnus_accountが紐付いている場合はそちらのパスワードで認証（LOOP/STUDIO共通パスワード）
	if staff.CygnusAccountID != nil {
		account, err := u.accountRepo.FindByID(ctx, *staff.CygnusAccountID)
		if err == nil {
			if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(in.Password)); err != nil {
				return "", apierror.ErrUnauthorized
			}
			salon, err := u.salonRepo.FindByID(ctx, staff.SalonID)
			if err != nil {
				return "", fmt.Errorf("Login: find salon: %w", err)
			}
			return u.generateJWT(staff, salon.Name)
		}
	}

	// cygnus_account未連携のスタッフはstaffsのパスワードで認証
	if err := bcrypt.CompareHashAndPassword([]byte(staff.PasswordHash), []byte(in.Password)); err != nil {
		return "", apierror.ErrUnauthorized
	}

	salon, err := u.salonRepo.FindByID(ctx, staff.SalonID)
	if err != nil {
		return "", fmt.Errorf("Login: find salon: %w", err)
	}

	token, err := u.generateJWT(staff, salon.Name)
	if err != nil {
		return "", fmt.Errorf("Login: generate jwt: %w", err)
	}

	return token, nil
}

type InviteInput struct {
	SalonID        uint64
	InviterStaffID uint64
	Email          string
	Role           model.StaffRole
	FrontendURL    string
}

func (u *AuthUsecase) Invite(ctx context.Context, in InviteInput) error {
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

	// 既に同じメールで staffs が存在する場合は重複エラー
	if existing, _ := u.staffRepo.FindByEmail(ctx, in.Email); existing != nil {
		return apierror.ErrEmailAlreadyInUse
	}

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

type AcceptInvitationInput struct {
	Token    string
	Name     string
	Password string
	StoreID  *uint64
}

type InviteInfoResult struct {
	SalonName string
	Stores    []*model.Store
}

func (u *AuthUsecase) GetInviteInfo(ctx context.Context, token string) (*InviteInfoResult, error) {
	inv, err := u.invitationRepo.FindByToken(ctx, token)
	if err != nil {
		return nil, apierror.ErrInvalidToken
	}
	if inv.Status != model.InvitationPending || inv.ExpiresAt.Before(time.Now()) {
		return nil, apierror.ErrInvalidToken
	}
	salon, err := u.salonRepo.FindByID(ctx, inv.SalonID)
	if err != nil {
		return nil, fmt.Errorf("GetInviteInfo: find salon: %w", err)
	}
	stores, err := u.storeRepo.FindBySalonID(ctx, inv.SalonID)
	if err != nil {
		return nil, fmt.Errorf("GetInviteInfo: find stores: %w", err)
	}
	return &InviteInfoResult{SalonName: salon.Name, Stores: stores}, nil
}

// AcceptInvitation 招待承諾。staffs + cygnus_accounts + salon_memberships を作成する。
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
		StoreID:      in.StoreID,
		Name:         in.Name,
		Email:        inv.Email,
		PasswordHash: string(hash),
		Role:         inv.Role,
	}
	if err := u.staffRepo.Create(ctx, staff); err != nil {
		return nil, fmt.Errorf("AcceptInvitation: create staff: %w", err)
	}

	// cygnus_accounts — STUDIOで先に作成済みの場合は使い回す
	account, err := u.accountRepo.FindByEmail(ctx, inv.Email)
	if err != nil {
		cygnusID, err := u.generateUniqueCygnusID(ctx)
		if err != nil {
			return nil, fmt.Errorf("AcceptInvitation: generate cygnus id: %w", err)
		}
		account = &model.CygnusAccount{
			CygnusID:     cygnusID,
			Email:        inv.Email,
			PasswordHash: string(hash),
			DisplayName:  in.Name,
		}
		if err := u.accountRepo.Create(ctx, account); err != nil {
			return nil, fmt.Errorf("AcceptInvitation: create cygnus account: %w", err)
		}
	}
	if err := u.staffRepo.LinkCygnusAccount(ctx, staff.ID, account.ID); err != nil {
		return nil, fmt.Errorf("AcceptInvitation: link cygnus account: %w", err)
	}
	staff.CygnusAccountID = &account.ID

	// salon_memberships — 既存の場合は重複作成しない
	if _, err := u.membershipRepo.FindByAccountAndSalon(ctx, account.ID, inv.SalonID); err != nil {
		membership := &model.SalonMembership{
			CygnusAccountID: account.ID,
			SalonID:         inv.SalonID,
			Role:            inv.Role,
			IsActive:        true,
		}
		if err := u.membershipRepo.Create(ctx, membership); err != nil {
			return nil, fmt.Errorf("AcceptInvitation: create membership: %w", err)
		}
	}

	_ = u.invitationRepo.UpdateStatus(ctx, inv.ID, model.InvitationAccepted)

	return staff, nil
}

type StudioRegisterInput struct {
	DisplayName string
	Email       string
	Password    string
}

func (u *AuthUsecase) StudioRegister(ctx context.Context, in StudioRegisterInput) (*model.CygnusAccount, error) {
	if existing, _ := u.accountRepo.FindByEmail(ctx, in.Email); existing != nil {
		return nil, apierror.ErrConflict
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("StudioRegister: hash: %w", err)
	}

	cygnusID, err := u.generateUniqueCygnusID(ctx)
	if err != nil {
		return nil, fmt.Errorf("StudioRegister: generate id: %w", err)
	}

	account := &model.CygnusAccount{
		CygnusID:    cygnusID,
		Email:       in.Email,
		PasswordHash: string(hash),
		DisplayName: in.DisplayName,
	}
	if err := u.accountRepo.Create(ctx, account); err != nil {
		return nil, fmt.Errorf("StudioRegister: create account: %w", err)
	}
	return account, nil
}

func (u *AuthUsecase) StudioLogin(ctx context.Context, email, password string) (string, error) {
	account, err := u.accountRepo.FindByEmail(ctx, email)
	if err != nil {
		return "", apierror.ErrUnauthorized
	}
	if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(password)); err != nil {
		return "", apierror.ErrUnauthorized
	}
	return u.generateStudioJWT(account)
}

func (u *AuthUsecase) generateStudioJWT(a *model.CygnusAccount) (string, error) {
	claims := jwt.MapClaims{
		"cygnus_account_id": a.ID,
		"cygnus_id":         a.CygnusID,
		"display_name":      a.DisplayName,
		"exp":               time.Now().Add(24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(u.jwtSecret))
}

func (u *AuthUsecase) ForgotPassword(ctx context.Context, email, frontendURL string) error {
	staff, err := u.staffRepo.FindByEmail(ctx, email)
	if err != nil {
		// メールアドレスの存在有無を漏らさないため常に成功扱い
		return nil
	}

	token, err := generateToken()
	if err != nil {
		return fmt.Errorf("ForgotPassword: generate token: %w", err)
	}

	prt := &model.PasswordResetToken{
		StaffID:   staff.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if err := u.resetTokenRepo.Create(ctx, prt); err != nil {
		return fmt.Errorf("ForgotPassword: create token: %w", err)
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)
	if err := u.mailer.SendPasswordReset(ctx, email, resetURL); err != nil {
		return fmt.Errorf("ForgotPassword: send mail: %w", err)
	}

	return nil
}

func (u *AuthUsecase) ResetPassword(ctx context.Context, token, newPassword string) error {
	prt, err := u.resetTokenRepo.FindByToken(ctx, token)
	if err != nil || prt.UsedAt != nil || prt.ExpiresAt.Before(time.Now()) {
		return apierror.ErrInvalidToken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("ResetPassword: hash: %w", err)
	}

	if err := u.staffRepo.UpdatePassword(ctx, prt.StaffID, string(hash)); err != nil {
		return fmt.Errorf("ResetPassword: update password: %w", err)
	}

	// cygnus_accountも同期
	if staff, err := u.staffRepo.FindByID(ctx, prt.StaffID); err == nil && staff.CygnusAccountID != nil {
		_ = u.accountRepo.UpdatePassword(ctx, *staff.CygnusAccountID, string(hash))
	}

	_ = u.resetTokenRepo.MarkUsed(ctx, prt.ID)
	return nil
}

func (u *AuthUsecase) ChangePassword(ctx context.Context, staffID uint64, currentPassword, newPassword string) error {
	staff, err := u.staffRepo.FindByID(ctx, staffID)
	if err != nil {
		return apierror.ErrUnauthorized
	}

	// 認証はcygnus_accountを優先（Loginと同じロジック）
	if staff.CygnusAccountID != nil {
		account, err := u.accountRepo.FindByID(ctx, *staff.CygnusAccountID)
		if err == nil {
			if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(currentPassword)); err != nil {
				return apierror.ErrUnauthorized
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("ChangePassword: hash: %w", err)
			}
			if err := u.staffRepo.UpdatePassword(ctx, staffID, string(hash)); err != nil {
				return fmt.Errorf("ChangePassword: update staffs: %w", err)
			}
			return u.accountRepo.UpdatePassword(ctx, *staff.CygnusAccountID, string(hash))
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(staff.PasswordHash), []byte(currentPassword)); err != nil {
		return apierror.ErrUnauthorized
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("ChangePassword: hash: %w", err)
	}
	return u.staffRepo.UpdatePassword(ctx, staffID, string(hash))
}

func (u *AuthUsecase) generateJWT(s *model.Staff, salonName string) (string, error) {
	claims := jwt.MapClaims{
		"staff_id":   s.ID,
		"salon_id":   s.SalonID,
		"salon_name": salonName,
		"role":       s.Role,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
	}
	if s.StoreID != nil {
		claims["store_id"] = *s.StoreID
	}
	if s.CygnusAccountID != nil {
		claims["cygnus_account_id"] = *s.CygnusAccountID
	}
	if s.AvatarInitials != nil {
		claims["avatar_initials"] = *s.AvatarInitials
	} else {
		// nameの先頭1文字をフォールバックとして使う
		runes := []rune(s.Name)
		if len(runes) > 0 {
			claims["avatar_initials"] = string(runes[0])
		}
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(u.jwtSecret))
}

// generateUniqueCygnusID CYG-XXXXX 形式のユニークIDを生成する。
func (u *AuthUsecase) generateUniqueCygnusID(ctx context.Context) (string, error) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for i := 0; i < 10; i++ {
		b := make([]byte, 5)
		for j := range b {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
			if err != nil {
				return "", err
			}
			b[j] = chars[n.Int64()]
		}
		id := "CYG-" + strings.ToUpper(string(b))
		exists, err := u.accountRepo.ExistsCygnusID(ctx, id)
		if err != nil {
			return "", err
		}
		if !exists {
			return id, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique cygnus id after 10 attempts")
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
