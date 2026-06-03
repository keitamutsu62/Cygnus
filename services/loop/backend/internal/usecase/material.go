package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type MaterialUsecase struct {
	materialRepo  repository.MaterialRepository
	inventoryRepo repository.InventoryWriteRepository
	storeRepo     repository.StoreRepository
}

func NewMaterialUsecase(
	materialRepo repository.MaterialRepository,
	inventoryRepo repository.InventoryWriteRepository,
	storeRepo repository.StoreRepository,
) *MaterialUsecase {
	return &MaterialUsecase{materialRepo: materialRepo, inventoryRepo: inventoryRepo, storeRepo: storeRepo}
}

func (u *MaterialUsecase) List(ctx context.Context, salonID uint64) ([]*model.MaterialWithMenus, error) {
	return u.materialRepo.FindBySalonIDWithMenus(ctx, salonID)
}

type CreateMaterialInput struct {
	SalonID    uint64
	Name       string
	Brand      *string
	Category   string
	SizeAmount *uint32
	SizeUnit   *string
	StockUnit  string
	JanCode    *string
	Threshold  uint32 // 初期発注点。全店舗の在庫行に適用
	MenuIDs    []uint64
}

// Create は材料を登録し、サロンの全店舗に在庫行を自動生成する。
// 後から店舗を追加した場合は別途 /stores/:id/inventory で在庫行を追加できる。
func (u *MaterialUsecase) Create(ctx context.Context, in CreateMaterialInput) (*model.Material, error) {
	m := &model.Material{
		SalonID:    in.SalonID,
		Name:       in.Name,
		Brand:      in.Brand,
		Category:   in.Category,
		SizeAmount: in.SizeAmount,
		SizeUnit:   in.SizeUnit,
		StockUnit:  in.StockUnit,
		JanCode:    in.JanCode,
	}
	if err := u.materialRepo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("MaterialUsecase.Create: %w", err)
	}

	// 全店舗に在庫行を自動生成（INSERT IGNORE で冪等）
	storeIDs, err := u.storeRepo.FindIDsBySalonID(ctx, in.SalonID)
	if err == nil {
		for _, sid := range storeIDs {
			_ = u.inventoryRepo.CreateForStore(ctx, sid, m.ID, in.Threshold)
		}
	}
	// メニュー関連付け
	if len(in.MenuIDs) > 0 {
		_ = u.materialRepo.SetMenuAssociations(ctx, m.ID, in.MenuIDs)
	}
	return m, nil
}

type UpdateMaterialInput struct {
	ID         uint64
	SalonID    uint64
	Name       string
	Brand      *string
	Category   string
	SizeAmount *uint32
	SizeUnit   *string
	StockUnit  string
	JanCode    *string
	MenuIDs    []uint64
}

func (u *MaterialUsecase) Update(ctx context.Context, in UpdateMaterialInput) (*model.Material, error) {
	m, err := u.materialRepo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if m.SalonID != in.SalonID {
		return nil, apierror.ErrForbidden
	}
	m.Name = in.Name
	m.Brand = in.Brand
	m.Category = in.Category
	m.SizeAmount = in.SizeAmount
	m.SizeUnit = in.SizeUnit
	m.StockUnit = in.StockUnit
	m.JanCode = in.JanCode
	if err := u.materialRepo.Update(ctx, m); err != nil {
		return nil, fmt.Errorf("MaterialUsecase.Update: %w", err)
	}
	// メニュー関連付けを上書き（空配列なら全解除）
	_ = u.materialRepo.SetMenuAssociations(ctx, m.ID, in.MenuIDs)
	return m, nil
}

func (u *MaterialUsecase) Delete(ctx context.Context, id, salonID uint64) error {
	m, err := u.materialRepo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if m.SalonID != salonID {
		return apierror.ErrForbidden
	}
	return u.materialRepo.Delete(ctx, id)
}
