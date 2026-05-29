package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

// ─── ProfileRepository ───────────────────────────────────────

type ProfileRepository struct{ db *sqlx.DB }

func NewProfileRepository(db *sqlx.DB) *ProfileRepository { return &ProfileRepository{db: db} }

func (r *ProfileRepository) Upsert(ctx context.Context, p *model.Profile) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO profiles (cygnus_account_id, bio, specialties, instagram_url, is_published)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE bio=VALUES(bio), specialties=VALUES(specialties),
		   instagram_url=VALUES(instagram_url), is_published=VALUES(is_published)`,
		p.CygnusAccountID, p.Bio, p.Specialties, p.InstagramURL, p.IsPublished)
	if err != nil {
		return fmt.Errorf("ProfileRepository.Upsert: %w", err)
	}
	if p.ID == 0 {
		id, _ := res.LastInsertId()
		p.ID = uint64(id)
	}
	return nil
}

func (r *ProfileRepository) FindByAccountID(ctx context.Context, accountID uint64) (*model.Profile, error) {
	var p model.Profile
	err := r.db.GetContext(ctx, &p, `SELECT * FROM profiles WHERE cygnus_account_id = ?`, accountID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	return &p, nil
}

func (r *ProfileRepository) FindByCygnusID(ctx context.Context, cygnusID string) (*model.Profile, error) {
	var p model.Profile
	err := r.db.GetContext(ctx, &p,
		`SELECT p.* FROM profiles p
		 JOIN cygnus_accounts a ON a.id = p.cygnus_account_id
		 WHERE a.cygnus_id = ? AND p.is_published = 1`, cygnusID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	return &p, nil
}

// ─── WorkRepository ──────────────────────────────────────────

type WorkRepository struct{ db *sqlx.DB }

func NewWorkRepository(db *sqlx.DB) *WorkRepository { return &WorkRepository{db: db} }

func (r *WorkRepository) Create(ctx context.Context, w *model.Work) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO works (cygnus_account_id, menu_id, title, description, image_url, tags, is_published)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		w.CygnusAccountID, w.MenuID, w.Title, w.Description, w.ImageURL, w.Tags, w.IsPublished)
	if err != nil {
		return fmt.Errorf("WorkRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	w.ID = uint64(id)
	return nil
}

func (r *WorkRepository) FindByID(ctx context.Context, id uint64) (*model.Work, error) {
	var w model.Work
	if err := r.db.GetContext(ctx, &w, `SELECT * FROM works WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &w, nil
}

func (r *WorkRepository) FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Work, error) {
	var list []*model.Work
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM works WHERE cygnus_account_id = ? ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, fmt.Errorf("WorkRepository.FindByAccountID: %w", err)
	}
	return list, nil
}

func (r *WorkRepository) FindPublishedByAccountID(ctx context.Context, accountID uint64) ([]*model.Work, error) {
	var list []*model.Work
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM works WHERE cygnus_account_id = ? AND is_published = 1 ORDER BY created_at DESC`,
		accountID)
	if err != nil {
		return nil, fmt.Errorf("WorkRepository.FindPublishedByAccountID: %w", err)
	}
	return list, nil
}

func (r *WorkRepository) Update(ctx context.Context, w *model.Work) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE works SET menu_id=?, title=?, description=?, image_url=?, tags=?, is_published=?
		 WHERE id=? AND cygnus_account_id=?`,
		w.MenuID, w.Title, w.Description, w.ImageURL, w.Tags, w.IsPublished,
		w.ID, w.CygnusAccountID)
	return err
}

func (r *WorkRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM works WHERE id = ?`, id)
	return err
}
