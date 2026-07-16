package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type StaffAnalysisRepository interface {
	FindByStaffID(ctx context.Context, staffID uint64) (*model.StaffAnalysis, error)
	Upsert(ctx context.Context, a *model.StaffAnalysis) error
}
