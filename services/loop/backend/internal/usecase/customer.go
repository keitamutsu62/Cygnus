package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type CustomerUsecase struct {
	repo repository.CustomerRepository
}

func NewCustomerUsecase(repo repository.CustomerRepository) *CustomerUsecase {
	return &CustomerUsecase{repo: repo}
}

func (u *CustomerUsecase) List(ctx context.Context, salonID uint64, q string) ([]*model.Customer, error) {
	return u.repo.FindBySalonID(ctx, salonID, q)
}

func (u *CustomerUsecase) Get(ctx context.Context, id uint64) (*model.Customer, error) {
	return u.repo.FindByID(ctx, id)
}

type CreateCustomerInput struct {
	SalonID  uint64
	Name     string
	Phone    *string
	ExLineID *string
}

func (u *CustomerUsecase) Create(ctx context.Context, in CreateCustomerInput) (*model.Customer, error) {
	c := &model.Customer{
		SalonID:  in.SalonID,
		Name:     in.Name,
		Phone:    in.Phone,
		ExLineID: in.ExLineID,
	}
	if err := u.repo.Create(ctx, c); err != nil {
		return nil, fmt.Errorf("CustomerUsecase.Create: %w", err)
	}
	return c, nil
}

type UpdateCustomerInput struct {
	ID       uint64
	SalonID  uint64
	Name     string
	Phone    *string
	ExLineID *string
}

func (u *CustomerUsecase) Update(ctx context.Context, in UpdateCustomerInput) (*model.Customer, error) {
	c, err := u.repo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if c.SalonID != in.SalonID {
		return nil, apierror.ErrForbidden
	}
	c.Name = in.Name
	c.Phone = in.Phone
	c.ExLineID = in.ExLineID
	if err := u.repo.Update(ctx, c); err != nil {
		return nil, fmt.Errorf("CustomerUsecase.Update: %w", err)
	}
	return c, nil
}

func (u *CustomerUsecase) Delete(ctx context.Context, id, salonID uint64) error {
	c, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if c.SalonID != salonID {
		return apierror.ErrForbidden
	}
	return u.repo.Delete(ctx, id)
}
