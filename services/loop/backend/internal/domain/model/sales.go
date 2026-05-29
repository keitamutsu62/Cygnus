package model

import "time"

type DailySales struct {
	ID          uint64    `db:"id"           json:"id"`
	StoreID     uint64    `db:"store_id"     json:"store_id"`
	Date        string    `db:"date"         json:"date"`
	TotalSales  uint32    `db:"total_sales"  json:"total_sales"`
	ClientCount uint32    `db:"client_count" json:"client_count"`
	TechSales   uint32    `db:"tech_sales"   json:"tech_sales"`
	RetailSales uint32    `db:"retail_sales" json:"retail_sales"`
	CreatedAt   time.Time `db:"created_at"   json:"created_at"`
}

type StaffDailySales struct {
	ID          uint64    `db:"id"           json:"id"`
	StaffID     uint64    `db:"staff_id"     json:"staff_id"`
	StoreID     uint64    `db:"store_id"     json:"store_id"`
	Date        string    `db:"date"         json:"date"`
	TotalSales  uint32    `db:"total_sales"  json:"total_sales"`
	ClientCount uint32    `db:"client_count" json:"client_count"`
	UnitPrice   uint32    `db:"unit_price"   json:"unit_price"`
	RetailSales uint32    `db:"retail_sales" json:"retail_sales"`
	CreatedAt   time.Time `db:"created_at"   json:"created_at"`
}

type StaffMenuSales struct {
	ID               uint64 `db:"id"                   json:"id"`
	StaffDailySaleID uint64 `db:"staff_daily_sale_id"  json:"staff_daily_sale_id"`
	MenuID           uint64 `db:"menu_id"              json:"menu_id"`
	Count            uint32 `db:"count"                json:"count"`
	Amount           uint32 `db:"amount"               json:"amount"`
}
