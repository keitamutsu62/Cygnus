package usecase

import (
	"context"
	"fmt"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StoreUsecase struct {
	storeRepo   repository.StoreRepository
	bhRepo      repository.BusinessHoursRepository
	closureRepo repository.StoreSpecialClosureRepository
}

func NewStoreUsecase(
	storeRepo repository.StoreRepository,
	bhRepo repository.BusinessHoursRepository,
	closureRepo repository.StoreSpecialClosureRepository,
) *StoreUsecase {
	return &StoreUsecase{storeRepo: storeRepo, bhRepo: bhRepo, closureRepo: closureRepo}
}

func (u *StoreUsecase) List(ctx context.Context, salonID uint64) ([]*model.Store, error) {
	return u.storeRepo.FindBySalonID(ctx, salonID)
}

type CreateStoreInput struct {
	SalonID string
	Name    string
	Address *string
	Phone   *string
}

// Create は店舗を作成し、営業時間のデフォルト行を自動生成する。
// RESERVE の空き枠計算は business_hours を参照するので必ず存在させる。
func (u *StoreUsecase) Create(ctx context.Context, salonID uint64, name string, address, phone *string) (*model.Store, error) {
	s := &model.Store{SalonID: salonID, Name: name, Address: address, Phone: phone}
	if err := u.storeRepo.Create(ctx, s); err != nil {
		return nil, fmt.Errorf("StoreUsecase.Create: %w", err)
	}
	// 営業時間デフォルト（09:00〜19:00、定休なし）を自動生成
	_ = u.bhRepo.Upsert(ctx, &model.BusinessHours{
		StoreID:   s.ID,
		OpenTime:  "09:00:00",
		CloseTime: "19:00:00",
	})
	return s, nil
}

func (u *StoreUsecase) Update(ctx context.Context, id, salonID uint64, name string, address, phone *string) (*model.Store, error) {
	s, err := u.storeRepo.FindByID(ctx, id)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if s.SalonID != salonID {
		return nil, apierror.ErrForbidden
	}
	s.Name = name
	s.Address = address
	s.Phone = phone
	if err := u.storeRepo.Update(ctx, s); err != nil {
		return nil, fmt.Errorf("StoreUsecase.Update: %w", err)
	}
	return s, nil
}

func (u *StoreUsecase) UpdateBusinessHours(ctx context.Context, storeID uint64, openTime, closeTime string, closedWeekday *int) error {
	return u.bhRepo.Upsert(ctx, &model.BusinessHours{
		StoreID:       storeID,
		OpenTime:      openTime,
		CloseTime:     closeTime,
		ClosedWeekday: closedWeekday,
	})
}

func (u *StoreUsecase) GetBusinessHours(ctx context.Context, storeID uint64) (*model.BusinessHours, error) {
	return u.bhRepo.FindByStoreID(ctx, storeID)
}

func (u *StoreUsecase) ListSpecialClosures(ctx context.Context, storeID uint64) ([]*model.StoreSpecialClosure, error) {
	return u.closureRepo.FindByStoreID(ctx, storeID)
}

func (u *StoreUsecase) AddSpecialClosure(ctx context.Context, storeID uint64, date, note string) (*model.StoreSpecialClosure, error) {
	c := &model.StoreSpecialClosure{StoreID: storeID, Date: date, Note: note}
	if err := u.closureRepo.Create(ctx, c); err != nil {
		return nil, fmt.Errorf("StoreUsecase.AddSpecialClosure: %w", err)
	}
	return c, nil
}

func (u *StoreUsecase) DeleteSpecialClosure(ctx context.Context, id, storeID uint64) error {
	return u.closureRepo.Delete(ctx, id, storeID)
}
