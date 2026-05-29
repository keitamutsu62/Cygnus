package model

import "time"

type Menu struct {
	ID              uint64    `db:"id"`
	SalonID         uint64    `db:"salon_id"`
	Name            string    `db:"name"`
	Price           uint32    `db:"price"`
	Duration        *uint16   `db:"duration"` // 分単位
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}
