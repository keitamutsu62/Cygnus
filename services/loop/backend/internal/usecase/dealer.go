package usecase

import (
	"context"
	"fmt"
	"time"

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

func (u *DealerUsecase) CreateDealer(ctx context.Context, salonID uint64, name string, method model.ContactMethod, info string, closingDay *uint8) (*model.Dealer, error) {
	d := &model.Dealer{
		SalonID:       salonID,
		Name:          name,
		ContactMethod: method,
		ContactInfo:   info,
		Status:        model.DealerStatusActive,
		ClosingDay:    closingDay,
	}
	if err := u.dealerRepo.Create(ctx, d); err != nil {
		return nil, fmt.Errorf("CreateDealer: %w", err)
	}
	return d, nil
}

func (u *DealerUsecase) UpdateDealer(ctx context.Context, id, salonID uint64, name string, method model.ContactMethod, info string, status model.DealerStatus, closingDay *uint8) (*model.Dealer, error) {
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
	d.ClosingDay = closingDay
	if err := u.dealerRepo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("UpdateDealer: %w", err)
	}
	return d, nil
}

func (u *DealerUsecase) DeleteDealer(ctx context.Context, id, salonID uint64) error {
	d, err := u.dealerRepo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if d.SalonID != salonID {
		return apierror.ErrForbidden
	}
	return u.dealerRepo.Delete(ctx, id)
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
	MaterialID    uint64  `json:"material_id"`
	Quantity      uint32  `json:"quantity"`
	Unit          string  `json:"unit"`
	EstimatedCost *uint32 `json:"estimated_cost,omitempty"`
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

type OrderHistoryItemEntry struct {
	MaterialID    uint64  `json:"material_id"`
	MaterialName  string  `json:"material_name"`
	Quantity      uint32  `json:"quantity"`
	Unit          string  `json:"unit"`
	EstimatedCost *uint32 `json:"estimated_cost"`
}

type OrderHistoryEntry struct {
	ID                 uint64                  `json:"id"`
	StoreID            uint64                  `json:"store_id"`
	Status             model.OrderStatus       `json:"status"`
	IsNextMonthInvoice bool                    `json:"is_next_month_invoice"`
	CreatedAt          time.Time               `json:"created_at"`
	DealerName         string                  `json:"dealer_name"`
	ContactMethod      model.ContactMethod     `json:"contact_method"`
	Items              []OrderHistoryItemEntry `json:"items"`
}

func (u *DealerUsecase) ListOrdersHistory(ctx context.Context, salonID uint64) ([]*OrderHistoryEntry, error) {
	orders, err := u.orderRepo.FindBySalonID(ctx, salonID)
	if err != nil {
		return nil, err
	}

	dealers, err := u.dealerRepo.FindBySalonID(ctx, salonID)
	if err != nil {
		return nil, err
	}
	dealerMap := make(map[uint64]*model.Dealer)
	for _, d := range dealers {
		dealerMap[d.ID] = d
	}

	orderIDs := make([]uint64, len(orders))
	for i, o := range orders {
		orderIDs[i] = o.ID
	}

	rawItems, err := u.orderRepo.FindItemsForOrders(ctx, orderIDs)
	if err != nil {
		return nil, err
	}
	itemsByOrder := make(map[uint64][]OrderHistoryItemEntry)
	for _, it := range rawItems {
		itemsByOrder[it.OrderID] = append(itemsByOrder[it.OrderID], OrderHistoryItemEntry{
			MaterialID:    it.MaterialID,
			MaterialName:  it.MaterialName,
			Quantity:      it.Quantity,
			Unit:          it.Unit,
			EstimatedCost: it.EstimatedCost,
		})
	}

	result := make([]*OrderHistoryEntry, len(orders))
	for i, o := range orders {
		entry := &OrderHistoryEntry{
			ID:                 o.ID,
			StoreID:            o.StoreID,
			Status:             o.Status,
			IsNextMonthInvoice: o.IsNextMonthInvoice,
			CreatedAt:          o.CreatedAt,
			Items:              itemsByOrder[o.ID],
		}
		if d := dealerMap[o.DealerID]; d != nil {
			entry.DealerName = d.Name
			entry.ContactMethod = d.ContactMethod
		}
		result[i] = entry
	}
	return result, nil
}
