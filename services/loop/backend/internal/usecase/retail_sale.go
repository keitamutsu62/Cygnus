package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type RetailSaleUsecase struct {
	repo      repository.RetailSaleRepository
	salesRepo repository.SalesRepository
}

func NewRetailSaleUsecase(repo repository.RetailSaleRepository, salesRepo repository.SalesRepository) *RetailSaleUsecase {
	return &RetailSaleUsecase{repo: repo, salesRepo: salesRepo}
}

type CreateRetailSaleInput struct {
	StaffID     uint64
	StoreID     uint64
	SalonID     uint64
	ProductName string
	Price       uint32
	SoldAt      string // RFC3339
}

// Create は物販 1 件を記録し、daily_sales / staff_daily_sales の retail_sales を加算する。
func (u *RetailSaleUsecase) Create(ctx context.Context, in CreateRetailSaleInput) (*model.RetailSale, error) {
	soldAt, err := time.Parse(time.RFC3339, in.SoldAt)
	if err != nil {
		return nil, fmt.Errorf("Create: invalid sold_at: %w", err)
	}

	rs := &model.RetailSale{
		StaffID:     in.StaffID,
		StoreID:     in.StoreID,
		SalonID:     in.SalonID,
		ProductName: in.ProductName,
		Price:       in.Price,
		SoldAt:      soldAt,
	}

	if err := u.repo.Create(ctx, rs); err != nil {
		return nil, err
	}

	date := soldAt.Format("2006-01-02")
	if err := u.salesRepo.UpsertRetailDailySales(ctx, in.StaffID, in.StoreID, date, in.Price); err != nil {
		return nil, fmt.Errorf("Create: aggregate retail sales: %w", err)
	}

	return rs, nil
}

func (u *RetailSaleUsecase) ListByStore(ctx context.Context, storeID uint64, from, to string) ([]*model.RetailSale, error) {
	return u.repo.FindByStore(ctx, storeID, from, to)
}

func (u *RetailSaleUsecase) ListByStaff(ctx context.Context, staffID uint64, from, to string) ([]*model.RetailSale, error) {
	return u.repo.FindByStaff(ctx, staffID, from, to)
}
