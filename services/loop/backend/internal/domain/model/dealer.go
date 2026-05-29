package model

import "time"

type ContactMethod string

const (
	ContactMethodLINE  ContactMethod = "LINE"
	ContactMethodEmail ContactMethod = "email"
)

type DealerStatus string

const (
	DealerStatusActive   DealerStatus = "active"
	DealerStatusInactive DealerStatus = "inactive"
	DealerStatusPending  DealerStatus = "pending"
)

type Dealer struct {
	ID            uint64        `db:"id"`
	SalonID       uint64        `db:"salon_id"`
	Name          string        `db:"name"`
	ContactMethod ContactMethod `db:"contact_method"`
	ContactInfo   string        `db:"contact_info"`
	Status        DealerStatus  `db:"status"`
	CreatedAt     time.Time     `db:"created_at"`
	UpdatedAt     time.Time     `db:"updated_at"`
}

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusSent      OrderStatus = "sent"
	OrderStatusReceived  OrderStatus = "received"
	OrderStatusDelivered OrderStatus = "delivered"
)

type Order struct {
	ID                 uint64      `db:"id"`
	SalonID            uint64      `db:"salon_id"`
	StoreID            uint64      `db:"store_id"`
	DealerID           uint64      `db:"dealer_id"`
	Status             OrderStatus `db:"status"`
	IsNextMonthInvoice bool        `db:"is_next_month_invoice"`
	SentAt             *time.Time  `db:"sent_at"`
	CreatedAt          time.Time   `db:"created_at"`
	UpdatedAt          time.Time   `db:"updated_at"`
}

type OrderItem struct {
	ID            uint64  `db:"id"`
	OrderID       uint64  `db:"order_id"`
	MaterialID    uint64  `db:"material_id"`
	Quantity      uint32  `db:"quantity"`
	Unit          string  `db:"unit"`
	EstimatedCost *uint32 `db:"estimated_cost"`
}
