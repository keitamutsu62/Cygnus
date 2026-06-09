package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type AdminAppointmentRepository interface {
	List(ctx context.Context) ([]*model.AdminAppointment, error)
	Create(ctx context.Context, a *model.AdminAppointment) error
	Update(ctx context.Context, a *model.AdminAppointment) error
	Delete(ctx context.Context, id uint64) error
}
