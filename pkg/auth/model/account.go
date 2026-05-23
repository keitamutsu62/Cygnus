package model

import "time"

// Account はサービス横断の認証エンティティ。
// LOOP (staff) / RESERVE (customer) 双方から参照される。
type Account struct {
	ID           uint64    `db:"id"`
	SalonID      uint64    `db:"salon_id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	Role         Role      `db:"role"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

type Role string

const (
	RoleOwner Role = "owner"
	RoleAdmin Role = "admin"
	RoleStaff Role = "staff"
)

// ExternalID は LINE ログイン等の外部プロバイダIDを保持する。
// ex_ prefix で統一（例: ex_line_id, ex_google_id）。
type ExternalID struct {
	AccountID  uint64  `db:"account_id"`
	Provider   string  `db:"provider"`
	ExternalID string  `db:"external_id"`
}
