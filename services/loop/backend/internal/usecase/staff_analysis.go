package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

const (
	minReviewsForAnalysis = 3
	star5RateHighTh       = 0.55 // ★5率がこれ以上なら「強み」
	star5RateSampleMinCnt = 3    // ★5率を出す最小サンプル
)

type StaffAnalysisUsecase struct {
	analysisRepo repository.StaffAnalysisRepository
	reviewRepo   repository.ReviewRepository
	staffRepo    repository.StaffRepository
	db           *sqlx.DB
}

func NewStaffAnalysisUsecase(
	analysisRepo repository.StaffAnalysisRepository,
	reviewRepo repository.ReviewRepository,
	staffRepo repository.StaffRepository,
	db *sqlx.DB,
) *StaffAnalysisUsecase {
	return &StaffAnalysisUsecase{analysisRepo: analysisRepo, reviewRepo: reviewRepo, staffRepo: staffRepo, db: db}
}

// Get — 保存済みの分析を取得
func (u *StaffAnalysisUsecase) Get(ctx context.Context, salonID, staffID uint64) (*model.StaffAnalysis, error) {
	staff, err := u.staffRepo.FindByID(ctx, staffID)
	if err != nil || staff == nil {
		return nil, fmt.Errorf("staff not found")
	}
	if staff.SalonID != salonID {
		return nil, fmt.Errorf("forbidden")
	}
	return u.analysisRepo.FindByStaffID(ctx, staffID)
}

// Generate — 集計→AI要素抽出→AI言語化→保存
func (u *StaffAnalysisUsecase) Generate(ctx context.Context, salonID, staffID uint64) (*model.StaffAnalysis, error) {
	staff, err := u.staffRepo.FindByID(ctx, staffID)
	if err != nil || staff == nil {
		return nil, fmt.Errorf("staff not found")
	}
	if staff.SalonID != salonID {
		return nil, fmt.Errorf("forbidden")
	}

	reviews, err := u.reviewRepo.FindByStaffID(ctx, staffID)
	if err != nil {
		return nil, fmt.Errorf("fetch reviews: %w", err)
	}
	if len(reviews) < minReviewsForAnalysis {
		return nil, fmt.Errorf("not enough reviews (need >= %d)", minReviewsForAnalysis)
	}

	// ── 前回observation を取得（変化検出用） ─────────────
	prev, _ := u.analysisRepo.FindByStaffID(ctx, staffID)

	// ── 数値集計（決定論的） ─────────────────────────────
	metrics := calcStaffMetrics(reviews)

	// 会計データから accounting_count / nomination_ratio を集計
	if accCnt, shimeiCnt, err := u.fetchTreatmentAggregates(ctx, staffID); err == nil {
		metrics.AccountingCount = accCnt
		if accCnt > 0 {
			nom := float64(shimeiCnt) / float64(accCnt)
			metrics.NominationRatio = &nom
			resp := float64(metrics.ReviewCount) / float64(accCnt)
			metrics.ResponseRate = &resp
		}
	}

	// ── 異常値ゲート（極端な★5率をnil化） ─────────────
	applyAnomalyGate(&metrics)

	// ── 会計×口コミ 突き合わせ観測（層3・Phase C） ─────
	observations, err := u.detectObservations(ctx, staffID, reviews, metrics)
	if err != nil {
		// 突き合わせが失敗しても分析は続行
		observations = []model.Observation{}
	}

	// ── AI要素抽出（マルチラベル） ───────────────────────
	elements, err := u.extractCommentElements(ctx, reviews)
	if err != nil {
		return nil, fmt.Errorf("extract elements: %w", err)
	}

	// ── AI言語化（前回metricsも渡して change を生成させる） ─
	var prevMetricsPtr *model.StaffMetrics
	if prev != nil {
		p := prev.Metrics
		prevMetricsPtr = &p
	}
	narratives, err := u.buildNarratives(ctx, staff.Name, metrics, elements, prevMetricsPtr)
	if err != nil {
		return nil, fmt.Errorf("build narratives: %w", err)
	}

	// ── 出力ゲート ────────────────────────────────
	applyExpressionGate(&narratives)                                        // 禁止語彙
	applyConsistencyGate(&narratives, metrics, prevMetricsPtr, elements)    // 数値整合

	analysis := &model.StaffAnalysis{
		StaffID:         staffID,
		Metrics:         metrics,
		CommentElements: elements,
		Narratives:      narratives,
		Observations:    observations,
		ReviewCount:     metrics.ReviewCount,
	}
	if prev != nil {
		pm := prev.Metrics
		analysis.PreviousMetrics = &pm
		pg := prev.GeneratedAt
		analysis.PreviousGeneratedAt = &pg
	}
	if err := u.analysisRepo.Upsert(ctx, analysis); err != nil {
		return nil, fmt.Errorf("save analysis: %w", err)
	}
	if saved, err := u.analysisRepo.FindByStaffID(ctx, staffID); err == nil {
		return saved, nil
	}
	analysis.GeneratedAt = time.Now()
	return analysis, nil
}

