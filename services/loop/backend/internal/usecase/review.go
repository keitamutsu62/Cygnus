package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type ReviewUsecase struct {
	repo repository.ReviewRepository
}

func NewReviewUsecase(repo repository.ReviewRepository) *ReviewUsecase {
	return &ReviewUsecase{repo: repo}
}

type CreateReviewInput struct {
	SalonID       uint64
	StoreID       *uint64
	StaffID       *uint64
	MenuID        *uint64
	RatingOverall uint8
	RatingFinish  uint8
	RatingService uint8
	Comment       *string
}

func (u *ReviewUsecase) Create(ctx context.Context, in CreateReviewInput) (*model.Review, error) {
	r := &model.Review{
		SalonID:       in.SalonID,
		StoreID:       in.StoreID,
		StaffID:       in.StaffID,
		MenuID:        in.MenuID,
		RatingOverall: in.RatingOverall,
		RatingFinish:  in.RatingFinish,
		RatingService: in.RatingService,
		Comment:       in.Comment,
	}
	if err := u.repo.Create(ctx, r); err != nil {
		return nil, fmt.Errorf("ReviewUsecase.Create: %w", err)
	}
	return r, nil
}

func (u *ReviewUsecase) ListBySalon(ctx context.Context, salonID uint64) ([]*model.Review, error) {
	return u.repo.FindBySalonID(ctx, salonID)
}

func (u *ReviewUsecase) ListByStaff(ctx context.Context, staffID uint64) ([]*model.Review, error) {
	return u.repo.FindByStaffID(ctx, staffID)
}

func (u *ReviewUsecase) ListDetails(ctx context.Context, salonID uint64, staffID *uint64, limit int) ([]*model.ReviewDetail, error) {
	return u.repo.FindDetailsBySalonID(ctx, salonID, staffID, limit)
}
