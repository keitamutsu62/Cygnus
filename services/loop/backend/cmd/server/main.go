package main

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Health
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"service": "cygnus-loop",
			"status":  "ok",
		})
	})

	// API v1
	v1 := e.Group("/api/v1")

	// Salons
	salons := v1.Group("/salons")
	_ = salons // TODO: SalonHandler を wire する

	// Staffs（サロンスタッフ管理）
	// salons.GET("/:salonId/staffs",     staffHandler.List)
	// salons.GET("/:salonId/staffs/:id", staffHandler.Get)
	// salons.POST("/:salonId/staffs",    staffHandler.Create)

	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
