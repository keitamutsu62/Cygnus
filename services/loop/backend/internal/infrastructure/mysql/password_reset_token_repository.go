package mysql

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type PasswordResetTokenRepository struct{ db *sqlx.DB }

func NewPasswordResetTokenRepository(db *sqlx.DB) *PasswordResetTokenRepository {
	return &PasswordResetTokenRepository{db: db}
}

func (r *PasswordResetTokenRepository) Create(ctx context.Context, t *model.PasswordResetToken) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO password_reset_tokens (staff_id, token, expires_at) VALUES (?, ?, ?)`,
		t.StaffID, t.Token, t.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("PasswordResetTokenRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	t.ID = uint64(id)
	return nil
}

func (r *PasswordResetTokenRepository) FindByToken(ctx context.Context, token string) (*model.PasswordResetToken, error) {
	var t model.PasswordResetToken
	if err := r.db.GetContext(ctx, &t,
		`SELECT * FROM password_reset_tokens WHERE token = ?`, token,
	); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &t, nil
}

func (r *PasswordResetTokenRepository) MarkUsed(ctx context.Context, id uint64) error {
	now := time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, now, id,
	)
	return err
}
