package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type StylistHandler struct {
	uc *usecase.StylistUsecase
}

func NewStylistHandler(uc *usecase.StylistUsecase) *StylistHandler {
	return &StylistHandler{uc: uc}
}

// GET /api/v1/stylists/:cygnus_id
func (h *StylistHandler) GetProfile(c echo.Context) error {
	cygnusID := c.Param("cygnus_id")
	profile, err := h.uc.GetPublicProfile(c.Request().Context(), cygnusID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "stylist not found")
	}
	return c.JSON(http.StatusOK, profile)
}

// GET /api/v1/stylists/:cygnus_id/slots?date=2026-06-01&duration=60&account_id=123
func (h *StylistHandler) GetSlots(c echo.Context) error {
	cygnusID := c.Param("cygnus_id")
	_ = cygnusID

	accountID, err := strconv.ParseUint(c.QueryParam("account_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "account_id is required")
	}

	dateStr := c.QueryParam("date")
	date, err := time.ParseInLocation("2006-01-02", dateStr, time.Local)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "date must be YYYY-MM-DD")
	}

	duration, _ := strconv.Atoi(c.QueryParam("duration"))
	if duration <= 0 {
		duration = 60
	}

	slots, err := h.uc.GetAvailableSlots(c.Request().Context(), cygnusID, accountID, date, duration)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, slots)
}
