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
	closingDay, err := h.salonRepo.GetClosingDay(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"shimei_charge": charge,
		"closing_day":   closingDay,
	})
}

// PATCH /api/v1/settings
func (h *SettingsHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.Role != "owner" && claims.Role != "admin" {
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	}
	var req struct {
		ShimeiCharge *uint32 `json:"shimei_charge"`
		ClosingDay   *uint8  `json:"closing_day"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	ctx := c.Request().Context()
	if req.ShimeiCharge != nil {
		if err := h.salonRepo.UpdateShimeiCharge(ctx, claims.SalonID, *req.ShimeiCharge); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed")
		}
	}
	if req.ClosingDay != nil {
		if *req.ClosingDay < 1 || *req.ClosingDay > 28 {
			return echo.NewHTTPError(http.StatusBadRequest, "closing_day must be 1-28")
		}
		if err := h.salonRepo.UpdateClosingDay(ctx, claims.SalonID, *req.ClosingDay); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed")
		}
	}
	// 更新後の値を返す
	charge, _ := h.salonRepo.GetShimeiCharge(ctx, claims.SalonID)
	day, _ := h.salonRepo.GetClosingDay(ctx, claims.SalonID)
	return c.JSON(http.StatusOK, map[string]any{
		"shimei_charge": charge,
		"closing_day":   day,
	})
}