// ─── 数値集計 ─────────────────────────────────────────────

func calcStaffMetrics(reviews []*model.Review) model.StaffMetrics {
	m := model.StaffMetrics{ReviewCount: uint32(len(reviews))}
	if len(reviews) == 0 {
		return m
	}
	var finish5, service5, low uint32
	for _, r := range reviews {
		if r.RatingFinish == 5 {
			finish5++
		}
		if r.RatingService == 5 {
			service5++
		}
		if r.RatingOverall <= 2 {
			low++
		}
	}
	m.StarLowCount = low
	if len(reviews) >= star5RateSampleMinCnt {
		f := float64(finish5) / float64(len(reviews))
		s := float64(service5) / float64(len(reviews))
		m.FinishStar5Rate = &f
		m.ServiceStar5Rate = &s
	}
	return m
}

func (u *StaffAnalysisUsecase) fetchTreatmentAggregates(ctx context.Context, staffID uint64) (accountingCount, shimeiCount uint32, err error) {
	err = u.db.QueryRowContext(ctx,
		`SELECT COUNT(*), SUM(CASE WHEN is_shimei = 1 THEN 1 ELSE 0 END)
		 FROM treatments WHERE staff_id = ?`, staffID,
	).Scan(&accountingCount, &shimeiCount)
	return
}

// ─── 層3: 会計×口コミ突き合わせ観測（ルールベース） ─────

// パターン検出用の閾値
const (
	minTotalTreatments     = 3    // 全体最小施術件数（パターン検出の下限）
	menuMinReviews         = 2    // メニュー別最小口コミ件数
	star5RateDiffHigh      = 0.15 // 全平均から +15pt で「高」
	star5RateDiffLow       = 0.15 // 全平均から -15pt で「低」
	treatmentRatioHigh     = 0.20 // 全体件数の20%以上で「量が多い」
	treatmentRatioLow      = 0.08 // 全体件数の8%未満で「機会が少ない」
	serviceStar5RateHigh   = 0.55 // 接客★5率これ以上で「高」
	nominationRatioHigh    = 0.55 // 指名比率これ以上で「高」
	volumeControlThreshold = 30   // 総件数これ以下で「件数控えめ」
)

func fmtRate(v *float64) string {
	if v == nil {
		return "nil"
	}
	return fmt.Sprintf("%.2f", *v)
}

type menuAggregate struct {
	MenuID          uint64
	MenuName        string
	TreatmentCount  uint32
	ReviewCount     uint32
	FinishStar5Rate float64 // 未算出は -1
}

