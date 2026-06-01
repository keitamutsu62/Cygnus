package usecase

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type AIUsecase struct {
	salesRepo repository.SalesRepository
	staffRepo repository.StaffRepository
}

func NewAIUsecase(salesRepo repository.SalesRepository, staffRepo repository.StaffRepository) *AIUsecase {
	return &AIUsecase{salesRepo: salesRepo, staffRepo: staffRepo}
}

type StaffAnalysisOutput struct {
	// Claude API 連携後はここに生成テキストが入る
	Analysis string `json:"analysis"`
	// デバッグ用：API 連携後は除外してよい
	Prompt string `json:"prompt,omitempty"`
}

// Analyze は staffID の過去30日売上データを収集しプロンプトを組み立てる。
// TODO: プロンプトを Anthropic Claude API に投げて analysis を返す。
//       現時点では stub テキストを返す。
func (u *AIUsecase) Analyze(ctx context.Context, staffID uint64) (*StaffAnalysisOutput, error) {
	// ── スタッフ情報 ─────────────────────────────────────────
	staff, err := u.staffRepo.FindByID(ctx, staffID)
	if err != nil {
		return nil, fmt.Errorf("AIUsecase.Analyze: staff not found: %w", err)
	}

	// ── 過去30日の日次売上 ───────────────────────────────────
	now  := time.Now()
	from := now.AddDate(0, 0, -30).Format("2006-01-02")
	to   := now.Format("2006-01-02")

	dailySales, err := u.salesRepo.FindStaffDailySales(ctx, staffID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AIUsecase.Analyze: fetch sales: %w", err)
	}

	// ── 集計 ────────────────────────────────────────────────
	stats := calcStats(dailySales)

	// ── プロンプト組み立て ────────────────────────────────────
	prompt := buildPrompt(staff, stats, from, to)

	// ── TODO: Claude API 呼び出し ────────────────────────────
	// ここを以下のように差し替えるだけで本番 AI 分析が動く:
	//
	//   client := anthropic.NewClient(os.Getenv("ANTHROPIC_API_KEY"))
	//   msg, err := client.Messages.New(ctx, anthropic.MessageNewParams{
	//       Model: "claude-opus-4-5",
	//       MaxTokens: 1024,
	//       Messages: []anthropic.MessageParam{
	//           anthropic.NewUserTextMessage(prompt),
	//       },
	//   })
	//   if err != nil { return nil, err }
	//   analysis := msg.Content[0].Text
	//
	// ── スタブ応答 ───────────────────────────────────────────
	analysis := buildStubAnalysis(staff, stats)

	return &StaffAnalysisOutput{
		Analysis: analysis,
		Prompt:   prompt, // 本番では空文字列にする
	}, nil
}

// ─── 統計計算 ────────────────────────────────────────────────────────────

type staffStats struct {
	WorkDays     int
	TotalSales   uint64
	TotalClients uint64
	TotalRetail  uint64
	AvgDailySales float64
	AvgUnitPrice  float64
	BestDay      string
	BestDaySales uint32
	WeeklyTrend  [4]uint64 // 4週分の週次合計（古い順）
}

func calcStats(records []*model.StaffDailySales) staffStats {
	var s staffStats
	if len(records) == 0 {
		return s
	}

	for _, r := range records {
		if r.TotalSales > 0 {
			s.WorkDays++
			s.TotalSales   += uint64(r.TotalSales)
			s.TotalClients += uint64(r.ClientCount)
			s.TotalRetail  += uint64(r.RetailSales)
		}
		if r.TotalSales > s.BestDaySales {
			s.BestDaySales = r.TotalSales
			s.BestDay      = r.Date[:10]
		}
	}

	if s.WorkDays > 0 {
		s.AvgDailySales = float64(s.TotalSales) / float64(s.WorkDays)
	}
	if s.TotalClients > 0 {
		s.AvgUnitPrice = float64(s.TotalSales) / float64(s.TotalClients)
	}

	// 週次集計（records は date DESC 順）
	sort.Slice(records, func(i, j int) bool { return records[i].Date < records[j].Date })
	now := time.Now()
	for _, r := range records {
		d, err := time.Parse("2006-01-02", r.Date[:10])
		if err != nil {
			continue
		}
		daysAgo := int(math.Round(now.Sub(d).Hours() / 24))
		weekIdx := daysAgo / 7
		if weekIdx < 4 {
			s.WeeklyTrend[3-weekIdx] += uint64(r.TotalSales)
		}
	}

	return s
}

