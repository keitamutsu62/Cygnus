package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StaffRepository struct{ db *sqlx.DB }

func NewStaffRepository(db *sqlx.DB) *StaffRepository { return &StaffRepository{db: db} }

func (r *StaffRepository) Create(ctx context.Context, s *model.Staff) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO staffs (salon_id, store_id, name, email, password_hash, role, avatar_initials)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		s.SalonID, s.StoreID, s.Name, s.Email, s.PasswordHash, s.Role, s.AvatarInitials)
	if err != nil {
		return fmt.Errorf("StaffRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	s.ID = uint64(id)
	return nil
}

func (r *StaffRepository) FindByID(ctx context.Context, id uint64) (*model.Staff, error) {
	var s model.Staff
	if err := r.db.GetContext(ctx, &s, `
		SELECT s.*, p.avatar_url
		FROM staffs s
		LEFT JOIN profiles p ON s.cygnus_account_id = p.cygnus_account_id
		WHERE s.id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &s, nil
}

func (r *StaffRepository) FindByEmail(ctx context.Context, email string) (*model.Staff, error) {
	var s model.Staff
	if err := r.db.GetContext(ctx, &s, `SELECT * FROM staffs WHERE email = ?`, email); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &s, nil
}

func (r *StaffRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Staff, error) {
	var list []*model.Staff
	if err := r.db.SelectContext(ctx, &list, `
		SELECT s.*, p.avatar_url
		FROM staffs s
		LEFT JOIN profiles p ON s.cygnus_account_id = p.cygnus_account_id
		WHERE s.salon_id = ?`, salonID); err != nil {
		return nil, fmt.Errorf("StaffRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *StaffRepository) CountBySalonID(ctx context.Context, salonID uint64) (int, error) {
	var count int
	if err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM staffs WHERE salon_id = ?`, salonID); err != nil {
		return 0, fmt.Errorf("StaffRepository.CountBySalonID: %w", err)
	}
	return count, nil
}

func (r *StaffRepository) Update(ctx context.Context, s *model.Staff) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE staffs SET name=?, role=?, is_active=?, avatar_initials=?, store_id=?, shimei_charge=? WHERE id=?`,
		s.Name, s.Role, s.IsActive, s.AvatarInitials, s.StoreID, s.ShimeiCharge, s.ID)
	return err
}

func (r *StaffRepository) UpdatePassword(ctx context.Context, staffID uint64, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE staffs SET password_hash = ? WHERE id = ?`, passwordHash, staffID)
	return err
}

func (r *StaffRepository) LinkCygnusAccount(ctx context.Context, staffID, cygnusAccountID uint64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE staffs SET cygnus_account_id = ? WHERE id = ?`,
		cygnusAccountID, staffID)
	return err
}

type InvitationRepository struct{ db *sqlx.DB }

func NewInvitationRepository(db *sqlx.DB) *InvitationRepository {
	return &InvitationRepository{db: db}
}

func (r *InvitationRepository) Create(ctx context.Context, inv *model.Invitation) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO invitations (salon_id, invited_by_staff_id, email, token, role, status, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		inv.SalonID, inv.InvitedByStaffID, inv.Email, inv.Token, inv.Role, inv.Status, inv.ExpiresAt)
	if err != nil {
		return fmt.Errorf("InvitationRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	inv.ID = uint64(id)
	return nil
}

func (r *InvitationRepository) FindByToken(ctx context.Context, token string) (*model.Invitation, error) {
	var inv model.Invitation
	if err := r.db.GetContext(ctx, &inv, `SELECT * FROM invitations WHERE token = ?`, token); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &inv, nil
}

func (r *InvitationRepository) UpdateStatus(ctx context.Context, id uint64, status model.InvitationStatus) error {
	_, err := r.db.ExecContext(ctx, `UPDATE invitations SET status = ? WHERE id = ?`, status, id)
	return err
}