func (u *StaffAnalysisUsecase) detectObservations(
	ctx context.Context, staffID uint64, reviews []*model.Review, m model.StaffMetrics,
) ([]model.Observation, error) {
	// 会計側のメニュー別件数を集計
	menuAggs, totalTreatments, err := u.fetchStaffMenuAggregates(ctx, staffID, reviews)
	if err != nil {
		return nil, err
	}

	out := make([]model.Observation, 0, 6)

	log.Printf("[staff.observations] staff_id=%d total_treatments=%d overall_finish=%s service=%s nomination=%s accounting=%d menus=%d",
		staffID, totalTreatments, fmtRate(m.FinishStar5Rate), fmtRate(m.ServiceStar5Rate), fmtRate(m.NominationRatio), m.AccountingCount, len(menuAggs))
	for _, a := range menuAggs {
		log.Printf("[staff.observations] menu=%d (%s) t_count=%d r_count=%d finish_star5=%.2f",
			a.MenuID, a.MenuName, a.TreatmentCount, a.ReviewCount, a.FinishStar5Rate)
	}

	// ─ メニュー別パターン ────────────────────────────
	if m.FinishStar5Rate != nil && totalTreatments >= minTotalTreatments {
		overallFinish := *m.FinishStar5Rate
		for _, a := range menuAggs {
			ratio := float64(a.TreatmentCount) / float64(totalTreatments)
			if a.ReviewCount < menuMinReviews {
				continue
			}
			finish := a.FinishStar5Rate
			if finish < 0 {
				continue
			}
			// 強み（量と質が一致）
			if ratio >= treatmentRatioHigh && finish >= overallFinish+star5RateDiffHigh {
				out = append(out, model.Observation{
					Key:      "strong_in_menu",
					Label:    fmt.Sprintf("%s で量と質が両立しています", a.MenuName),
					Evidence: fmt.Sprintf("%s %d件（全体の%.0f%%）で仕上がり★5率%.0f%%（全体平均%.0f%%）", a.MenuName, a.TreatmentCount, ratio*100, finish*100, overallFinish*100),
					Tone:     "positive",
				})
			}
			// 機会の偏り（できるのに任されていない）
			if ratio <= treatmentRatioLow && finish >= overallFinish+star5RateDiffHigh {
				out = append(out, model.Observation{
					Key:      "opportunity_gap",
					Label:    fmt.Sprintf("%s は評価が高いが件数が少ない状態です", a.MenuName),
					Evidence: fmt.Sprintf("%s %d件（全体の%.0f%%）で仕上がり★5率%.0f%%（全体平均%.0f%%）", a.MenuName, a.TreatmentCount, ratio*100, finish*100, overallFinish*100),
					Tone:     "neutral",
				})
			}
			// 量と質の乖離（件数多いが評価が伴わない）
			if ratio >= treatmentRatioHigh && finish <= overallFinish-star5RateDiffLow {
				out = append(out, model.Observation{
					Key:      "volume_quality_gap",
					Label:    fmt.Sprintf("%s は件数が多い一方で仕上がり★5率が低い水準です", a.MenuName),
					Evidence: fmt.Sprintf("%s %d件（全体の%.0f%%）で仕上がり★5率%.0f%%（全体平均%.0f%%）", a.MenuName, a.TreatmentCount, ratio*100, finish*100, overallFinish*100),
					Tone:     "attention",
				})
			}
		}
	}

	// ─ 全体パターン ────────────────────────────────
	// 数字は控えめだが接客が強い
	if m.ServiceStar5Rate != nil && *m.ServiceStar5Rate >= serviceStar5RateHigh && m.AccountingCount > 0 && m.AccountingCount <= volumeControlThreshold {
		out = append(out, model.Observation{
			Key:      "service_leverage",
			Label:    "件数は控えめですが接客★5率が高い状態です",
			Evidence: fmt.Sprintf("施術%d件で接客★5率%.0f%%", m.AccountingCount, *m.ServiceStar5Rate*100),
			Tone:     "positive",
		})
	}
	// 指名で選ばれている
	if m.ServiceStar5Rate != nil && *m.ServiceStar5Rate >= 0.5 && m.NominationRatio != nil && *m.NominationRatio >= nominationRatioHigh {
		out = append(out, model.Observation{
			Key:      "nomination_led",
			Label:    "指名で選ばれる傾向が観測されています",
			Evidence: fmt.Sprintf("指名比率%.0f%%、接客★5率%.0f%%", *m.NominationRatio*100, *m.ServiceStar5Rate*100),
			Tone:     "positive",
		})
	}
	log.Printf("[staff.observations] staff_id=%d detected=%d", staffID, len(out))
	return out, nil
}