// ─── プロンプト ───────────────────────────────────────────────────────────

func buildPrompt(staff *model.Staff, s staffStats, from, to string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("以下は美容師スタッフ「%s」さんの%sから%sまでの売上データです。\n\n", staff.Name, from, to))
	sb.WriteString("▼ 期間サマリー\n")
	sb.WriteString(fmt.Sprintf("- 合計売上: ¥%s\n", fmtNum(s.TotalSales)))
	sb.WriteString(fmt.Sprintf("- 稼働日数: %d日\n", s.WorkDays))
	sb.WriteString(fmt.Sprintf("- 平均日次売上: ¥%s\n", fmtNum(uint64(s.AvgDailySales))))
	sb.WriteString(fmt.Sprintf("- 総担当客数: %d名\n", s.TotalClients))
	sb.WriteString(fmt.Sprintf("- 平均客単価: ¥%s\n", fmtNum(uint64(s.AvgUnitPrice))))
	sb.WriteString(fmt.Sprintf("- 物販売上: ¥%s\n", fmtNum(s.TotalRetail)))
	if s.BestDay != "" {
		sb.WriteString(fmt.Sprintf("- 最高売上日: %s（¥%s）\n", s.BestDay, fmtNum(uint64(s.BestDaySales))))
	}
	sb.WriteString("\n▼ 週次推移（古い順）\n")
	labels := []string{"4週前", "3週前", "2週前", "直近1週"}
	for i, label := range labels {
		sb.WriteString(fmt.Sprintf("- %s: ¥%s\n", label, fmtNum(s.WeeklyTrend[i])))
	}
	sb.WriteString("\nこのデータをもとに、このスタッフの「得意な施術領域」「強み」「改善できるポイント」を200字程度で分析してください。")
	sb.WriteString("美容師向けの実践的なアドバイスを含めてください。")
	return sb.String()
}

// ─── スタブ応答（API 連携後は削除） ──────────────────────────────────────

func buildStubAnalysis(staff *model.Staff, s staffStats) string {
	if s.WorkDays == 0 {
		return fmt.Sprintf("%sさんの分析データがまだありません。施術記録を積み重ねることで、AIが得意領域を分析できるようになります。", staff.Name)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("【%s さんの得意領域分析】\n\n", staff.Name))

	// 売上傾向コメント
	if s.WeeklyTrend[3] > s.WeeklyTrend[0] && s.WeeklyTrend[0] > 0 {
		growth := float64(s.WeeklyTrend[3]-s.WeeklyTrend[0]) / float64(s.WeeklyTrend[0]) * 100
		sb.WriteString(fmt.Sprintf("📈 直近4週間で売上が %.0f%% 成長しています。", growth))
		sb.WriteString("安定した顧客獲得ができており、指名客が増加傾向にあると推測されます。\n\n")
	} else {
		sb.WriteString("📊 安定した売上を維持しています。")
		sb.WriteString("既存顧客のリピート率が高く、信頼関係が築けていると考えられます。\n\n")
	}

	// 客単価コメント
	if s.AvgUnitPrice >= 15000 {
		sb.WriteString("💡 客単価が高く、カラーやパーマなど技術単価の高い施術が得意と推測されます。")
		sb.WriteString("トリートメントや物販のクロスセルでさらなる向上が見込めます。\n\n")
	} else {
		sb.WriteString("💡 担当客数が多く、幅広い顧客層に対応できる対応力が強みです。")
		sb.WriteString("技術単価の高いメニューの提案を増やすことで客単価向上が期待できます。\n\n")
	}

	// 物販コメント
	retailRate := 0.0
	if s.TotalSales > 0 {
		retailRate = float64(s.TotalRetail) / float64(s.TotalSales) * 100
	}
	if retailRate >= 10 {
		sb.WriteString(fmt.Sprintf("🛍 物販比率 %.0f%% と高水準。ホームケア提案力が優れています。", retailRate))
	} else {
		sb.WriteString("🛍 物販提案の余地があります。施術後のホームケアアドバイスで物販比率10%%を目指しましょう。")
	}

	return sb.String()
}

func fmtNum(n uint64) string {
	s := fmt.Sprintf("%d", n)
	result := make([]byte, 0, len(s)+len(s)/3)
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, ',')
		}
		result = append(result, byte(c))
	}
	return string(result)
}
