package model

import "time"

type Follow struct {
	ID               uint64    `db:"id"`
	CygnusCustomerID uint64    `db:"cygnus_customer_id"`
	CygnusAccountID  uint64    `db:"cygnus_account_id"` // フォロー先スタイリスト
	CreatedAt        time.Time `db:"created_at"`
}

type SavedWork struct {
	ID               uint64    `db:"id"`
	CygnusCustomerID uint64    `db:"cygnus_customer_id"`
	WorkID           uint64    `db:"work_id"`
	CreatedAt        time.Time `db:"created_at"`
}
