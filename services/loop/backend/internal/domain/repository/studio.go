package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type ProfileRepository interface {
	Upsert(ctx context.Context, p *model.Profile) error
	FindByAccountID(ctx context.Context, accountID uint64) (*model.Profile, error)
	FindByCygnusID(ctx context.Context, cygnusID string) (*model.Profile, error)
}

type WorkRepository interface {
	Create(ctx context.Context, w *model.Work) error
	FindByID(ctx context.Context, id uint64) (*model.Work, error)
	FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Work, error)
	FindPublishedByAccountID(ctx context.Context, accountID uint64) ([]*model.Work, error)
	Update(ctx context.Context, w *model.Work) error
	Delete(ctx context.Context, id uint64) error
}
