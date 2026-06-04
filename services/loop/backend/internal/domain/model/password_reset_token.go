package model

import "time"

type PasswordResetToken struct {
	ID        uint64     `db:"id"`
	StaffID   uint64     `db:"staff_id"`
	Token     string     `db:"token"`
	ExpiresAt time.Time  `db:"expires_at"`
	UsedAt    *time.Time `db:"used_at"`
	CreatedAt time.Time  `db:"created_at"`
}
