package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type MaterialHandler struct {
	uc *usecase.MaterialUsecase
}

func NewMaterialHandler(uc *usecase.MaterialUsecase) *MaterialHandler {
	return &MaterialHandler{uc: uc}
}

// GET /api/v1/materials
func (h *MaterialHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	list, err := h.uc.List(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/materials
func (h *MaterialHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		Name       string   `json:"name"`
		Brand      *string  `json:"brand"`
		Category   string   `json:"category"`
		SizeAmount *uint32  `json:"size_amount"`
		SizeUnit   *string  `json:"size_unit"`
		StockUnit  string   `json:"stock_unit"`
		Threshold  uint32   `json:"threshold"`
		MenuIDs    []uint64 `json:"menu_ids"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.Name == "" || req.Category == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name and category are required")
	}
	if req.StockUnit == "" {
		req.StockUnit = "本"
	}
	m, err := h.uc.Create(c.Request().Context(), usecase.CreateMaterialInput{
		SalonID:    claims.SalonID,
		Name:       req.Name,
		Brand:      req.Brand,
		Category:   req.Category,
		SizeAmount: req.SizeAmount,
		SizeUnit:   req.SizeUnit,
		StockUnit:  req.StockUnit,
		Threshold:  req.Threshold,
		MenuIDs:    req.MenuIDs,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, m)
}

// PATCH /api/v1/materials/:id
func (h *MaterialHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Name       string   `json:"name"`
		Brand      *string  `json:"brand"`
		Category   string   `json:"category"`
		SizeAmount *uint32  `json:"size_amount"`
		SizeUnit   *string  `json:"size_unit"`
		StockUnit  string   `json:"stock_unit"`
		MenuIDs    []uint64 `json:"menu_ids"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	m, err := h.uc.Update(c.Request().Context(), usecase.UpdateMaterialInput{
		ID:         id,
		SalonID:    claims.SalonID,
		Name:       req.Name,
		Brand:      req.Brand,
		Category:   req.Category,
		SizeAmount: req.SizeAmount,
		SizeUnit:   req.SizeUnit,
		StockUnit:  req.StockUnit,
		MenuIDs:    req.MenuIDs,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "material not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, m)
}

// DELETE /api/v1/materials/:id
func (h *MaterialHandler) Delete(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.Delete(c.Request().Context(), id, claims.SalonID); err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "material not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
