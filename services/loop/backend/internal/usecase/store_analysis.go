package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

const (
	weeklyPeriodDays        = 7
	weeklyMinReviews        = 3
	weeklyPctChangeHigh     = 0.15
	weeklyUnitPriceDiffPct  = 0.10
	weeklyReviewsFlowDiff   = 3
	weeklyStar5RateHighTh   = 0.55
	weeklyStar5RateSampleMin = 5
)

type StoreAnalysisUsecase struct {
	analysisRepo repository.StoreAnalysisRepository
	reviewRepo   repository.ReviewRepository
	storeRepo    repository.StoreRepository
	db           *sqlx.DB
}

func NewStoreAnalysisUsecase(
	analysisRepo repository.StoreAnalysisRepository,
	reviewRepo repository.ReviewRepository,
	storeRepo repository.StoreRepository,
	db *sqlx.DB,
) *StoreAnalysisUsecase {
	return &StoreAnalysisUsecase{analysisRepo: analysisRepo, reviewRepo: reviewRepo, storeRepo: storeRepo, db: db}
}

// Get — 保存済みの店舗分析を取得
func (u *StoreAnalysisUsecase) Get(ctx context.Context, salonID, storeID uint64) (*model.StoreAnalysis, error) {
	store, err := u.storeRepo.FindByID(ctx, storeID)
	if err != nil || store == nil {
		return nil, fmt.Errorf("store not found")
	}
	if store.SalonID != salonID {
		return nil, fmt.Errorf("forbidden")
	}
	return u.analysisRepo.FindByStoreID(ctx, storeID)
}

