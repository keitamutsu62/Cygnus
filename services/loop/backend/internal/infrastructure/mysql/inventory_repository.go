package mysql

import (
	"context"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type inventoryRepository struct{ db *sqlx.DB }

func NewInventoryRepository(db *sqlx.DB) *inventoryRepository {
	return &inventoryRepository{db}
}

func (r *inventoryRepository) ListByStore(ctx context.Context, storeID uint64) ([]*model.InventoryItem, error) {
	type row struct {
		InvID      uint64  `db:"inv_id"`
		StoreID    uint64  `db:"store_id"`
		MaterialID uint64  `db:"material_id"`
		Quantity   uint32  `db:"quantity"`
		Threshold  uint32  `db:"threshold"`
		Name       string  `db:"name"`
		Brand      *string `db:"brand"`
		Category   string  `db:"category"`
		SizeAmount *uint32 `db:"size_amount"`
		SizeUnit   *string `db:"size_unit"`
		StockUnit  string  `db:"stock_unit"`
	}

	const q = `
		SELECT
			i.id        AS inv_id,
			i.store_id,
			i.material_id,
			i.quantity,
			i.threshold,
			m.name,
			m.brand,
			m.category,
			m.size_amount,
			m.size_unit,
			m.stock_unit
		FROM inventories i
		JOIN materials m ON m.id = i.material_id
		WHERE i.store_id = ?
		ORDER BY
			FIELD(i.status,'要発注','注意','正常','過剰'),
			m.name`

	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, storeID); err != nil {
		return nil, err
	}

	items := make([]*model.InventoryItem, len(rows))
	for i, rw := range rows {
		status, bar := model.CalcStatus(rw.Quantity, rw.Threshold)
		items[i] = &model.InventoryItem{
			Inventory: model.Inventory{
				ID:        rw.InvID,
				StoreID:   rw.StoreID,
				MaterialID: rw.MaterialID,
				Quantity:  rw.Quantity,
				Threshold: rw.Threshold,
			},
			Material: model.Material{
				ID:         rw.MaterialID,
				Name:       rw.Name,
				Brand:      rw.Brand,
				Category:   rw.Category,
				SizeAmount: rw.SizeAmount,
				SizeUnit:   rw.SizeUnit,
				StockUnit:  rw.StockUnit,
			},
			Status:   status,
			BarWidth: bar,
		}
	}
	return items, nil
}

func (r *inventoryRepository) UpdateQuantity(ctx context.Context, inventoryID uint64, quantity uint32) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE inventories SET quantity = ? WHERE id = ?`,
		quantity, inventoryID)
	return err
}
