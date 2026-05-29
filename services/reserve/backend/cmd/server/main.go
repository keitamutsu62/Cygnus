package main

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/handler"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/infrastructure/mysql"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/middleware"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/usecase"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()

	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		panic("DB接続失敗: " + err.Error())
	}

	// リポジトリ
	customerRepo := mysql.NewCustomerRepository(db)
	appointmentRepo := mysql.NewAppointmentRepository(db)
	followRepo := mysql.NewFollowRepository(db)
	savedWorkRepo := mysql.NewSavedWorkRepository(db)
	stylistRepo := mysql.NewStylistRepository(db)

	// ユースケース
	authUC := usecase.NewCustomerAuthUsecase(customerRepo, cfg.JWTSecret)
	appointmentUC := usecase.NewAppointmentUsecase(appointmentRepo)
	followUC := usecase.NewFollowUsecase(followRepo, savedWorkRepo)
	stylistUC := usecase.NewStylistUsecase(stylistRepo, appointmentRepo)

	// ハンドラ
	authH := handler.NewAuthHandler(authUC)
	appointmentH := handler.NewAppointmentHandler(appointmentUC)
	followH := handler.NewFollowHandler(followUC)
	stylistH := handler.NewStylistHandler(stylistUC)

	// Echo
	e := echo.New()
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.CORS())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"service": "cygnus-reserve",
			"status":  "ok",
		})
	})

	// 認証不要
	auth := e.Group("/api/v1/auth")
	auth.POST("/guest", authH.GuestLogin) // 開発用
	auth.POST("/line", authH.LineLogin)   // LINE OAuth stub

	// 公開エンドポイント
	pub := e.Group("/api/v1/stylists")
	pub.GET("/:cygnus_id", stylistH.GetProfile)
	pub.GET("/:cygnus_id/slots", stylistH.GetSlots)

	// 認証必要（お客さんJWT）
	api := e.Group("/api/v1", middleware.CustomerJWT(cfg.JWTSecret))
	api.POST("/appointments", appointmentH.Create)
	api.GET("/appointments", appointmentH.List)
	api.DELETE("/appointments/:id", appointmentH.Cancel)
	api.POST("/follows/:account_id", followH.Follow)
	api.DELETE("/follows/:account_id", followH.Unfollow)
	api.GET("/follows", followH.List)
	api.POST("/saved-works/:work_id", followH.SaveWork)
	api.DELETE("/saved-works/:work_id", followH.UnsaveWork)
	api.GET("/saved-works", followH.ListSavedWorks)

	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
