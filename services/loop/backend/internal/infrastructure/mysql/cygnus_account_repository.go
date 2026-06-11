package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type CygnusAccountRepository struct{ db *sqlx.DB }

func NewCygnusAccountRepository(db *sqlx.DB) *CygnusAccountRepository {
	return &CygnusAccountRepository{db: db}
}

func (r *CygnusAccountRepository) Create(ctx context.Context, a *model.CygnusAccount) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO cygnus_accounts (cygnus_id, email, password_hash, display_name, avatar_initials)
		 VALUES (?, ?, ?, ?, ?)`,
		a.CygnusID, a.Email, a.PasswordHash, a.DisplayName, a.AvatarInitials)
	if err != nil {
		return fmt.Errorf("CygnusAccountRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	a.ID = uint64(id)
	return nil
}

func (r *CygnusAccountRepository) FindByID(ctx context.Context, id uint64) (*model.CygnusAccount, error) {
	var a model.CygnusAccount
	if err := r.db.GetContext(ctx, &a, `SELECT * FROM cygnus_accounts WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &a, nil
}

func (r *CygnusAccountRepository) FindByEmail(ctx context.Context, email string) (*model.CygnusAccount, error) {
	var a model.CygnusAccount
	if err := r.db.GetContext(ctx, &a, `SELECT * FROM cygnus_accounts WHERE email = ?`, email); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &a, nil
}

func (r *CygnusAccountRepository) FindByCygnusID(ctx context.Context, cygnusID string) (*model.CygnusAccount, error) {
	var a model.CygnusAccount
	if err := r.db.GetContext(ctx, &a, `SELECT * FROM cygnus_accounts WHERE cygnus_id = ?`, cygnusID); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &a, nil
}

func (r *CygnusAccountRepository) ExistsCygnusID(ctx context.Context, cygnusID string) (bool, error) {
	var count int
	err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM cygnus_accounts WHERE cygnus_id = ?`, cygnusID)
	return count > 0, err
}

func (r *CygnusAccountRepository) UpdatePassword(ctx context.Context, accountID uint64, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE cygnus_accounts SET password_hash = ? WHERE id = ?`, passwordHash, accountID)
	return err
}

// ─────────────────────────────────────────────────────────────

type SalonMembershipRepository struct{ db *sqlx.DB }

func NewSalonMembershipRepository(db *sqlx.DB) *SalonMembershipRepository {
	return &SalonMembershipRepository{db: db}
}

func (r *SalonMembershipRepository) Create(ctx context.Context, m *model.SalonMembership) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO salon_memberships (cygnus_account_id, salon_id, store_id, role, is_active)
		 VALUES (?, ?, ?, ?, ?)`,
		m.CygnusAccountID, m.SalonID, m.StoreID, m.Role, m.IsActive)
	if err != nil {
		return fmt.Errorf("SalonMembershipRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	m.ID = uint64(id)
	return nil
}

func (r *SalonMembershipRepository) FindByAccountAndSalon(ctx context.Context, accountID, salonID uint64) (*model.SalonMembership, error) {
	var m model.SalonMembership
	err := r.db.GetContext(ctx, &m,
		`SELECT * FROM salon_memberships WHERE cygnus_account_id = ? AND salon_id = ?`,
		accountID, salonID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	return &m, nil
}
