package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StudioUsecase struct {
	accountRepo repository.CygnusAccountRepository
	profileRepo repository.ProfileRepository
	workRepo    repository.WorkRepository
}

func NewStudioUsecase(
	accountRepo repository.CygnusAccountRepository,
	profileRepo repository.ProfileRepository,
	workRepo repository.WorkRepository,
) *StudioUsecase {
	return &StudioUsecase{accountRepo: accountRepo, profileRepo: profileRepo, workRepo: workRepo}
}

// ─── Profile ─────────────────────────────────────────────────

func (u *StudioUsecase) GetMyProfile(ctx context.Context, accountID uint64) (*model.Profile, error) {
	p, err := u.profileRepo.FindByAccountID(ctx, accountID)
	if err != nil {
		// プロフィール未作成の場合は空のプロフィールを返す
		return &model.Profile{CygnusAccountID: accountID}, nil
	}
	return p, nil
}

type UpsertProfileInput struct {
	AccountID    uint64
	Bio          *string
	Specialties  *string // JSON文字列
	InstagramURL *string
	IsPublished  bool
}

func (u *StudioUsecase) UpsertProfile(ctx context.Context, in UpsertProfileInput) (*model.Profile, error) {
	p := &model.Profile{
		CygnusAccountID: in.AccountID,
		Bio:             in.Bio,
		Specialties:     in.Specialties,
		InstagramURL:    in.InstagramURL,
		IsPublished:     in.IsPublished,
	}
	if err := u.profileRepo.Upsert(ctx, p); err != nil {
		return nil, fmt.Errorf("UpsertProfile: %w", err)
	}
	return p, nil
}

// GetPublicProfile は公開済みプロフィールをcygnus_idで取得する（RESERVE用）
func (u *StudioUsecase) GetPublicProfile(ctx context.Context, cygnusID string) (*model.CygnusAccount, *model.Profile, []*model.Work, error) {
	account, err := u.accountRepo.FindByCygnusID(ctx, cygnusID)
	if err != nil {
		return nil, nil, nil, apierror.ErrNotFound
	}
	profile, _ := u.profileRepo.FindByAccountID(ctx, account.ID)
	works, _ := u.workRepo.FindPublishedByAccountID(ctx, account.ID)
	return account, profile, works, nil
}

// ─── Works ───────────────────────────────────────────────────

func (u *StudioUsecase) ListMyWorks(ctx context.Context, accountID uint64) ([]*model.Work, error) {
	return u.workRepo.FindByAccountID(ctx, accountID)
}

type CreateWorkInput struct {
	AccountID   uint64
	MenuID      *uint64
	Title       *string
	Description *string
	ImageURL    string
	Tags        *string // JSON文字列
	IsPublished bool
}

func (u *StudioUsecase) CreateWork(ctx context.Context, in CreateWorkInput) (*model.Work, error) {
	w := &model.Work{
		CygnusAccountID: in.AccountID,
		MenuID:          in.MenuID,
		Title:           in.Title,
		Description:     in.Description,
		ImageURL:        in.ImageURL,
		Tags:            in.Tags,
		IsPublished:     in.IsPublished,
	}
	if err := u.workRepo.Create(ctx, w); err != nil {
		return nil, fmt.Errorf("CreateWork: %w", err)
	}
	return w, nil
}

type UpdateWorkInput struct {
	ID          uint64
	AccountID   uint64
	MenuID      *uint64
	Title       *string
	Description *string
	ImageURL    string
	Tags        *string
	IsPublished bool
}

func (u *StudioUsecase) UpdateWork(ctx context.Context, in UpdateWorkInput) (*model.Work, error) {
	existing, err := u.workRepo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if existing.CygnusAccountID != in.AccountID {
		return nil, apierror.ErrForbidden
	}
	existing.MenuID = in.MenuID
	existing.Title = in.Title
	existing.Description = in.Description
	existing.ImageURL = in.ImageURL
	existing.Tags = in.Tags
	existing.IsPublished = in.IsPublished
	if err := u.workRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("UpdateWork: %w", err)
	}
	return existing, nil
}

func (u *StudioUsecase) DeleteWork(ctx context.Context, id, accountID uint64) error {
	existing, err := u.workRepo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if existing.CygnusAccountID != accountID {
		return apierror.ErrForbidden
	}
	return u.workRepo.Delete(ctx, id)
}
