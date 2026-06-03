package handler

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"github.com/labstack/echo/v4"
)

type SettingsHandler struct {
	salonRepo *mysql.SalonRepository
}

func NewSettingsHandler(salonRepo *mysql.SalonRepository) *SettingsHandler {
	return &SettingsHandler{salonRepo: salonRepo}
}

// GET /api/v1/settings
func (h *SettingsHandler) Get(c echo.Context) error {
	claims := claimsFrom(c)
	charge, err := h.salonRepo.GetShimeiCharge(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]any{"shimei_charge": charge})
}

// PATCH /api/v1/settings
func (h *SettingsHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.Role != "owner" && claims.Role != "admin" {
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	}
	var req struct {
		ShimeiCharge uint32 `json:"shimei_charge"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if err := h.salonRepo.UpdateShimeiCharge(c.Request().Context(), claims.SalonID, req.ShimeiCharge); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]any{"shimei_charge": req.ShimeiCharge})
}
