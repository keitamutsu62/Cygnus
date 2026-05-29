package model

import "time"

type TreatmentSource string

const (
	TreatmentSourceReserve   TreatmentSource = "reserve"
	TreatmentSourceHotpepper TreatmentSource = "hotpepper"
	TreatmentSourceLine      TreatmentSource = "line"
	TreatmentSourceWalkin    TreatmentSource = "walkin"
	TreatmentSourceOther     TreatmentSource = "other"
)

type Treatment struct {
	ID              uint64          `db:"id"`
	StaffID         uint64          `db:"staff_id"`
	CustomerID      uint64          `db:"customer_id"`
	SalonID         uint64          `db:"salon_id"`
	StoreID         *uint64         `db:"store_id"`
	MenuID          *uint64         `db:"menu_id"`
	MenuName        string          `db:"menu_name"`
	Price           uint32          `db:"price"`
	DurationMinutes *uint16         `db:"duration_minutes"`
	Source          TreatmentSource `db:"source"`
	AppointmentID   *uint64         `db:"appointment_id"`
	PerformedAt     time.Time       `db:"performed_at"`
	Notes           *string         `db:"notes"`
	CreatedAt       time.Time       `db:"created_at"`
}