// Generate — 週次観測を集計してAI言語化・保存
func (u *StoreAnalysisUsecase) Generate(ctx context.Context, salonID, storeID uint64) (*model.StoreAnalysis, error) {
	store, err := u.storeRepo.FindByID(ctx, storeID)
	if err != nil || store == nil {
		return nil, fmt.Errorf("store not found")
	}
	if store.SalonID != salonID {
		return nil, fmt.Errorf("forbidden")
	}

	// 前回observation を取得（変化検出用）
	prev, _ := u.analysisRepo.FindByStoreID(ctx, storeID)

	now := time.Now()
	curEnd := now
	curStart := curEnd.AddDate(0, 0, -weeklyPeriodDays+1)
	prevEnd := curStart.AddDate(0, 0, -1)
	prevStart := prevEnd.AddDate(0, 0, -weeklyPeriodDays+1)

	// ── 数値集計 ─────────────────────────────────
	metrics, err := u.aggregateWeeklyMetrics(ctx, storeID, curStart, curEnd)
	if err != nil {
		return nil, fmt.Errorf("aggregate current metrics: %w", err)
	}
	var prevWeekMetrics *model.StoreMetrics
	if pm, err := u.aggregateWeeklyMetrics(ctx, storeID, prevStart, prevEnd); err == nil {
		prevWeekMetrics = &pm
	}

	applyStoreAnomalyGate(&metrics)

	// 直近7日の口コミを取得（コメント要素抽出用）
	reviews, err := u.fetchStoreReviewsInRange(ctx, store.SalonID, storeID, curStart, curEnd)
	if err != nil {
		return nil, fmt.Errorf("fetch reviews: %w", err)
	}

	observations := u.detectStoreObservations(metrics, prevWeekMetrics)

	// AI 要素抽出
	elements := []model.CommentElement{}
	if len(reviews) >= weeklyMinReviews {
		if extracted, err := u.extractStoreCommentElements(ctx, reviews); err == nil {
			elements = extracted
		} else {
			log.Printf("[store.analysis] element extract failed: %v", err)
		}
	}

	// AI ナラティブ生成
	narratives, err := u.buildStoreNarratives(ctx, store.Name, metrics, elements, prevWeekMetrics)
	if err != nil {
		return nil, fmt.Errorf("build narratives: %w", err)
	}

	applyStoreExpressionGate(&narratives)
	applyStoreConsistencyGate(&narratives, metrics, prevWeekMetrics, elements)

	analysis := &model.StoreAnalysis{
		StoreID:         storeID,
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
	if saved, err := u.analysisRepo.FindByStoreID(ctx, storeID); err == nil {
		return saved, nil
	}
	analysis.GeneratedAt = time.Now()
	return analysis, nil
}

// ─── 集計クエリ ─────────────────────────────────

func (u *StoreAnalysisUsecase) aggregateWeeklyMetrics(ctx context.Context, storeID uint64, start, end time.Time) (model.StoreMetrics, error) {
	startStr := start.Format("2006-01-02")
	endStr := end.Format("2006-01-02")
	m := model.StoreMetrics{
		PeriodStart: startStr,
		PeriodEnd:   endStr,
	}

	// 会計側：daily_sales の集計
	err := u.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(total_sales),0), COALESCE(SUM(tech_sales),0), COALESCE(SUM(retail_sales),0), COALESCE(SUM(client_count),0)
		 FROM daily_sales WHERE store_id = ? AND date BETWEEN ? AND ?`,
		storeID, startStr, endStr,
	).Scan(&m.TotalSales, &m.TechSales, &m.RetailSales, &m.ClientCount)
	if err != nil {
		return m, fmt.Errorf("daily_sales aggregate: %w", err)
	}

	// 施術件数・指名比率
	startDT := start.Format("2006-01-02 00:00:00")
	endDT := end.Format("2006-01-02 23:59:59")
	var treatCount, shimeiCount uint32
	err = u.db.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_shimei = 1 THEN 1 ELSE 0 END), 0)
		 FROM treatments WHERE store_id = ? AND performed_at BETWEEN ? AND ?`,
		storeID, startDT, endDT,
	).Scan(&treatCount, &shimeiCount)
	if err == nil {
		m.TreatmentCount = treatCount
		if treatCount > 0 {
			nom := float64(shimeiCount) / float64(treatCount)
			m.NominationRatio = &nom
		}
	}
	if m.ClientCount > 0 {
		avg := float64(m.TotalSales) / float64(m.ClientCount)
		m.AveragePerClient = &avg
	}

	// 口コミ側
	var reviewCount, finish5, service5, low uint32
	err = u.db.QueryRowContext(ctx,
		`SELECT COUNT(*),
		        COALESCE(SUM(CASE WHEN rating_finish = 5 THEN 1 ELSE 0 END), 0),
		        COALESCE(SUM(CASE WHEN rating_service = 5 THEN 1 ELSE 0 END), 0),
		        COALESCE(SUM(CASE WHEN rating_overall <= 2 THEN 1 ELSE 0 END), 0)
		 FROM reviews
		 WHERE store_id = ? AND created_at BETWEEN ? AND ?`,
		storeID, startDT, endDT,
	).Scan(&reviewCount, &finish5, &service5, &low)
	if err == nil {
		m.ReviewCount = reviewCount
		m.StarLowCount = low
		if reviewCount >= weeklyStar5RateSampleMin {
			f := float64(finish5) / float64(reviewCount)
			s := float64(service5) / float64(reviewCount)
			m.FinishStar5Rate = &f
			m.ServiceStar5Rate = &s
		}
		if m.TreatmentCount > 0 {
			r := float64(reviewCount) / float64(m.TreatmentCount)
			m.ResponseRate = &r
		}
	}

	return m, nil
}

func (u *StoreAnalysisUsecase) fetchStoreReviewsInRange(ctx context.Context, salonID, storeID uint64, start, end time.Time) ([]*model.Review, error) {
	all, err := u.reviewRepo.FindBySalonID(ctx, salonID)
	if err != nil {
		return nil, err
	}
	out := make([]*model.Review, 0, len(all))
	for _, r := range all {
		if r.StoreID == nil || *r.StoreID != storeID {
			continue
		}
		if r.CreatedAt.Before(start) || r.CreatedAt.After(end.Add(24*time.Hour)) {
			continue
		}
		out = append(out, r)
	}
	return out, nil
}

// ─── パターン検出（層3） ────────────────────────

