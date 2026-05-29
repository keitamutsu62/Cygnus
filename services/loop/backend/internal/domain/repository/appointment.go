package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

// AppointmentRepository は LOOP から appointments を読み取るためのリポジトリ。
// 書き込みは RESERVE が行うため、LOOP 側は読み取りのみ。
type AppointmentRepository interface {
	FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Appointment, error)
	UpdateStatus(ctx context.Context, id uint64, status model.AppointmentStatus) error
}
