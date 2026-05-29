package handler

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	uc *usecase.CustomerAuthUsecase
}

func NewAuthHandler(uc *usecase.CustomerAuthUsecase) *AuthHandler {
	return &AuthHandler{uc: uc}
}

// POST /api/v1/auth/guest   ← 開発・テスト用。LINE OAuthが繋がるまでの代替
func (h *AuthHandler) GuestLogin(c echo.Context) error {
	var req struct {
		DisplayName string `json:"display_name"`
	}
	if err := c.Bind(&req); err != nil || req.DisplayName == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "display_name is required")
	}
	token, customer, err := h.uc.GuestLogin(c.Request().Context(), usecase.GuestLoginInput{
		DisplayName: req.DisplayName,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, map[string]any{
		"token":    token,
		"customer": customer,
	})
}

// POST /api/v1/auth/line   ← LINE OAuthコールバック (stub: トークン検証は外部連携時に実装)
func (h *AuthHandler) LineLogin(c echo.Context) error {
	var req struct {
		LineUserID      string  `json:"line_user_id"`
		DisplayName     string  `json:"display_name"`
		ProfileImageURL *string `json:"profile_image_url"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.LineUserID == "" || req.DisplayName == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "line_user_id and display_name are required")
	}

	token, customer, err := h.uc.LineLogin(c.Request().Context(), req.LineUserID, req.DisplayName, req.ProfileImageURL)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"token":    token,
		"customer": customer,
	})
}
