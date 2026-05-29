package model

import "time"

type Store struct {
	ID        uint64    `db:"id"`
	SalonID   uint64    `db:"salon_id"`
	Name      string    `db:"name"`
	Address   *string   `db:"address"`
	Phone     *string   `db:"phone"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type BusinessHours struct {
	ID            uint64    `db:"id"`
	StoreID       uint64    `db:"store_id"`
	OpenTime      string    `db:"open_time"`      // "09:00:00"
	CloseTime     string    `db:"close_time"`     // "19:00:00"
	ClosedWeekday *int      `db:"closed_weekday"` // 0=日, 1=月, …, nil=定休なし
	UpdatedAt     time.Time `db:"updated_at"`
}
