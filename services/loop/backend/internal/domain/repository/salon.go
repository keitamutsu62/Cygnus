package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type SalonRepository interface {
	FindByID(ctx context.Context, id uint64) (*model.Salon, error)
	Create(ctx context.Context, s *model.Salon) error
	Update(ctx context.Context, s *model.Salon) error
}
