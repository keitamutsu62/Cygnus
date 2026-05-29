package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type MenuHandler struct {
	uc *usecase.MenuUsecase
}

func NewMenuHandler(uc *usecase.MenuUsecase) *MenuHandler { return &MenuHandler{uc: uc} }

// GET /api/v1/menus
func (h *MenuHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	list, err := h.uc.List(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/menus
func (h *MenuHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		Name     string  `json:"name"`
		Price    uint32  `json:"price"`
		Duration *uint16 `json:"duration"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}
	m, err := h.uc.Create(c.Request().Context(), usecase.CreateMenuInput{
		SalonID:  claims.SalonID,
		Name:     req.Name,
		Price:    req.Price,
		Duration: req.Duration,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, m)
}

// PATCH /api/v1/menus/:id
func (h *MenuHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Name     string  `json:"name"`
		Price    uint32  `json:"price"`
		Duration *uint16 `json:"duration"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	m, err := h.uc.Update(c.Request().Context(), usecase.UpdateMenuInput{
		ID:       id,
		SalonID:  claims.SalonID,
		Name:     req.Name,
		Price:    req.Price,
		Duration: req.Duration,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "menu not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, m)
}

// DELETE /api/v1/menus/:id
func (h *MenuHandler) Delete(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.Delete(c.Request().Context(), id, claims.SalonID); err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "menu not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
