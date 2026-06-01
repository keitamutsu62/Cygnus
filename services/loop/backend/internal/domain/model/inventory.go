package model

import "time"

type Material struct {
	ID         uint64  `db:"id"`
	SalonID    uint64  `db:"salon_id"`
	Name       string  `db:"name"`
	Brand      *string `db:"brand"`
	Category   string  `db:"category"`
	SizeAmount *uint32 `db:"size_amount"`
	SizeUnit   *string `db:"size_unit"`
	StockUnit  string  `db:"stock_unit"`
}

type MenuAssoc struct {
	MenuID   uint64 `db:"menu_id"   json:"menu_id"`
	MenuName string `db:"menu_name" json:"menu_name"`
}

type MaterialWithMenus struct {
	ID         uint64      `json:"id"`
	SalonID    uint64      `json:"salon_id"`
	Name       string      `json:"name"`
	Brand      *string     `json:"brand"`
	Category   string      `json:"category"`
	SizeAmount *uint32     `json:"size_amount"`
	SizeUnit   *string     `json:"size_unit"`
	StockUnit  string      `json:"stock_unit"`
	Menus      []MenuAssoc `json:"menus"`
}

type Inventory struct {
	ID         uint64    `db:"id"`
	StoreID    uint64    `db:"store_id"`
	MaterialID uint64    `db:"material_id"`
	Quantity   uint32    `db:"quantity"`
	Threshold  uint32    `db:"threshold"`
	UpdatedAt  time.Time `db:"updated_at"`
}

type InventoryStatus string

const (
	StatusCritical InventoryStatus = "要発注"
	StatusWarning  InventoryStatus = "注意"
	StatusOK       InventoryStatus = "正常"
	StatusExcess   InventoryStatus = "過剰"
)

type InventoryItem struct {
	Inventory
	Material
	Status   InventoryStatus
	BarWidth int // 0-100
}

func CalcStatus(quantity, threshold uint32) (InventoryStatus, int) {
	if threshold == 0 {
		return StatusOK, 100
	}
	ratio := float64(quantity) / float64(threshold)
	bar := int(min(ratio/2*100, 100))
	switch {
	case ratio >= 2.0:
		return StatusExcess, bar
	case ratio >= 1.0:
		return StatusOK, bar
	case ratio >= 0.5:
		return StatusWarning, bar
	default:
		return StatusCritical, bar
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
