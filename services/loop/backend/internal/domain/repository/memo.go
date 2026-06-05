package repository

import (
	"context"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type StudioMemoRepository interface {
	// Upsert は同日のメモを上書き保存する
	Upsert(ctx context.Context, memo *model.StudioMemo) error
	// FindByAccountID は全メモを日付降順で返す
	FindByAccountID(ctx context.Context, accountID uint64) ([]*model.StudioMemo, error)
	// FindTodayByAccountID は当日のメモを返す（なければ nil）
	FindTodayByAccountID(ctx context.Context, accountID uint64, today string) (*model.StudioMemo, error)
}
