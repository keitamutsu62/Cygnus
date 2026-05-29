package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type CygnusAccountRepository interface {
	Create(ctx context.Context, a *model.CygnusAccount) error
	FindByID(ctx context.Context, id uint64) (*model.CygnusAccount, error)
	FindByEmail(ctx context.Context, email string) (*model.CygnusAccount, error)
	FindByCygnusID(ctx context.Context, cygnusID string) (*model.CygnusAccount, error)
	ExistsCygnusID(ctx context.Context, cygnusID string) (bool, error)
}

type SalonMembershipRepository interface {
	Create(ctx context.Context, m *model.SalonMembership) error
	FindByAccountAndSalon(ctx context.Context, accountID, salonID uint64) (*model.SalonMembership, error)
}
