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
		`INSERT INTO materials (salon_id, name, brand, category, size_amount, size_unit, stock_unit, jan_code)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		m.SalonID, m.Name, m.Brand, m.Category, m.SizeAmount, m.SizeUnit, m.StockUnit, m.JanCode)
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
	list := make([]*model.Material, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM materials WHERE salon_id = ? ORDER BY category, name`, salonID)
	if err != nil {
		return nil, fmt.Errorf("MaterialRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *MaterialRepository) Update(ctx context.Context, m *model.Material) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE materials SET name=?, brand=?, category=?, size_amount=?, size_unit=?, stock_unit=?, jan_code=?
		 WHERE id=? AND salon_id=?`,
		m.Name, m.Brand, m.Category, m.SizeAmount, m.SizeUnit, m.StockUnit, m.JanCode, m.ID, m.SalonID)
	return err
}

func (r *MaterialRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM materials WHERE id = ?`, id)
	return err
}

func (r *MaterialRepository) FindBySalonIDWithMenus(ctx context.Context, salonID uint64) ([]*model.MaterialWithMenus, error) {
	type row struct {
		ID         uint64  `db:"id"`
		SalonID    uint64  `db:"salon_id"`
		Name       string  `db:"name"`
		Brand      *string `db:"brand"`
		Category   string  `db:"category"`
		SizeAmount *uint32 `db:"size_amount"`
		SizeUnit   *string `db:"size_unit"`
		StockUnit  string  `db:"stock_unit"`
		JanCode    *string `db:"jan_code"`
		MenuID     uint64  `db:"menu_id"`
		MenuName   string  `db:"menu_name"`
	}
	var rows []row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT m.id, m.salon_id, m.name, m.brand, m.category, m.size_amount, m.size_unit, m.stock_unit, m.jan_code,
		       COALESCE(mn.id, 0) AS menu_id, COALESCE(mn.name, '') AS menu_name
		FROM materials m
		LEFT JOIN menu_materials mm ON mm.material_id = m.id
		LEFT JOIN menus mn ON mn.id = mm.menu_id
		WHERE m.salon_id = ?
		ORDER BY m.category, m.name, mm.id`, salonID)
	if err != nil {
		return nil, fmt.Errorf("MaterialRepository.FindBySalonIDWithMenus: %w", err)
	}
	// 行を material ごとに集約
	indexed := make(map[uint64]*model.MaterialWithMenus)
	var order []uint64
	for _, r := range rows {
		if _, exists := indexed[r.ID]; !exists {
			indexed[r.ID] = &model.MaterialWithMenus{
				ID: r.ID, SalonID: r.SalonID, Name: r.Name, Brand: r.Brand,
				Category: r.Category, SizeAmount: r.SizeAmount, SizeUnit: r.SizeUnit, StockUnit: r.StockUnit,
				JanCode: r.JanCode,
				Menus: []model.MenuAssoc{},
			}
			order = append(order, r.ID)
		}
		if r.MenuID != 0 {
			indexed[r.ID].Menus = append(indexed[r.ID].Menus, model.MenuAssoc{MenuID: r.MenuID, MenuName: r.MenuName})
		}
	}
	result := make([]*model.MaterialWithMenus, 0, len(order))
	for _, id := range order {
		result = append(result, indexed[id])
	}
	return result, nil
}

func (r *MaterialRepository) SetMenuAssociations(ctx context.Context, materialID uint64, menuIDs []uint64) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("MaterialRepository.SetMenuAssociations begin: %w", err)
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM menu_materials WHERE material_id = ?`, materialID); err != nil {
		return fmt.Errorf("MaterialRepository.SetMenuAssociations delete: %w", err)
	}
	for _, menuID := range menuIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO menu_materials (menu_id, material_id) VALUES (?, ?)`, menuID, materialID); err != nil {
			return fmt.Errorf("MaterialRepository.SetMenuAssociations insert: %w", err)
		}
	}
	return tx.Commit()
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
