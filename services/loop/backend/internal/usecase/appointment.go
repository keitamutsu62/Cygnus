package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type AppointmentUsecase struct {
	repo repository.AppointmentRepository
}

func NewAppointmentUsecase(repo repository.AppointmentRepository) *AppointmentUsecase {
	return &AppointmentUsecase{repo: repo}
}

// ListMine は自分（cygnus_account_id）宛ての予約一覧を返す。
func (u *AppointmentUsecase) ListMine(ctx context.Context, accountID uint64) ([]*model.Appointment, error) {
	return u.repo.FindByAccountID(ctx, accountID)
}

// ListBySalon はサロン全体の予約一覧を返す（オーナー・管理者向け）。
func (u *AppointmentUsecase) ListBySalon(ctx context.Context, salonID uint64) ([]*model.Appointment, error) {
	return u.repo.FindBySalonID(ctx, salonID)
}

// Complete は予約を完了済みに更新する（施術後の確定操作）。
func (u *AppointmentUsecase) Complete(ctx context.Context, id uint64) error {
	if err := u.repo.UpdateStatus(ctx, id, model.AppointmentStatusCompleted); err != nil {
		return fmt.Errorf("AppointmentUsecase.Complete: %w", err)
	}
	return nil
}
