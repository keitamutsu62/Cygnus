package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type StoreAnalysisRepository interface {
	FindByStoreID(ctx context.Context, storeID uint64) (*model.StoreAnalysis, error)
	Upsert(ctx context.Context, a *model.StoreAnalysis) error
}
