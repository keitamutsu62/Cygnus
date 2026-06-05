package model

import "time"

type Profile struct {
	ID              uint64    `db:"id"               json:"id"`
	CygnusAccountID uint64    `db:"cygnus_account_id" json:"cygnus_account_id"`
	AvatarURL       *string   `db:"avatar_url"       json:"avatar_url"`
	Bio             *string   `db:"bio"              json:"bio"`
	Specialties     *string   `db:"specialties"      json:"specialties"`
	InstagramURL    *string   `db:"instagram_url"    json:"instagram_url"`
	IsPublished     bool      `db:"is_published"     json:"is_published"`
	ShimeiCharge    uint32    `db:"shimei_charge"    json:"shimei_charge"`
	CreatedAt       time.Time `db:"created_at"       json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"       json:"updated_at"`
}

type Career struct {
	ID              uint64  `db:"id"                json:"id"`
	CygnusAccountID uint64  `db:"cygnus_account_id" json:"-"`
	SalonName       string  `db:"salon_name"        json:"salon_name"`
	Role            string  `db:"role"              json:"role"`
	StartYear       uint16  `db:"start_year"        json:"start_year"`
	StartMonth      uint8   `db:"start_month"       json:"start_month"`
	EndYear         *uint16 `db:"end_year"          json:"end_year"`
	EndMonth        *uint8  `db:"end_month"         json:"end_month"`
	IsCurrent       bool    `db:"is_current"        json:"is_current"`
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
