package usecase

import (
	"context"
	"time"

	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/reserve/backend/pkg/apierror"
)

type StylistUsecase struct {
	repo            repository.StylistRepository
	appointmentRepo repository.AppointmentRepository
}

func NewStylistUsecase(repo repository.StylistRepository, appointmentRepo repository.AppointmentRepository) *StylistUsecase {
	return &StylistUsecase{repo: repo, appointmentRepo: appointmentRepo}
}

func (u *StylistUsecase) GetPublicProfile(ctx context.Context, cygnusID string) (*model.StylistPublicProfile, error) {
	profile, err := u.repo.FindPublicProfile(ctx, cygnusID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	works, _ := u.repo.FindPublishedWorks(ctx, cygnusID)
	profile.Works = works
	return profile, nil
}

// GetAvailableSlots はスタイリストの空き枠を計算して返す。
// 既存予約を除外した枠を返す簡易実装。営業時間は09:00-19:00固定（将来business_hours連携）。
func (u *StylistUsecase) GetAvailableSlots(ctx context.Context, cygnusID string, accountID uint64, date time.Time, durationMinutes int) ([]*model.AvailableSlot, error) {
	appointments, err := u.repo.FindAppointmentsByAccountID(ctx, accountID)
	if err != nil {
		return nil, err
	}

	// 指定日の予約だけ抽出
	y, m, d := date.Date()
	booked := make([][2]time.Time, 0)
	loc := date.Location()
	for _, a := range appointments {
		if a.Status == model.AppointmentStatusCancelled {
			continue
		}
		ay, am, ad := a.StartAt.In(loc).Date()
		if ay == y && am == m && ad == d {
			booked = append(booked, [2]time.Time{a.StartAt, a.EndAt})
		}
	}

	// 09:00-19:00 の中で duration 分の空き枠を列挙
	openAt := time.Date(y, m, d, 9, 0, 0, 0, loc)
	closeAt := time.Date(y, m, d, 19, 0, 0, 0, loc)
	dur := time.Duration(durationMinutes) * time.Minute
	interval := 30 * time.Minute

	var slots []*model.AvailableSlot
	for start := openAt; start.Add(dur).Before(closeAt) || start.Add(dur).Equal(closeAt); start = start.Add(interval) {
		end := start.Add(dur)
		if !overlaps(start, end, booked) {
			slots = append(slots, &model.AvailableSlot{StartAt: start, EndAt: end})
		}
	}
	return slots, nil
}

func overlaps(start, end time.Time, booked [][2]time.Time) bool {
	for _, b := range booked {
		if start.Before(b[1]) && end.After(b[0]) {
			return true
		}
	}
	return false
}
