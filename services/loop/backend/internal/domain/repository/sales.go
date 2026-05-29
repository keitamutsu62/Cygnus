package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type SalesRepository interface {
	// UpsertStaffDailySales は staff_daily_sales を加算 upsert し、行の id を返す。
	// treatment 作成時の自動集計に使用。
	UpsertStaffDailySales(ctx context.Context, staffID, storeID uint64, date string, amount uint32) (uint64, error)
	// AppendStaffMenuSales は staff_menu_sales に 1 施術分を追記する。
	AppendStaffMenuSales(ctx context.Context, staffDailySaleID, menuID uint64, amount uint32) error
	// UpsertDailySales は store 単位の日次売上を加算 upsert する。
	UpsertDailySales(ctx context.Context, storeID uint64, date string, techAmount uint32) error

	FindDailySalesByStore(ctx context.Context, storeID uint64, from, to string) ([]*model.DailySales, error)
	FindStaffDailySales(ctx context.Context, staffID uint64, from, to string) ([]*model.StaffDailySales, error)
}
