package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type AppointmentRepository struct{ db *sqlx.DB }

func NewAppointmentRepository(db *sqlx.DB) *AppointmentRepository {
	return &AppointmentRepository{db: db}
}

func (r *AppointmentRepository) FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error) {
	var list []*model.Appointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM appointments WHERE cygnus_account_id = ? ORDER BY start_at DESC`,
		accountID)
	if err != nil {
		return nil, fmt.Errorf("AppointmentRepository.FindByAccountID: %w", err)
	}
	return list, nil
}

func (r *AppointmentRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Appointment, error) {
	var list []*model.Appointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM appointments WHERE salon_id = ? ORDER BY start_at DESC`,
		salonID)
	if err != nil {
		return nil, fmt.Errorf("AppointmentRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *AppointmentRepository) UpdateStatus(ctx context.Context, id uint64, status model.AppointmentStatus) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE appointments SET status = ? WHERE id = ?`, status, id)
	return err
}
