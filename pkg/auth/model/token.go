package model

import "time"

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

type Claims struct {
	AccountID uint64 `json:"account_id"`
	SalonID   uint64 `json:"salon_id"`
	Role      Role   `json:"role"`
}
