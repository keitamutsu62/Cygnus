package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type StaffRepository interface {
	FindByID(ctx context.Context, id uint64) (*model.Staff, error)
	FindByEmail(ctx context.Context, email string) (*model.Staff, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Staff, error)
	Create(ctx context.Context, s *model.Staff) error
	Update(ctx context.Context, s *model.Staff) error
	Delete(ctx context.Context, id uint64) error
}
