package usecase

import (
	"context"

	"github.com/keitamutsu62/cygnus/pkg/auth/model"
)

type AuthUsecase interface {
	Login(ctx context.Context, email, password string) (*model.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string) (*model.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
}

type AccountRepository interface {
	FindByEmail(ctx context.Context, email string) (*model.Account, error)
	Create(ctx context.Context, a *model.Account) error
}

type TokenRepository interface {
	SaveRefreshToken(ctx context.Context, accountID uint64, token string) error
	DeleteRefreshToken(ctx context.Context, token string) error
	FindAccountIDByRefreshToken(ctx context.Context, token string) (uint64, error)
}
