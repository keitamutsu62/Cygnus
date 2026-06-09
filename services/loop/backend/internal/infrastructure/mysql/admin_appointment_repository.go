package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type AdminAppointmentRepository struct{ db *sqlx.DB }

func NewAdminAppointmentRepository(db *sqlx.DB) *AdminAppointmentRepository {
	return &AdminAppointmentRepository{db: db}
}

func (r *AdminAppointmentRepository) List(ctx context.Context) ([]*model.AdminAppointment, error) {
	var list []*model.AdminAppointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM admin_appointments ORDER BY date ASC, time ASC`)
	if err != nil {
		return nil, fmt.Errorf("AdminAppointmentRepository.List: %w", err)
	}
	return list, nil
}

func (r *AdminAppointmentRepository) Create(ctx context.Context, a *model.AdminAppointment) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO admin_appointments (salon_name, title, date, time, status, notes, result)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		a.SalonName, a.Title, a.Date, a.Time, a.Status, a.Notes, a.Result)
	if err != nil {
		return fmt.Errorf("AdminAppointmentRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	a.ID = uint64(id)
	return nil
}

func (r *AdminAppointmentRepository) Update(ctx context.Context, a *model.AdminAppointment) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE admin_appointments
		 SET salon_name=?, title=?, date=?, time=?, status=?, notes=?, result=?
		 WHERE id=?`,
		a.SalonName, a.Title, a.Date, a.Time, a.Status, a.Notes, a.Result, a.ID)
	if err != nil {
		return fmt.Errorf("AdminAppointmentRepository.Update: %w", err)
	}
	return nil
}

func (r *AdminAppointmentRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM admin_appointments WHERE id=?`, id)
	return err
}
