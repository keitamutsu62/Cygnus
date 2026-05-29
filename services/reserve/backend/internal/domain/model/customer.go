package model

import "time"

type Customer struct {
	ID                uint64    `db:"id"`
	CygnusCustomerID  string    `db:"cygnus_customer_id"` // CCU-XXXXX
	LineUserID        *string   `db:"line_user_id"`
	DisplayName       string    `db:"display_name"`
	ProfileImageURL   *string   `db:"profile_image_url"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
}
