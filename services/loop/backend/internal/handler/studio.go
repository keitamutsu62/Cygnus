package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type StudioHandler struct {
	uc *usecase.StudioUsecase
}

func NewStudioHandler(uc *usecase.StudioUsecase) *StudioHandler {
	return &StudioHandler{uc: uc}
}

// GET /api/v1/studio/profile
func (h *StudioHandler) GetMyProfile(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	p, err := h.uc.GetMyProfile(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, p)
}

// PUT /api/v1/studio/profile
func (h *StudioHandler) UpsertProfile(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}

	var req struct {
		AvatarURL    *string `json:"avatar_url"`
		Bio          *string `json:"bio"`
		Specialties  *string `json:"specialties"`
		InstagramURL *string `json:"instagram_url"`
		IsPublished  bool    `json:"is_published"`
		ShimeiCharge uint32  `json:"shimei_charge"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	p, err := h.uc.UpsertProfile(c.Request().Context(), usecase.UpsertProfileInput{
		AccountID:    *claims.CygnusAccountID,
		AvatarURL:    req.AvatarURL,
		Bio:          req.Bio,
		Specialties:  req.Specialties,
		InstagramURL: req.InstagramURL,
		IsPublished:  req.IsPublished,
		ShimeiCharge: req.ShimeiCharge,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, p)
}

// GET /api/v1/studio/works
func (h *StudioHandler) ListMyWorks(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	works, err := h.uc.ListMyWorks(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, works)
}

// POST /api/v1/studio/works
func (h *StudioHandler) CreateWork(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}

	var req struct {
		MenuID      *uint64 `json:"menu_id"`
		Title       *string `json:"title"`
		Description *string `json:"description"`
		ImageURL    string  `json:"image_url"`
		Tags        *string `json:"tags"`
		IsPublished bool    `json:"is_published"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.ImageURL == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "image_url is required")
	}

	w, err := h.uc.CreateWork(c.Request().Context(), usecase.CreateWorkInput{
		AccountID:   *claims.CygnusAccountID,
		MenuID:      req.MenuID,
		Title:       req.Title,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		Tags:        req.Tags,
		IsPublished: req.IsPublished,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, w)
}

// PATCH /api/v1/studio/works/:id
func (h *StudioHandler) UpdateWork(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}

	var req struct {
		MenuID      *uint64 `json:"menu_id"`
		Title       *string `json:"title"`
		Description *string `json:"description"`
		ImageURL    string  `json:"image_url"`
		Tags        *string `json:"tags"`
		IsPublished bool    `json:"is_published"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	w, err := h.uc.UpdateWork(c.Request().Context(), usecase.UpdateWorkInput{
		ID:          id,
		AccountID:   *claims.CygnusAccountID,
		MenuID:      req.MenuID,
		Title:       req.Title,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		Tags:        req.Tags,
		IsPublished: req.IsPublished,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "work not found")
		}
		if errors.Is(err, apierror.ErrForbidden) {
			return echo.NewHTTPError(http.StatusForbidden, "forbidden")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, w)
}

// DELETE /api/v1/studio/works/:id
func (h *StudioHandler) DeleteWork(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}

	if err := h.uc.DeleteWork(c.Request().Context(), id, *claims.CygnusAccountID); err != nil {
		if errors.Is(err, apierror.ErrNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "work not found")
		}
		if errors.Is(err, apierror.ErrForbidden) {
			return echo.NewHTTPError(http.StatusForbidden, "forbidden")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/studio/careers
func (h *StudioHandler) ListCareers(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	list, err := h.uc.ListCareers(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /api/v1/studio/careers
func (h *StudioHandler) CreateCareer(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	var req struct {
		SalonName  string  `json:"salon_name"`
		Role       string  `json:"role"`
		StartYear  uint16  `json:"start_year"`
		StartMonth uint8   `json:"start_month"`
		EndYear    *uint16 `json:"end_year"`
		EndMonth   *uint8  `json:"end_month"`
		IsCurrent  bool    `json:"is_current"`
	}
	if err := c.Bind(&req); err != nil || req.SalonName == "" || req.Role == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "salon_name and role required")
	}
	career := &model.Career{
		SalonName: req.SalonName, Role: req.Role,
		StartYear: req.StartYear, StartMonth: req.StartMonth,
		EndYear: req.EndYear, EndMonth: req.EndMonth, IsCurrent: req.IsCurrent,
	}
	if err := h.uc.CreateCareer(c.Request().Context(), *claims.CygnusAccountID, career); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, career)
}

// PATCH /api/v1/studio/careers/:id
func (h *StudioHandler) UpdateCareer(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		SalonName  string  `json:"salon_name"`
		Role       string  `json:"role"`
		StartYear  uint16  `json:"start_year"`
		StartMonth uint8   `json:"start_month"`
		EndYear    *uint16 `json:"end_year"`
		EndMonth   *uint8  `json:"end_month"`
		IsCurrent  bool    `json:"is_current"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	career := &model.Career{
		ID: id, SalonName: req.SalonName, Role: req.Role,
		StartYear: req.StartYear, StartMonth: req.StartMonth,
		EndYear: req.EndYear, EndMonth: req.EndMonth, IsCurrent: req.IsCurrent,
	}
	if err := h.uc.UpdateCareer(c.Request().Context(), *claims.CygnusAccountID, career); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, career)
}

