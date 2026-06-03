package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type DealerRepository interface {
	Create(ctx context.Context, d *model.Dealer) error
	FindByID(ctx context.Context, id uint64) (*model.Dealer, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Dealer, error)
	Update(ctx context.Context, d *model.Dealer) error
	Delete(ctx context.Context, id uint64) error
}

type OrderRepository interface {
	Create(ctx context.Context, o *model.Order) error
	FindByID(ctx context.Context, id uint64) (*model.Order, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Order, error)
	UpdateStatus(ctx context.Context, id uint64, status model.OrderStatus) error
	AddItems(ctx context.Context, items []*model.OrderItem) error
	FindItems(ctx context.Context, orderID uint64) ([]*model.OrderItem, error)
	FindItemsForOrders(ctx context.Context, orderIDs []uint64) ([]*model.ItemWithMaterial, error)
}
