package mysql

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type ReviewRepository struct{ db *sqlx.DB }

func NewReviewRepository(db *sqlx.DB) *ReviewRepository { return &ReviewRepository{db: db} }

func (r *ReviewRepository) Create(ctx context.Context, rv *model.Review) error {
	var res sql.Result
	var err error
	if rv.CreatedAt.IsZero() {
		res, err = r.db.ExecContext(ctx,
			`INSERT INTO reviews (salon_id, store_id, staff_id, menu_id, rating_overall, rating_finish, rating_service, comment)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			rv.SalonID, rv.StoreID, rv.StaffID, rv.MenuID, rv.RatingOverall, rv.RatingFinish, rv.RatingService, rv.Comment)
	} else {
		res, err = r.db.ExecContext(ctx,
			`INSERT INTO reviews (salon_id, store_id, staff_id, menu_id, rating_overall, rating_finish, rating_service, comment, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			rv.SalonID, rv.StoreID, rv.StaffID, rv.MenuID, rv.RatingOverall, rv.RatingFinish, rv.RatingService, rv.Comment, rv.CreatedAt)
	}
	if err != nil {
		return fmt.Errorf("ReviewRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	rv.ID = uint64(id)
	return nil
}

func (r *ReviewRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Review, error) {
	list := make([]*model.Review, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM reviews WHERE salon_id = ? ORDER BY created_at DESC`, salonID)
	if err != nil {
		return nil, fmt.Errorf("ReviewRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *ReviewRepository) FindByStaffID(ctx context.Context, staffID uint64) ([]*model.Review, error) {
	list := make([]*model.Review, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM reviews WHERE staff_id = ? ORDER BY created_at DESC`, staffID)
	if err != nil {
		return nil, fmt.Errorf("ReviewRepository.FindByStaffID: %w", err)
	}
	return list, nil
}

func (r *ReviewRepository) FindDetailsBySalonID(ctx context.Context, salonID uint64, staffID *uint64, limit int) ([]*model.ReviewDetail, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	list := make([]*model.ReviewDetail, 0)
	q := `SELECT r.id, r.store_id, r.staff_id, s.name AS staff_name,
	             r.menu_id, m.name AS menu_name,
	             r.rating_overall, r.rating_finish, r.rating_service,
	             r.comment, r.created_at
	      FROM reviews r
	      LEFT JOIN staffs s ON s.id = r.staff_id
	      LEFT JOIN menus  m ON m.id = r.menu_id
	      WHERE r.salon_id = ?`
	args := []any{salonID}
	if staffID != nil {
		q += ` AND r.staff_id = ?`
		args = append(args, *staffID)
	}
	q += ` ORDER BY r.created_at DESC LIMIT ?`
	args = append(args, limit)
	if err := r.db.SelectContext(ctx, &list, q, args...); err != nil {
		return nil, fmt.Errorf("ReviewRepository.FindDetailsBySalonID: %w", err)
	}
	return list, nil
}
