package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/middleware"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type FollowHandler struct {
	uc *usecase.FollowUsecase
}

func NewFollowHandler(uc *usecase.FollowUsecase) *FollowHandler {
	return &FollowHandler{uc: uc}
}

// POST /api/v1/follows/:account_id
func (h *FollowHandler) Follow(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid account_id")
	}
	if err := h.uc.Follow(c.Request().Context(), claims.CustomerID, accountID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// DELETE /api/v1/follows/:account_id
func (h *FollowHandler) Unfollow(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid account_id")
	}
	if err := h.uc.Unfollow(c.Request().Context(), claims.CustomerID, accountID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/follows
func (h *FollowHandler) List(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	list, err := h.uc.ListFollows(c.Request().Context(), claims.CustomerID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/saved-works/:work_id
func (h *FollowHandler) SaveWork(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	workID, err := strconv.ParseUint(c.Param("work_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid work_id")
	}
	if err := h.uc.SaveWork(c.Request().Context(), claims.CustomerID, workID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// DELETE /api/v1/saved-works/:work_id
func (h *FollowHandler) UnsaveWork(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	workID, err := strconv.ParseUint(c.Param("work_id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid work_id")
	}
	if err := h.uc.UnsaveWork(c.Request().Context(), claims.CustomerID, workID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/saved-works
func (h *FollowHandler) ListSavedWorks(c echo.Context) error {
	claims := middleware.GetCustomerClaims(c)
	list, err := h.uc.ListSavedWorks(c.Request().Context(), claims.CustomerID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}
