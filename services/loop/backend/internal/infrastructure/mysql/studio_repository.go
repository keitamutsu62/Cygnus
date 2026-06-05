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
		`INSERT INTO profiles (cygnus_account_id, avatar_url, bio, specialties, instagram_url, is_published, shimei_charge)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE avatar_url=VALUES(avatar_url), bio=VALUES(bio), specialties=VALUES(specialties),
		   instagram_url=VALUES(instagram_url), is_published=VALUES(is_published),
		   shimei_charge=VALUES(shimei_charge)`,
		p.CygnusAccountID, p.AvatarURL, p.Bio, p.Specialties, p.InstagramURL, p.IsPublished, p.ShimeiCharge)
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

// ─── MembershipRepository（LOOP在籍履歴） ─────────────────────

type LoopMembership struct {
	SalonName  string  `db:"salon_name"`
	Role       string  `db:"role"`
	IsActive   bool    `db:"is_active"`
	JoinedAt   string  `db:"joined_at"`
	LeftAt     *string `db:"left_at"`
}

func FetchLoopMemberships(ctx context.Context, db *sqlx.DB, accountID uint64) ([]*LoopMembership, error) {
	list := make([]*LoopMembership, 0)
	err := db.SelectContext(ctx, &list,
		`SELECT s.name AS salon_name, sm.role, sm.is_active,
		        DATE_FORMAT(sm.joined_at, '%Y-%m-%d') AS joined_at,
		        DATE_FORMAT(sm.left_at,   '%Y-%m-%d') AS left_at
		 FROM salon_memberships sm
		 JOIN salons s ON s.id = sm.salon_id
		 WHERE sm.cygnus_account_id = ?
		 ORDER BY sm.is_active DESC, sm.joined_at DESC`, accountID)
	return list, err
}

// ─── CareerRepository ────────────────────────────────────────

type CareerRepository struct{ db *sqlx.DB }

func NewCareerRepository(db *sqlx.DB) *CareerRepository { return &CareerRepository{db: db} }

func (r *CareerRepository) Create(ctx context.Context, c *model.Career) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO studio_careers (cygnus_account_id, salon_name, role, start_year, start_month, end_year, end_month, is_current)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		c.CygnusAccountID, c.SalonName, c.Role, c.StartYear, c.StartMonth, c.EndYear, c.EndMonth, c.IsCurrent)
	if err != nil {
		return fmt.Errorf("CareerRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	c.ID = uint64(id)
	return nil
}

func (r *CareerRepository) FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Career, error) {
	list := make([]*model.Career, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM studio_careers WHERE cygnus_account_id = ?
		 ORDER BY is_current DESC, start_year DESC, start_month DESC`, accountID)
	if err != nil {
		return nil, fmt.Errorf("CareerRepository.FindByAccountID: %w", err)
	}
	return list, nil
}

func (r *CareerRepository) Update(ctx context.Context, c *model.Career) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE studio_careers SET salon_name=?, role=?, start_year=?, start_month=?,
		 end_year=?, end_month=?, is_current=? WHERE id=? AND cygnus_account_id=?`,
		c.SalonName, c.Role, c.StartYear, c.StartMonth, c.EndYear, c.EndMonth, c.IsCurrent,
		c.ID, c.CygnusAccountID)
	return err
}

func (r *CareerRepository) Delete(ctx context.Context, id, accountID uint64) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM studio_careers WHERE id=? AND cygnus_account_id=?`, id, accountID)
	return err
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
	list := make([]*model.Work, 0)
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM works WHERE cygnus_account_id = ? ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, fmt.Errorf("WorkRepository.FindByAccountID: %w", err)
	}
	return list, nil
}

func (r *WorkRepository) FindPublishedByAccountID(ctx context.Context, accountID uint64) ([]*model.Work, error) {
	list := make([]*model.Work, 0)
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
