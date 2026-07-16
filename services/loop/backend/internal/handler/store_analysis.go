package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type StoreAnalysisHandler struct {
	uc *usecase.StoreAnalysisUsecase
}

func NewStoreAnalysisHandler(uc *usecase.StoreAnalysisUsecase) *StoreAnalysisHandler {
	return &StoreAnalysisHandler{uc: uc}
}

// GET /api/v1/stores/:id/analysis
func (h *StoreAnalysisHandler) Get(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	a, err := h.uc.Get(c.Request().Context(), claims.SalonID, id)
	if err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return c.NoContent(http.StatusNoContent)
		}
		return c.NoContent(http.StatusNoContent)
	}
	return c.JSON(http.StatusOK, a)
}

// POST /api/v1/stores/:id/analysis
func (h *StoreAnalysisHandler) Generate(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	a, err := h.uc.Generate(c.Request().Context(), claims.SalonID, id)
	if err != nil {
		log.Printf("[store.analysis.generate] salon_id=%d store_id=%d err=%v", claims.SalonID, id, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "analysis failed")
	}
	return c.JSON(http.StatusOK, a)
}
