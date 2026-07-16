package model

import "time"

// StaffAnalysis — スタッフの観測値ベース分析
// 「解釈しない・指図しない・観測値を出す」の原則に沿った構造。
type StaffAnalysis struct {
	ID                  uint64            `db:"id"                    json:"id"`
	StaffID             uint64            `db:"staff_id"              json:"staff_id"`
	Metrics             StaffMetrics      `db:"-"                     json:"metrics"`
	CommentElements     []CommentElement  `db:"-"                     json:"comment_elements"`
	Narratives          StaffNarratives   `db:"-"                     json:"narratives"`
	Observations        []Observation     `db:"-"                     json:"observations"`
	PreviousMetrics     *StaffMetrics     `db:"-"                     json:"previous_metrics,omitempty"`
	PreviousGeneratedAt *time.Time        `db:"previous_generated_at" json:"previous_generated_at,omitempty"`
	ReviewCount         uint32            `db:"review_count"          json:"review_count"`
	GeneratedAt         time.Time         `db:"generated_at"          json:"generated_at"`
}

// Observation — 会計×口コミの突き合わせで検出したパターン
type Observation struct {
	Key      string `json:"key"`       // strong_in_menu / opportunity_gap / volume_quality_gap / service_leverage / nomination_led
	Label    string `json:"label"`     // 淡々とした観測ラベル
	Evidence string `json:"evidence"`  // 根拠となる観測数値
	Tone     string `json:"tone"`      // positive | neutral | attention
}

// StaffMetrics — 数値指標（決定論的に集計）
type StaffMetrics struct {
	ReviewCount        uint32   `json:"review_count"`
	AccountingCount    uint32   `json:"accounting_count"`
	FinishStar5Rate    *float64 `json:"finish_star5_rate"`    // 仕上がり★5率（件数不足時 nil）
	ServiceStar5Rate   *float64 `json:"service_star5_rate"`   // 接客★5率
	StarLowCount       uint32   `json:"star_low_count"`       // ★1〜2の件数（アラート用）
	NominationRatio    *float64 `json:"nomination_ratio"`     // 指名比率（会計データ）
	ResponseRate       *float64 `json:"response_rate"`        // 回答率 = 口コミ/会計
}

// CommentElement — コメント全要素抽出結果
type CommentElement struct {
	Element  string `json:"element"`   // 例: "仕上がりへの満足"
	Count    uint32 `json:"count"`     // 抽出件数
	Category string `json:"category"`  // "skill" | "service" | "result"
}

// StaffNarratives — 淡々とした事実文
// change は Phase B（前月比が必要）で埋める
type StaffNarratives struct {
	Strength string  `json:"strength"`         // 強みの観測文（1文）
	Change   *string `json:"change,omitempty"` // 変化（Phase B、Aでは常にnil）
	Room     *string `json:"room,omitempty"`   // 余地1つ
	Mirror   string  `json:"mirror"`           // 変化が映る鏡
}
