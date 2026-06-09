package model

import "time"

type AdminAppointmentStatus string

const (
	AdminApptScheduled AdminAppointmentStatus = "scheduled"
	AdminApptDone      AdminAppointmentStatus = "done"
	AdminApptCancelled AdminAppointmentStatus = "cancelled"
)

type AdminAppointment struct {
	ID         uint64                 `db:"id"          json:"id"`
	SalonName  string                 `db:"salon_name"  json:"salon_name"`
	Title      string                 `db:"title"       json:"title"`
	Date       string                 `db:"date"        json:"date"`
	Time       *string                `db:"time"        json:"time"`
	Status     AdminAppointmentStatus `db:"status"      json:"status"`
	Notes      *string                `db:"notes"       json:"notes"`
	Result     *string                `db:"result"      json:"result"`
	CreatedAt  time.Time              `db:"created_at"  json:"created_at"`
	UpdatedAt  time.Time              `db:"updated_at"  json:"updated_at"`
}
