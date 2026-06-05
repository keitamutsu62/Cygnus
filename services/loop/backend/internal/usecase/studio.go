package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StudioUsecase struct {
	accountRepo repository.CygnusAccountRepository
	profileRepo repository.ProfileRepository
	workRepo    repository.WorkRepository
	memoRepo    repository.StudioMemoRepository
}

func NewStudioUsecase(
	accountRepo repository.CygnusAccountRepository,
	profileRepo repository.ProfileRepository,
	workRepo repository.WorkRepository,
	memoRepo repository.StudioMemoRepository,
) *StudioUsecase {
	return &StudioUsecase{accountRepo: accountRepo, profileRepo: profileRepo, workRepo: workRepo, memoRepo: memoRepo}
}

// ─── Profile ─────────────────────────────────────────────────

func (u *StudioUsecase) GetMyProfile(ctx context.Context, accountID uint64) (*model.Profile, error) {
	p, err := u.profileRepo.FindByAccountID(ctx, accountID)
	if err != nil {
		// プロフィール未作成の場合は空のプロフィールを返す
		return &model.Profile{CygnusAccountID: accountID}, nil
	}
	return p, nil
}

type UpsertProfileInput struct {
	AccountID    uint64
	Bio          *string
	Specialties  *string // JSON文字列
	InstagramURL *string
	IsPublished  bool
}

func (u *StudioUsecase) UpsertProfile(ctx context.Context, in UpsertProfileInput) (*model.Profile, error) {
	p := &model.Profile{
		CygnusAccountID: in.AccountID,
		Bio:             in.Bio,
		Specialties:     in.Specialties,
		InstagramURL:    in.InstagramURL,
		IsPublished:     in.IsPublished,
	}
	if err := u.profileRepo.Upsert(ctx, p); err != nil {
		return nil, fmt.Errorf("UpsertProfile: %w", err)
	}
	return p, nil
}

// GetPublicProfile は公開済みプロフィールをcygnus_idで取得する（RESERVE用）
func (u *StudioUsecase) GetPublicProfile(ctx context.Context, cygnusID string) (*model.CygnusAccount, *model.Profile, []*model.Work, error) {
	account, err := u.accountRepo.FindByCygnusID(ctx, cygnusID)
	if err != nil {
		return nil, nil, nil, apierror.ErrNotFound
	}
	profile, _ := u.profileRepo.FindByAccountID(ctx, account.ID)
	works, _ := u.workRepo.FindPublishedByAccountID(ctx, account.ID)
	return account, profile, works, nil
}

// ─── Works ───────────────────────────────────────────────────

func (u *StudioUsecase) ListMyWorks(ctx context.Context, accountID uint64) ([]*model.Work, error) {
	return u.workRepo.FindByAccountID(ctx, accountID)
}

type CreateWorkInput struct {
	AccountID   uint64
	MenuID      *uint64
	Title       *string
	Description *string
	ImageURL    string
	Tags        *string // JSON文字列
	IsPublished bool
}

func (u *StudioUsecase) CreateWork(ctx context.Context, in CreateWorkInput) (*model.Work, error) {
	w := &model.Work{
		CygnusAccountID: in.AccountID,
		MenuID:          in.MenuID,
		Title:           in.Title,
		Description:     in.Description,
		ImageURL:        in.ImageURL,
		Tags:            in.Tags,
		IsPublished:     in.IsPublished,
	}
	if err := u.workRepo.Create(ctx, w); err != nil {
		return nil, fmt.Errorf("CreateWork: %w", err)
	}
	return w, nil
}

type UpdateWorkInput struct {
	ID          uint64
	AccountID   uint64
	MenuID      *uint64
	Title       *string
	Description *string
	ImageURL    string
	Tags        *string
	IsPublished bool
}

func (u *StudioUsecase) UpdateWork(ctx context.Context, in UpdateWorkInput) (*model.Work, error) {
	existing, err := u.workRepo.FindByID(ctx, in.ID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	if existing.CygnusAccountID != in.AccountID {
		return nil, apierror.ErrForbidden
	}
	existing.MenuID = in.MenuID
	existing.Title = in.Title
	existing.Description = in.Description
	existing.ImageURL = in.ImageURL
	existing.Tags = in.Tags
	existing.IsPublished = in.IsPublished
	if err := u.workRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("UpdateWork: %w", err)
	}
	return existing, nil
}

