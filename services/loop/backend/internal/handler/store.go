package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type StoreHandler struct {
	uc *usecase.StoreUsecase
}

func NewStoreHandler(uc *usecase.StoreUsecase) *StoreHandler { return &StoreHandler{uc: uc} }

// GET /api/v1/stores
func (h *StoreHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	list, err := h.uc.List(c.Request().Context(), claims.SalonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/stores
func (h *StoreHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		Name    string  `json:"name"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
	}
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}
	s, err := h.uc.Create(c.Request().Context(), claims.SalonID, req.Name, req.Address, req.Phone)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, s)
}

// PATCH /api/v1/stores/:id
func (h *StoreHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Name    string  `json:"name"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	s, err := h.uc.Update(c.Request().Context(), id, claims.SalonID, req.Name, req.Address, req.Phone)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, s)
}

// GET /api/v1/stores/:id/hours
func (h *StoreHandler) GetHours(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	bh, err := h.uc.GetBusinessHours(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "not found")
	}
	return c.JSON(http.StatusOK, bh)
}

// DELETE /api/v1/stores/:id
func (h *StoreHandler) Delete(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.Delete(c.Request().Context(), id, claims.SalonID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/stores/:id/special-closures
func (h *StoreHandler) ListSpecialClosures(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	list, err := h.uc.ListSpecialClosures(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/stores/:id/special-closures
func (h *StoreHandler) AddSpecialClosure(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Date string `json:"date"`
		Note string `json:"note"`
	}
	if err := c.Bind(&req); err != nil || req.Date == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "date is required (YYYY-MM-DD)")
	}
	closure, err := h.uc.AddSpecialClosure(c.Request().Context(), id, req.Date, req.Note)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, closure)
}

// DELETE /api/v1/stores/:id/special-closures/:closureId
func (h *StoreHandler) DeleteSpecialClosure(c echo.Context) error {
	storeID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	closureID, err := strconv.ParseUint(c.Param("closureId"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid closureId")
	}
	if err := h.uc.DeleteSpecialClosure(c.Request().Context(), closureID, storeID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// PUT /api/v1/stores/:id/hours
func (h *StoreHandler) UpdateHours(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		OpenTime      string `json:"open_time"`
		CloseTime     string `json:"close_time"`
		ClosedWeekday *int   `json:"closed_weekday"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if err := h.uc.UpdateBusinessHours(c.Request().Context(), id, req.OpenTime, req.CloseTime, req.ClosedWeekday); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}
