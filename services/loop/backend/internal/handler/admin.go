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

	h.db.GetContext(ctx, &salons, `SELECT COUNT(*) AS count FROM salons WHERE is_internal = 0`)
	h.db.GetContext(ctx, &staffs, `
		SELECT COUNT(*) AS count FROM staffs
		WHERE salon_id IN (SELECT id FROM salons WHERE is_internal = 0)
		AND is_active = 1`)
	h.db.GetContext(ctx, &activeSubs, `
		SELECT COUNT(*) AS count FROM subscriptions
		WHERE status = 'active'
		AND salon_id IN (SELECT id FROM salons WHERE is_internal = 0)`)

	// MRR = SUM(base_price + per_staff_price × active_staff_count) per active subscription
	var mrrRow struct{ MRR *int64 `db:"mrr"` }
	h.db.GetContext(ctx, &mrrRow, `
		SELECT COALESCE(SUM(
			p.base_price + p.per_staff_price * (
				SELECT COUNT(*) FROM staffs st
				WHERE st.salon_id = sub.salon_id AND st.is_active = 1
			)
		), 0) AS mrr
		FROM subscriptions sub
		JOIN salons s  ON s.id  = sub.salon_id
		JOIN plans  p  ON p.id  = sub.plan_id
		WHERE sub.status = 'active'
		AND s.is_internal = 0`)

	mrr := int64(0)
	if mrrRow.MRR != nil {
		mrr = *mrrRow.MRR
	}

	return c.JSON(http.StatusOK, map[string]any{
		"salon_count":      salons.Count,
		"staff_count":      staffs.Count,
		"active_sub_count": activeSubs.Count,
		"mrr":              mrr,
	})
}

// GET /admin/v1/salons
func (h *AdminHandler) ListSalons(c echo.Context) error {
	ctx := c.Request().Context()

	type salonRow struct {
		ID           uint64  `db:"id"`
		Name         string  `db:"name"`
		IsInternal   bool    `db:"is_internal"`
		PlanName     *string `db:"plan_name"`
		BasePrice    *int64  `db:"base_price"`
		PerStaff     *int64  `db:"per_staff_price"`
		StaffCount   int     `db:"staff_count"`
		SubStatus    *string `db:"sub_status"`
		SubCreatedAt *string `db:"sub_created_at"`
	}
	var rows []salonRow
	err := h.db.SelectContext(ctx, &rows, `
		SELECT
			s.id,
			s.name,
			s.is_internal,
			p.name         AS plan_name,
			p.base_price,
			p.per_staff_price,
			(SELECT COUNT(*) FROM staffs st WHERE st.salon_id = s.id AND st.is_active = 1) AS staff_count,
			sub.status     AS sub_status,
			DATE_FORMAT(sub.created_at, '%Y-%m-%d') AS sub_created_at
		FROM salons s
		LEFT JOIN subscriptions sub ON sub.salon_id = s.id
		LEFT JOIN plans p ON p.id = sub.plan_id
		ORDER BY s.id ASC`)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}

	type salonResp struct {
		ID           uint64  `json:"id"`
		Name         string  `json:"name"`
		IsInternal   bool    `json:"is_internal"`
		PlanName     *string `json:"plan_name"`
		StaffCount   int     `json:"staff_count"`
		MRR          int64   `json:"mrr"`
		SubStatus    *string `json:"sub_status"`
		SubCreatedAt *string `json:"sub_created_at"`
	}
	result := make([]salonResp, len(rows))
	for i, r := range rows {
		mrr := int64(0)
		if r.BasePrice != nil && r.PerStaff != nil {
			mrr = *r.BasePrice + *r.PerStaff*int64(r.StaffCount)
		}
		result[i] = salonResp{
			ID:           r.ID,
			Name:         r.Name,
			IsInternal:   r.IsInternal,
			PlanName:     r.PlanName,
			StaffCount:   r.StaffCount,
			MRR:          mrr,
			SubStatus:    r.SubStatus,
			SubCreatedAt: r.SubCreatedAt,
		}
	}
	return c.JSON(http.StatusOK, result)
}

// PATCH /admin/v1/salons/:id
func (h *AdminHandler) UpdateSalon(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	var req struct {
		IsInternal *bool `json:"is_internal"`
	}
	if err := c.Bind(&req); err != nil || req.IsInternal == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "is_internal required")
	}
	_, err = h.db.ExecContext(c.Request().Context(),
		`UPDATE salons SET is_internal = ? WHERE id = ?`, *req.IsInternal, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed")
	}
	return c.NoContent(http.StatusNoContent)
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
	ctx, cancel := context.WithTimeout(c.Request().Context(), 12*time.Second)
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

	// プロジェクト開始日（累計の起点）
	projectStart := "2026-05-01"

	// 当月合計
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

	// 累計合計（プロジェクト開始〜今日）
	cumEnd := end
	cumOut, err := ce.GetCostAndUsage(ctx, &costexplorer.GetCostAndUsageInput{
		TimePeriod:  &cetypes.DateInterval{Start: aws.String(projectStart), End: aws.String(cumEnd)},
		Granularity: cetypes.GranularityMonthly,
		Metrics:     []string{"UnblendedCost"},
	})
	var cumulativeAmount string
	if err == nil {
		var total float64
		for _, r := range cumOut.ResultsByTime {
			if a := r.Total["UnblendedCost"].Amount; a != nil {
				if v, e := strconv.ParseFloat(*a, 64); e == nil {
					total += v
				}
			}
		}
		cumulativeAmount = strconv.FormatFloat(total, 'f', 4, 64)
	}

	// サービス別内訳（当月）
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
		"status":            "ok",
		"amount":            amount,
		"unit":              unit,
		"period_start":      start,
		"period_end":        end,
		"cumulative_amount": cumulativeAmount,
		"project_start":     projectStart,
		"breakdown":         breakdown,
	})
}
