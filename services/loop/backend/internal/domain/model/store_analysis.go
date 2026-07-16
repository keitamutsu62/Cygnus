package model

import "time"

// StoreAnalysis — 店舗の週次観測ベース分析（Weekly Insight）
type StoreAnalysis struct {
	ID                  uint64            `db:"id"                    json:"id"`
	StoreID             uint64            `db:"store_id"              json:"store_id"`
	Metrics             StoreMetrics      `db:"-"                     json:"metrics"`
	CommentElements     []CommentElement  `db:"-"                     json:"comment_elements"`
	Narratives          StoreNarratives   `db:"-"                     json:"narratives"`
	Observations        []Observation     `db:"-"                     json:"observations"`
	PreviousMetrics     *StoreMetrics     `db:"-"                     json:"previous_metrics,omitempty"`
	PreviousGeneratedAt *time.Time        `db:"previous_generated_at" json:"previous_generated_at,omitempty"`
	ReviewCount         uint32            `db:"review_count"          json:"review_count"`
	GeneratedAt         time.Time         `db:"generated_at"          json:"generated_at"`
}

// StoreMetrics — 店舗の週次数値指標（決定論的に集計）
// 期間: 直近7日（generated_at 起点）
type StoreMetrics struct {
	// 期間
	PeriodStart string `json:"period_start"` // YYYY-MM-DD
	PeriodEnd   string `json:"period_end"`   // YYYY-MM-DD

	// 会計側
	TotalSales      uint32   `json:"total_sales"`       // 技術+物販の総売上（円）
	TechSales       uint32   `json:"tech_sales"`        // 技術売上
	RetailSales     uint32   `json:"retail_sales"`      // 物販売上
	ClientCount     uint32   `json:"client_count"`      // 客数
	TreatmentCount  uint32   `json:"treatment_count"`   // 施術件数
	AveragePerClient *float64 `json:"average_per_client"` // 客単価（円）
	NominationRatio *float64 `json:"nomination_ratio"`  // 全体指名比率

	// 口コミ側
	ReviewCount      uint32   `json:"review_count"`
	FinishStar5Rate  *float64 `json:"finish_star5_rate"`
	ServiceStar5Rate *float64 `json:"service_star5_rate"`
	StarLowCount     uint32   `json:"star_low_count"` // ★1〜2の件数
	ResponseRate     *float64 `json:"response_rate"`  // 口コミ/施術件数
}

// StoreNarratives — 店舗版の淡々とした事実文
type StoreNarratives struct {
	Strength string  `json:"strength"`         // 強みの観測文（1文）
	Change   *string `json:"change,omitempty"` // 前週からの変化（差分がなければ null）
	Room     *string `json:"room,omitempty"`   // 余地
	Mirror   string  `json:"mirror"`           // 変化が映る鏡
}
