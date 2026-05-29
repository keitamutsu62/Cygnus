package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type CustomerHandler struct {
	uc *usecase.CustomerUsecase
}

func NewCustomerHandler(uc *usecase.CustomerUsecase) *CustomerHandler {
	return &CustomerHandler{uc: uc}
}

// GET /api/v1/customers?q=山田
func (h *CustomerHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	q := c.QueryParam("q")
	list, err := h.uc.List(c.Request().Context(), claims.SalonID, q)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/customers/:id
func (h *CustomerHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	cust, err := h.uc.Get(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "customer not found")
	}
	return c.JSON(http.StatusOK, cust)
}

// POST /api/v1/customers
func (h *CustomerHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		Name     string  `json:"name"`
		Phone    *string `json:"phone"`
		ExLineID *string `json:"ex_line_id"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}
	cust, err := h.uc.Create(c.Request().Context(), usecase.CreateCustomerInput{
		SalonID:  claims.SalonID,
		Name:     req.Name,
		Phone:    req.Phone,
		ExLineID: req.ExLineID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, cust)
}

// PATCH /api/v1/customers/:id
func (h *CustomerHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Name     string  `json:"name"`
		Phone    *string `json:"phone"`
		ExLineID *string `json:"ex_line_id"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	cust, err := h.uc.Update(c.Request().Context(), usecase.UpdateCustomerInput{
		ID:       id,
		SalonID:  claims.SalonID,
		Name:     req.Name,
		Phone:    req.Phone,
		ExLineID: req.ExLineID,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "customer not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, cust)
}

// DELETE /api/v1/customers/:id
func (h *CustomerHandler) Delete(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.Delete(c.Request().Context(), id, claims.SalonID); err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "customer not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
