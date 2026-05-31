package mysql

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

// ─── DealerRepository ────────────────────────────────────────

type DealerRepository struct{ db *sqlx.DB }

func NewDealerRepository(db *sqlx.DB) *DealerRepository { return &DealerRepository{db: db} }

func (r *DealerRepository) Create(ctx context.Context, d *model.Dealer) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO dealers (salon_id, name, contact_method, contact_info, status)
		 VALUES (?, ?, ?, ?, ?)`,
		d.SalonID, d.Name, d.ContactMethod, d.ContactInfo, d.Status)
	if err != nil {
		return fmt.Errorf("DealerRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	d.ID = uint64(id)
	return nil
}

func (r *DealerRepository) FindByID(ctx context.Context, id uint64) (*model.Dealer, error) {
	var d model.Dealer
	if err := r.db.GetContext(ctx, &d, `SELECT * FROM dealers WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &d, nil
}

func (r *DealerRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Dealer, error) {
	var list []*model.Dealer
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM dealers WHERE salon_id = ? ORDER BY name ASC`, salonID)
	if err != nil {
		return nil, fmt.Errorf("DealerRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *DealerRepository) Update(ctx context.Context, d *model.Dealer) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE dealers SET name=?, contact_method=?, contact_info=?, status=? WHERE id=? AND salon_id=?`,
		d.Name, d.ContactMethod, d.ContactInfo, d.Status, d.ID, d.SalonID)
	return err
}

// ─── OrderRepository ─────────────────────────────────────────

type OrderRepository struct{ db *sqlx.DB }

func NewOrderRepository(db *sqlx.DB) *OrderRepository { return &OrderRepository{db: db} }

func (r *OrderRepository) Create(ctx context.Context, o *model.Order) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO orders (salon_id, store_id, dealer_id, status, is_next_month_invoice)
		 VALUES (?, ?, ?, ?, ?)`,
		o.SalonID, o.StoreID, o.DealerID, o.Status, o.IsNextMonthInvoice)
	if err != nil {
		return fmt.Errorf("OrderRepository.Create: %w", err)
	}
	id, _ := res.LastInsertId()
	o.ID = uint64(id)
	return nil
}

func (r *OrderRepository) FindByID(ctx context.Context, id uint64) (*model.Order, error) {
	var o model.Order
	if err := r.db.GetContext(ctx, &o, `SELECT * FROM orders WHERE id = ?`, id); err != nil {
		return nil, apierror.ErrNotFound
	}
	return &o, nil
}

func (r *OrderRepository) FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Order, error) {
	var list []*model.Order
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM orders WHERE salon_id = ? ORDER BY created_at DESC`, salonID)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.FindBySalonID: %w", err)
	}
	return list, nil
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, id uint64, status model.OrderStatus) error {
	_, err := r.db.ExecContext(ctx, `UPDATE orders SET status=? WHERE id=?`, status, id)
	return err
}

func (r *OrderRepository) AddItems(ctx context.Context, items []*model.OrderItem) error {
	for _, item := range items {
		res, err := r.db.ExecContext(ctx,
			`INSERT INTO order_items (order_id, material_id, quantity, unit, estimated_cost)
			 VALUES (?, ?, ?, ?, ?)`,
			item.OrderID, item.MaterialID, item.Quantity, item.Unit, item.EstimatedCost)
		if err != nil {
			return fmt.Errorf("OrderRepository.AddItems: %w", err)
		}
		id, _ := res.LastInsertId()
		item.ID = uint64(id)
	}
	return nil
}

func (r *OrderRepository) FindItems(ctx context.Context, orderID uint64) ([]*model.OrderItem, error) {
	var list []*model.OrderItem
	err := r.db.SelectContext(ctx, &list,
		`SELECT * FROM order_items WHERE order_id = ?`, orderID)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.FindItems: %w", err)
	}
	return list, nil
}

func (r *OrderRepository) FindItemsForOrders(ctx context.Context, orderIDs []uint64) ([]*model.ItemWithMaterial, error) {
	if len(orderIDs) == 0 {
		return nil, nil
	}
	query, args, err := sqlx.In(`
		SELECT oi.order_id, m.name AS material_name, oi.quantity, oi.unit, oi.estimated_cost
		FROM order_items oi
		JOIN materials m ON m.id = oi.material_id
		WHERE oi.order_id IN (?)
		ORDER BY oi.id ASC`, orderIDs)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.FindItemsForOrders: %w", err)
	}
	var list []*model.ItemWithMaterial
	err = r.db.SelectContext(ctx, &list, r.db.Rebind(query), args...)
	if err != nil {
		return nil, fmt.Errorf("OrderRepository.FindItemsForOrders: %w", err)
	}
	return list, nil
}
