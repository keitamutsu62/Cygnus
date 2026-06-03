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

type staffRes struct {
	ID             uint64  `json:"id"`
	SalonID        uint64  `json:"salon_id"`
	StoreID        *uint64 `json:"store_id"`
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	IsActive       bool    `json:"is_active"`
	AvatarInitials *string `json:"avatar_initials"`
	ShimeiCharge   *uint32 `json:"shimei_charge"`
	CreatedAt      string  `json:"created_at"`
}

func toStaffRes(s *model.Staff) staffRes {
	return staffRes{
		ID: s.ID, SalonID: s.SalonID, StoreID: s.StoreID,
		Name: s.Name, Email: s.Email, Role: string(s.Role), IsActive: s.IsActive,
		AvatarInitials: s.AvatarInitials, ShimeiCharge: s.ShimeiCharge,
		CreatedAt: s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// GET /api/v1/staffs
func (h *StaffHandler) List(c echo.Context) error {
	salonID := claimsFrom(c).SalonID
	list, err := h.uc.ListStaff(c.Request().Context(), salonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	res := make([]staffRes, len(list))
	for i, s := range list {
		res[i] = toStaffRes(s)
	}
	return c.JSON(http.StatusOK, res)
}

// PATCH /api/v1/staffs/:id
func (h *StaffHandler) Update(c echo.Context) error {
	claims := claimsFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		Role              string  `json:"role"`
		IsActive          *bool   `json:"is_active"`
		ShimeiCharge      *uint32 `json:"shimei_charge"`
		ClearShimeiCharge bool    `json:"clear_shimei_charge"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	s, err := h.uc.UpdateStaff(c.Request().Context(), usecase.UpdateStaffInput{
		ID:                id,
		SalonID:           claims.SalonID,
		Role:              model.StaffRole(req.Role),
		IsActive:          req.IsActive,
		ShimeiCharge:      req.ShimeiCharge,
		ClearShimeiCharge: req.ClearShimeiCharge,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, toStaffRes(s))
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
	return c.JSON(http.StatusOK, toStaffRes(s))
}
