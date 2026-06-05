package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type TreatmentHandler struct {
	uc *usecase.TreatmentUsecase
}

func NewTreatmentHandler(uc *usecase.TreatmentUsecase) *TreatmentHandler {
	return &TreatmentHandler{uc: uc}
}

// POST /api/v1/treatments
func (h *TreatmentHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)

	var req struct {
		StaffID         *uint64                  `json:"staff_id"`
		CustomerID      *uint64                  `json:"customer_id"`
		StoreID         *uint64                  `json:"store_id"`
		MenuID          *uint64                  `json:"menu_id"`
		MenuName        string                   `json:"menu_name"`
		Price           uint32                   `json:"price"`
		DurationMinutes *uint16                  `json:"duration_minutes"`
		Source          model.TreatmentSource    `json:"source"`
		IsShimei        bool                     `json:"is_shimei"`
		AppointmentID   *uint64                  `json:"appointment_id"`
		PerformedAt     string                   `json:"performed_at"` // RFC3339
		Notes           *string                  `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.MenuName == "" || req.PerformedAt == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "menu_name, performed_at are required")
	}

	// owner/admin は staff_id を指定可能、それ以外は自分自身
	staffID := claims.StaffID
	if req.StaffID != nil && (claims.Role == "owner" || claims.Role == "admin") {
		staffID = *req.StaffID
	}

	// store_id が省略された場合は JWT のstore_id を使用する
	storeID := req.StoreID
	if storeID == nil && claims.StoreID != nil {
		storeID = claims.StoreID
	}

	t, err := h.uc.Create(c.Request().Context(), usecase.CreateTreatmentInput{
		StaffID:         staffID,
		CustomerID:      req.CustomerID,
		SalonID:         claims.SalonID,
		StoreID:         storeID,
		MenuID:          req.MenuID,
		MenuName:        req.MenuName,
		Price:           req.Price,
		DurationMinutes: req.DurationMinutes,
		Source:          req.Source,
		IsShimei:        req.IsShimei,
		AppointmentID:   req.AppointmentID,
		PerformedAt:     req.PerformedAt,
		Notes:           req.Notes,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, t)
}

// GET /api/v1/treatments?scope=mine&limit=20&offset=0
func (h *TreatmentHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	scope := c.QueryParam("scope")
	var list any
	var err error
	if scope == "mine" {
		list, err = h.uc.ListByStaff(c.Request().Context(), claims.StaffID, limit, offset)
	} else {
		list, err = h.uc.ListBySalon(c.Request().Context(), claims.SalonID, limit, offset)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}
