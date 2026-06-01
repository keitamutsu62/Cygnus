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
// ログイン中スタッフ自身の得意領域を分析して返す。
func (h *AIHandler) Analyze(c echo.Context) error {
	claims := claimsFrom(c)
	out, err := h.uc.Analyze(c.Request().Context(), claims.StaffID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "analysis failed")
	}
	return c.JSON(http.StatusOK, out)
}
