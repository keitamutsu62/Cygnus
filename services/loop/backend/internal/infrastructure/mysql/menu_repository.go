package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type MenuRepository struct{ db *sqlx.DB }

func NewMenuRepository(db *sqlx.DB) *MenuRepository { return &MenuRepository{db: db} }

func (r *MenuRepository) Create(ctx context.Context, m *model.Menu) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO menus (salon_id, name, price, duration) VALUES (?, ?, ?, ?)`,
		m.SalonID, m.Name, m.Price, m.Duration)
	if err != nil {
		return fmt.Errorf("MenuRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	m.ID = uint64(id)
	return nil
}

func (r *MenuRepository) FindByID(ctx context.Context, id uint64) (*model.Menu, error) {
	var m model.Menu
	if err := r.db.GetContext(ctx, &m, `SELECT * FROM menus WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &m, nil
}

func (r *MenuRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Menu, error) {
	var list []*model.Menu
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM menus WHERE salon_id = ? ORDER BY id ASC`, salonID)
	if err != nil {
		return nil, fmt.Errorf("MenuRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *MenuRepository) Update(ctx context.Context, m *model.Menu) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE menus SET name=?, price=?, duration=?, is_active=? WHERE id=? AND salon_id=?`,
		m.Name, m.Price, m.Duration, m.IsActive, m.ID, m.SalonID)
	return err
}

func (r *MenuRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM menus WHERE id = ?`, id)
	return err
}
