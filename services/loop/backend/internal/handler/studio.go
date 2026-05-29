package handler

import (
	"errors"
	"net/http"
	"strconv"

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
		Bio          *string `json:"bio"`
		Specialties  *string `json:"specialties"`
		InstagramURL *string `json:"instagram_url"`
		IsPublished  bool    `json:"is_published"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	p, err := h.uc.UpsertProfile(c.Request().Context(), usecase.UpsertProfileInput{
		AccountID:    *claims.CygnusAccountID,
		Bio:          req.Bio,
		Specialties:  req.Specialties,
		InstagramURL: req.InstagramURL,
		IsPublished:  req.IsPublished,
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
