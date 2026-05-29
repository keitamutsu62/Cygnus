package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type MenuUsecase struct {
	repo repository.MenuRepository
}

func NewMenuUsecase(repo repository.MenuRepository) *MenuUsecase {
	return &MenuUsecase{repo: repo}
}

func (u *MenuUsecase) List(ctx context.Context, salonID uint64) ([]*model.Menu, error) {
	return u.repo.FindBySalonID(ctx, salonID)
}

type CreateMenuInput struct {
	SalonID  uint64
	Name     string
	Price    uint32
	Duration *uint16
}

func (u *MenuUsecase) Create(ctx context.Context, in CreateMenuInput) (*model.Menu, error) {
	m := &model.Menu{
		SalonID:  in.SalonID,
		Name:     in.Name,
		Price:    in.Price,
		Duration: in.Duration,
	}
	if err := u.repo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("MenuUsecase.Create: %w", err)
	}
	return m, nil
}

type UpdateMenuInput struct {
	ID       uint64
	SalonID  uint64
	Name     string
	Price    uint32
	Duration *uint16
	IsActive *bool
}

func (u *MenuUsecase) Update(ctx context.Context, in UpdateMenuInput) (*model.Menu, error) {
	m, err := u.repo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if m.SalonID != in.SalonID {
		return nil, apierror.ErrForbidden
	}
	if in.Name != "" {
		m.Name = in.Name
	}
	if in.Price > 0 {
		m.Price = in.Price
	}
	if in.Duration != nil {
		m.Duration = in.Duration
	}
	if in.IsActive != nil {
		m.IsActive = *in.IsActive
	}
	if err := u.repo.Update(ctx, m); err != nil {
		return nil, fmt.Errorf("MenuUsecase.Update: %w", err)
	}
	return m, nil
}

func (u *MenuUsecase) Delete(ctx context.Context, id, salonID uint64) error {
	m, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if m.SalonID != salonID {
		return apierror.ErrForbidden
	}
	return u.repo.Delete(ctx, id)
}
