package model

import "time"

type AppointmentStatus string

const (
	AppointmentStatusPending   AppointmentStatus = "pending"
	AppointmentStatusConfirmed AppointmentStatus = "confirmed"
	AppointmentStatusCompleted AppointmentStatus = "completed"
	AppointmentStatusCancelled AppointmentStatus = "cancelled"
)

type Appointment struct {
	ID               uint64            `db:"id"`
	CygnusCustomerID uint64            `db:"cygnus_customer_id"`
	CygnusAccountID  uint64            `db:"cygnus_account_id"` // スタイリスト
	SalonID          uint64            `db:"salon_id"`
	StoreID          *uint64           `db:"store_id"`
	MenuID           *uint64           `db:"menu_id"`
	MenuName         string            `db:"menu_name"`
	Price            uint32            `db:"price"`
	DurationMinutes  *uint16           `db:"duration_minutes"`
	StartAt          time.Time         `db:"start_at"`
	EndAt            time.Time         `db:"end_at"`
	Status           AppointmentStatus `db:"status"`
	CancelReason     *string           `db:"cancel_reason"`
	Notes            *string           `db:"notes"`
	CreatedAt        time.Time         `db:"created_at"`
	UpdatedAt        time.Time         `db:"updated_at"`
}
