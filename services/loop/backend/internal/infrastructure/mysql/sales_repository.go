package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type SalesRepository struct{ db *sqlx.DB }

func NewSalesRepository(db *sqlx.DB) *SalesRepository { return &SalesRepository{db: db} }

// UpsertStaffDailySales は staff_daily_sales を加算 upsert し id を返す。
// treatment 作成のたびに呼ばれ、当日の累計に加算していく。
func (r *SalesRepository) UpsertStaffDailySales(ctx context.Context, staffID, storeID uint64, date string, amount uint32) (uint64, error) {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
		VALUES (?, ?, ?, ?, 1, ?, 0)
		ON DUPLICATE KEY UPDATE
		  total_sales  = total_sales + VALUES(total_sales),
		  client_count = client_count + 1,
		  unit_price   = (total_sales + VALUES(total_sales)) / (client_count + 1)`,
		staffID, storeID, date, amount, amount)
	if err != nil {
		return 0, fmt.Errorf("SalesRepository.UpsertStaffDailySales: %w", err)
	}
	var id uint64
	err = r.db.GetContext(ctx, &id,
		`SELECT id FROM staff_daily_sales WHERE staff_id=? AND date=?`, staffID, date)
	return id, err
}

// AppendStaffMenuSales は施術 1 件分を menu 別に追記する。
func (r *SalesRepository) AppendStaffMenuSales(ctx context.Context, staffDailySaleID, menuID uint64, amount uint32) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO staff_menu_sales (staff_daily_sale_id, menu_id, count, amount) VALUES (?, ?, 1, ?)`,
		staffDailySaleID, menuID, amount)
	return err
}

// UpsertDailySales は store 単位の日次売上に加算 upsert する。
func (r *SalesRepository) UpsertDailySales(ctx context.Context, storeID uint64, date string, techAmount uint32) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
		VALUES (?, ?, ?, 1, ?, 0)
		ON DUPLICATE KEY UPDATE
		  total_sales  = total_sales + VALUES(total_sales),
		  client_count = client_count + 1,
		  tech_sales   = tech_sales + VALUES(tech_sales)`,
		storeID, date, techAmount, techAmount)
	return err
}

func (r *SalesRepository) FindDailySalesByStore(ctx context.Context, storeID uint64, from, to string) ([]*model.DailySales, error) {
	var list []*model.DailySales
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM daily_sales WHERE store_id=? AND date BETWEEN ? AND ? ORDER BY date DESC`,
		storeID, from, to)
	if err != nil {
		return nil, fmt.Errorf("SalesRepository.FindDailySalesByStore: %w", err)
	}
	return list, nil
}

// UpsertRetailDailySales は物販売上を daily_sales / staff_daily_sales の retail_sales に加算する。
func (r *SalesRepository) UpsertRetailDailySales(ctx context.Context, staffID, storeID uint64, date string, amount uint32) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
		VALUES (?, ?, ?, 0, 0, ?)
		ON DUPLICATE KEY UPDATE
		  total_sales  = total_sales + VALUES(retail_sales),
		  retail_sales = retail_sales + VALUES(retail_sales)`,
		storeID, date, amount, amount)
	if err != nil {
		return fmt.Errorf("UpsertRetailDailySales(daily): %w", err)
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
		VALUES (?, ?, ?, ?, 0, 0, ?)
		ON DUPLICATE KEY UPDATE
		  total_sales  = total_sales + VALUES(retail_sales),
		  retail_sales = retail_sales + VALUES(retail_sales)`,
		staffID, storeID, date, amount, amount)
	if err != nil {
		return fmt.Errorf("UpsertRetailDailySales(staff): %w", err)
	}
	return nil
}

func (r *SalesRepository) FindStaffDailySales(ctx context.Context, staffID uint64, from, to string) ([]*model.StaffDailySales, error) {
	var list []*model.StaffDailySales
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM staff_daily_sales WHERE staff_id=? AND date BETWEEN ? AND ? ORDER BY date DESC`,
		staffID, from, to)
	if err != nil {
		return nil, fmt.Errorf("SalesRepository.FindStaffDailySales: %w", err)
	}
	return list, nil
}

func (r *SalesRepository) FindAllStaffDailySalesByStore(ctx context.Context, storeID uint64, date string) ([]*repository.StaffSalesSummary, error) {
	var rows []struct {
		StaffID        uint64  `db:"staff_id"`
		Name           string  `db:"name"`
		AvatarInitials *string `db:"avatar_initials"`
		TotalSales     uint32  `db:"total_sales"`
		ClientCount    uint32  `db:"client_count"`
	}
	err := r.db.SelectContext(ctx, &rows, `
		SELECT s.id AS staff_id, s.name, s.avatar_initials,
		       COALESCE(sd.total_sales, 0)  AS total_sales,
		       COALESCE(sd.client_count, 0) AS client_count
		FROM staffs s
		LEFT JOIN staff_daily_sales sd ON sd.staff_id = s.id AND sd.date = ?
		WHERE s.store_id = ?
		ORDER BY total_sales DESC`, date, storeID)
	if err != nil {
		return nil, fmt.Errorf("SalesRepository.FindAllStaffDailySalesByStore: %w", err)
	}
	result := make([]*repository.StaffSalesSummary, len(rows))
	for i, row := range rows {
		result[i] = &repository.StaffSalesSummary{
			StaffID:        row.StaffID,
			Name:           row.Name,
			AvatarInitials: row.AvatarInitials,
			TotalSales:     row.TotalSales,
			ClientCount:    row.ClientCount,
		}
	}
	return result, nil
}
