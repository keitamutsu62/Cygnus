package model

import "time"

type Profile struct {
	ID              uint64    `db:"id"`
	CygnusAccountID uint64    `db:"cygnus_account_id"`
	Bio             *string   `db:"bio"`
	Specialties     *string   `db:"specialties"` // JSON: ["カラー","カット"]
	InstagramURL    *string   `db:"instagram_url"`
	IsPublished     bool      `db:"is_published"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}

type Work struct {
	ID              uint64    `db:"id"`
	CygnusAccountID uint64    `db:"cygnus_account_id"`
	MenuID          *uint64   `db:"menu_id"`
	Title           *string   `db:"title"`
	Description     *string   `db:"description"`
	ImageURL        string    `db:"image_url"`
	Tags            *string   `db:"tags"` // JSON: ["ハイライト","透明感"]
	IsPublished     bool      `db:"is_published"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}
