package handler

import (
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type StaffHandler struct {
	uc *usecase.StaffUsecase
}

func NewStaffHandler(uc *usecase.StaffUsecase) *StaffHandler {
	return &StaffHandler{uc: uc}
}

func (h *StaffHandler) List(c echo.Context) error {
	salonID, err := strconv.ParseUint(c.Param("salonId"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid salon_id")
	}
	list, err := h.uc.ListStaff(c.Request().Context(), salonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, list)
}

func (h *StaffHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	s, err := h.uc.GetStaff(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, s)
}

type createStaffRequest struct {
	Email    string          `json:"email"`
	Password string          `json:"password"`
	Role     model.StaffRole `json:"role"`
}

func (h *StaffHandler) Create(c echo.Context) error {
	salonID, err := strconv.ParseUint(c.Param("salonId"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid salon_id")
	}
	var req createStaffRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	s, err := h.uc.CreateStaff(c.Request().Context(), usecase.CreateStaffInput{
		SalonID:  salonID,
		Email:    req.Email,
		Password: req.Password,
		Role:     req.Role,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, s)
}
