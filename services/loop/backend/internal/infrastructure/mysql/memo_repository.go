package mysql

import (
	"context"
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
)

type studioMemoRepository struct{ db *sqlx.DB }

func NewStudioMemoRepository(db *sqlx.DB) *studioMemoRepository {
	return &studioMemoRepository{db: db}
}

func (r *studioMemoRepository) Upsert(ctx context.Context, m *model.StudioMemo) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO studio_memos (cygnus_account_id, memo_date, text) VALUES (?, ?, ?)`,
		m.CygnusAccountID, m.MemoDate, m.Text,
	)
	if err != nil {
		return err
	}
	id, _ := res.LastInsertId()
	m.ID = uint64(id)
	return nil
}

func (r *studioMemoRepository) FindByAccountID(ctx context.Context, accountID uint64) ([]*model.StudioMemo, error) {
	var rows []*model.StudioMemo
	err := r.db.SelectContext(ctx, &rows,
		`SELECT * FROM studio_memos WHERE cygnus_account_id = ? ORDER BY memo_date DESC`,
		accountID,
	)
	return rows, err
}

func (r *studioMemoRepository) FindTodayByAccountID(ctx context.Context, accountID uint64, today string) (*model.StudioMemo, error) {
	var m model.StudioMemo
	err := r.db.GetContext(ctx, &m,
		`SELECT * FROM studio_memos WHERE cygnus_account_id = ? AND memo_date = ? ORDER BY created_at DESC LIMIT 1`,
		accountID, today,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &m, err
}
