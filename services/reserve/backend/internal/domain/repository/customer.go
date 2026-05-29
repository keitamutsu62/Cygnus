package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
)

type CustomerRepository interface {
	Create(ctx context.Context, c *model.Customer) error
	FindByID(ctx context.Context, id uint64) (*model.Customer, error)
	FindByLineUserID(ctx context.Context, lineUserID string) (*model.Customer, error)
	ExistsCygnusCustomerID(ctx context.Context, id string) (bool, error)
}
