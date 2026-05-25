package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type InventoryRepository interface {
	ListByStore(ctx context.Context, storeID uint64) ([]*model.InventoryItem, error)
	UpdateQuantity(ctx context.Context, inventoryID uint64, quantity uint32) error
}
