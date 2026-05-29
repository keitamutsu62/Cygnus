package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type InventoryHandler struct {
	uc *usecase.InventoryUsecase
}

func NewInventoryHandler(uc *usecase.InventoryUsecase) *InventoryHandler {
	return &InventoryHandler{uc}
}

func (h *InventoryHandler) List(c echo.Context) error {
	claims := claimsFrom(c)

	storeIDStr := c.QueryParam("store_id")
	var storeID uint64
	if storeIDStr != "" {
		id, err := strconv.ParseUint(storeIDStr, 10, 64)
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

	items, err := h.uc.List(c.Request().Context(), storeID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to list inventory")
	}

	type itemRes struct {
		ID         uint64  `json:"id"`
		MaterialID uint64  `json:"material_id"`
		Name       string  `json:"name"`
		Brand      *string `json:"brand"`
		Category   string  `json:"category"`
		SizeAmount *uint32 `json:"size_amount"`
		SizeUnit   *string `json:"size_unit"`
		StockUnit  string  `json:"stock_unit"`
		Quantity   uint32  `json:"quantity"`
		Threshold  uint32  `json:"threshold"`
		Status     string  `json:"status"`
		BarWidth   int     `json:"bar_width"`
	}

	res := make([]itemRes, len(items))
	for i, it := range items {
		res[i] = itemRes{
			ID:         it.Inventory.ID,
			MaterialID: it.Material.ID,
			Name:       it.Material.Name,
			Brand:      it.Material.Brand,
			Category:   it.Material.Category,
			SizeAmount: it.Material.SizeAmount,
			SizeUnit:   it.Material.SizeUnit,
			StockUnit:  it.Material.StockUnit,
			Quantity:   it.Inventory.Quantity,
			Threshold:  it.Inventory.Threshold,
			Status:     string(it.Status),
			BarWidth:   it.BarWidth,
		}
	}
	return c.JSON(http.StatusOK, res)
}

func (h *InventoryHandler) UpdateQuantity(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}

	var body struct {
		Quantity uint32 `json:"quantity"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}

	if err := h.uc.UpdateQuantity(c.Request().Context(), id, body.Quantity); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update")
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
