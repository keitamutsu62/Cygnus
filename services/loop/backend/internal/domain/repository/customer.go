package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type CustomerRepository interface {
	Create(ctx context.Context, c *model.Customer) error
	FindByID(ctx context.Context, id uint64) (*model.Customer, error)
	FindBySalonID(ctx context.Context, salonID uint64, q string) ([]*model.Customer, error)
	Update(ctx context.Context, c *model.Customer) error
	Delete(ctx context.Context, id uint64) error
}
