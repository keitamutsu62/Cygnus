package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type ReviewRepository interface {
	Create(ctx context.Context, r *model.Review) error
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Review, error)
	FindByStaffID(ctx context.Context, staffID uint64) ([]*model.Review, error)
	FindDetailsBySalonID(ctx context.Context, salonID uint64, staffID *uint64, limit int) ([]*model.ReviewDetail, error)
}
