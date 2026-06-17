package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type DealerHandler struct {
	uc *usecase.DealerUsecase
}

func NewDealerHandler(uc *usecase.DealerUsecase) *DealerHandler { return &DealerHandler{uc: uc} }

// GET /api/v1/dealers
func (h *DealerHandler) ListDealers(c echo.Context) error {
	claims := claimsFrom(c)
	list, err := h.uc.ListDealers(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/dealers
func (h *DealerHandler) CreateDealer(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		Name          string              `json:"name"`
		ContactMethod model.ContactMethod `json:"contact_method"`
		ContactInfo   string             `json:"contact_info"`
		ClosingDay    *uint8              `json:"closing_day"`
	}
	if err := c.Bind(&req); err != nil || req.Name == "" || req.ContactInfo == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name, contact_method, contact_info are required")
	}
	if req.ClosingDay != nil && (*req.ClosingDay < 1 || *req.ClosingDay > 28) {
		return echo.NewHTTPError(http.StatusBadRequest, "closing_day must be 1-28")
	}
	d, err := h.uc.CreateDealer(c.Request().Context(), claims.SalonID, req.Name, req.ContactMethod, req.ContactInfo, req.ClosingDay)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, d)
}

// PATCH /api/v1/dealers/:id
func (h *DealerHandler) UpdateDealer(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Name          string              `json:"name"`
		ContactMethod model.ContactMethod `json:"contact_method"`
		ContactInfo   string              `json:"contact_info"`
		Status        model.DealerStatus  `json:"status"`
		ClosingDay    *uint8              `json:"closing_day"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.ClosingDay != nil && (*req.ClosingDay < 1 || *req.ClosingDay > 28) {
		return echo.NewHTTPError(http.StatusBadRequest, "closing_day must be 1-28")
	}
	d, err := h.uc.UpdateDealer(c.Request().Context(), id, claims.SalonID, req.Name, req.ContactMethod, req.ContactInfo, req.Status, req.ClosingDay)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, d)
}

// DELETE /api/v1/dealers/:id
func (h *DealerHandler) DeleteDealer(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.DeleteDealer(c.Request().Context(), id, claims.SalonID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/orders/history
func (h *DealerHandler) ListOrdersHistory(c echo.Context) error {
	claims := claimsFrom(c)
	entries, err := h.uc.ListOrdersHistory(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, entries)
}

// GET /api/v1/orders
func (h *DealerHandler) ListOrders(c echo.Context) error {
	claims := claimsFrom(c)
	list, err := h.uc.ListOrders(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/orders
func (h *DealerHandler) CreateOrder(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		StoreID            uint64                  `json:"store_id"`
		DealerID           uint64                  `json:"dealer_id"`
		IsNextMonthInvoice bool                    `json:"is_next_month_invoice"`
		Items              []usecase.OrderItemInput `json:"items"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.StoreID == 0 || req.DealerID == 0 || len(req.Items) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "store_id, dealer_id, items are required")
	}
	o, err := h.uc.CreateOrder(c.Request().Context(), usecase.CreateOrderInput{
		SalonID:            claims.SalonID,
		StoreID:            req.StoreID,
		DealerID:           req.DealerID,
		IsNextMonthInvoice: req.IsNextMonthInvoice,
		Items:              req.Items,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, o)
}

// GET /api/v1/orders/:id
func (h *DealerHandler) GetOrder(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	o, items, err := h.uc.GetOrder(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "order not found")
	}
	return c.JSON(http.StatusOK, map[string]any{"order": o, "items": items})
}

// POST /api/v1/orders/:id/send
// PDF生成 → S3アップロード → SESメール or LINE URL を返す
func (h *DealerHandler) SendOrder(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	result, err := h.uc.SendOrder(c.Request().Context(), id, claims.SalonName)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to send order")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"method":   result.Method,
		"line_url": result.LineURL,
		"pdf_url":  result.PDFURL,
	})
}

// POST /api/v1/orders/send-group
func (h *DealerHandler) SendOrderGroup(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		OrderIDs []uint64 `json:"order_ids"`
	}
	if err := c.Bind(&req); err != nil || len(req.OrderIDs) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "order_ids required")
	}
	result, err := h.uc.SendOrderGroup(c.Request().Context(), req.OrderIDs, claims.SalonName)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to send orders")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"method":   result.Method,
		"line_url": result.LineURL,
		"pdf_url":  result.PDFURL,
	})
}

// PATCH /api/v1/orders/:id/items/:material_id
func (h *DealerHandler) UpdateOrderItem(c echo.Context) error {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	materialID, err := strconv.ParseUint(c.Param("material_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid material_id")
	}
	var req struct {
		Quantity uint32 `json:"quantity"`
	}
	if err := c.Bind(&req); err != nil || req.Quantity == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "quantity must be >= 1")
	}
	if err := h.uc.UpdateOrderItem(c.Request().Context(), orderID, materialID, req.Quantity); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update item")
	}
	return c.NoContent(http.StatusNoContent)
}

// DELETE /api/v1/orders/:id/items/:material_id
func (h *DealerHandler) DeleteOrderItem(c echo.Context) error {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	materialID, err := strconv.ParseUint(c.Param("material_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid material_id")
	}
	orderDeleted, err := h.uc.DeleteOrderItem(c.Request().Context(), orderID, materialID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete item")
	}
	return c.JSON(http.StatusOK, map[string]any{"order_deleted": orderDeleted})
}

// PATCH /api/v1/orders/:id/status
func (h *DealerHandler) UpdateOrderStatus(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Status model.OrderStatus `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if err := h.uc.UpdateOrderStatus(c.Request().Context(), id, req.Status); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
