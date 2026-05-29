package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type AppointmentHandler struct {
	uc *usecase.AppointmentUsecase
}

func NewAppointmentHandler(uc *usecase.AppointmentUsecase) *AppointmentHandler {
	return &AppointmentHandler{uc: uc}
}

// GET /api/v1/appointments?scope=mine
// scope=mine  → 自分宛ての予約（cygnus_account_id 一致）
// scope=salon → サロン全体（オーナー・管理者向け）
func (h *AppointmentHandler) List(c echo.Context) error {
	claims := claimsFrom(c)

	scope := c.QueryParam("scope")
	var list any
	var err error

	if scope == "mine" {
		if claims.CygnusAccountID == nil {
			return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
		}
		list, err = h.uc.ListMine(c.Request().Context(), *claims.CygnusAccountID)
	} else {
		list, err = h.uc.ListBySalon(c.Request().Context(), claims.SalonID)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// PATCH /api/v1/appointments/:id/complete
func (h *AppointmentHandler) Complete(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.Complete(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
