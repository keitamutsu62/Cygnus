package model

import "time"

type Review struct {
	ID            uint64    `db:"id"             json:"id"`
	SalonID       uint64    `db:"salon_id"       json:"salon_id"`
	StoreID       *uint64   `db:"store_id"       json:"store_id"`
	StaffID       *uint64   `db:"staff_id"       json:"staff_id"`
	MenuID        *uint64   `db:"menu_id"        json:"menu_id"`
	RatingOverall uint8     `db:"rating_overall" json:"rating_overall"`
	RatingFinish  uint8     `db:"rating_finish"  json:"rating_finish"`
	RatingService uint8     `db:"rating_service" json:"rating_service"`
	Comment       *string   `db:"comment"        json:"comment"`
	CreatedAt     time.Time `db:"created_at"     json:"created_at"`
}

type ReviewDetail struct {
	ID            uint64    `db:"id"             json:"id"`
	StoreID       *uint64   `db:"store_id"       json:"store_id"`
	StaffID       *uint64   `db:"staff_id"       json:"staff_id"`
	StaffName     *string   `db:"staff_name"     json:"staff_name"`
	MenuID        *uint64   `db:"menu_id"        json:"menu_id"`
	MenuName      *string   `db:"menu_name"      json:"menu_name"`
	RatingOverall uint8     `db:"rating_overall" json:"rating_overall"`
	RatingFinish  uint8     `db:"rating_finish"  json:"rating_finish"`
	RatingService uint8     `db:"rating_service" json:"rating_service"`
	Comment       *string   `db:"comment"        json:"comment"`
	CreatedAt     time.Time `db:"created_at"     json:"created_at"`
}
