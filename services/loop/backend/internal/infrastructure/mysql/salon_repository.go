package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type SalonRepository struct{ db *sqlx.DB }

func NewSalonRepository(db *sqlx.DB) *SalonRepository { return &SalonRepository{db: db} }

func (r *SalonRepository) Create(ctx context.Context, s *model.Salon) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO salons (name) VALUES (?)`, s.Name)
	if err != nil {
		return fmt.Errorf("SalonRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	s.ID = uint64(id)
	return nil
}

func (r *SalonRepository) FindByID(ctx context.Context, id uint64) (*model.Salon, error) {
	var s model.Salon
	if err := r.db.GetContext(ctx, &s, `SELECT * FROM salons WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &s, nil
}

func (r *SalonRepository) GetShimeiCharge(ctx context.Context, salonID uint64) (uint32, error) {
	var charge uint32
	if err := r.db.QueryRowContext(ctx, `SELECT shimei_charge FROM salons WHERE id = ?`, salonID).Scan(&charge); err != nil {
		return 1100, err
	}
	return charge, nil
}

func (r *SalonRepository) UpdateShimeiCharge(ctx context.Context, salonID uint64, charge uint32) error {
	_, err := r.db.ExecContext(ctx, `UPDATE salons SET shimei_charge = ? WHERE id = ?`, charge, salonID)
	return err
}

func (r *SalonRepository) GetClosingDay(ctx context.Context, salonID uint64) (uint8, error) {
	var day uint8
	if err := r.db.QueryRowContext(ctx, `SELECT closing_day FROM salons WHERE id = ?`, salonID).Scan(&day); err != nil {
		return 20, err
	}
	return day, nil
}

func (r *SalonRepository) UpdateClosingDay(ctx context.Context, salonID uint64, day uint8) error {
	_, err := r.db.ExecContext(ctx, `UPDATE salons SET closing_day = ? WHERE id = ?`, day, salonID)
	return err
}

type PlanRepository struct{ db *sqlx.DB }

func NewPlanRepository(db *sqlx.DB) *PlanRepository { return &PlanRepository{db: db} }

func (r *PlanRepository) FindByID(ctx context.Context, id uint64) (*model.Plan, error) {
	var p model.Plan
	if err := r.db.GetContext(ctx, &p, `SELECT * FROM plans WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &p, nil
}

func (r *PlanRepository) FindDefault(ctx context.Context) (*model.Plan, error) {
	var p model.Plan
	if err := r.db.GetContext(ctx, &p, `SELECT * FROM plans ORDER BY id ASC LIMIT 1`); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &p, nil
}

type SubscriptionRepository struct{ db *sqlx.DB }

func NewSubscriptionRepository(db *sqlx.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

func (r *SubscriptionRepository) Create(ctx context.Context, s *model.Subscription) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO subscriptions (salon_id, plan_id, status) VALUES (?, ?, ?)`,
		s.SalonID, s.PlanID, s.Status)
	if err != nil {
		return fmt.Errorf("SubscriptionRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	s.ID = uint64(id)
	return nil
}

func (r *SubscriptionRepository) FindBySalonID(ctx context.Context, salonID uint64) (*model.Subscription, error) {
	var s model.Subscription
	if err := r.db.GetContext(ctx, &s, `SELECT * FROM subscriptions WHERE salon_id = ?`, salonID); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &s, nil
}
