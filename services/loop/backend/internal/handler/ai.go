package handler

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type AIHandler struct {
	uc *usecase.AIUsecase
}

func NewAIHandler(uc *usecase.AIUsecase) *AIHandler {
	return &AIHandler{uc: uc}
}

// POST /api/v1/staff/analysis
// body: { "staff_id": 123 } — 省略時はログイン中スタッフ自身を分析する。
func (h *AIHandler) Analyze(c echo.Context) error {
	claims := claimsFrom(c)
	staffID := claims.StaffID

	var body struct {
		StaffID *uint64 `json:"staff_id"`
	}
	if err := c.Bind(&body); err == nil && body.StaffID != nil {
		staffID = *body.StaffID
	}

	out, err := h.uc.Analyze(c.Request().Context(), staffID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "analysis failed")
	}
	return c.JSON(http.StatusOK, out)
}
