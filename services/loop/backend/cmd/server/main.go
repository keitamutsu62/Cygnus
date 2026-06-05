package main

import (
	"net/http"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/handler"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mailer"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/storage"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/middleware"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()

	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		panic("DB接続失敗: " + err.Error())
	}

	// ─── リポジトリ ────────────────────────────────────────────
	salonRepo        := mysql.NewSalonRepository(db)
	planRepo         := mysql.NewPlanRepository(db)
	subRepo          := mysql.NewSubscriptionRepository(db)
	staffRepo        := mysql.NewStaffRepository(db)
	invRepo          := mysql.NewInvitationRepository(db)
	resetTokenRepo   := mysql.NewPasswordResetTokenRepository(db)
	accountRepo      := mysql.NewCygnusAccountRepository(db)
	membershipRepo   := mysql.NewSalonMembershipRepository(db)
	profileRepo      := mysql.NewProfileRepository(db)
	workRepo         := mysql.NewWorkRepository(db)
	memoRepo         := mysql.NewStudioMemoRepository(db)
	invtRepo         := mysql.NewInventoryRepository(db)
	invtWriteRepo    := mysql.NewInventoryWriteRepository(db)
	treatmentRepo    := mysql.NewTreatmentRepository(db)
	menuRepo         := mysql.NewMenuRepository(db)
	customerRepo     := mysql.NewCustomerRepository(db)
	appointmentRepo  := mysql.NewAppointmentRepository(db)
	storeRepo        := mysql.NewStoreRepository(db)
	bhRepo           := mysql.NewBusinessHoursRepository(db)
	closureRepo      := mysql.NewStoreSpecialClosureRepository(db)
	salesRepo        := mysql.NewSalesRepository(db)
	retailSaleRepo   := mysql.NewRetailSaleRepository(db)
	materialRepo     := mysql.NewMaterialRepository(db)
	dealerRepo       := mysql.NewDealerRepository(db)
	orderRepo        := mysql.NewOrderRepository(db)

	// ─── ストレージ（R2環境変数が揃っていればR2、未設定ならLocalにフォールバック）──
	var imgStorage storage.ImageStorage
	if cfg.R2AccountID != "" && cfg.R2AccessKey != "" && cfg.R2SecretKey != "" {
		imgStorage = storage.NewR2Storage(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2PublicURL)
	} else {
		imgStorage = storage.NewLocalStorage()
	}

	// ─── ユースケース ──────────────────────────────────────────
	m := mailer.NewLogMailer()

	authUC       := usecase.NewAuthUsecase(salonRepo, planRepo, subRepo, staffRepo, invRepo, accountRepo, membershipRepo, resetTokenRepo, m, cfg.JWTSecret)
	staffUC      := usecase.NewStaffUsecase(staffRepo)
	invtUC       := usecase.NewInventoryUsecase(invtRepo)
	studioUC     := usecase.NewStudioUsecase(accountRepo, profileRepo, workRepo, memoRepo, imgStorage)
	treatmentUC  := usecase.NewTreatmentUsecase(treatmentRepo, salesRepo, appointmentRepo)
	menuUC       := usecase.NewMenuUsecase(menuRepo)
	customerUC   := usecase.NewCustomerUsecase(customerRepo)
	appointmentUC := usecase.NewAppointmentUsecase(appointmentRepo)
	storeUC      := usecase.NewStoreUsecase(storeRepo, bhRepo, closureRepo)
	materialUC      := usecase.NewMaterialUsecase(materialRepo, invtWriteRepo, storeRepo)
	dealerUC        := usecase.NewDealerUsecase(dealerRepo, orderRepo)
	retailSaleUC    := usecase.NewRetailSaleUsecase(retailSaleRepo, salesRepo)
	aiUC            := usecase.NewAIUsecase(salesRepo, staffRepo)

	// ─── ハンドラ ──────────────────────────────────────────────
	authH        := handler.NewAuthHandler(authUC, cfg.FrontendURL)
	staffH       := handler.NewStaffHandler(staffUC)
	invtH        := handler.NewInventoryHandler(invtUC)
	studioH      := handler.NewStudioHandler(studioUC)
	treatH       := handler.NewTreatmentHandler(treatmentUC)
	menuH        := handler.NewMenuHandler(menuUC)
	customerH    := handler.NewCustomerHandler(customerUC)
	appointmentH := handler.NewAppointmentHandler(appointmentUC)
	storeH       := handler.NewStoreHandler(storeUC)
	materialH    := handler.NewMaterialHandler(materialUC)
	dealerH      := handler.NewDealerHandler(dealerUC)
	salesH          := handler.NewSalesHandler(salesRepo)
	retailSaleH     := handler.NewRetailSaleHandler(retailSaleUC)
	aiH             := handler.NewAIHandler(aiUC)
	settingsH       := handler.NewSettingsHandler(salonRepo)

	// ─── Echo ─────────────────────────────────────────────────
	e := echo.New()
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.CORS())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"service": "cygnus-loop", "status": "ok"})
	})

	// 認証不要
	auth := e.Group("/api/v1/auth")
	auth.POST("/register", authH.Register)
	auth.POST("/login", authH.Login)
	auth.POST("/accept-invitation", authH.AcceptInvitation)
	auth.POST("/forgot-password", authH.ForgotPassword)
	auth.POST("/reset-password", authH.ResetPassword)
	auth.POST("/studio/register", authH.StudioRegister)
	auth.POST("/studio/login", authH.StudioLogin)

	// 公開（RESERVE が参照）
	pub := e.Group("/api/v1/public")
	pub.GET("/stylists/:cygnus_id", studioH.GetPublicProfile)

	// ─── STUDIO認証必要（cygnus_account_id のみ） ──────────────
	studio := e.Group("/api/v1/studio", middleware.StudioJWT(cfg.JWTSecret))
	studio.GET("/profile", studioH.GetMyProfile)
	studio.PUT("/profile", studioH.UpsertProfile)
	studio.GET("/works", studioH.ListMyWorks)
	studio.POST("/works", studioH.CreateWork)
	studio.PATCH("/works/:id", studioH.UpdateWork)
	studio.DELETE("/works/:id", studioH.DeleteWork)
	studio.POST("/bio-suggest", studioH.SuggestBio)
	studio.GET("/memos/today", studioH.GetTodayMemo)
	studio.GET("/memos", studioH.ListMemos)
	studio.POST("/memos", studioH.UpsertMemo)

	// ─── 認証必要 ──────────────────────────────────────────────
	api := e.Group("/api/v1", middleware.JWT(cfg.JWTSecret))

	// 認証・スタッフ
	api.POST("/auth/invite", authH.Invite)
	api.PATCH("/auth/change-password", authH.ChangePassword)
	api.GET("/staffs", staffH.List)
	api.GET("/staffs/:id", staffH.Get)
	api.PATCH("/staffs/:id", staffH.Update)

	// 店舗管理（RESERVE の空き枠計算が business_hours を参照）
	api.GET("/stores", storeH.List)
	api.POST("/stores", storeH.Create)
	api.PATCH("/stores/:id", storeH.Update)
	api.GET("/stores/:id/hours", storeH.GetHours)
	api.PUT("/stores/:id/hours", storeH.UpdateHours)
	api.GET("/stores/:id/special-closures", storeH.ListSpecialClosures)
	api.POST("/stores/:id/special-closures", storeH.AddSpecialClosure)
	api.DELETE("/stores/:id/special-closures/:closureId", storeH.DeleteSpecialClosure)

	// メニュー（RESERVE の予約フロー・duration で空き枠計算に使用）
	api.GET("/menus", menuH.List)
	api.POST("/menus", menuH.Create)
	api.PATCH("/menus/:id", menuH.Update)
	api.DELETE("/menus/:id", menuH.Delete)

	// 材料管理（材料追加 → 全店舗に在庫行を自動生成）
	api.GET("/materials", materialH.List)
	api.POST("/materials", materialH.Create)
	api.PATCH("/materials/:id", materialH.Update)
	api.DELETE("/materials/:id", materialH.Delete)

	// 在庫（数量更新・一覧）
	api.GET("/inventory", invtH.List)
	api.PATCH("/inventory/:id/quantity", invtH.UpdateQuantity)

	// 仕入れ先・発注（"sent" 変更が LINE/email 発注通知の外部連携トリガー）
	api.GET("/dealers", dealerH.ListDealers)
	api.POST("/dealers", dealerH.CreateDealer)
	api.PATCH("/dealers/:id", dealerH.UpdateDealer)
	api.DELETE("/dealers/:id", dealerH.DeleteDealer)
	api.GET("/orders", dealerH.ListOrders)
	api.GET("/orders/history", dealerH.ListOrdersHistory)
	api.POST("/orders", dealerH.CreateOrder)
	api.GET("/orders/:id", dealerH.GetOrder)
	api.PATCH("/orders/:id/status", dealerH.UpdateOrderStatus)

	// 顧客台帳
	api.GET("/customers", customerH.List)
	api.GET("/customers/:id", customerH.Get)
	api.POST("/customers", customerH.Create)
	api.PATCH("/customers/:id", customerH.Update)
	api.DELETE("/customers/:id", customerH.Delete)

	// 施術記録（treatment 作成 → 売上自動集計 + RESERVE 予約自動完了）
	api.POST("/treatments", treatH.Create)
	api.GET("/treatments", treatH.List)

	// 予約確認（RESERVE 連携後に appointments テーブルにデータが来る）
	api.GET("/appointments", appointmentH.List)
	api.PATCH("/appointments/:id/complete", appointmentH.Complete)

	// 売上集計（treatment 作成で自動更新される）
	api.GET("/sales/store", salesH.GetStoreSales)
	api.GET("/sales/store/staff", salesH.GetStoreStaffSales)
	api.GET("/sales/staff", salesH.GetMyStaffSales)
	api.GET("/sales/staff/menus", salesH.GetStaffMenuSales)

	// 物販記録（会計時に記録 → daily_sales / staff_daily_sales の retail_sales を自動加算）
	api.POST("/retail-sales", retailSaleH.Create)
	api.GET("/retail-sales", retailSaleH.List)

	// AI 分析（スタッフの得意領域）
	// TODO: ANTHROPIC_API_KEY を設定すれば usecase/ai.go の stub が実 API に切り替わる
	api.POST("/staff/analysis", aiH.Analyze)

	// サロン設定（指名料など）
	api.GET("/settings", settingsH.Get)
	api.PATCH("/settings", settingsH.Update)


	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
