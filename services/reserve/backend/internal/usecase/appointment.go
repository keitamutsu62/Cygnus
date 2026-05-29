package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
)

type AppointmentUsecase struct {
	repo repository.AppointmentRepository
}

func NewAppointmentUsecase(repo repository.AppointmentRepository) *AppointmentUsecase {
	return &AppointmentUsecase{repo: repo}
}

type CreateAppointmentInput struct {
	CustomerID      uint64
	StylistAccountID uint64
	SalonID         uint64
	StoreID         *uint64
	MenuID          *uint64
	MenuName        string
	Price           uint32
	DurationMinutes *uint16
	StartAt         time.Time
	Notes           *string
}

func (u *AppointmentUsecase) Create(ctx context.Context, in CreateAppointmentInput) (*model.Appointment, error) {
	endAt := in.StartAt
	if in.DurationMinutes != nil {
		endAt = in.StartAt.Add(time.Duration(*in.DurationMinutes) * time.Minute)
	}

	a := &model.Appointment{
		CygnusCustomerID: in.CustomerID,
		CygnusAccountID:  in.StylistAccountID,
		SalonID:          in.SalonID,
		StoreID:          in.StoreID,
		MenuID:           in.MenuID,
		MenuName:         in.MenuName,
		Price:            in.Price,
		DurationMinutes:  in.DurationMinutes,
		StartAt:          in.StartAt,
		EndAt:            endAt,
		Status:           model.AppointmentStatusPending,
		Notes:            in.Notes,
	}
	if err := u.repo.Create(ctx, a); err != nil {
		return nil, fmt.Errorf("Create appointment: %w", err)
	}
	return a, nil
}

func (u *AppointmentUsecase) ListMyAppointments(ctx context.Context, customerID uint64) ([]*model.Appointment, error) {
	return u.repo.FindByCustomerID(ctx, customerID)
}

func (u *AppointmentUsecase) Cancel(ctx context.Context, id, customerID uint64, reason *string) error {
	a, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if a.CygnusCustomerID != customerID {
		return apierror.ErrForbidden
	}
	if a.Status == model.AppointmentStatusCancelled || a.Status == model.AppointmentStatusCompleted {
		return fmt.Errorf("cannot cancel appointment with status %s", a.Status)
	}
	return u.repo.UpdateStatus(ctx, id, model.AppointmentStatusCancelled, reason)
}
