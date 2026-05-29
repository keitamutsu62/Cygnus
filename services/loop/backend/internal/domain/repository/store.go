package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type StoreRepository interface {
	Create(ctx context.Context, s *model.Store) error
	FindByID(ctx context.Context, id uint64) (*model.Store, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Store, error)
	Update(ctx context.Context, s *model.Store) error
	Delete(ctx context.Context, id uint64) error
	// IDsOnlySalon は salon の全 store_id を返す（材料追加時の在庫行自動生成用）
	FindIDsBySalonID(ctx context.Context, salonID uint64) ([]uint64, error)
}

type BusinessHoursRepository interface {
	Upsert(ctx context.Context, bh *model.BusinessHours) error
	FindByStoreID(ctx context.Context, storeID uint64) (*model.BusinessHours, error)
}
