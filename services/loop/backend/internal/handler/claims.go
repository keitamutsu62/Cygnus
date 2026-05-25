package handler

import (
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

func claimsFrom(c echo.Context) *middleware.Claims {
	return middleware.GetClaims(c)
}
