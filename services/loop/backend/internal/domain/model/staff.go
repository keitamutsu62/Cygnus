package model

import "time"

type Staff struct {
	ID              uint64    `db:"id"`
	CygnusAccountID *uint64   `db:"cygnus_account_id"`
	SalonID         uint64    `db:"salon_id"`
	StoreID         *uint64   `db:"store_id"`
	Name            string    `db:"name"`
	Email           string    `db:"email"`
	PasswordHash    string    `db:"password_hash"`
	Role            StaffRole `db:"role"`
	IsActive        bool      `db:"is_active"`
	AvatarInitials  *string   `db:"avatar_initials"`
	ShimeiCharge    *uint32   `db:"shimei_charge"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}

type StaffRole string

const (
	StaffRoleOwner StaffRole = "owner"
	StaffRoleAdmin StaffRole = "admin"
	StaffRoleStaff StaffRole = "staff"
)

type Invitation struct {
	ID               uint64           `db:"id"`
	SalonID          uint64           `db:"salon_id"`
	InvitedByStaffID uint64           `db:"invited_by_staff_id"`
	Email            string           `db:"email"`
	Token            string           `db:"token"`
	Role             StaffRole        `db:"role"`
	Status           InvitationStatus `db:"status"`
	ExpiresAt        time.Time        `db:"expires_at"`
	CreatedAt        time.Time        `db:"created_at"`
}

type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationExpired  InvitationStatus = "expired"
)
