package model

import "time"

type Salon struct {
	ID           uint64    `db:"id"`
	Name         string    `db:"name"`
	ShimeiCharge uint32    `db:"shimei_charge"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

type Plan struct {
	ID            uint64  `db:"id"`
	Name          string  `db:"name"`
	MaxStaffCount *uint32 `db:"max_staff_count"` // nil = 無制限
}

type Subscription struct {
	ID        uint64             `db:"id"`
	SalonID   uint64             `db:"salon_id"`
	PlanID    uint64             `db:"plan_id"`
	Status    SubscriptionStatus `db:"status"`
	CreatedAt time.Time          `db:"created_at"`
	UpdatedAt time.Time          `db:"updated_at"`
}

type SubscriptionStatus string

const (
	SubscriptionActive    SubscriptionStatus = "active"
	SubscriptionCancelled SubscriptionStatus = "cancelled"
	SubscriptionExpired   SubscriptionStatus = "expired"
)
