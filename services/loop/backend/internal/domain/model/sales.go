package model

import "time"

type DailySales struct {
	ID          uint64    `db:"id"`
	StoreID     uint64    `db:"store_id"`
	Date        string    `db:"date"` // "2026-01-15"
	TotalSales  uint32    `db:"total_sales"`
	ClientCount uint32    `db:"client_count"`
	TechSales   uint32    `db:"tech_sales"`
	RetailSales uint32    `db:"retail_sales"`
	CreatedAt   time.Time `db:"created_at"`
}

type StaffDailySales struct {
	ID          uint64    `db:"id"`
	StaffID     uint64    `db:"staff_id"`
	StoreID     uint64    `db:"store_id"`
	Date        string    `db:"date"`
	TotalSales  uint32    `db:"total_sales"`
	ClientCount uint32    `db:"client_count"`
	UnitPrice   uint32    `db:"unit_price"`
	RetailSales uint32    `db:"retail_sales"`
	CreatedAt   time.Time `db:"created_at"`
}

type StaffMenuSales struct {
	ID               uint64 `db:"id"`
	StaffDailySaleID uint64 `db:"staff_daily_sale_id"`
	MenuID           uint64 `db:"menu_id"`
	Count            uint32 `db:"count"`
	Amount           uint32 `db:"amount"`
}