func (u *StoreAnalysisUsecase) detectStoreObservations(m model.StoreMetrics, prev *model.StoreMetrics) []model.Observation {
	out := make([]model.Observation, 0, 6)
	if prev == nil {
		return out
	}

	// 売上急変
	if prev.TotalSales > 0 {
		diff := (float64(m.TotalSales) - float64(prev.TotalSales)) / float64(prev.TotalSales)
		if diff >= weeklyPctChangeHigh {
			out = append(out, model.Observation{
				Key:      "sales_up",
				Label:    "総売上が前週から増加しています",
				Evidence: fmt.Sprintf("前週%d円 → 今週%d円（%+d%%）", prev.TotalSales, m.TotalSales, int(diff*100+0.5)),
				Tone:     "positive",
			})
		} else if diff <= -weeklyPctChangeHigh {
			out = append(out, model.Observation{
				Key:      "sales_down",
				Label:    "総売上が前週から減少しています",
				Evidence: fmt.Sprintf("前週%d円 → 今週%d円（%+d%%）", prev.TotalSales, m.TotalSales, int(diff*100+0.5)),
				Tone:     "attention",
			})
		}
	}

	// 客単価急変
	if m.AveragePerClient != nil && prev.AveragePerClient != nil && *prev.AveragePerClient > 0 {
		diff := (*m.AveragePerClient - *prev.AveragePerClient) / *prev.AveragePerClient
		if diff >= weeklyUnitPriceDiffPct {
			out = append(out, model.Observation{
				Key:      "unit_price_up",
				Label:    "客単価が前週から上昇しています",
				Evidence: fmt.Sprintf("前週%d円 → 今週%d円（%+d%%）", int(*prev.AveragePerClient), int(*m.AveragePerClient), int(diff*100+0.5)),
				Tone:     "positive",
			})
		} else if diff <= -weeklyUnitPriceDiffPct {
			out = append(out, model.Observation{
				Key:      "unit_price_down",
				Label:    "客単価が前週から下がっています",
				Evidence: fmt.Sprintf("前週%d円 → 今週%d円（%+d%%）", int(*prev.AveragePerClient), int(*m.AveragePerClient), int(diff*100+0.5)),
				Tone:     "attention",
			})
		}
	}

	// 口コミ流入増減
	rDiff := int(m.ReviewCount) - int(prev.ReviewCount)
	if rDiff >= weeklyReviewsFlowDiff {
		out = append(out, model.Observation{
			Key:      "reviews_flow_up",
			Label:    "口コミの流入が前週から増えています",
			Evidence: fmt.Sprintf("前週%d件 → 今週%d件（%+d件）", prev.ReviewCount, m.ReviewCount, rDiff),
			Tone:     "positive",
		})
	} else if rDiff <= -weeklyReviewsFlowDiff && prev.ReviewCount >= weeklyReviewsFlowDiff {
		out = append(out, model.Observation{
			Key:      "reviews_flow_down",
			Label:    "口コミの流入が前週から減っています",
			Evidence: fmt.Sprintf("前週%d件 → 今週%d件（%+d件）", prev.ReviewCount, m.ReviewCount, rDiff),
			Tone:     "attention",
		})
	}

	// 会計×口コミ乖離（施術件数増 vs ★5率低下）
	if m.FinishStar5Rate != nil && prev.FinishStar5Rate != nil {
		treatDiff := int(m.TreatmentCount) - int(prev.TreatmentCount)
		rateDiff := *m.FinishStar5Rate - *prev.FinishStar5Rate
		if treatDiff > 0 && rateDiff <= -0.10 {
			out = append(out, model.Observation{
				Key:      "volume_up_quality_down",
				Label:    "施術件数が増える中で仕上がり★5率が下がっています",
				Evidence: fmt.Sprintf("施術%d → %d件、仕上がり★5率%.0f%% → %.0f%%（%+.0fpt）", prev.TreatmentCount, m.TreatmentCount, *prev.FinishStar5Rate*100, *m.FinishStar5Rate*100, rateDiff*100),
				Tone:     "attention",
			})
		}
	}

	log.Printf("[store.observations] store_id detected=%d", len(out))
	return out
}

// ─── AI: コメント要素抽出 ─────────────────────────

