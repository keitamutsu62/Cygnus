package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type CustomerRepository struct{ db *sqlx.DB }

func NewCustomerRepository(db *sqlx.DB) *CustomerRepository { return &CustomerRepository{db: db} }

func (r *CustomerRepository) Create(ctx context.Context, c *model.Customer) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO customers (salon_id, name, phone, ex_line_id) VALUES (?, ?, ?, ?)`,
		c.SalonID, c.Name, c.Phone, c.ExLineID)
	if err != nil {
		return fmt.Errorf("CustomerRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	c.ID = uint64(id)
	return nil
}

func (r *CustomerRepository) FindByID(ctx context.Context, id uint64) (*model.Customer, error) {
	var c model.Customer
	if err := r.db.GetContext(ctx, &c, `SELECT * FROM customers WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &c, nil
}

func (r *CustomerRepository) FindBySalonID(ctx context.Context, salonID uint64, q string) ([]*model.Customer, error) {
	var list []*model.Customer
	var err error
	if q != "" {
		err = r.db.SelectContext(ctx, &list,
			`SELECT * FROM customers WHERE salon_id = ? AND name LIKE ? ORDER BY name ASC`,
			salonID, "%"+q+"%")
	} else {
		err = r.db.SelectContext(ctx, &list,
			`SELECT * FROM customers WHERE salon_id = ? ORDER BY name ASC`, salonID)
	}
	if err != nil {
		return nil, fmt.Errorf("CustomerRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *CustomerRepository) Update(ctx context.Context, c *model.Customer) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE customers SET name=?, phone=?, ex_line_id=? WHERE id=? AND salon_id=?`,
		c.Name, c.Phone, c.ExLineID, c.ID, c.SalonID)
	return err
}

func (r *CustomerRepository) Delete(ctx context.Context, id uint64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM customers WHERE id = ?`, id)
	return err
}
