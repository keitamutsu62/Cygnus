package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
)

type AppointmentRepository struct{ db *sqlx.DB }

func NewAppointmentRepository(db *sqlx.DB) *AppointmentRepository {
	return &AppointmentRepository{db: db}
}

func (r *AppointmentRepository) Create(ctx context.Context, a *model.Appointment) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO appointments
		   (cygnus_customer_id, cygnus_account_id, salon_id, store_id,
		    menu_id, menu_name, price, duration_minutes, start_at, end_at, status, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.CygnusCustomerID, a.CygnusAccountID, a.SalonID, a.StoreID,
		a.MenuID, a.MenuName, a.Price, a.DurationMinutes,
		a.StartAt, a.EndAt, a.Status, a.Notes)
	if err != nil {
		return fmt.Errorf("AppointmentRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	a.ID = uint64(id)
	return nil
}

func (r *AppointmentRepository) FindByID(ctx context.Context, id uint64) (*model.Appointment, error) {
	var a model.Appointment
	if err := r.db.GetContext(ctx, &a, `SELECT * FROM appointments WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &a, nil
}

func (r *AppointmentRepository) FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.Appointment, error) {
	var list []*model.Appointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM appointments WHERE cygnus_customer_id = ? ORDER BY start_at DESC`, customerID)
	if err != nil {
		return nil, fmt.Errorf("AppointmentRepository.FindByCustomerID: %w", err)
	}
	return list, nil
}

func (r *AppointmentRepository) FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error) {
	var list []*model.Appointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM appointments WHERE cygnus_account_id = ? ORDER BY start_at DESC`, accountID)
	if err != nil {
		return nil, fmt.Errorf("AppointmentRepository.FindByAccountID: %w", err)
	}
	return list, nil
}

func (r *AppointmentRepository) UpdateStatus(ctx context.Context, id uint64, status model.AppointmentStatus, cancelReason *string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE appointments SET status = ?, cancel_reason = ? WHERE id = ?`,
		status, cancelReason, id)
	return err
}
