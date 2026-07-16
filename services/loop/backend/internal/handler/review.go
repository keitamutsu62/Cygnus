package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type ReviewHandler struct {
	uc        *usecase.ReviewUsecase
	menuUC    *usecase.MenuUsecase
	staffUC   *usecase.StaffUsecase
	storeRepo repository.StoreRepository
}

func NewReviewHandler(
	uc *usecase.ReviewUsecase,
	menuUC *usecase.MenuUsecase,
	staffUC *usecase.StaffUsecase,
	storeRepo repository.StoreRepository,
) *ReviewHandler {
	return &ReviewHandler{uc: uc, menuUC: menuUC, staffUC: staffUC, storeRepo: storeRepo}
}

func (h *ReviewHandler) resolveSalonID(c echo.Context) (storeID, salonID uint64, err error) {
	storeID, err = strconv.ParseUint(c.Param("store_id"), 10, 64)
	if err != nil {
		return 0, 0, echo.NewHTTPError(http.StatusBadRequest, "invalid store_id")
	}
	s, err := h.storeRepo.FindByID(c.Request().Context(), storeID)
	if err != nil || s == nil {
		return 0, 0, echo.NewHTTPError(http.StatusNotFound, "store not found")
	}
	return storeID, s.SalonID, nil
}

// GET /api/v1/public/stores/:store_id/menus
func (h *ReviewHandler) PublicListMenus(c echo.Context) error {
	_, salonID, err := h.resolveSalonID(c)
	if err != nil {
		return err
	}
	menuType := c.QueryParam("type")
	if menuType == "" {
		menuType = "treatment"
	}
	list, err := h.menuUC.List(c.Request().Context(), salonID, menuType)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	out := make([]map[string]any, 0, len(list))
	for _, m := range list {
		if !m.IsActive {
			continue
		}
		out = append(out, map[string]any{
			"id":   m.ID,
			"name": m.Name,
		})
	}
	return c.JSON(http.StatusOK, out)
}

// GET /api/v1/public/stores/:store_id/staffs
func (h *ReviewHandler) PublicListStaffs(c echo.Context) error {
	storeID, salonID, err := h.resolveSalonID(c)
	if err != nil {
		return err
	}
	list, err := h.staffUC.ListStaff(c.Request().Context(), salonID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	out := make([]map[string]any, 0, len(list))
	for _, s := range list {
		if !s.IsActive {
			continue
		}
		// この店舗に所属するスタッフだけを返す（未所属＝全店OK扱いも含める）
		if s.StoreID != nil && *s.StoreID != storeID {
			continue
		}
		out = append(out, map[string]any{
			"id":   s.ID,
			"name": s.Name,
		})
	}
	return c.JSON(http.StatusOK, out)
}

// GET /api/v1/reviews?staff_id=X&limit=Y
func (h *ReviewHandler) List(c echo.Context) error {
	claims := claimsFrom(c)
	var staffID *uint64
	if s := c.QueryParam("staff_id"); s != "" {
		if v, err := strconv.ParseUint(s, 10, 64); err == nil {
			staffID = &v
		}
	}
	// staff role は自分の口コミしか見れない
	if claims.Role == "staff" {
		sid := claims.StaffID
		staffID = &sid
	}
	limit := 0
	if s := c.QueryParam("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			limit = v
		}
	}
	list, err := h.uc.ListDetails(c.Request().Context(), claims.SalonID, staffID, limit)
	if err != nil {
		log.Printf("[reviews.List] salon_id=%d err=%v", claims.SalonID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/public/stores/:store_id/reviews
func (h *ReviewHandler) PublicCreate(c echo.Context) error {
	storeID, salonID, err := h.resolveSalonID(c)
	if err != nil {
		return err
	}
	var req struct {
		StaffID       *uint64 `json:"staff_id"`
		MenuID        *uint64 `json:"menu_id"`
		RatingOverall uint8   `json:"rating_overall"`
		RatingFinish  uint8   `json:"rating_finish"`
		RatingService uint8   `json:"rating_service"`
		Comment       string  `json:"comment"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.RatingOverall < 1 || req.RatingOverall > 5 ||
		req.RatingFinish < 1 || req.RatingFinish > 5 ||
		req.RatingService < 1 || req.RatingService > 5 {
		return echo.NewHTTPError(http.StatusBadRequest, "rating must be 1-5")
	}
	var comment *string
	if req.Comment != "" {
		comment = &req.Comment
	}
	storeIDCopy := storeID
	r, err := h.uc.Create(c.Request().Context(), usecase.CreateReviewInput{
		SalonID:       salonID,
		StoreID:       &storeIDCopy,
		StaffID:       req.StaffID,
		MenuID:        req.MenuID,
		RatingOverall: req.RatingOverall,
		RatingFinish:  req.RatingFinish,
		RatingService: req.RatingService,
		Comment:       comment,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": r.ID})
}
