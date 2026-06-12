package handler

import (
	"errors"
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	uc          *usecase.AuthUsecase
	frontendURL string
}

func NewAuthHandler(uc *usecase.AuthUsecase, frontendURL string) *AuthHandler {
	return &AuthHandler{uc: uc, frontendURL: frontendURL}
}

// POST /api/v1/auth/register
func (h *AuthHandler) Register(c echo.Context) error {
	var req struct {
		SalonName     string   `json:"salon_name"`
		StoreNames    []string `json:"store_names"`
		OwnerName     string   `json:"owner_name"`
		OwnerEmail    string   `json:"owner_email"`
		OwnerPassword string   `json:"owner_password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.SalonName == "" || req.OwnerName == "" || req.OwnerEmail == "" || req.OwnerPassword == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "all fields are required")
	}

	token, err := h.uc.Register(c.Request().Context(), usecase.RegisterInput{
		SalonName:     req.SalonName,
		StoreNames:    req.StoreNames,
		OwnerName:     req.OwnerName,
		OwnerEmail:    req.OwnerEmail,
		OwnerPassword: req.OwnerPassword,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrConflict) {
			return echo.NewHTTPError(http.StatusConflict, "email already in use")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "registration failed")
	}

	return c.JSON(http.StatusCreated, map[string]string{"token": token})
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c echo.Context) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	token, err := h.uc.Login(c.Request().Context(), usecase.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrUnauthorized) {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid email or password")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "login failed")
	}

	return c.JSON(http.StatusOK, map[string]string{"token": token})
}

// POST /api/v1/auth/invite
func (h *AuthHandler) Invite(c echo.Context) error {
	claims := claimsFrom(c)

	var req struct {
		Email string          `json:"email"`
		Role  model.StaffRole `json:"role"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "email is required")
	}

	err := h.uc.Invite(c.Request().Context(), usecase.InviteInput{
		SalonID:        claims.SalonID,
		InviterStaffID: claims.StaffID,
		Email:          req.Email,
		Role:           req.Role,
		FrontendURL:    h.frontendURL,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrStaffLimitExceed) {
			return echo.NewHTTPError(http.StatusForbidden, "staff limit exceeded for current plan")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "invite failed")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "invitation sent"})
}

// POST /api/v1/auth/studio/register
func (h *AuthHandler) StudioRegister(c echo.Context) error {
	var req struct {
		DisplayName string `json:"display_name"`
		Email       string `json:"email"`
		Password    string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.DisplayName == "" || req.Email == "" || len(req.Password) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "display_name, email, password(8+) are required")
	}
	account, err := h.uc.StudioRegister(c.Request().Context(), usecase.StudioRegisterInput{
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Password:    req.Password,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrConflict) {
			return echo.NewHTTPError(http.StatusConflict, "email already in use")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "registration failed")
	}
	return c.JSON(http.StatusCreated, map[string]any{
		"cygnus_id":    account.CygnusID,
		"display_name": account.DisplayName,
		"email":        account.Email,
	})
}

// POST /api/v1/auth/studio/login
func (h *AuthHandler) StudioLogin(c echo.Context) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	token, err := h.uc.StudioLogin(c.Request().Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, apierror.ErrUnauthorized) {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid email or password")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "login failed")
	}
	return c.JSON(http.StatusOK, map[string]string{"token": token})
}

// POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c echo.Context) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	// メールアドレス存在有無を漏らさないため、エラーを無視して常に200を返す
	_ = h.uc.ForgotPassword(c.Request().Context(), req.Email, h.frontendURL)
	return c.JSON(http.StatusOK, map[string]string{"message": "if the email exists, a reset link has been sent"})
}

// POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(c echo.Context) error {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if len(req.NewPassword) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "new_password must be at least 8 characters")
	}
	if err := h.uc.ResetPassword(c.Request().Context(), req.Token, req.NewPassword); err != nil {
		if errors.Is(err, apierror.ErrInvalidToken) {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid or expired reset token")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to reset password")
	}
	return c.NoContent(http.StatusNoContent)
}

// PATCH /api/v1/auth/change-password
func (h *AuthHandler) ChangePassword(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.CurrentPassword == "" || len(req.NewPassword) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "new_password must be at least 8 characters")
	}
	if err := h.uc.ChangePassword(c.Request().Context(), claims.StaffID, req.CurrentPassword, req.NewPassword); err != nil {
		if errors.Is(err, apierror.ErrUnauthorized) {
			return echo.NewHTTPError(http.StatusUnauthorized, "current password is incorrect")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to change password")
	}
	return c.NoContent(http.StatusNoContent)
}

// GET /api/v1/auth/invite-info?token=xxx
func (h *AuthHandler) InviteInfo(c echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "token is required")
	}
	info, err := h.uc.GetInviteInfo(c.Request().Context(), token)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid or expired token")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"salon_name": info.SalonName,
		"stores":     info.Stores,
	})
}

// POST /api/v1/auth/accept-invitation
func (h *AuthHandler) AcceptInvitation(c echo.Context) error {
	var req struct {
		Token    string  `json:"token"`
		Name     string  `json:"name"`
		Password string  `json:"password"`
		StoreID  *uint64 `json:"store_id"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	staff, err := h.uc.AcceptInvitation(c.Request().Context(), usecase.AcceptInvitationInput{
		Token:    req.Token,
		Name:     req.Name,
		Password: req.Password,
		StoreID:  req.StoreID,
	})
	if err != nil {
		if errors.Is(err, apierror.ErrInvalidToken) {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid or expired invitation token")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to accept invitation")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"staff_id": staff.ID,
		"email":    staff.Email,
		"role":     staff.Role,
	})
}
