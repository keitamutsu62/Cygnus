package main

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/handler"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mailer"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/middleware"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()

	// DB接続
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		panic("DB接続失敗: " + err.Error())
	}

	// リポジトリ
	salonRepo := mysql.NewSalonRepository(db)
	planRepo := mysql.NewPlanRepository(db)
	subRepo := mysql.NewSubscriptionRepository(db)
	staffRepo := mysql.NewStaffRepository(db)
	invRepo := mysql.NewInvitationRepository(db)
	invtRepo := mysql.NewInventoryRepository(db)

	// メーラー（開発用ログ出力）
	m := mailer.NewLogMailer()

	// ユースケース
	authUC := usecase.NewAuthUsecase(salonRepo, planRepo, subRepo, staffRepo, invRepo, m, cfg.JWTSecret)
	invtUC := usecase.NewInventoryUsecase(invtRepo)

	// ハンドラ
	authH := handler.NewAuthHandler(authUC, cfg.FrontendURL)
	invtH := handler.NewInventoryHandler(invtUC)

	// Echo
	e := echo.New()
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.CORS())

	// ヘルスチェック
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"service": "cygnus-loop",
			"status":  "ok",
		})
	})

	// 認証（ログイン不要）
	auth := e.Group("/api/v1/auth")
	auth.POST("/register", authH.Register)
	auth.POST("/login", authH.Login)
	auth.POST("/accept-invitation", authH.AcceptInvitation)

	// 認証必要なルート
	api := e.Group("/api/v1", middleware.JWT(cfg.JWTSecret))
	api.POST("/auth/invite", authH.Invite)
	api.GET("/inventory", invtH.List)
	api.PATCH("/inventory/:id/quantity", invtH.UpdateQuantity)

	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
