package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type MaterialRepository interface {
	Create(ctx context.Context, m *model.Material) error
	FindByID(ctx context.Context, id uint64) (*model.Material, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Material, error)
	FindBySalonIDWithMenus(ctx context.Context, salonID uint64) ([]*model.MaterialWithMenus, error)
	Update(ctx context.Context, m *model.Material) error
	Delete(ctx context.Context, id uint64) error
	SetMenuAssociations(ctx context.Context, materialID uint64, menuIDs []uint64) error
}

type InventoryWriteRepository interface {
	// CreateForStore は material を店舗の在庫に登録する（材料追加時の自動生成用）。
	CreateForStore(ctx context.Context, storeID, materialID uint64, threshold uint32) error
}