func (u *StudioUsecase) DeleteWork(ctx context.Context, id, accountID uint64) error {
	existing, err := u.workRepo.FindByID(ctx, id)
	if err != nil {
		return apierror.ErrNotFound
	}
	if existing.CygnusAccountID != accountID {
		return apierror.ErrForbidden
	}
	return u.workRepo.Delete(ctx, id)
}

// SuggestBio はプロフィールの得意施術をもとに自己紹介文を生成する。
// TODO: ANTHROPIC_API_KEY が設定されていれば Claude API で生成する。
func (u *StudioUsecase) SuggestBio(ctx context.Context, accountID uint64) (string, error) {
	profile, _ := u.profileRepo.FindByAccountID(ctx, accountID)

	var specialties []string
	if profile != nil && profile.Specialties != nil {
		_ = json.Unmarshal([]byte(*profile.Specialties), &specialties)
	}

	works, _ := u.workRepo.FindByAccountID(ctx, accountID)
	workCount := len(works)

	return buildBioSuggestion(specialties, workCount), nil
}

// ─── Memos ──────────────────────────────────────────────────

func (u *StudioUsecase) GetTodayMemo(ctx context.Context, accountID uint64) (*model.StudioMemo, error) {
	today := time.Now().Format("2006-01-02")
	return u.memoRepo.FindTodayByAccountID(ctx, accountID, today)
}

func (u *StudioUsecase) UpsertMemo(ctx context.Context, accountID uint64, text string) (*model.StudioMemo, error) {
	today := time.Now().Format("2006-01-02")
	m := &model.StudioMemo{CygnusAccountID: accountID, MemoDate: today, Text: text}
	if err := u.memoRepo.Upsert(ctx, m); err != nil {
		return nil, fmt.Errorf("UpsertMemo: %w", err)
	}
	saved, err := u.memoRepo.FindTodayByAccountID(ctx, accountID, today)
	if err != nil || saved == nil {
		return m, nil
	}
	return saved, nil
}

func (u *StudioUsecase) ListMemos(ctx context.Context, accountID uint64) ([]*model.StudioMemo, error) {
	return u.memoRepo.FindByAccountID(ctx, accountID)
}

func buildBioSuggestion(specialties []string, workCount int) string {
	if len(specialties) == 0 {
		return "お客様一人ひとりの個性と魅力を引き出すスタイリングを大切にしています。ご要望をしっかりお伺いし、理想のスタイルをご提案いたします。"
	}

	var sb strings.Builder
	main := specialties[0]

	switch main {
	case "カラー":
		sb.WriteString("カラーを得意としており、肌のトーンに合わせた自然な発色を追求しています。")
	case "カット":
		sb.WriteString("カットを得意としており、骨格や髪質を見極めた似合わせスタイルをご提案します。")
	case "パーマ":
		sb.WriteString("パーマを得意としており、ダメージを最小限に抑えながら理想のウェーブを表現します。")
	case "縮毛矯正":
		sb.WriteString("縮毛矯正を得意としており、自然なストレートから艶やかなサラサラヘアまで対応します。")
	case "トリートメント":
		sb.WriteString("トリートメントを得意としており、髪の内側からケアして美しい艶髪へ導きます。")
	case "ヘアセット":
		sb.WriteString("ヘアセットを得意としており、大切な日のスタイルを丁寧に仕上げます。")
	case "ブリーチ":
		sb.WriteString("ブリーチを得意としており、ダメージケアと両立したハイトーンカラーが得意です。")
	case "インナーカラー":
		sb.WriteString("インナーカラーを得意としており、動きに合わせて表情が変わるデザインカラーを提案します。")
	default:
		sb.WriteString(fmt.Sprintf("%sを得意としています。", main))
	}

	if len(specialties) > 1 {
		sb.WriteString(fmt.Sprintf("%sなども得意としており、", strings.Join(specialties[1:], "・")))
		sb.WriteString("幅広いスタイルに対応できます。")
	}

	if workCount > 0 {
		sb.WriteString(fmt.Sprintf("これまでの施術実績をアーカイブに掲載していますので、ぜひご覧ください。"))
	} else {
		sb.WriteString("お客様の「なりたい」を一緒に叶えていきましょう。")
	}

	return sb.String()
}
