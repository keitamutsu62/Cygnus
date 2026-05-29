package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type DealerUsecase struct {
	dealerRepo repository.DealerRepository
	orderRepo  repository.OrderRepository
}

func NewDealerUsecase(dealerRepo repository.DealerRepository, orderRepo repository.OrderRepository) *DealerUsecase {
	return &DealerUsecase{dealerRepo: dealerRepo, orderRepo: orderRepo}
}

// ─── Dealer ──────────────────────────────────────────────────

func (u *DealerUsecase) ListDealers(ctx context.Context, salonID uint64) ([]*model.Dealer, error) {
	return u.dealerRepo.FindBySalonID(ctx, salonID)
}

func (u *DealerUsecase) CreateDealer(ctx context.Context, salonID uint64, name string, method model.ContactMethod, info string) (*model.Dealer, error) {
	d := &model.Dealer{
		SalonID:       salonID,
		Name:          name,
		ContactMethod: method,
		ContactInfo:   info,
		Status:        model.DealerStatusActive,
	}
	if err := u.dealerRepo.Create(ctx, d); err != nil {
		return nil, fmt.Errorf("CreateDealer: %w", err)
	}
	return d, nil
}

func (u *DealerUsecase) UpdateDealer(ctx context.Context, id, salonID uint64, name string, method model.ContactMethod, info string, status model.DealerStatus) (*model.Dealer, error) {
	d, err := u.dealerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if d.SalonID != salonID {
		return nil, apierror.ErrForbidden
	}
	d.Name = name
	d.ContactMethod = method
	d.ContactInfo = info
	d.Status = status
	if err := u.dealerRepo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("UpdateDealer: %w", err)
	}
	return d, nil
}

// ─── Order ───────────────────────────────────────────────────

type CreateOrderInput struct {
	SalonID            uint64
	StoreID            uint64
	DealerID           uint64
	IsNextMonthInvoice bool
	Items              []OrderItemInput
}

type OrderItemInput struct {
	MaterialID    uint64
	Quantity      uint32
	Unit          string
	EstimatedCost *uint32
}

func (u *DealerUsecase) CreateOrder(ctx context.Context, in CreateOrderInput) (*model.Order, error) {
	o := &model.Order{
		SalonID:            in.SalonID,
		StoreID:            in.StoreID,
		DealerID:           in.DealerID,
		Status:             model.OrderStatusPending,
		IsNextMonthInvoice: in.IsNextMonthInvoice,
	}
	if err := u.orderRepo.Create(ctx, o); err != nil {
		return nil, fmt.Errorf("CreateOrder: %w", err)
	}

	items := make([]*model.OrderItem, len(in.Items))
	for i, it := range in.Items {
		items[i] = &model.OrderItem{
			OrderID:       o.ID,
			MaterialID:    it.MaterialID,
			Quantity:      it.Quantity,
			Unit:          it.Unit,
			EstimatedCost: it.EstimatedCost,
		}
	}
	if err := u.orderRepo.AddItems(ctx, items); err != nil {
		return nil, fmt.Errorf("CreateOrder items: %w", err)
	}
	return o, nil
}

func (u *DealerUsecase) ListOrders(ctx context.Context, salonID uint64) ([]*model.Order, error) {
	return u.orderRepo.FindBySalonID(ctx, salonID)
}

func (u *DealerUsecase) GetOrder(ctx context.Context, id uint64) (*model.Order, []*model.OrderItem, error) {
	o, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, nil, apierror.ErrNotFound
	}
	items, _ := u.orderRepo.FindItems(ctx, id)
	return o, items, nil
}

// UpdateOrderStatus は発注ステータスを更新する。
// "sent" に変更した場合が LINE/email 通知の外部連携トリガーになる。
func (u *DealerUsecase) UpdateOrderStatus(ctx context.Context, id uint64, status model.OrderStatus) error {
	return u.orderRepo.UpdateStatus(ctx, id, status)
}
