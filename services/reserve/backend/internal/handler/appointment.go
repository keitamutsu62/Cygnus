package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/middleware"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type AppointmentHandler struct {
	uc *usecase.AppointmentUsecase
}

func NewAppointmentHandler(uc *usecase.AppointmentUsecase) *AppointmentHandler {
	return &AppointmentHandler{uc: uc}
}

// POST /api/v1/appointments
func (h *AppointmentHandler) Create(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)

	var req struct {
		StylistAccountID uint64  `json:"stylist_account_id"`
		SalonID          uint64  `json:"salon_id"`
		StoreID          *uint64 `json:"store_id"`
		MenuID           *uint64 `json:"menu_id"`
		MenuName         string  `json:"menu_name"`
		Price            uint32  `json:"price"`
		DurationMinutes  *uint16 `json:"duration_minutes"`
		StartAt          string  `json:"start_at"` // RFC3339
		Notes            *string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.StylistAccountID == 0 || req.SalonID == 0 || req.MenuName == "" || req.StartAt == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "stylist_account_id, salon_id, menu_name, start_at are required")
	}

	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "start_at must be RFC3339")
	}

	a, err := h.uc.Create(c.Request().Context(), usecase.CreateAppointmentInput{
		CustomerID:       claims.CustomerID,
		StylistAccountID: req.StylistAccountID,
		SalonID:          req.SalonID,
		StoreID:          req.StoreID,
		MenuID:           req.MenuID,
		MenuName:         req.MenuName,
		Price:            req.Price,
		DurationMinutes:  req.DurationMinutes,
		StartAt:          startAt,
		Notes:            req.Notes,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, a)
}

// GET /api/v1/appointments
func (h *AppointmentHandler) List(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	list, err := h.uc.ListMyAppointments(c.Request().Context(), claims.CustomerID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// DELETE /api/v1/appointments/:id
func (h *AppointmentHandler) Cancel(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}

	var req struct {
		Reason *string `json:"reason"`
	}
	_ = c.Bind(&req)

	if err := h.uc.Cancel(c.Request().Context(), id, claims.CustomerID, req.Reason); err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "appointment not found")
		}
		if errors.Is(err, apierror.ErrForbidden) {
			return echo.NewHTTPError(http.StatusForbidden, "forbidden")
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