func (u *StoreAnalysisUsecase) extractStoreCommentElements(ctx context.Context, reviews []*model.Review) ([]model.CommentElement, error) {
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

// ─── AI: ナラティブ生成 ─────────────────────────

func (u *StoreAnalysisUsecase) buildStoreNarratives(ctx context.Context, storeName string, m model.StoreMetrics, elems []model.CommentElement, prev *model.StoreMetrics) (model.StoreNarratives, error) {
	prompt := buildStoreNarrativesPrompt(storeName, m, elems, prev)
	text, err := callClaudeText(ctx, "claude-haiku-4-5", 768, prompt)
	if err != nil {
		return model.StoreNarratives{}, err
	}
	n, err := parseStoreNarratives(text)
	if err != nil {
		return model.StoreNarratives{}, err
	}
	return *n, nil
}

func buildStoreNarrativesPrompt(storeName string, m model.StoreMetrics, elems []model.CommentElement, prev *model.StoreMetrics) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("店舗「%s」の直近7日（%s〜%s）の観測データを、淡々とした事実文に整えてください。\n\n", storeName, m.PeriodStart, m.PeriodEnd))

	sb.WriteString("【会計観測数値】\n")
	sb.WriteString(fmt.Sprintf("- 総売上: %d円（技術%d円 / 物販%d円）\n", m.TotalSales, m.TechSales, m.RetailSales))
	sb.WriteString(fmt.Sprintf("- 客数: %d名\n", m.ClientCount))
	sb.WriteString(fmt.Sprintf("- 施術件数: %d件\n", m.TreatmentCount))
	if m.AveragePerClient != nil {
		sb.WriteString(fmt.Sprintf("- 客単価: %d円\n", int(*m.AveragePerClient)))
	}
	if m.NominationRatio != nil {
		sb.WriteString(fmt.Sprintf("- 指名比率: %.0f%%\n", *m.NominationRatio*100))
	}

	sb.WriteString("\n【口コミ観測数値】\n")
	sb.WriteString(fmt.Sprintf("- 口コミ件数: %d件\n", m.ReviewCount))
	if m.FinishStar5Rate != nil {
		sb.WriteString(fmt.Sprintf("- 仕上がり★5率: %.0f%%\n", *m.FinishStar5Rate*100))
	}
	if m.ServiceStar5Rate != nil {
		sb.WriteString(fmt.Sprintf("- 接客★5率: %.0f%%\n", *m.ServiceStar5Rate*100))
	}
	sb.WriteString(fmt.Sprintf("- ★1〜2の件数: %d件\n", m.StarLowCount))

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
		sb.WriteString("\n【前週からの差分】\n")
		if prev.TotalSales > 0 {
			diff := int(m.TotalSales) - int(prev.TotalSales)
			sb.WriteString(fmt.Sprintf("- 総売上: %d → %d円（%+d円）\n", prev.TotalSales, m.TotalSales, diff))
		}
		if prev.ClientCount > 0 {
			sb.WriteString(fmt.Sprintf("- 客数: %d → %d名（%+d名）\n", prev.ClientCount, m.ClientCount, int(m.ClientCount)-int(prev.ClientCount)))
		}
		if m.AveragePerClient != nil && prev.AveragePerClient != nil {
			sb.WriteString(fmt.Sprintf("- 客単価: %d → %d円（%+d円）\n", int(*prev.AveragePerClient), int(*m.AveragePerClient), int(*m.AveragePerClient)-int(*prev.AveragePerClient)))
		}
		if prev.ReviewCount != m.ReviewCount {
			sb.WriteString(fmt.Sprintf("- 口コミ件数: %d → %d件（%+d件）\n", prev.ReviewCount, m.ReviewCount, int(m.ReviewCount)-int(prev.ReviewCount)))
		}
		writeStarDiff := func(label string, cur, before *float64) {
			if cur == nil || before == nil {
				return
			}
			sb.WriteString(fmt.Sprintf("- %s: %.0f%% → %.0f%%（%+.0fpt）\n", label, *before*100, *cur*100, (*cur-*before)*100))
		}
		writeStarDiff("仕上がり★5率", m.FinishStar5Rate, prev.FinishStar5Rate)
		writeStarDiff("接客★5率", m.ServiceStar5Rate, prev.ServiceStar5Rate)
	}

	sb.WriteString(`
【厳守ルール】これは "教育インサイト" ではなく "観測ダッシュボード" です。
- 事実を淡々と述べる。解釈・因果・改善指示を含めない。
- 「〜すべき」「〜したほうがよい」「〜しましょう」「〜してください」等の指示語は禁止。
- 問いかけ調・励まし語は禁止。
- 「不足」「弱み」「劣る」等のネガティブ評価語は使わず、「まだ件数が少ない」等の "余地" フレームに置く。
- 数字は上記【観測数値】から引用してよいが、存在しない数値を書かないこと。

【出力】
JSON オブジェクトのみ。前置き・後置き・コードフェンス不要。フィールドは以下:
{
  "strength": "強みの観測文。1文（40〜80文字目安）。数字を1つ以上含める。",
  "change": "前週からの変化を淡々と述べる1文。前週データが与えられている場合のみ生成。値の推移だけ書き、良し悪しの評価語は禁止。有意な差分がない or 前週データがなければ null。",
  "room": "余地1つ（「まだ〜これから見えてくる段階」の文）。強みが明確でない場合は null。",
  "mirror": "変化が映る鏡（「〜すると、ここに変化が表示されます」の1文）。指図せず、次に見る場所を示すのみ。"
}
`)
	return sb.String()
}

