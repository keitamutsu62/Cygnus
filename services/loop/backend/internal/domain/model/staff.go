package model

import "time"

type Staff struct {
	ID           uint64    `db:"id"`
	SalonID      uint64    `db:"salon_id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	Role         StaffRole `db:"role"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

type StaffRole string

const (
	StaffRoleOwner StaffRole = "owner"
	StaffRoleAdmin StaffRole = "admin"
	StaffRoleStaff StaffRole = "staff"
)
