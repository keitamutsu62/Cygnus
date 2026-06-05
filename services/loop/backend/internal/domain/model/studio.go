package model

import "time"

type Profile struct {
	ID              uint64    `db:"id"               json:"id"`
	CygnusAccountID uint64    `db:"cygnus_account_id" json:"cygnus_account_id"`
	Bio             *string   `db:"bio"              json:"bio"`
	Specialties     *string   `db:"specialties"      json:"specialties"`
	InstagramURL    *string   `db:"instagram_url"    json:"instagram_url"`
	IsPublished     bool      `db:"is_published"     json:"is_published"`
	CreatedAt       time.Time `db:"created_at"       json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"       json:"updated_at"`
}

type Work struct {
	ID              uint64    `db:"id"               json:"id"`
	CygnusAccountID uint64    `db:"cygnus_account_id" json:"cygnus_account_id"`
	MenuID          *uint64   `db:"menu_id"          json:"menu_id"`
	Title           *string   `db:"title"            json:"title"`
	Description     *string   `db:"description"      json:"description"`
	ImageURL        string    `db:"image_url"        json:"image_url"`
	Tags            *string   `db:"tags"             json:"tags"`
	IsPublished     bool      `db:"is_published"     json:"is_published"`
	CreatedAt       time.Time `db:"created_at"       json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"       json:"updated_at"`
}
