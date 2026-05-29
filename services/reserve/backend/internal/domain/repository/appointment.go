package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
)

type AppointmentRepository interface {
	Create(ctx context.Context, a *model.Appointment) error
	FindByID(ctx context.Context, id uint64) (*model.Appointment, error)
	FindByCustomerID(ctx context.Context, customerID uint64) ([]*model.Appointment, error)
	FindByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error)
	UpdateStatus(ctx context.Context, id uint64, status model.AppointmentStatus, cancelReason *string) error
}
