package usecase

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/pdf"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

// OrderPDFUploader はPDFをアップロードしてPresigned URLを返すインターフェース。
type OrderPDFUploader interface {
	Upload(ctx context.Context, key string, pdfBytes []byte) (string, error)
}

// OrderEmailSender はメールを送信するインターフェース。
type OrderEmailSender interface {
	SendOrderEmail(ctx context.Context, to, subject, bodyText string, pdfBytes []byte, fileName string) error
}

type DealerUsecase struct {
	dealerRepo  repository.DealerRepository
	orderRepo   repository.OrderRepository
	pdfUploader OrderPDFUploader  // nilの場合はS3未設定
	emailSender OrderEmailSender  // nilの場合はSES未設定
}

func NewDealerUsecase(
	dealerRepo repository.DealerRepository,
	orderRepo repository.OrderRepository,
	uploader OrderPDFUploader,
	sender OrderEmailSender,
) *DealerUsecase {
	return &DealerUsecase{
		dealerRepo:  dealerRepo,
		orderRepo:   orderRepo,
		pdfUploader: uploader,
		emailSender: sender,
	}
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
func (u *DealerUsecase) UpdateOrderStatus(ctx context.Context, id uint64, status model.OrderStatus) error {
	return u.orderRepo.UpdateStatus(ctx, id, status)
}

// UpdateOrderItem は pending 注文の品目数量を更新する。
func (u *DealerUsecase) UpdateOrderItem(ctx context.Context, orderID, materialID uint64, quantity uint32) error {
	order, err := u.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		return err
	}
	if order.Status != model.OrderStatusPending {
		return fmt.Errorf("order is not pending")
	}
	return u.orderRepo.UpdateItemQuantity(ctx, orderID, materialID, quantity)
}

// DeleteOrderItem は pending 注文の品目を削除する。品目がゼロになった場合は注文ごと削除する。
func (u *DealerUsecase) DeleteOrderItem(ctx context.Context, orderID, materialID uint64) (orderDeleted bool, err error) {
	order, err := u.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		return false, err
	}
	if order.Status != model.OrderStatusPending {
		return false, fmt.Errorf("order is not pending")
	}
	if err := u.orderRepo.DeleteItem(ctx, orderID, materialID); err != nil {
		return false, err
	}
	remaining, err := u.orderRepo.FindItems(ctx, orderID)
	if err != nil {
		return false, err
	}
	if len(remaining) == 0 {
		return true, u.orderRepo.Delete(ctx, orderID)
	}
	return false, nil
}

type OrderHistoryItemEntry struct {
	MaterialID    uint64  `json:"material_id"`
	MaterialName  string  `json:"material_name"`
	JanCode       *string `json:"jan_code"`
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

// SendOrderResult は発注送信の結果を返す。
type SendOrderResult struct {
	Method  string // "email" | "LINE"
	LineURL string // LINE の場合のみ
	PDFURL  string // Presigned URL（LINE / S3未設定時のフォールバック）
}

// SendOrder は発注書PDFを生成してディーラーに送信する。
// S3未設定の場合は空のPDFURLを返す。SES未設定でemailの場合もPDFURLだけ返す。
func (u *DealerUsecase) SendOrder(ctx context.Context, orderID uint64, salonName string) (*SendOrderResult, error) {
	order, items, err := u.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	dealer, err := u.dealerRepo.FindByID(ctx, order.DealerID)
	if err != nil {
		return nil, fmt.Errorf("SendOrder dealer: %w", err)
	}

	// ─── PDF生成 ─────────────────────────────────────────────────
	// GetOrder が返す items は *model.OrderItem。材料名付きの ItemWithMaterial を使う。
	rawItems, _ := u.orderRepo.FindItemsForOrders(ctx, []uint64{orderID})
	pdfItems := make([]pdf.OrderPDFItem, len(rawItems))
	for i, it := range rawItems {
		pdfItems[i] = pdf.OrderPDFItem{
			Name:          it.MaterialName,
			JanCode:       it.JanCode,
			Quantity:      it.Quantity,
			Unit:          it.Unit,
			EstimatedCost: it.EstimatedCost,
		}
	}
	_ = items

	pdfData := pdf.OrderPDFData{
		OrderNumber:        fmt.Sprintf("%d-%04d", order.CreatedAt.Year(), order.ID),
		Date:               order.CreatedAt,
		DealerName:         dealer.Name,
		SalonName:          salonName,
		IsNextMonthInvoice: order.IsNextMonthInvoice,
		Items:              pdfItems,
	}
	pdfBytes, err := pdf.GenerateOrderPDF(pdfData)
	if err != nil {
		return nil, fmt.Errorf("SendOrder pdf: %w", err)
	}

	fileName := fmt.Sprintf("order_%d_%s.pdf", order.ID, order.CreatedAt.Format("20060102"))

	// ─── S3アップロード ──────────────────────────────────────────
	var presignedURL string
	if u.pdfUploader != nil {
		key := fmt.Sprintf("orders/%d/%s", order.SalonID, fileName)
		presignedURL, err = u.pdfUploader.Upload(ctx, key, pdfBytes)
		if err != nil {
			return nil, fmt.Errorf("SendOrder upload: %w", err)
		}
	}

	// ─── ステータス更新 ──────────────────────────────────────────
	if err := u.orderRepo.UpdateStatus(ctx, orderID, model.OrderStatusSent); err != nil {
		return nil, fmt.Errorf("SendOrder status: %w", err)
	}

	result := &SendOrderResult{PDFURL: presignedURL}

	switch dealer.ContactMethod {
	case model.ContactMethodEmail:
		result.Method = "email"
		if u.emailSender != nil && dealer.ContactInfo != "" {
			subject := fmt.Sprintf("【発注書】%s より", salonName)
			body := fmt.Sprintf("いつもお世話になっております。\n%s より発注書をお送りします。\n\n添付のPDFをご確認ください。\n\n%s", salonName, salonName)
			if err := u.emailSender.SendOrderEmail(ctx, dealer.ContactInfo, subject, body, pdfBytes, fileName); err != nil {
				// メール送信失敗はログに記録するがエラーは返さない（PDFは生成済み）
				return result, nil
			}
		}

	case model.ContactMethodLINE:
		result.Method = "LINE"
		if presignedURL != "" {
			msg := fmt.Sprintf("【発注書】\n%s よりご発注いただきました。\n発注書PDF: %s", salonName, presignedURL)
			result.LineURL = "https://line.me/R/msg/text/?" + url.QueryEscape(msg)
		} else {
			result.LineURL = ""
		}
	}

	return result, nil
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
			JanCode:       it.JanCode,
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
