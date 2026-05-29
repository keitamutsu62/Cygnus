package model

import "time"

type RetailSale struct {
	ID          uint64    `db:"id"`
	StaffID     uint64    `db:"staff_id"`
	StoreID     uint64    `db:"store_id"`
	SalonID     uint64    `db:"salon_id"`
	ProductName string    `db:"product_name"`
	Price       uint32    `db:"price"`
	SoldAt      time.Time `db:"sold_at"`
	CreatedAt   time.Time `db:"created_at"`
}