// DELETE /api/v1/studio/careers/:id
func (h *StudioHandler) DeleteCareer(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.uc.DeleteCareer(c.Request().Context(), id, *claims.CygnusAccountID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/studio/memos/today
func (h *StudioHandler) GetTodayMemo(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	m, err := h.uc.GetTodayMemo(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	if m == nil {
		return c.JSON(http.StatusOK, nil)
	}
	return c.JSON(http.StatusOK, m)
}

// POST /api/v1/studio/memos
func (h *StudioHandler) UpsertMemo(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	var req struct {
		Text string `json:"text"`
	}
	if err := c.Bind(&req); err != nil || req.Text == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "text required")
	}
	m, err := h.uc.UpsertMemo(c.Request().Context(), *claims.CygnusAccountID, req.Text)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, m)
}

// GET /api/v1/studio/memos
func (h *StudioHandler) ListMemos(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	memos, err := h.uc.ListMemos(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, memos)
}

// GET /api/v1/studio/menus
func (h *StudioHandler) ListMenus(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	list, err := h.uc.ListMenusForAccount(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/studio/stats/monthly
func (h *StudioHandler) GetMonthlyStats(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	stats, err := h.uc.GetMonthlyStats(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, stats)
}

// GET /api/v1/studio/treatments/recent
func (h *StudioHandler) GetRecentTreatments(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	list, err := h.uc.GetRecentTreatments(c.Request().Context(), *claims.CygnusAccountID, 10)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// GET /api/v1/studio/treatments/count
func (h *StudioHandler) GetTotalTreatmentCount(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	count, err := h.uc.GetTotalTreatmentCount(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]uint64{"count": count})
}

// GET /api/v1/studio/memberships
func (h *StudioHandler) ListLoopMemberships(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	items, err := h.uc.ListLoopMemberships(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, items)
}

// POST /api/v1/studio/bio-suggest
func (h *StudioHandler) SuggestBio(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "cygnus account required")
	}
	bio, err := h.uc.SuggestBio(c.Request().Context(), *claims.CygnusAccountID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]string{"bio": bio})
}

// PATCH /api/v1/staffs/me/avatar  (LOOPのJWTで呼ぶ。cygnus_account_idが必要)
func (h *StudioHandler) UpdateMyAvatarFromLoop(c echo.Context) error {
	claims := claimsFrom(c)
	if claims.CygnusAccountID == nil {
		return echo.NewHTTPError(http.StatusForbidden, "STUDIOアカウントが未連携です")
	}
	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.Bind(&req); err != nil || req.AvatarURL == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if err := h.uc.UpdateMyAvatarURL(c.Request().Context(), *claims.CygnusAccountID, req.AvatarURL); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// GET /api/v1/public/stylists/:cygnus_id
func (h *StudioHandler) GetPublicProfile(c echo.Context) error {
	cygnusID := c.Param("cygnus_id")
	account, profile, works, err := h.uc.GetPublicProfile(c.Request().Context(), cygnusID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "stylist not found")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"account": account,
		"profile": profile,
		"works":   works,
	})
}
