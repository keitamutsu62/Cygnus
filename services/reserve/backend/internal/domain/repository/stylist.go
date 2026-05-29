package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
)

type StylistRepository interface {
	FindPublicProfile(ctx context.Context, cygnusID string) (*model.StylistPublicProfile, error)
	FindPublishedWorks(ctx context.Context, cygnusID string) ([]*model.PublicWork, error)
	FindAppointmentsByAccountID(ctx context.Context, accountID uint64) ([]*model.Appointment, error)
}
