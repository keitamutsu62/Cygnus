package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type RetailSaleHandler struct {
	uc *usecase.RetailSaleUsecase
}

func NewRetailSaleHandler(uc *usecase.RetailSaleUsecase) *RetailSaleHandler {
	return &RetailSaleHandler{uc: uc}
}

// POST /api/v1/retail-sales
func (h *RetailSaleHandler) Create(c echo.Context) error {
	claims := claimsFrom(c)

	var req struct {
		StoreID     uint64 `json:"store_id"`
		ProductName string `json:"product_name"`
		Price       uint32 `json:"price"`
		SoldAt      string `json:"sold_at"` // RFC3339
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.ProductName == "" || req.SoldAt == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "product_name, sold_at are required")
	}

	// store_id が省略された場合は JWT のstore_id を使用する
	storeID := req.StoreID
	if storeID == 0 && claims.StoreID != nil {
		storeID = *claims.StoreID
	}

	rs, err := h.uc.Create(c.Request().Context(), usecase.CreateRetailSaleInput{
		StaffID:     claims.StaffID,
		StoreID:     storeID,
		SalonID:     claims.SalonID,
		ProductName: req.ProductName,
		Price:       req.Price,
		SoldAt:      req.SoldAt,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusCreated, rs)
}

// GET /api/v1/retail-sales?scope=mine&from=2026-05-01&to=2026-05-31
func (h *RetailSaleHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	from, to := parseDateRange(c)

	scope := c.QueryParam("scope")
	if scope == "mine" {
		list, err := h.uc.ListByStaff(c.Request().Context(), claims.StaffID, from, to)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed")
		}
		return c.JSON(http.StatusOK, list)
	}

	storeIDStr := c.QueryParam("store_id")
	var storeID uint64
	if storeIDStr != "" {
		if _, err := parseUint64(storeIDStr, &storeID); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid store_id")
		}
	}
	if storeID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "store_id or scope=mine is required")
	}

	list, err := h.uc.ListByStore(c.Request().Context(), storeID, from, to)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

func parseUint64(s string, dst *uint64) (uint64, error) {
	v, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, err
	}
	if dst != nil {
		*dst = v
	}
	return v, nil
}