func (u *StaffAnalysisUsecase) fetchStaffMenuAggregates(
	ctx context.Context, staffID uint64, reviews []*model.Review,
) ([]menuAggregate, uint32, error) {
	// 会計側: staff × menu の件数
	rows, err := u.db.QueryContext(ctx,
		`SELECT t.menu_id, COALESCE(m.name, t.menu_name) AS menu_name, COUNT(*) AS treatment_count
		 FROM treatments t
		 LEFT JOIN menus m ON m.id = t.menu_id
		 WHERE t.staff_id = ? AND t.menu_id IS NOT NULL
		 GROUP BY t.menu_id, menu_name`, staffID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	byMenu := make(map[uint64]*menuAggregate)
	var total uint32
	for rows.Next() {
		var mid uint64
		var name string
		var cnt uint32
		if err := rows.Scan(&mid, &name, &cnt); err != nil {
			continue
		}
		byMenu[mid] = &menuAggregate{MenuID: mid, MenuName: name, TreatmentCount: cnt, FinishStar5Rate: -1}
		total += cnt
	}

	// 口コミ側: staff × menu の finish★5率（reviewsから直接集計）
	type mrev struct {
		cnt   uint32
		fin5  uint32
	}
	revByMenu := make(map[uint64]*mrev)
	for _, r := range reviews {
		if r.MenuID == nil {
			continue
		}
		id := *r.MenuID
		if _, ok := revByMenu[id]; !ok {
			revByMenu[id] = &mrev{}
		}
		revByMenu[id].cnt++
		if r.RatingFinish == 5 {
			revByMenu[id].fin5++
		}
	}
	for id, m := range revByMenu {
		if agg, ok := byMenu[id]; ok {
			agg.ReviewCount = m.cnt
			if m.cnt > 0 {
				agg.FinishStar5Rate = float64(m.fin5) / float64(m.cnt)
			}
		}
	}

	out := make([]menuAggregate, 0, len(byMenu))
	for _, v := range byMenu {
		out = append(out, *v)
	}
	return out, total, nil
}

// ─── AI: コメント全要素抽出 ─────────────────────────────

type llmExtractedItem struct {
	Elements []string `json:"elements"`
	Category string   `json:"category_hint,omitempty"`
}
type llmExtractResp struct {
	Items []llmExtractedItem `json:"items"`
}

func (u *StaffAnalysisUsecase) extractCommentElements(ctx context.Context, reviews []*model.Review) ([]model.CommentElement, error) {
	// コメントがないレビューは除外
	comments := make([]string, 0, len(reviews))
	for _, r := range reviews {
		if r.Comment == nil {
			continue
		}
		c := strings.TrimSpace(*r.Comment)
		if c == "" {
			continue
		}
		comments = append(comments, c)
	}
	if len(comments) == 0 {
		return []model.CommentElement{}, nil
	}

	prompt := buildElementExtractionPrompt(comments)
	text, err := callClaudeText(ctx, "claude-haiku-4-5", 2048, prompt)
	if err != nil {
		return nil, err
	}
	resp, err := parseElementExtractResp(text)
	if err != nil {
		return nil, err
	}
	return aggregateElements(resp), nil
}

func buildElementExtractionPrompt(comments []string) string {
	var sb strings.Builder
	sb.WriteString(`以下は美容師に対するお客様の口コミ本文の一覧です。各コメントについて、含まれている「評価要素」を短い単語または句で全部挙げてください（マルチラベル）。

要素の粒度の目安（絶対の分類ではなく参考例）:
- 技術系: "仕上がりへの満足", "カラーの発色", "ブローの質" など
- 接客系: "会話のしやすさ", "説明の丁寧さ", "気遣い", "リラックスできる" など
- 成果系: "指名につながる", "リピート意向" など

各要素は 3〜12 文字程度の簡潔な句にしてください。1つのコメントに複数要素が含まれてよい（切り分け不要）。ネガティブ要素も検出してください（例: "待ち時間の長さ", "説明不足"）。

出力は次の JSON のみ。前置き・後置き・コードフェンス不要:
{"items":[{"elements":["要素1","要素2"],"category_hint":"skill"|"service"|"result"|"negative"}, ...]}
items は入力コメントと同じ順で、同じ件数の要素。要素が抽出できない場合は elements: [] にしてください。

---
コメント:
`)
	for i, c := range comments {
		sb.WriteString(fmt.Sprintf("%d. %s\n", i+1, c))
	}
	return sb.String()
}

func parseElementExtractResp(raw string) (*llmExtractResp, error) {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}
	re := regexp.MustCompile(`(?s)\{.*\}`)
	if m := re.FindString(s); m != "" {
		s = m
	}
	var out llmExtractResp
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// 要素の集計 + カテゴリ推定
func aggregateElements(resp *llmExtractResp) []model.CommentElement {
	type stat struct {
		count    uint32
		category string
	}
	m := make(map[string]*stat)
	for _, it := range resp.Items {
		for _, el := range it.Elements {
			key := strings.TrimSpace(el)
			if key == "" {
				continue
			}
			if _, ok := m[key]; !ok {
				m[key] = &stat{category: normalizeCategory(it.Category)}
			}
			m[key].count++
		}
	}
	out := make([]model.CommentElement, 0, len(m))
	for k, v := range m {
		out = append(out, model.CommentElement{Element: k, Count: v.count, Category: v.category})
	}
	// count降順
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].Count > out[i].Count {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}

func normalizeCategory(hint string) string {
	switch strings.ToLower(strings.TrimSpace(hint)) {
	case "skill":
		return "skill"
	case "service":
		return "service"
	case "result":
		return "result"
	case "negative":
		return "negative"
	}
	return "other"
}

// ─── AI: 言語化（淡々とした事実文） ─────────────────────

func (u *StaffAnalysisUsecase) buildNarratives(ctx context.Context, staffName string, m model.StaffMetrics, elems []model.CommentElement, prev *model.StaffMetrics) (model.StaffNarratives, error) {
	prompt := buildNarrativesPrompt(staffName, m, elems, prev)
	text, err := callClaudeText(ctx, "claude-haiku-4-5", 768, prompt)
	if err != nil {
		return model.StaffNarratives{}, err
	}
	n, err := parseNarratives(text)
	if err != nil {
		return model.StaffNarratives{}, err
	}
	return *n, nil
}

func buildNarrativesPrompt(staffName string, m model.StaffMetrics, elems []model.CommentElement, prev *model.StaffMetrics) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("スタッフ「%s」の観測データを、淡々とした事実文に整えてください。\n\n", staffName))

	sb.WriteString("【観測数値】\n")
	sb.WriteString(fmt.Sprintf("- 口コミ件数: %d件\n", m.ReviewCount))
	if m.FinishStar5Rate != nil {
		sb.WriteString(fmt.Sprintf("- 仕上がり★5率: %.0f%%\n", *m.FinishStar5Rate*100))
	}
	if m.ServiceStar5Rate != nil {
		sb.WriteString(fmt.Sprintf("- 接客★5率: %.0f%%\n", *m.ServiceStar5Rate*100))
	}
	sb.WriteString(fmt.Sprintf("- ★1〜2の件数: %d件\n", m.StarLowCount))
	if m.NominationRatio != nil {
		sb.WriteString(fmt.Sprintf("- 指名比率: %.0f%%\n", *m.NominationRatio*100))
	}

	if len(elems) > 0 {
		sb.WriteString("\n【お客様の声で多い要素（頻出順）】\n")
		max := len(elems)
		if max > 8 {
			max = 8
		}
		for i := 0; i < max; i++ {
			sb.WriteString(fmt.Sprintf("- %s（%d件, category=%s）\n", elems[i].Element, elems[i].Count, elems[i].Category))
		}
	}

	if prev != nil {
		sb.WriteString("\n【前回観測時からの差分】\n")
		sb.WriteString(fmt.Sprintf("- 口コミ件数: %d → %d件（%+d）\n", prev.ReviewCount, m.ReviewCount, int(m.ReviewCount)-int(prev.ReviewCount)))
		writeStarDiff := func(label string, cur, before *float64) {
			if cur == nil || before == nil {
				return
			}
			diff := (*cur - *before) * 100
			sb.WriteString(fmt.Sprintf("- %s: %.0f%% → %.0f%%（%+.0fpt）\n", label, *before*100, *cur*100, diff))
		}
		writeStarDiff("仕上がり★5率", m.FinishStar5Rate, prev.FinishStar5Rate)
		writeStarDiff("接客★5率", m.ServiceStar5Rate, prev.ServiceStar5Rate)
		writeStarDiff("指名比率", m.NominationRatio, prev.NominationRatio)
		writeStarDiff("回答率", m.ResponseRate, prev.ResponseRate)
		if m.StarLowCount != prev.StarLowCount {
			sb.WriteString(fmt.Sprintf("- ★1〜2件数: %d → %d件（%+d）\n", prev.StarLowCount, m.StarLowCount, int(m.StarLowCount)-int(prev.StarLowCount)))
		}
	}

	sb.WriteString(`
【厳守ルール】これは "教育インサイト" ではなく "観測ダッシュボード" です。
- 事実を淡々と述べる。解釈・因果・改善指示を含めない。
- 「〜すべき」「〜したほうがよい」「〜しましょう」「〜してください」等の指示語は禁止。
- 問いかけ調（「〜ですか？」）、励まし語（「素晴らしい」「頑張って」等）は禁止。
- 「不足」「弱み」「劣る」等のネガティブ評価語は使わず、「まだ件数が少ない」「これから見えてくる」等の "余地" フレームに置く。
- 数字は上記【観測数値】から引用してよいが、存在しない数値を書かないこと。

【出力】
JSON オブジェクトのみ。前置き・後置き・コードフェンス不要。フィールドは以下:
{
  "strength": "強みの観測文。1文（40〜80文字目安）。数字を1つ以上含める。",
  "change": "前回観測からの変化を淡々と述べる1文。前回データが与えられている場合のみ生成。値の推移だけ書き、良し悪しの評価語は禁止。有意な差分がない or 前回データがなければ null。",
  "room": "余地1つ（「まだ〜これから見えてくる段階」の文）。強みが明確でない場合は null。",
  "mirror": "変化が映る鏡（「〜すると、ここに変化が表示されます」の1文）。指図せず、次に見る場所を示すのみ。"
}
`)
	return sb.String()
}

