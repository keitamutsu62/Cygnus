package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/labstack/echo/v4"
)

type SalesHandler struct {
	repo repository.SalesRepository
}

func NewSalesHandler(repo repository.SalesRepository) *SalesHandler {
	return &SalesHandler{repo: repo}
}

// GET /api/v1/sales/store?store_id=1&from=2026-05-01&to=2026-05-31
func (h *SalesHandler) GetStoreSales(c echo.Context) error {
	storeIDStr := c.QueryParam("store_id")
	storeID, err := strconv.ParseUint(storeIDStr, 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "store_id is required")
	}
	from, to := parseDateRange(c)
	list, err := h.repo.FindDailySalesByStore(c.Request().Context(), storeID, from, to)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/sales/staff?from=2026-05-01&to=2026-05-31
func (h *SalesHandler) GetMyStaffSales(c echo.Context) error {
	claims := claimsFrom(c)
	from, to := parseDateRange(c)
	list, err := h.repo.FindStaffDailySales(c.Request().Context(), claims.StaffID, from, to)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/sales/store/staff?store_id=10&date=2026-05-29
func (h *SalesHandler) GetStoreStaffSales(c echo.Context) error {
	claims := claimsFrom(c)

	var storeID uint64
	if s := c.QueryParam("store_id"); s != "" {
		id, err := strconv.ParseUint(s, 10, 64)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid store_id")
		}
		storeID = id
	}
	if storeID == 0 {
		if claims.StoreID != nil {
			storeID = *claims.StoreID
		} else {
			return echo.NewHTTPError(http.StatusBadRequest, "store_id is required")
		}
	}

	date := c.QueryParam("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	list, err := h.repo.FindAllStaffDailySalesByStore(c.Request().Context(), storeID, date)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

func parseDateRange(c echo.Context) (from, to string) {
	from = c.QueryParam("from")
	to = c.QueryParam("to")
	if from == "" {
		from = time.Now().Format("2006-01-01")
	}
	if to == "" {
		to = time.Now().Format("2006-01-31")
	}
	return
}
