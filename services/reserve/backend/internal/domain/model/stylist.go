package model

import "time"

// StylistPublicProfile は RESERVE が公開表示するスタイリスト情報。
// cygnus_accounts + profiles + works を結合したビュー的な構造体。
type StylistPublicProfile struct {
	CygnusID       string    `json:"cygnus_id"`
	DisplayName    string    `json:"display_name"`
	AvatarInitials *string   `json:"avatar_initials"`
	Bio            *string   `json:"bio"`
	Specialties    *string   `json:"specialties"`
	InstagramURL   *string   `json:"instagram_url"`
	Works          []*PublicWork `json:"works"`
}

type PublicWork struct {
	ID          uint64    `db:"id"    json:"id"`
	MenuID      *uint64   `db:"menu_id" json:"menu_id"`
	Title       *string   `db:"title"  json:"title"`
	ImageURL    string    `db:"image_url" json:"image_url"`
	Tags        *string   `db:"tags"   json:"tags"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// AvailableSlot は予約可能な時間枠。
type AvailableSlot struct {
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}
