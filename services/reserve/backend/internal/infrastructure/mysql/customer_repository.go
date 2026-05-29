package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
)

type CustomerRepository struct{ db *sqlx.DB }

func NewCustomerRepository(db *sqlx.DB) *CustomerRepository { return &CustomerRepository{db: db} }

func (r *CustomerRepository) Create(ctx context.Context, c *model.Customer) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO cygnus_customers (cygnus_customer_id, line_user_id, display_name, profile_image_url)
		 VALUES (?, ?, ?, ?)`,
		c.CygnusCustomerID, c.LineUserID, c.DisplayName, c.ProfileImageURL)
	if err != nil {
		return fmt.Errorf("CustomerRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	c.ID = uint64(id)
	return nil
}

func (r *CustomerRepository) FindByID(ctx context.Context, id uint64) (*model.Customer, error) {
	var c model.Customer
	if err := r.db.GetContext(ctx, &c, `SELECT * FROM cygnus_customers WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &c, nil
}

func (r *CustomerRepository) FindByLineUserID(ctx context.Context, lineUserID string) (*model.Customer, error) {
	var c model.Customer
	if err := r.db.GetContext(ctx, &c, `SELECT * FROM cygnus_customers WHERE line_user_id = ?`, lineUserID); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &c, nil
}

func (r *CustomerRepository) ExistsCygnusCustomerID(ctx context.Context, id string) (bool, error) {
	var count int
	err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM cygnus_customers WHERE cygnus_customer_id = ?`, id)
	return count > 0, err
}
