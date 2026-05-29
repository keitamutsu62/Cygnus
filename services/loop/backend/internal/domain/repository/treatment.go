package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type TreatmentRepository interface {
	Create(ctx context.Context, t *model.Treatment) error
	FindByID(ctx context.Context, id uint64) (*model.Treatment, error)
	FindByStaffID(ctx context.Context, staffID uint64, limit, offset int) ([]*model.Treatment, error)
	FindBySalonID(ctx context.Context, salonID uint64, limit, offset int) ([]*model.Treatment, error)
}
