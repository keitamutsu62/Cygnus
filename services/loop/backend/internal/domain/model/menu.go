package model

import "time"

type Menu struct {
	ID        uint64    `db:"id"         json:"id"`
	SalonID   uint64    `db:"salon_id"   json:"salon_id"`
	Name      string    `db:"name"       json:"name"`
	MenuType  string    `db:"menu_type"  json:"menu_type"`
	Price     uint32    `db:"price"      json:"price"`
	Duration  *uint16   `db:"duration"   json:"duration_minutes"`
	IsActive  bool      `db:"is_active"  json:"is_active"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}
