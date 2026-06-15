package usecase

import (
	"context"
	"fmt"
	"math"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
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
	Analysis string `json:"analysis"`
}

// Analyze は staffID の過去30日売上データ＋メニュー別内訳を収集し、
// ANTHROPIC_API_KEY が設定されていれば Claude API で分析する。
// 未設定の場合はスタブテキストを返す。
func (u *AIUsecase) Analyze(ctx context.Context, staffID uint64) (*StaffAnalysisOutput, error) {
	staff, err := u.staffRepo.FindByID(ctx, staffID)
	if err != nil {
		return nil, fmt.Errorf("AIUsecase.Analyze: staff not found: %w", err)
	}

	now  := time.Now()
	from := now.AddDate(0, 0, -30).Format("2006-01-02")
	to   := now.Format("2006-01-02")

	dailySales, err := u.salesRepo.FindStaffDailySales(ctx, staffID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AIUsecase.Analyze: fetch daily sales: %w", err)
	}

	menuSales, err := u.salesRepo.FindStaffMenuSales(ctx, staffID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AIUsecase.Analyze: fetch menu sales: %w", err)
	}

	stats  := calcStats(dailySales)
	prompt := buildPrompt(staff, stats, menuSales, from, to)

	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		client := anthropic.NewClient(option.WithAPIKey(apiKey))
		msg, err := client.Messages.New(ctx, anthropic.MessageNewParams{
			Model:     anthropic.ModelClaudeHaiku4_5,
			MaxTokens: 1024,
			Messages: []anthropic.MessageParam{
				anthropic.NewUserMessage(anthropic.NewTextBlock(prompt)),
			},
		})
		if err == nil && len(msg.Content) > 0 {
			return &StaffAnalysisOutput{Analysis: msg.Content[0].Text}, nil
		}
	}

	return &StaffAnalysisOutput{Analysis: buildStubAnalysis(staff, stats, menuSales)}, nil
}

// ─── 統計計算 ────────────────────────────────────────────────────────────

type staffStats struct {
	WorkDays      int
	TotalSales    uint64
	TotalClients  uint64
	TotalRetail   uint64
	AvgDailySales float64
	AvgUnitPrice  float64
	BestDay       string
	BestDaySales  uint32
	WeeklyTrend   [4]uint64
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

	sort.Slice(records, func(i, j int) bool { return records[i].Date < records[j].Date })
	now := time.Now()
	for _, r := range records {
		d, err := time.Parse("2006-01-02", r.Date[:10])
		if err != nil {
			continue
		}
		daysAgo := int(math.Round(now.Sub(d).Hours() / 24))
		weekIdx  := daysAgo / 7
		if weekIdx < 4 {
			s.WeeklyTrend[3-weekIdx] += uint64(r.TotalSales)
		}
	}

	return s
}

// ─── プロンプト ───────────────────────────────────────────────────────────

