package model

import "time"

type Store struct {
	ID        uint64    `db:"id"         json:"id"`
	SalonID   uint64    `db:"salon_id"   json:"salon_id"`
	Name      string    `db:"name"       json:"name"`
	Address   *string   `db:"address"    json:"address"`
	Phone     *string   `db:"phone"      json:"phone"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type BusinessHours struct {
	ID            uint64    `db:"id"             json:"id"`
	StoreID       uint64    `db:"store_id"       json:"store_id"`
	OpenTime      string    `db:"open_time"      json:"open_time"`
	CloseTime     string    `db:"close_time"     json:"close_time"`
	ClosedWeekday *int      `db:"closed_weekday" json:"closed_weekday"`
	UpdatedAt     time.Time `db:"updated_at"     json:"updated_at"`
}
