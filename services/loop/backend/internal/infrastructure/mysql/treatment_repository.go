package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type TreatmentRepository struct{ db *sqlx.DB }

func NewTreatmentRepository(db *sqlx.DB) *TreatmentRepository {
	return &TreatmentRepository{db: db}
}

func (r *TreatmentRepository) Create(ctx context.Context, t *model.Treatment) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO treatments
		   (staff_id, customer_id, salon_id, store_id, menu_id, menu_name,
		    price, duration_minutes, source, is_shimei, appointment_id, performed_at, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.StaffID, t.CustomerID, t.SalonID, t.StoreID, t.MenuID, t.MenuName,
		t.Price, t.DurationMinutes, t.Source, t.IsShimei, t.AppointmentID, t.PerformedAt, t.Notes)
	if err != nil {
		return fmt.Errorf("TreatmentRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	t.ID = uint64(id)
	return nil
}

func (r *TreatmentRepository) FindByID(ctx context.Context, id uint64) (*model.Treatment, error) {
	var t model.Treatment
	if err := r.db.GetContext(ctx, &t, `SELECT * FROM treatments WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &t, nil
}

func (r *TreatmentRepository) FindByStaffID(ctx context.Context, staffID uint64, limit, offset int) ([]*model.Treatment, error) {
	var list []*model.Treatment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM treatments WHERE staff_id = ? ORDER BY performed_at DESC LIMIT ? OFFSET ?`,
		staffID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("TreatmentRepository.FindByStaffID: %w", err)
	}
	return list, nil
}

func (r *TreatmentRepository) FindBySalonID(ctx context.Context, salonID uint64, limit, offset int) ([]*model.Treatment, error) {
	var list []*model.Treatment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM treatments WHERE salon_id = ? ORDER BY performed_at DESC LIMIT ? OFFSET ?`,
		salonID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("TreatmentRepository.FindBySalonID: %w", err)
	}
	return list, nil
}