func buildPrompt(staff *model.Staff, s staffStats, menus []*repository.StaffMenuSalesSummary, from, to string) string {
	var sb strings.Builder

	sb.WriteString("あなたはプロの美容サロン経営コンサルタントです。\n")
	sb.WriteString("以下のデータをもとに、スタッフへの具体的なフィードバックを作成してください。\n\n")

	sb.WriteString(fmt.Sprintf("## スタッフ: %s\n", staff.Name))
	sb.WriteString(fmt.Sprintf("## 集計期間: %s 〜 %s（過去30日）\n\n", from, to))

	sb.WriteString("### 売上サマリー\n")
	if s.WorkDays == 0 {
		sb.WriteString("- この期間の施術記録がありません\n")
	} else {
		sb.WriteString(fmt.Sprintf("- 合計売上: ¥%s\n", fmtNum(s.TotalSales)))
		sb.WriteString(fmt.Sprintf("- 稼働日数: %d日\n", s.WorkDays))
		sb.WriteString(fmt.Sprintf("- 平均日次売上: ¥%s\n", fmtNum(uint64(s.AvgDailySales))))
		sb.WriteString(fmt.Sprintf("- 総担当客数: %d名\n", s.TotalClients))
		sb.WriteString(fmt.Sprintf("- 平均客単価: ¥%s\n", fmtNum(uint64(s.AvgUnitPrice))))
		retailRate := 0.0
		if s.TotalSales > 0 {
			retailRate = float64(s.TotalRetail) / float64(s.TotalSales) * 100
		}
		sb.WriteString(fmt.Sprintf("- 物販売上: ¥%s（売上比 %.1f%%）\n", fmtNum(s.TotalRetail), retailRate))
		if s.BestDay != "" {
			sb.WriteString(fmt.Sprintf("- 最高売上日: %s（¥%s）\n", s.BestDay, fmtNum(uint64(s.BestDaySales))))
		}
	}

	sb.WriteString("\n### 週次売上推移\n")
	labels := []string{"4週前", "3週前", "2週前", "直近1週"}
	for i, label := range labels {
		sb.WriteString(fmt.Sprintf("- %s: ¥%s\n", label, fmtNum(s.WeeklyTrend[i])))
	}

	if len(menus) > 0 {
		sb.WriteString("\n### メニュー別実績（上位10件）\n")
		limit := 10
		if len(menus) < limit {
			limit = len(menus)
		}
		for i, m := range menus[:limit] {
			pct := 0.0
			if s.TotalSales > 0 {
				pct = float64(m.TotalAmount) / float64(s.TotalSales) * 100
			}
			sb.WriteString(fmt.Sprintf("%d. %s: %d件 ¥%s（売上構成比 %.1f%%）\n",
				i+1, m.MenuName, m.TotalCount, fmtNum(uint64(m.TotalAmount)), pct))
		}
	}

	sb.WriteString("\n---\n")
	sb.WriteString("上記データを分析し、以下の3点を日本語で回答してください。\n")
	sb.WriteString("出力形式は必ずこの構造にしてください：\n\n")
	sb.WriteString("【得意な施術領域】\n（メニュー別実績をもとに、件数・売上比率が高い施術を具体的に挙げること）\n\n")
	sb.WriteString("【強み・特徴】\n（客単価・リピート傾向・物販力など数値から読み取れる強みを2〜3点）\n\n")
	sb.WriteString("【伸びしろ・改善ポイント】\n（データが示す弱点や、取り組むと効果的な具体的アクションを1〜2点）\n\n")
	sb.WriteString("各セクション100〜150字程度。数値を引用しながら具体的に書くこと。抽象的な表現は避けること。")

	return sb.String()
}

// ─── スタブ応答（ANTHROPIC_API_KEY 未設定時） ──────────────────────────────

func buildStubAnalysis(staff *model.Staff, s staffStats, menus []*repository.StaffMenuSalesSummary) string {
	if s.WorkDays == 0 {
		return fmt.Sprintf("【%s さんの得意領域分析】\n\n施術記録がまだありません。記録を積み重ねることでAIが詳細な分析を提供できるようになります。", staff.Name)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("【%s さんの得意領域分析】\n\n", staff.Name))
	sb.WriteString("※ AI分析はANTHROPIC_API_KEY設定後に有効になります。以下は集計データに基づく簡易表示です。\n\n")

	sb.WriteString("【得意な施術領域】\n")
	if len(menus) > 0 {
		top := menus[0]
		pct := float64(top.TotalAmount) / float64(s.TotalSales) * 100
		sb.WriteString(fmt.Sprintf("「%s」が売上の%.0f%%（¥%s / %d件）を占め、主力施術となっています。\n\n",
			top.MenuName, pct, fmtNum(uint64(top.TotalAmount)), top.TotalCount))
	} else {
		sb.WriteString("メニュー別データがありません。\n\n")
	}

	sb.WriteString("【強み・特徴】\n")
	if s.WeeklyTrend[3] > s.WeeklyTrend[0] && s.WeeklyTrend[0] > 0 {
		growth := float64(s.WeeklyTrend[3]-s.WeeklyTrend[0]) / float64(s.WeeklyTrend[0]) * 100
		sb.WriteString(fmt.Sprintf("直近4週で売上が%.0f%%成長。客単価¥%s。\n\n", growth, fmtNum(uint64(s.AvgUnitPrice))))
	} else {
		sb.WriteString(fmt.Sprintf("安定した売上を維持。客単価¥%s。\n\n", fmtNum(uint64(s.AvgUnitPrice))))
	}

	sb.WriteString("【伸びしろ・改善ポイント】\n")
	retailRate := float64(s.TotalRetail) / float64(s.TotalSales) * 100
	if retailRate < 10 {
		sb.WriteString(fmt.Sprintf("物販比率が%.1f%%と低め。ホームケア提案の強化で10%%超えを目指せます。", retailRate))
	} else {
		sb.WriteString(fmt.Sprintf("物販比率%.1f%%と良好。次は客単価のさらなる向上が課題です。", retailRate))
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
