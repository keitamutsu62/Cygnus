package model

import "time"

// Customer は LOOP の顧客台帳エントリ。サロンが管理する顧客情報。
// cygnus_customers（RESERVE のお客さんID）とは別物。
type Customer struct {
	ID        uint64    `db:"id"`
	SalonID   uint64    `db:"salon_id"`
	Name      string    `db:"name"`
	Phone     *string   `db:"phone"`
	ExLineID  *string   `db:"ex_line_id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}
