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

type staffRes struct {
	ID             uint64  `json:"id"`
	SalonID        uint64  `json:"salon_id"`
	StoreID        *uint64 `json:"store_id"`
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	AvatarInitials *string `json:"avatar_initials"`
	CreatedAt      string  `json:"created_at"`
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
		res[i] = staffRes{
			ID: s.ID, SalonID: s.SalonID, StoreID: s.StoreID,
			Name: s.Name, Email: s.Email, Role: string(s.Role),
			AvatarInitials: s.AvatarInitials,
			CreatedAt:      s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}
	return c.JSON(http.StatusOK, res)
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
	return c.JSON(http.StatusOK, staffRes{
		ID: s.ID, SalonID: s.SalonID, StoreID: s.StoreID,
		Name: s.Name, Email: s.Email, Role: string(s.Role),
		AvatarInitials: s.AvatarInitials,
		CreatedAt:      s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}
