package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type TreatmentUsecase struct {
	repo            repository.TreatmentRepository
	salesRepo       repository.SalesRepository
	appointmentRepo repository.AppointmentRepository
}

func NewTreatmentUsecase(
	repo repository.TreatmentRepository,
	salesRepo repository.SalesRepository,
	appointmentRepo repository.AppointmentRepository,
) *TreatmentUsecase {
	return &TreatmentUsecase{repo: repo, salesRepo: salesRepo, appointmentRepo: appointmentRepo}
}

type CreateTreatmentInput struct {
	StaffID         uint64
	CustomerID      *uint64
	SalonID         uint64
	StoreID         *uint64
	MenuID          *uint64
	MenuName        string
	Price           uint32
	DurationMinutes *uint16
	Source          model.TreatmentSource
	AppointmentID   *uint64
	PerformedAt     string // RFC3339
	Notes           *string
}

// Create は治療記録を作成し、売上集計と予約完了を自動で連鎖させる。
// LOOP スタンドアロン時も RESERVE 連携後も同じフローで動く。
func (u *TreatmentUsecase) Create(ctx context.Context, in CreateTreatmentInput) (*model.Treatment, error) {
	t := &model.Treatment{
		StaffID:         in.StaffID,
		CustomerID:      in.CustomerID,
		SalonID:         in.SalonID,
		StoreID:         in.StoreID,
		MenuID:          in.MenuID,
		MenuName:        in.MenuName,
		Price:           in.Price,
		DurationMinutes: in.DurationMinutes,
		Source:          in.Source,
		AppointmentID:   in.AppointmentID,
		Notes:           in.Notes,
	}
	performedAt, err := time.Parse(time.RFC3339, in.PerformedAt)
	if err != nil {
		return nil, fmt.Errorf("Create: invalid performed_at: %w", err)
	}
	t.PerformedAt = performedAt

	if err := u.repo.Create(ctx, t); err != nil {
		return nil, fmt.Errorf("Create treatment: %w", err)
	}

	// ── 売上集計の自動カスケード ──────────────────────────────
	// store_id がある場合のみ集計対象。ない場合はスキップ（エラーにしない）。
	if in.StoreID != nil {
		date := performedAt.Format("2006-01-02")

		salesID, err := u.salesRepo.UpsertStaffDailySales(ctx, in.StaffID, *in.StoreID, date, in.Price)
		if err == nil && in.MenuID != nil && salesID > 0 {
			_ = u.salesRepo.AppendStaffMenuSales(ctx, salesID, *in.MenuID, in.Price)
		}
		_ = u.salesRepo.UpsertDailySales(ctx, *in.StoreID, date, in.Price)
	}

	// ── RESERVE 予約の自動完了 ───────────────────────────────
	// appointment_id が設定されている場合、予約ステータスを completed に更新。
	// LOOP スタンドアロン時は appointment_id が nil なので何もしない。
	// RESERVE 連携後は treatment 作成だけで予約が自動的に閉じる。
	if in.AppointmentID != nil {
		_ = u.appointmentRepo.UpdateStatus(ctx, *in.AppointmentID, model.AppointmentStatusCompleted)
	}

	return t, nil
}

func (u *TreatmentUsecase) ListByStaff(ctx context.Context, staffID uint64, limit, offset int) ([]*model.Treatment, error) {
	return u.repo.FindByStaffID(ctx, staffID, limit, offset)
}

func (u *TreatmentUsecase) ListBySalon(ctx context.Context, salonID uint64, limit, offset int) ([]*model.Treatment, error) {
	return u.repo.FindBySalonID(ctx, salonID, limit, offset)
}
