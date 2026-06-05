package model

import "time"

type StudioMemo struct {
	ID               uint64    `db:"id"                 json:"id"`
	CygnusAccountID  uint64    `db:"cygnus_account_id"  json:"-"`
	MemoDate         string    `db:"memo_date"          json:"memo_date"` // YYYY-MM-DD
	Text             string    `db:"text"               json:"text"`
	CreatedAt        time.Time `db:"created_at"         json:"created_at"`
	UpdatedAt        time.Time `db:"updated_at"         json:"updated_at"`
}
