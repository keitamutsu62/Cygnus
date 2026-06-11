package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type RetailSaleRepository struct{ db *sqlx.DB }

func NewRetailSaleRepository(db *sqlx.DB) *RetailSaleRepository {
	return &RetailSaleRepository{db: db}
}

func (r *RetailSaleRepository) Create(ctx context.Context, rs *model.RetailSale) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO retail_sales (staff_id, store_id, salon_id, product_name, price, sold_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		rs.StaffID, rs.StoreID, rs.SalonID, rs.ProductName, rs.Price, rs.SoldAt)
	if err != nil {
		return fmt.Errorf("RetailSaleRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	rs.ID = uint64(id)
	return nil
}

func (r *RetailSaleRepository) FindByStore(ctx context.Context, storeID uint64, from, to string) ([]*model.RetailSale, error) {
	list := make([]*model.RetailSale, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM retail_sales WHERE store_id=? AND DATE(sold_at) BETWEEN ? AND ? ORDER BY sold_at DESC`,
		storeID, from, to)
	if err != nil {
		return nil, fmt.Errorf("RetailSaleRepository.FindByStore: %w", err)
	}
	return list, nil
}

func (r *RetailSaleRepository) FindByStaff(ctx context.Context, staffID uint64, from, to string) ([]*model.RetailSale, error) {
	list := make([]*model.RetailSale, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM retail_sales WHERE staff_id=? AND DATE(sold_at) BETWEEN ? AND ? ORDER BY sold_at DESC`,
		staffID, from, to)
	if err != nil {
		return nil, fmt.Errorf("RetailSaleRepository.FindByStaff: %w", err)
	}
	return list, nil
}
