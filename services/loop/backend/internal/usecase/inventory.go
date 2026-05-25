package usecase

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type InventoryUsecase struct {
	repo repository.InventoryRepository
}

func NewInventoryUsecase(repo repository.InventoryRepository) *InventoryUsecase {
	return &InventoryUsecase{repo}
}

func (uc *InventoryUsecase) List(ctx context.Context, storeID uint64) ([]*model.InventoryItem, error) {
	return uc.repo.ListByStore(ctx, storeID)
}

func (uc *InventoryUsecase) UpdateQuantity(ctx context.Context, inventoryID uint64, quantity uint32) error {
	return uc.repo.UpdateQuantity(ctx, inventoryID, quantity)
}