func parseNarratives(raw string) (*model.StaffNarratives, error) {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}
	re := regexp.MustCompile(`(?s)\{.*\}`)
	if m := re.FindString(s); m != "" {
		s = m
	}
	var out model.StaffNarratives
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ─── 出力ゲート ─────────────────────────────────────────
// 仕様書 層5：表現ゲート・整合ゲート・異常値ゲート

// 表現ゲート：禁止パターン（指図・励まし・因果断定・ネガティブ評価）
var forbiddenPatterns = []string{
	// 指示・命令
	"すべき", "したほうがよい", "しましょう", "してください", "しなくてはならない", "してみましょう", "してみて", "取り組んで", "意識して", "注意して", "気をつけて",
	// 励まし・評価
	"頑張", "素晴らしい", "素敵", "優秀",
	// 解釈・推測
	"考えられます", "考えられる", "読み取れます", "読み取れる", "思われます", "傾向にある", "可能性が高い", "見受けられる", "推察",
	// 因果断定
	"が原因", "によるもの", "だから",
	// ネガティブ評価
	"劣る", "弱み", "不足", "課題", "問題点", "欠点", "低迷", "苦手",
}

// 整合ゲート：narrative 内の数値表現（例: "45%", "12件"）を抽出して metrics と照合
var numberInTextRe = regexp.MustCompile(`(\d+(?:\.\d+)?)\s*(%|件|pt)`)

