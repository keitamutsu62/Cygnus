package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type SalonRepository interface {
	Create(ctx context.Context, s *model.Salon) error
	FindByID(ctx context.Context, id uint64) (*model.Salon, error)
}

type PlanRepository interface {
	FindByID(ctx context.Context, id uint64) (*model.Plan, error)
	FindDefault(ctx context.Context) (*model.Plan, error)
}

type SubscriptionRepository interface {
	Create(ctx context.Context, s *model.Subscription) error
	FindBySalonID(ctx context.Context, salonID uint64) (*model.Subscription, error)
}

type StaffRepository interface {
	Create(ctx context.Context, s *model.Staff) error
	FindByID(ctx context.Context, id uint64) (*model.Staff, error)
	FindByEmail(ctx context.Context, email string) (*model.Staff, error)
	FindBySalonID(ctx context.Context, salonID uint64) ([]*model.Staff, error)
	CountBySalonID(ctx context.Context, salonID uint64) (int, error)
	Update(ctx context.Context, s *model.Staff) error
	UpdatePassword(ctx context.Context, staffID uint64, passwordHash string) error
	LinkCygnusAccount(ctx context.Context, staffID, cygnusAccountID uint64) error
}

type InvitationRepository interface {
	Create(ctx context.Context, inv *model.Invitation) error
	FindByToken(ctx context.Context, token string) (*model.Invitation, error)
	UpdateStatus(ctx context.Context, id uint64, status model.InvitationStatus) error
}

type PasswordResetTokenRepository interface {
	Create(ctx context.Context, t *model.PasswordResetToken) error
	FindByToken(ctx context.Context, token string) (*model.PasswordResetToken, error)
	MarkUsed(ctx context.Context, id uint64) error
}
