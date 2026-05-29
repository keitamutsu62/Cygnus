package model

import "time"

type CygnusAccount struct {
	ID             uint64    `db:"id"`
	CygnusID       string    `db:"cygnus_id"` // CYG-XXXXX
	Email          string    `db:"email"`
	PasswordHash   string    `db:"password_hash"`
	DisplayName    string    `db:"display_name"`
	AvatarInitials *string   `db:"avatar_initials"`
	CreatedAt      time.Time `db:"created_at"`
	UpdatedAt      time.Time `db:"updated_at"`
}

type SalonMembership struct {
	ID              uint64     `db:"id"`
	CygnusAccountID uint64     `db:"cygnus_account_id"`
	SalonID         uint64     `db:"salon_id"`
	StoreID         *uint64    `db:"store_id"`
	Role            StaffRole  `db:"role"`
	IsActive        bool       `db:"is_active"`
	JoinedAt        time.Time  `db:"joined_at"`
	LeftAt          *time.Time `db:"left_at"`
}