func parseStoreNarratives(raw string) (*model.StoreNarratives, error) {
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
	var out model.StoreNarratives
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ─── 出力ゲート ──────────────────────────────────

func applyStoreExpressionGate(n *model.StoreNarratives) {
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
		n.Mirror = "新しい会計や口コミが集まると、この画面に変化が表示されます。"
	}
}

func applyStoreConsistencyGate(n *model.StoreNarratives, m model.StoreMetrics, prev *model.StoreMetrics, elements []model.CommentElement) {
	allowed := storeAllowedNumbers(m, prev, elements)
	if !checkNumbersInText(n.Strength, allowed) {
		log.Printf("[store.consistency_gate] strength: mismatch=%q", n.Strength)
		n.Strength = "観測値の言語化に成功しませんでした。数値と要素表示をご参照ください。"
	}
	if n.Change != nil && !checkNumbersInText(*n.Change, allowed) {
		log.Printf("[store.consistency_gate] change: mismatch=%q", *n.Change)
		n.Change = nil
	}
	if n.Room != nil && !checkNumbersInText(*n.Room, allowed) {
		log.Printf("[store.consistency_gate] room: mismatch=%q", *n.Room)
		n.Room = nil
	}
}

// storeAllowedNumbers — narrative に含めてよい数値集合
func storeAllowedNumbers(m model.StoreMetrics, prev *model.StoreMetrics, elements []model.CommentElement) map[string]bool {
	out := make(map[string]bool)
	addPct := func(v *float64) {
		if v == nil {
			return
		}
		p := int(*v*100 + 0.5)
		for d := -1; d <= 1; d++ {
			out[fmt.Sprintf("%d%%", p+d)] = true
		}
	}
	addCount := func(v uint32) {
		out[fmt.Sprintf("%d件", v)] = true
	}
	addYen := func(v uint32) {
		out[fmt.Sprintf("%d円", v)] = true
	}
	addYenF := func(v *float64) {
		if v == nil {
			return
		}
		out[fmt.Sprintf("%d円", int(*v))] = true
	}
	addName := func(v uint32) {
		out[fmt.Sprintf("%d名", v)] = true
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

	addYen(m.TotalSales)
	addYen(m.TechSales)
	addYen(m.RetailSales)
	addYenF(m.AveragePerClient)
	addName(m.ClientCount)
	addCount(m.TreatmentCount)
	addCount(m.ReviewCount)
	addCount(m.StarLowCount)
	addPct(m.FinishStar5Rate)
	addPct(m.ServiceStar5Rate)
	addPct(m.NominationRatio)
	addPct(m.ResponseRate)

	if prev != nil {
		addYen(prev.TotalSales)
		addYen(prev.TechSales)
		addYen(prev.RetailSales)
		addYenF(prev.AveragePerClient)
		addName(prev.ClientCount)
		addCount(prev.TreatmentCount)
		addCount(prev.ReviewCount)
		addPct(prev.FinishStar5Rate)
		addPct(prev.ServiceStar5Rate)
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
	for _, e := range elements {
		addCount(e.Count)
	}
	return out
}

// 異常値ゲート：レビュー件数が少ないのに★5率が極端値のケースは表示保留
func applyStoreAnomalyGate(m *model.StoreMetrics) {
	if m.ReviewCount < weeklyStar5RateSampleMin {
		if m.FinishStar5Rate != nil && (*m.FinishStar5Rate == 0 || *m.FinishStar5Rate == 1) {
			m.FinishStar5Rate = nil
		}
		if m.ServiceStar5Rate != nil && (*m.ServiceStar5Rate == 0 || *m.ServiceStar5Rate == 1) {
			m.ServiceStar5Rate = nil
		}
	}
}
