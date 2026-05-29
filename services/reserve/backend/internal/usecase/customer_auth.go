package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/repository"
)

type CustomerAuthUsecase struct {
	repo      repository.CustomerRepository
	jwtSecret string
}

func NewCustomerAuthUsecase(repo repository.CustomerRepository, jwtSecret string) *CustomerAuthUsecase {
	return &CustomerAuthUsecase{repo: repo, jwtSecret: jwtSecret}
}

type GuestLoginInput struct {
	DisplayName string
}

// GuestLogin 開発・テスト用のゲストログイン。LINE OAuthが繋がるまでの代替。
func (u *CustomerAuthUsecase) GuestLogin(ctx context.Context, in GuestLoginInput) (string, *model.Customer, error) {
	ccuID, err := u.generateUniqueCCUID(ctx)
	if err != nil {
		return "", nil, fmt.Errorf("GuestLogin: %w", err)
	}
	c := &model.Customer{
		CygnusCustomerID: ccuID,
		DisplayName:      in.DisplayName,
	}
	if err := u.repo.Create(ctx, c); err != nil {
		return "", nil, fmt.Errorf("GuestLogin: create customer: %w", err)
	}
	token, err := u.generateJWT(c)
	if err != nil {
		return "", nil, fmt.Errorf("GuestLogin: generate jwt: %w", err)
	}
	return token, c, nil
}

// LineLogin LINE OAuthコールバック。line_user_id でお客さんを検索、なければ新規作成。
// 実際のLINE OAuthトークン検証は外部連携時に実装。
func (u *CustomerAuthUsecase) LineLogin(ctx context.Context, lineUserID, displayName string, profileImageURL *string) (string, *model.Customer, error) {
	c, err := u.repo.FindByLineUserID(ctx, lineUserID)
	if err != nil {
		// 新規作成
		ccuID, err := u.generateUniqueCCUID(ctx)
		if err != nil {
			return "", nil, fmt.Errorf("LineLogin: %w", err)
		}
		c = &model.Customer{
			CygnusCustomerID: ccuID,
			LineUserID:       &lineUserID,
			DisplayName:      displayName,
			ProfileImageURL:  profileImageURL,
		}
		if err := u.repo.Create(ctx, c); err != nil {
			return "", nil, fmt.Errorf("LineLogin: create customer: %w", err)
		}
	}
	token, err := u.generateJWT(c)
	if err != nil {
		return "", nil, fmt.Errorf("LineLogin: generate jwt: %w", err)
	}
	return token, c, nil
}

func (u *CustomerAuthUsecase) generateJWT(c *model.Customer) (string, error) {
	claims := jwt.MapClaims{
		"customer_id": c.ID,
		"exp":         time.Now().Add(30 * 24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(u.jwtSecret))
}

// generateUniqueCCUID CCU-XXXXX 形式のユニークIDを生成する。
func (u *CustomerAuthUsecase) generateUniqueCCUID(ctx context.Context) (string, error) {
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
		id := "CCU-" + strings.ToUpper(string(b))
		exists, err := u.repo.ExistsCygnusCustomerID(ctx, id)
		if err != nil {
			return "", err
		}
		if !exists {
			return id, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique CCU id after 10 attempts")
}
