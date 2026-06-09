package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	cetypes "github.com/aws/aws-sdk-go-v2/service/costexplorer/types"
	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/labstack/echo/v4"
)

type AdminHandler struct {
	db       *sqlx.DB
	apptRepo repository.AdminAppointmentRepository
}

func NewAdminHandler(db *sqlx.DB, apptRepo repository.AdminAppointmentRepository) *AdminHandler {
	return &AdminHandler{db: db, apptRepo: apptRepo}
}

// GET /admin/v1/stats
func (h *AdminHandler) GetStats(c echo.Context) error {
	ctx := c.Request().Context()

	type row struct{ Count int `db:"count"` }
	var salons, staffs, activeSubs row

	h.db.GetContext(ctx, &salons, `SELECT COUNT(*) AS count FROM salons`)
	h.db.GetContext(ctx, &staffs, `SELECT COUNT(*) AS count FROM staffs`)
	h.db.GetContext(ctx, &activeSubs, `SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'`)

	// 今月売上合計
	now := time.Now()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var totalSales struct{ Total *int64 `db:"total"` }
	h.db.GetContext(ctx, &totalSales,
		`SELECT SUM(total_sales + retail_sales) AS total FROM daily_sales WHERE date >= ?`,
		from.Format("2006-01-02"))

	total := int64(0)
	if totalSales.Total != nil {
		total = *totalSales.Total
	}

	return c.JSON(http.StatusOK, map[string]any{
		"salon_count":      salons.Count,
		"staff_count":      staffs.Count,
		"active_sub_count": activeSubs.Count,
		"monthly_sales":    total,
	})
}

// GET /admin/v1/appointments
func (h *AdminHandler) ListAppointments(c echo.Context) error {
	list, err := h.apptRepo.List(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, list)
}

// POST /admin/v1/appointments
func (h *AdminHandler) CreateAppointment(c echo.Context) error {
	var req struct {
		SalonName string  `json:"salon_name"`
		Title     string  `json:"title"`
		Date      string  `json:"date"`
		Time      *string `json:"time"`
		Notes     *string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.SalonName == "" || req.Title == "" || req.Date == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "salon_name, title, date are required")
	}

	a := &model.AdminAppointment{
		SalonName: req.SalonName,
		Title:     req.Title,
		Date:      req.Date,
		Time:      req.Time,
		Status:    model.AdminApptScheduled,
		Notes:     req.Notes,
	}
	if err := h.apptRepo.Create(c.Request().Context(), a); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusCreated, a)
}

// PATCH /admin/v1/appointments/:id
func (h *AdminHandler) UpdateAppointment(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		SalonName *string                         `json:"salon_name"`
		Title     *string                         `json:"title"`
		Date      *string                         `json:"date"`
		Time      *string                         `json:"time"`
		Status    *model.AdminAppointmentStatus   `json:"status"`
		Notes     *string                         `json:"notes"`
		Result    *string                         `json:"result"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	existing, err := findAdminAppt(c.Request().Context(), h.db, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "not found")
	}

	if req.SalonName != nil { existing.SalonName = *req.SalonName }
	if req.Title != nil     { existing.Title = *req.Title }
	if req.Date != nil      { existing.Date = *req.Date }
	if req.Time != nil      { existing.Time = req.Time }
	if req.Status != nil    { existing.Status = *req.Status }
	if req.Notes != nil     { existing.Notes = req.Notes }
	if req.Result != nil    { existing.Result = req.Result }

	if err := h.apptRepo.Update(c.Request().Context(), existing); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.JSON(http.StatusOK, existing)
}

// DELETE /admin/v1/appointments/:id
func (h *AdminHandler) DeleteAppointment(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	if err := h.apptRepo.Delete(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
}

func findAdminAppt(ctx context.Context, db *sqlx.DB, id uint64) (*model.AdminAppointment, error) {
	var a model.AdminAppointment
	err := db.GetContext(ctx, &a, `SELECT * FROM admin_appointments WHERE id = ?`, id)
	return &a, err
}

// GET /admin/v1/aws-cost
func (h *AdminHandler) GetAWSCost(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 8*time.Second)
	defer cancel()

	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion("us-east-1"))
	if err != nil {
		return c.JSON(http.StatusOK, map[string]any{"status": "unavailable", "reason": "config error"})
	}

	ce := costexplorer.NewFromConfig(cfg)

	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	end   := now.Format("2006-01-02")
	if start == end {
		end = now.AddDate(0, 0, 1).Format("2006-01-02")
	}

	// 合計
	out, err := ce.GetCostAndUsage(ctx, &costexplorer.GetCostAndUsageInput{
		TimePeriod:  &cetypes.DateInterval{Start: aws.String(start), End: aws.String(end)},
		Granularity: cetypes.GranularityMonthly,
		Metrics:     []string{"UnblendedCost"},
	})
	if err != nil {
		return c.JSON(http.StatusOK, map[string]any{"status": "unavailable", "reason": "api error"})
	}
	if len(out.ResultsByTime) == 0 {
		return c.JSON(http.StatusOK, map[string]any{"status": "unavailable", "reason": "no data"})
	}

	amount := out.ResultsByTime[0].Total["UnblendedCost"].Amount
	unit   := out.ResultsByTime[0].Total["UnblendedCost"].Unit

	// サービス別内訳
	byService, err := ce.GetCostAndUsage(ctx, &costexplorer.GetCostAndUsageInput{
		TimePeriod:  &cetypes.DateInterval{Start: aws.String(start), End: aws.String(end)},
		Granularity: cetypes.GranularityMonthly,
		Metrics:     []string{"UnblendedCost"},
		GroupBy: []cetypes.GroupDefinition{
			{Type: cetypes.GroupDefinitionTypeDimension, Key: aws.String("SERVICE")},
		},
	})

	type serviceItem struct {
		Service string `json:"service"`
		Amount  string `json:"amount"`
	}
	var breakdown []serviceItem
	if err == nil && len(byService.ResultsByTime) > 0 {
		for _, g := range byService.ResultsByTime[0].Groups {
			if len(g.Keys) == 0 { continue }
			a := g.Metrics["UnblendedCost"].Amount
			if a == nil { continue }
			breakdown = append(breakdown, serviceItem{Service: g.Keys[0], Amount: *a})
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status":       "ok",
		"amount":       amount,
		"unit":         unit,
		"period_start": start,
		"period_end":   end,
		"breakdown":    breakdown,
	})
}