func applyExpressionGate(n *model.StaffNarratives) {
	if containsForbidden(n.Strength) {
		n.Strength = "観測値の言語化に成功しませんでした。数値と要素表示をご参照ください。"
	}
	if n.Change != nil && containsForbidden(*n.Change) {
		n.Change = nil
	}
	if n.Room != nil && containsForbidden(*n.Room) {
		n.Room = nil
	}
	if containsForbidden(n.Mirror) {
		n.Mirror = "新しい口コミが集まると、この画面に変化が表示されます。"
	}
}

// 整合ゲート：narratives 内の数値が metrics/elements に存在するかチェック（ハルシネーション検出）
// 不一致が多い場合、そのフィールドをフォールバック文に置換
func applyConsistencyGate(n *model.StaffNarratives, m model.StaffMetrics, prev *model.StaffMetrics, elements []model.CommentElement) {
	allowed := allowedNumbers(m, prev, elements)
	if !checkNumbersInText(n.Strength, allowed) {
		log.Printf("[staff.consistency_gate] strength: mismatch=%q", n.Strength)
		n.Strength = "観測値の言語化に成功しませんでした。数値と要素表示をご参照ください。"
	}
	if n.Change != nil && !checkNumbersInText(*n.Change, allowed) {
		log.Printf("[staff.consistency_gate] change: mismatch=%q", *n.Change)
		n.Change = nil
	}
	if n.Room != nil && !checkNumbersInText(*n.Room, allowed) {
		log.Printf("[staff.consistency_gate] room: mismatch=%q", *n.Room)
		n.Room = nil
	}
}

