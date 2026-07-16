package usecase

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
)

type ReviewImportUsecase struct {
	staffRepo  repository.StaffRepository
	reviewRepo repository.ReviewRepository
}

func NewReviewImportUsecase(staffRepo repository.StaffRepository, reviewRepo repository.ReviewRepository) *ReviewImportUsecase {
	return &ReviewImportUsecase{staffRepo: staffRepo, reviewRepo: reviewRepo}
}

type ExtractedReview struct {
	Author    string  `json:"author"`
	Date      string  `json:"date"`       // YYYY-MM-DD (推定含む)
	Rating    int     `json:"rating"`     // 1-5
	Text      string  `json:"text"`
	StaffHint string  `json:"staff_hint"` // 本文から検出したスタッフ名
	StaffID   *uint64 `json:"staff_id"`   // マッチしたLOOPスタッフID（サーバー側で埋める）
	StaffName *string `json:"staff_name"` // 同上
}

type ImportImage struct {
	Data      []byte
	MediaType string // image/png, image/jpeg
}

// Analyze — 複数のスクショ画像を Claude Vision に渡して口コミを抽出し、
// LOOP登録スタッフとの名前マッチも行って返す。
func (u *ReviewImportUsecase) Analyze(ctx context.Context, salonID uint64, images []ImportImage) ([]ExtractedReview, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is not set")
	}
	if len(images) == 0 {
		return []ExtractedReview{}, nil
	}

	content := make([]map[string]any, 0, len(images)+1)
	for _, img := range images {
		content = append(content, map[string]any{
			"type": "image",
			"source": map[string]any{
				"type":       "base64",
				"media_type": img.MediaType,
				"data":       base64.StdEncoding.EncodeToString(img.Data),
			},
		})
	}
	content = append(content, map[string]any{
		"type": "text",
		"text": buildImportPrompt(),
	})

	reqBody := map[string]any{
		"model":      "claude-sonnet-4-6",
		"max_tokens": 4096,
		"messages": []map[string]any{
			{"role": "user", "content": content},
		},
	}
	body, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 120 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic request: %w", err)
	}
	defer res.Body.Close()
	respBody, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anthropic api error status=%d body=%s", res.StatusCode, string(respBody))
	}

	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("parse anthropic response: %w", err)
	}
	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty anthropic response")
	}

	// 全てのtextブロックを結合
	var combined strings.Builder
	for _, c := range apiResp.Content {
		if c.Type == "text" {
			combined.WriteString(c.Text)
		}
	}
	extracted, err := parseExtractedReviews(combined.String())
	if err != nil {
		return nil, fmt.Errorf("parse extracted reviews: %w (raw=%s)", err, combined.String())
	}

	// LOOP登録スタッフとの名前マッチング
	staffs, err := u.staffRepo.FindBySalonID(ctx, salonID)
	if err == nil && len(staffs) > 0 {
		for i := range extracted {
			hint := strings.TrimSpace(extracted[i].StaffHint)
			if hint == "" {
				continue
			}
			for _, s := range staffs {
				if !s.IsActive {
					continue
				}
				if matchStaffName(s.Name, hint) {
					id := s.ID
					name := s.Name
					extracted[i].StaffID = &id
					extracted[i].StaffName = &name
					break
				}
			}
		}
	}
	return extracted, nil
}

type SaveReviewInput struct {
	StaffID       *uint64
	MenuID        *uint64
	RatingOverall uint8
	RatingFinish  uint8
	RatingService uint8
	Comment       *string
	CreatedAt     *time.Time
}

// BulkSave — 確認済みレビューをDBに一括保存
func (u *ReviewImportUsecase) BulkSave(ctx context.Context, salonID uint64, storeID *uint64, items []SaveReviewInput) (int, error) {
	saved := 0
	for _, it := range items {
		if it.RatingOverall < 1 || it.RatingOverall > 5 ||
			it.RatingFinish < 1 || it.RatingFinish > 5 ||
			it.RatingService < 1 || it.RatingService > 5 {
			continue
		}
		r := buildImportedReview(salonID, storeID, it)
		if err := u.reviewRepo.Create(ctx, r); err != nil {
			return saved, fmt.Errorf("review import save: %w", err)
		}
		saved++
	}
	return saved, nil
}

// ─── helpers ─────────────────────────────────────────────────

func buildImportPrompt() string {
	return `以下の画像は Google Maps の美容サロン口コミページのスクリーンショットです。
各口コミの情報を JSON 配列として1度だけ返してください。前置き・解説・コードフェンスは一切不要です。

各要素のフィールド:
- rating: 星の数 (1〜5 の整数)
- author: 投稿者名 (取得できない場合は空文字列 "")
- date: 投稿日 YYYY-MM-DD。相対表記 (例: "3ヶ月前") の場合は今日から逆算して推定してください。
- text: 口コミ本文 (改行・絵文字含めそのまま)
- staff_hint: 本文中に登場するスタッフの氏名 (姓のみ or フルネーム)。特定できなければ ""

重要:
- 重複する口コミは1件だけにしてください
- 「もっと見る」等で省略された本文は取得できる範囲だけで構いません
- 画像に口コミがなければ空配列 [] を返してください`
}

func parseExtractedReviews(raw string) ([]ExtractedReview, error) {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}
	re := regexp.MustCompile(`(?s)\[.*\]`)
	if m := re.FindString(s); m != "" {
		s = m
	}
	var out []ExtractedReview
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func buildImportedReview(salonID uint64, storeID *uint64, in SaveReviewInput) *model.Review {
	r := &model.Review{
		SalonID:       salonID,
		StoreID:       storeID,
		StaffID:       in.StaffID,
		MenuID:        in.MenuID,
		RatingOverall: in.RatingOverall,
		RatingFinish:  in.RatingFinish,
		RatingService: in.RatingService,
		Comment:       in.Comment,
	}
	if in.CreatedAt != nil && !in.CreatedAt.IsZero() {
		r.CreatedAt = *in.CreatedAt
	}
	return r
}

// matchStaffName — LOOP登録スタッフ名(name) と AI抽出したhint がマッチするか判定
func matchStaffName(name, hint string) bool {
	n := strings.TrimSpace(name)
	h := strings.TrimSpace(hint)
	if n == "" || h == "" {
		return false
	}
	if n == h {
		return true
	}
	// スペース区切りで姓/名を分割し、いずれかが完全一致すればマッチ
	nameParts := strings.Fields(strings.ReplaceAll(n, "　", " "))
	hintParts := strings.Fields(strings.ReplaceAll(h, "　", " "))
	for _, np := range nameParts {
		for _, hp := range hintParts {
			if np == hp {
				return true
			}
		}
	}
	// 部分一致（hintが姓のみのケース）
	if strings.Contains(n, h) || strings.Contains(h, n) {
		return true
	}
	return false
}
