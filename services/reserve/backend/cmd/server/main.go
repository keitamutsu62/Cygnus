package main

import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"service": "cygnus-reserve",
			"status":  "ok",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
