package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"golang.org/x/crypto/bcrypt"
)

type StaffUsecase struct {
	staffRepo repository.StaffRepository
}

func NewStaffUsecase(r repository.StaffRepository) *StaffUsecase {
	return &StaffUsecase{staffRepo: r}
}

func (u *StaffUsecase) GetStaff(ctx context.Context, id uint64) (*model.Staff, error) {
	s, err := u.staffRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("StaffUsecase.GetStaff: %w", err)
	}
	return s, nil
}

func (u *StaffUsecase) ListStaff(ctx context.Context, salonID uint64) ([]*model.Staff, error) {
	list, err := u.staffRepo.FindBySalonID(ctx, salonID)
	if err != nil {
		return nil, fmt.Errorf("StaffUsecase.ListStaff: %w", err)
	}
	return list, nil
}

type CreateStaffInput struct {
	SalonID  uint64
	Email    string
	Password string
	Role     model.StaffRole
}

type UpdateStaffInput struct {
	ID                uint64
	SalonID           uint64
	Role              model.StaffRole
	IsActive          *bool
	ShimeiCharge      *uint32
	ClearShimeiCharge bool
}

func (u *StaffUsecase) UpdateStaff(ctx context.Context, in UpdateStaffInput) (*model.Staff, error) {
	s, err := u.staffRepo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("StaffUsecase.UpdateStaff: not found")
	}
	if s.SalonID != in.SalonID {
		return nil, fmt.Errorf("StaffUsecase.UpdateStaff: forbidden")
	}
	if in.Role != "" {
		s.Role = in.Role
	}
	if in.IsActive != nil {
		s.IsActive = *in.IsActive
	}
	if in.ClearShimeiCharge {
		s.ShimeiCharge = nil
	} else if in.ShimeiCharge != nil {
		s.ShimeiCharge = in.ShimeiCharge
	}
	if err := u.staffRepo.Update(ctx, s); err != nil {
		return nil, fmt.Errorf("StaffUsecase.UpdateStaff: %w", err)
	}
	return s, nil
}

func (u *StaffUsecase) CreateStaff(ctx context.Context, in CreateStaffInput) (*model.Staff, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("StaffUsecase.CreateStaff: hash: %w", err)
	}
	s := &model.Staff{
		SalonID:      in.SalonID,
		Email:        in.Email,
		PasswordHash: string(hash),
		Role:         in.Role,
	}
	if err := u.staffRepo.Create(ctx, s); err != nil {
		return nil, fmt.Errorf("StaffUsecase.CreateStaff: %w", err)
	}
	return s, nil
}
