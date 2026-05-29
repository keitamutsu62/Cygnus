package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type StaffHandler struct {
	uc *usecase.StaffUsecase
}

func NewStaffHandler(uc *usecase.StaffUsecase) *StaffHandler {
	return &StaffHandler{uc: uc}
}

// GET /api/v1/staffs
func (h *StaffHandler) List(c echo.Context) error {
	salonID := claimsFrom(c).SalonID // JWTからサロンIDを取得
	list, err := h.uc.ListStaff(c.Request().Context(), salonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/staffs/:id
func (h *StaffHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	s, err := h.uc.GetStaff(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "staff not found")
	}
	return c.JSON(http.StatusOK, s)
}
