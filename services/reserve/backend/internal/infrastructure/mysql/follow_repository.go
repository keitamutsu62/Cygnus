package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
)

// ─── FollowRepository ────────────────────────────────────────

type FollowRepository struct{ db *sqlx.DB }

func NewFollowRepository(db *sqlx.DB) *FollowRepository { return &FollowRepository{db: db} }

func (r *FollowRepository) Create(ctx context.Context, f *model.Follow) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT IGNORE INTO follows (cygnus_customer_id, cygnus_account_id) VALUES (?, ?)`,
		f.CygnusCustomerID, f.CygnusAccountID)
	if err != nil {
		return fmt.Errorf("FollowRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	f.ID = uint64(id)
	return nil
}

func (r *FollowRepository) Delete(ctx context.Context, customerID, accountID uint64) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM follows WHERE cygnus_customer_id = ? AND cygnus_account_id = ?`,
		customerID, accountID)
	return err
}

func (r *FollowRepository) FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.Follow, error) {
	var list []*model.Follow
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM follows WHERE cygnus_customer_id = ? ORDER BY created_at DESC`, customerID)
	if err != nil {
		return nil, fmt.Errorf("FollowRepository.FindByCustomerID: %w", err)
	}
	return list, nil
}

func (r *FollowRepository) Exists(ctx context.Context, customerID, accountID uint64) (bool, error) {
	var count int
	err := r.db.GetContext(ctx, &count,
		`SELECT COUNT(*) FROM follows WHERE cygnus_customer_id = ? AND cygnus_account_id = ?`,
		customerID, accountID)
	return count > 0, err
}

// ─── SavedWorkRepository ─────────────────────────────────────

type SavedWorkRepository struct{ db *sqlx.DB }

func NewSavedWorkRepository(db *sqlx.DB) *SavedWorkRepository {
	return &SavedWorkRepository{db: db}
}

func (r *SavedWorkRepository) Create(ctx context.Context, s *model.SavedWork) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT IGNORE INTO saved_works (cygnus_customer_id, work_id) VALUES (?, ?)`,
		s.CygnusCustomerID, s.WorkID)
	if err != nil {
		return fmt.Errorf("SavedWorkRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	s.ID = uint64(id)
	return nil
}

func (r *SavedWorkRepository) Delete(ctx context.Context, customerID, workID uint64) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM saved_works WHERE cygnus_customer_id = ? AND work_id = ?`,
		customerID, workID)
	return err
}

func (r *SavedWorkRepository) FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.SavedWork, error) {
	var list []*model.SavedWork
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM saved_works WHERE cygnus_customer_id = ? ORDER BY created_at DESC`, customerID)
	if err != nil {
		return nil, fmt.Errorf("SavedWorkRepository.FindByCustomerID: %w", err)
	}
	return list, nil
}

func (r *SavedWorkRepository) Exists(ctx context.Context, customerID, workID uint64) (bool, error) {
	var count int
	err := r.db.GetContext(ctx, &count,
		`SELECT COUNT(*) FROM saved_works WHERE cygnus_customer_id = ? AND work_id = ?`,
		customerID, workID)
	return count > 0, err
}
