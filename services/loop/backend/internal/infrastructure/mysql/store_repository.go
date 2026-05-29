package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

// ─── StoreRepository ─────────────────────────────────────────

type StoreRepository struct{ db *sqlx.DB }

func NewStoreRepository(db *sqlx.DB) *StoreRepository { return &StoreRepository{db: db} }

func (r *StoreRepository) Create(ctx context.Context, s *model.Store) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO stores (salon_id, name, address, phone) VALUES (?, ?, ?, ?)`,
		s.SalonID, s.Name, s.Address, s.Phone)
	if err != nil {
		return fmt.Errorf("StoreRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	s.ID = uint64(id)
	return nil
}

func (r *StoreRepository) FindByID(ctx context.Context, id uint64) (*model.Store, error) {
	var s model.Store
	if err := r.db.GetContext(ctx, &s, `SELECT * FROM stores WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &s, nil
}

func (r *StoreRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Store, error) {
	var list []*model.Store
	err := r.db.SelectContext(ctx, &list, `SELECT * FROM stores WHERE salon_id = ? ORDER BY id ASC`, salonID)
	if err != nil {
		return nil, fmt.Errorf("StoreRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *StoreRepository) FindIDsBySalonID(ctx context.Context, salonID uint64) ([]uint64, error) {
	var ids []uint64
	err := r.db.SelectContext(ctx, &ids, `SELECT id FROM stores WHERE salon_id = ?`, salonID)
	return ids, err
}

func (r *StoreRepository) Update(ctx context.Context, s *model.Store) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE stores SET name=?, address=?, phone=? WHERE id=? AND salon_id=?`,
		s.Name, s.Address, s.Phone, s.ID, s.SalonID)
	return err
}

func (r *StoreRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM stores WHERE id = ?`, id)
	return err
}

// ─── BusinessHoursRepository ─────────────────────────────────

type BusinessHoursRepository struct{ db *sqlx.DB }

func NewBusinessHoursRepository(db *sqlx.DB) *BusinessHoursRepository {
	return &BusinessHoursRepository{db: db}
}

func (r *BusinessHoursRepository) Upsert(ctx context.Context, bh *model.BusinessHours) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO business_hours (store_id, open_time, close_time, closed_weekday)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE open_time=VALUES(open_time), close_time=VALUES(close_time),
		   closed_weekday=VALUES(closed_weekday)`,
		bh.StoreID, bh.OpenTime, bh.CloseTime, bh.ClosedWeekday)
	return err
}

func (r *BusinessHoursRepository) FindByStoreID(ctx context.Context, storeID uint64) (*model.BusinessHours, error) {
	var bh model.BusinessHours
	if err := r.db.GetContext(ctx, &bh, `SELECT * FROM business_hours WHERE store_id = ?`, storeID); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &bh, nil
}
