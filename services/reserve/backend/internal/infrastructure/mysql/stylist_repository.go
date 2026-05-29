package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
)

type StylistRepository struct{ db *sqlx.DB }

func NewStylistRepository(db *sqlx.DB) *StylistRepository { return &StylistRepository{db: db} }

// FindPublicProfile は cygnus_id でスタイリストの公開プロフィールを返す。
// cygnus_accounts + profiles を JOIN する。
func (r *StylistRepository) FindPublicProfile(ctx context.Context, cygnusID string) (*model.StylistPublicProfile, error) {
	var row struct {
		CygnusID       string  `db:"cygnus_id"`
		DisplayName    string  `db:"display_name"`
		AvatarInitials *string `db:"avatar_initials"`
		Bio            *string `db:"bio"`
		Specialties    *string `db:"specialties"`
		InstagramURL   *string `db:"instagram_url"`
	}
	err := r.db.GetContext(ctx, &row, `
		SELECT a.cygnus_id, a.display_name, a.avatar_initials,
		       p.bio, p.specialties, p.instagram_url
		FROM cygnus_accounts a
		LEFT JOIN profiles p ON p.cygnus_account_id = a.id AND p.is_published = 1
		WHERE a.cygnus_id = ?`, cygnusID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	return &model.StylistPublicProfile{
		CygnusID:       row.CygnusID,
		DisplayName:    row.DisplayName,
		AvatarInitials: row.AvatarInitials,
		Bio:            row.Bio,
		Specialties:    row.Specialties,
		InstagramURL:   row.InstagramURL,
	}, nil
}

// FindPublishedWorks は公開済み作品一覧を返す。
func (r *StylistRepository) FindPublishedWorks(ctx context.Context, cygnusID string) ([]*model.PublicWork, error) {
	var list []*model.PublicWork
	err := r.db.SelectContext(ctx, &list, `
		SELECT w.id, w.menu_id, w.title, w.image_url, w.tags, w.created_at
		FROM works w
		JOIN cygnus_accounts a ON a.id = w.cygnus_account_id
		WHERE a.cygnus_id = ? AND w.is_published = 1
		ORDER BY w.created_at DESC`, cygnusID)
	if err != nil {
		return nil, fmt.Errorf("StylistRepository.FindPublishedWorks: %w", err)
	}
	return list, nil
}

// FindAppointmentsByAccountID はスタイリストの予約一覧を返す（LOOP連携用）。
func (r *StylistRepository) FindAppointmentsByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error) {
	var list []*model.Appointment
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM appointments WHERE cygnus_account_id = ? ORDER BY start_at DESC`,
		accountID)
	if err != nil {
		return nil, fmt.Errorf("StylistRepository.FindAppointmentsByAccountID: %w", err)
	}
	return list, nil
}
