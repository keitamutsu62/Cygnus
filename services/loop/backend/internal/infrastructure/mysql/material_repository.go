package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

// ─── MaterialRepository ──────────────────────────────────────

type MaterialRepository struct{ db *sqlx.DB }

func NewMaterialRepository(db *sqlx.DB) *MaterialRepository { return &MaterialRepository{db: db} }

func (r *MaterialRepository) Create(ctx context.Context, m *model.Material) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO materials (salon_id, name, brand, category, size_amount, size_unit, stock_unit)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		m.SalonID, m.Name, m.Brand, m.Category, m.SizeAmount, m.SizeUnit, m.StockUnit)
	if err != nil {
		return fmt.Errorf("MaterialRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	m.ID = uint64(id)
	return nil
}

func (r *MaterialRepository) FindByID(ctx context.Context, id uint64) (*model.Material, error) {
	var m model.Material
	if err := r.db.GetContext(ctx, &m, `SELECT * FROM materials WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &m, nil
}

func (r *MaterialRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Material, error) {
	var list []*model.Material
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM materials WHERE salon_id = ? ORDER BY category, name`, salonID)
	if err != nil {
		return nil, fmt.Errorf("MaterialRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *MaterialRepository) Update(ctx context.Context, m *model.Material) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE materials SET name=?, brand=?, category=?, size_amount=?, size_unit=?, stock_unit=?
		 WHERE id=? AND salon_id=?`,
		m.Name, m.Brand, m.Category, m.SizeAmount, m.SizeUnit, m.StockUnit, m.ID, m.SalonID)
	return err
}

func (r *MaterialRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM materials WHERE id = ?`, id)
	return err
}

// ─── InventoryWriteRepository ────────────────────────────────

type InventoryWriteRepository struct{ db *sqlx.DB }

func NewInventoryWriteRepository(db *sqlx.DB) *InventoryWriteRepository {
	return &InventoryWriteRepository{db: db}
}

// CreateForStore は material を store の在庫台帳に登録する。
// INSERT IGNORE で重複登録を防ぐ。
func (r *InventoryWriteRepository) CreateForStore(ctx context.Context, storeID, materialID uint64, threshold uint32) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT IGNORE INTO inventories (store_id, material_id, quantity, threshold, status)
		 VALUES (?, ?, 0, ?, '正常')`,
		storeID, materialID, threshold)
	return err
}
