package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type MenuRepository interface {
	Create(ctx context.Context, m *model.Menu) error
	FindByID(ctx context.Context, id uint64) (*model.Menu, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Menu, error)
	Update(ctx context.Context, m *model.Menu) error
	Delete(ctx context.Context, id uint64) error
}
