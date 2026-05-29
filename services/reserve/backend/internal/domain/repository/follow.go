package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
)

type FollowRepository interface {
	Create(ctx context.Context, f *model.Follow) error
	Delete(ctx context.Context, customerID, accountID uint64) error
	FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.Follow, error)
	Exists(ctx context.Context, customerID, accountID uint64) (bool, error)
}

type SavedWorkRepository interface {
	Create(ctx context.Context, s *model.SavedWork) error
	Delete(ctx context.Context, customerID, workID uint64) error
	FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.SavedWork, error)
	Exists(ctx context.Context, customerID, workID uint64) (bool, error)
}