// allowedNumbers — narratives に含めてよい数値の集合を metrics / comment elements から導出
func allowedNumbers(m model.StaffMetrics, prev *model.StaffMetrics, elements []model.CommentElement) map[string]bool {
	out := make(map[string]bool)
	addPct := func(v *float64) {
		if v == nil {
			return
		}
		// 整数％と ±1% の許容範囲
		p := int(*v*100 + 0.5)
		for d := -1; d <= 1; d++ {
			out[fmt.Sprintf("%d%%", p+d)] = true
		}
	}
	addCount := func(v uint32) {
		out[fmt.Sprintf("%d件", v)] = true
	}
	addPt := func(diff float64) {
		p := int(diff*100 + 0.5)
		for d := -1; d <= 1; d++ {
			out[fmt.Sprintf("%dpt", p+d)] = true
			if p+d > 0 {
				out[fmt.Sprintf("+%dpt", p+d)] = true
			}
		}
	}
	addPct(m.FinishStar5Rate)
	addPct(m.ServiceStar5Rate)
	addPct(m.NominationRatio)
	addPct(m.ResponseRate)
	addCount(m.ReviewCount)
	addCount(m.AccountingCount)
	addCount(m.StarLowCount)
	if prev != nil {
		addPct(prev.FinishStar5Rate)
		addPct(prev.ServiceStar5Rate)
		addPct(prev.NominationRatio)
		addPct(prev.ResponseRate)
		addCount(prev.ReviewCount)
		diff := func(a, b *float64) {
			if a != nil && b != nil {
				addPt(*a - *b)
				addPt(*b - *a)
			}
		}
		diff(m.FinishStar5Rate, prev.FinishStar5Rate)
		diff(m.ServiceStar5Rate, prev.ServiceStar5Rate)
		diff(m.NominationRatio, prev.NominationRatio)
	}
	// コメント要素の頻出件数も許容（例: "5件"）
	for _, e := range elements {
		addCount(e.Count)
	}
	return out
}

// checkNumbersInText — 文中の数値がすべて allowed に含まれていれば true
func checkNumbersInText(s string, allowed map[string]bool) bool {
	if s == "" {
		return true
	}
	matches := numberInTextRe.FindAllStringSubmatch(s, -1)
	for _, mt := range matches {
		key := mt[1] + mt[2] // e.g., "62%"
		if !allowed[key] {
			return false
		}
	}
	return true
}

// 異常値ゲート：★5率が 0% or 100% 相当で件数が少ないケースは表示保留
func applyAnomalyGate(m *model.StaffMetrics) {
	if m.ReviewCount < 5 { // 5件未満の完全極端値は信頼できない
		if m.FinishStar5Rate != nil && (*m.FinishStar5Rate == 0 || *m.FinishStar5Rate == 1) {
			m.FinishStar5Rate = nil
		}
		if m.ServiceStar5Rate != nil && (*m.ServiceStar5Rate == 0 || *m.ServiceStar5Rate == 1) {
			m.ServiceStar5Rate = nil
		}
	}
}

func containsForbidden(s string) bool {
	if s == "" {
		return false
	}
	for _, p := range forbiddenPatterns {
		if strings.Contains(s, p) {
			return true
		}
	}
	return false
}

// ─── 共通: Claude 呼び出し ──────────────────────────────

func callClaudeText(ctx context.Context, model string, maxTokens int, prompt string) (string, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY is not set")
	}
	reqBody := map[string]any{
		"model":      model,
		"max_tokens": maxTokens,
		"messages": []map[string]any{
			{"role": "user", "content": prompt},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")
	client := &http.Client{Timeout: 60 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	respBody, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("anthropic api error status=%d body=%s", res.StatusCode, string(respBody))
	}
	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return "", err
	}
	var sb strings.Builder
	for _, c := range apiResp.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	return sb.String(), nil
}
