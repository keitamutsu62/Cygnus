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
		ContactInfo   string              `json:"contact_info"`
	}
	if err := c.Bind(&req); err != nil || req.Name == "" || req.ContactInfo == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name, contact_method, contact_info are required")
	}
	d, err := h.uc.CreateDealer(c.Request().Context(), claims.SalonID, req.Name, req.ContactMethod, req.ContactInfo)
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
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	d, err := h.uc.UpdateDealer(c.Request().Context(), id, claims.SalonID, req.Name, req.ContactMethod, req.ContactInfo, req.Status)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, d)
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

// PATCH /api/v1/orders/:id/status
// "sent" に変更したタイミングが LINE/email 発注通知の外部連携トリガー
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
