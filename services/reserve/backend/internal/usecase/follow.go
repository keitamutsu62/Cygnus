package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/repository"
)

type FollowUsecase struct {
	followRepo    repository.FollowRepository
	savedWorkRepo repository.SavedWorkRepository
}

func NewFollowUsecase(followRepo repository.FollowRepository, savedWorkRepo repository.SavedWorkRepository) *FollowUsecase {
	return &FollowUsecase{followRepo: followRepo, savedWorkRepo: savedWorkRepo}
}

// ─── Follow ──────────────────────────────────────────────────

func (u *FollowUsecase) Follow(ctx context.Context, customerID, accountID uint64) error {
	f := &model.Follow{CygnusCustomerID: customerID, CygnusAccountID: accountID}
	if err := u.followRepo.Create(ctx, f); err != nil {
		return fmt.Errorf("Follow: %w", err)
	}
	return nil
}

func (u *FollowUsecase) Unfollow(ctx context.Context, customerID, accountID uint64) error {
	return u.followRepo.Delete(ctx, customerID, accountID)
}

func (u *FollowUsecase) ListFollows(ctx context.Context, customerID uint64) ([]*model.Follow, error) {
	return u.followRepo.FindByCustomerID(ctx, customerID)
}

func (u *FollowUsecase) IsFollowing(ctx context.Context, customerID, accountID uint64) (bool, error) {
	return u.followRepo.Exists(ctx, customerID, accountID)
}

// ─── SavedWork ───────────────────────────────────────────────

func (u *FollowUsecase) SaveWork(ctx context.Context, customerID, workID uint64) error {
	s := &model.SavedWork{CygnusCustomerID: customerID, WorkID: workID}
	if err := u.savedWorkRepo.Create(ctx, s); err != nil {
		return fmt.Errorf("SaveWork: %w", err)
	}
	return nil
}

func (u *FollowUsecase) UnsaveWork(ctx context.Context, customerID, workID uint64) error {
	return u.savedWorkRepo.Delete(ctx, customerID, workID)
}

func (u *FollowUsecase) ListSavedWorks(ctx context.Context, customerID uint64) ([]*model.SavedWork, error) {
	return u.savedWorkRepo.FindByCustomerID(ctx, customerID)
}
