package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/repository"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/storage"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StudioUsecase struct {
	db          *sqlx.DB
	accountRepo repository.CygnusAccountRepository
	profileRepo repository.ProfileRepository
	careerRepo  repository.CareerRepository
	workRepo    repository.WorkRepository
	memoRepo    repository.StudioMemoRepository
	imgStorage  storage.ImageStorage
}

func NewStudioUsecase(
	db          *sqlx.DB,
	accountRepo repository.CygnusAccountRepository,
	profileRepo repository.ProfileRepository,
	careerRepo  repository.CareerRepository,
	workRepo    repository.WorkRepository,
	memoRepo    repository.StudioMemoRepository,
	imgStorage  storage.ImageStorage,
) *StudioUsecase {
	return &StudioUsecase{
		db:          db,
		accountRepo: accountRepo,
		profileRepo: profileRepo,
		careerRepo:  careerRepo,
		workRepo:    workRepo,
		memoRepo:    memoRepo,
		imgStorage:  imgStorage,
	}
}

// ─── Profile ─────────────────────────────────────────────────

func (u *StudioUsecase) UpdateMyAvatarURL(ctx context.Context, cygnusAccountID uint64, avatarURL string) error {
	// base64 data URL の場合は imgStorage 経由でアップロード（R2設定時はCDN URLに変換）
	if strings.HasPrefix(avatarURL, "data:") {
		uploaded, err := u.imgStorage.Upload(ctx, avatarURL)
		if err == nil {
			avatarURL = uploaded
		}
	}
	p, err := u.profileRepo.FindByAccountID(ctx, cygnusAccountID)
	if err != nil {
		p = &model.Profile{CygnusAccountID: cygnusAccountID}
	}
	p.AvatarURL = &avatarURL
	return u.profileRepo.Upsert(ctx, p)
}

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
	AvatarURL    *string
	Bio          *string
	Specialties  *string // JSON文字列
	InstagramURL *string
	IsPublished  bool
	ShimeiCharge uint32
}

func (u *StudioUsecase) UpsertProfile(ctx context.Context, in UpsertProfileInput) (*model.Profile, error) {
	// base64 data URL の場合は imgStorage 経由でアップロード
	if in.AvatarURL != nil && strings.HasPrefix(*in.AvatarURL, "data:") {
		uploaded, err := u.imgStorage.Upload(ctx, *in.AvatarURL)
		if err == nil {
			in.AvatarURL = &uploaded
		}
	}
	p := &model.Profile{
		CygnusAccountID: in.AccountID,
		AvatarURL:       in.AvatarURL,
		Bio:             in.Bio,
		Specialties:     in.Specialties,
		InstagramURL:    in.InstagramURL,
		IsPublished:     in.IsPublished,
		ShimeiCharge:    in.ShimeiCharge,
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

// ─── LOOP Memberships ────────────────────────────────────────

type LoopMembershipItem struct {
	SalonName string  `json:"salon_name"`
	Role      string  `json:"role"`
	IsActive  bool    `json:"is_active"`
	JoinedAt  string  `json:"joined_at"`
	LeftAt    *string `json:"left_at"`
}

func (u *StudioUsecase) ListLoopMemberships(ctx context.Context, accountID uint64) ([]*LoopMembershipItem, error) {
	rows, err := mysql.FetchLoopMemberships(ctx, u.db, accountID)
	if err != nil {
		return nil, err
	}
	items := make([]*LoopMembershipItem, len(rows))
	for i, r := range rows {
		role := "スタッフ"
		switch r.Role {
		case "owner":
			role = "オーナー"
		case "admin":
			role = "マネージャー"
		}
		items[i] = &LoopMembershipItem{
			SalonName: r.SalonName,
			Role:      role,
			IsActive:  r.IsActive,
			JoinedAt:  r.JoinedAt,
			LeftAt:    r.LeftAt,
		}
	}
	return items, nil
}

// ─── Careers ─────────────────────────────────────────────────

func (u *StudioUsecase) ListCareers(ctx context.Context, accountID uint64) ([]*model.Career, error) {
	return u.careerRepo.FindByAccountID(ctx, accountID)
}

func (u *StudioUsecase) CreateCareer(ctx context.Context, accountID uint64, c *model.Career) error {
	c.CygnusAccountID = accountID
	return u.careerRepo.Create(ctx, c)
}

func (u *StudioUsecase) UpdateCareer(ctx context.Context, accountID uint64, c *model.Career) error {
	c.CygnusAccountID = accountID
	return u.careerRepo.Update(ctx, c)
}

func (u *StudioUsecase) DeleteCareer(ctx context.Context, id, accountID uint64) error {
	return u.careerRepo.Delete(ctx, id, accountID)
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
	url, err := u.imgStorage.Upload(ctx, in.ImageURL)
	if err != nil {
		return nil, fmt.Errorf("CreateWork upload: %w", err)
	}
	w := &model.Work{
		CygnusAccountID: in.AccountID,
		MenuID:          in.MenuID,
		Title:           in.Title,
		Description:     in.Description,
		ImageURL:        url,
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

// ─── Menus ───────────────────────────────────────────────────

func (u *StudioUsecase) ListMenusForAccount(ctx context.Context, accountID uint64) ([]*model.Menu, error) {
	var salonID uint64
	err := u.db.QueryRowContext(ctx,
		`SELECT salon_id FROM salon_memberships WHERE cygnus_account_id = ? AND is_active = 1 LIMIT 1`,
		accountID).Scan(&salonID)
	if err != nil {
		return []*model.Menu{}, nil
	}
	rows, err := u.db.QueryContext(ctx,
		`SELECT id, salon_id, name, menu_type, price, duration, is_active, created_at, updated_at
		 FROM menus WHERE salon_id = ? AND is_active = 1 ORDER BY menu_type, name`, salonID)
	if err != nil {
		return []*model.Menu{}, nil
	}
	defer rows.Close()
	list := make([]*model.Menu, 0)
	for rows.Next() {
		var m model.Menu
		if err := rows.Scan(&m.ID, &m.SalonID, &m.Name, &m.MenuType, &m.Price, &m.Duration, &m.IsActive, &m.CreatedAt, &m.UpdatedAt); err != nil {
			continue
		}
		list = append(list, &m)
	}
	return list, nil
}

// ─── LOOP Stats ──────────────────────────────────────────────

type MonthlyStats struct {
	TotalSales      uint64  `json:"total_sales"`
	TreatmentCount  uint64  `json:"treatment_count"`
	RepeatRate      float64 `json:"repeat_rate"`
	NewClients      uint64  `json:"new_clients"`
	SalesDiffPct    *int    `json:"sales_diff_pct"`    // 先月比（%）nil=先月データなし
	NominationRate  *int    `json:"nomination_rate"`   // 指名率（%）nil=データなし
}

func (u *StudioUsecase) GetMonthlyStats(ctx context.Context, accountID uint64) (*MonthlyStats, error) {
	now := time.Now()
	from := fmt.Sprintf("%d-%02d-01", now.Year(), now.Month())
	to := now.Format("2006-01-02")

	var stats MonthlyStats
	err := u.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(sds.total_sales), 0),
			COALESCE(SUM(sds.client_count), 0)
		FROM staff_daily_sales sds
		JOIN staffs s ON s.id = sds.staff_id
		WHERE s.cygnus_account_id = ? AND sds.date BETWEEN ? AND ?`,
		accountID, from, to,
	).Scan(&stats.TotalSales, &stats.TreatmentCount)
	if err != nil {
		return &stats, nil
	}

	// 当月の担当顧客一覧
	rows, err := u.db.QueryContext(ctx, `
		SELECT DISTINCT t.customer_id
		FROM treatments t
		JOIN staffs s ON s.id = t.staff_id
		WHERE s.cygnus_account_id = ? AND t.customer_id IS NOT NULL
		  AND t.performed_at BETWEEN ? AND ?`,
		accountID, from+" 00:00:00", to+" 23:59:59")
	if err != nil {
		return &stats, nil
	}
	defer rows.Close()

	var customerIDs []uint64
	for rows.Next() {
		var id uint64
		if rows.Scan(&id) == nil {
			customerIDs = append(customerIDs, id)
		}
	}

	if len(customerIDs) > 0 {
		query, args, _ := sqlx.In(`
			SELECT COUNT(DISTINCT customer_id)
			FROM treatments
			WHERE customer_id IN (?) AND performed_at < ?`,
			customerIDs, from+" 00:00:00")
		var repeaters uint64
		u.db.QueryRowContext(ctx, u.db.Rebind(query), args...).Scan(&repeaters)

		total := uint64(len(customerIDs))
		stats.NewClients = total - repeaters
		if total > 0 {
			stats.RepeatRate = float64(repeaters) / float64(total) * 100
		}
	}

	// 先月比
	prevMonth := now.AddDate(0, -1, 0)
	prevFrom := fmt.Sprintf("%d-%02d-01", prevMonth.Year(), prevMonth.Month())
	prevTo := fmt.Sprintf("%d-%02d-01", now.Year(), now.Month()) // 当月1日の前日まで
	var prevSales uint64
	u.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(sds.total_sales), 0)
		FROM staff_daily_sales sds
		JOIN staffs s ON s.id = sds.staff_id
		WHERE s.cygnus_account_id = ? AND sds.date >= ? AND sds.date < ?`,
		accountID, prevFrom, prevTo,
	).Scan(&prevSales)
	if prevSales > 0 {
		diff := int(float64(stats.TotalSales-prevSales) / float64(prevSales) * 100)
		stats.SalesDiffPct = &diff
	}

	// 指名率（is_shimei = 1 の施術 / 全施術）
	var totalCount, nominationCount uint64
	u.db.QueryRowContext(ctx, `
		SELECT COUNT(*), SUM(CASE WHEN t.is_shimei = 1 THEN 1 ELSE 0 END)
		FROM treatments t
		JOIN staffs s ON s.id = t.staff_id
		WHERE s.cygnus_account_id = ? AND t.performed_at BETWEEN ? AND ?`,
		accountID, from+" 00:00:00", to+" 23:59:59",
	).Scan(&totalCount, &nominationCount)
	if totalCount > 0 {
		rate := int(float64(nominationCount) / float64(totalCount) * 100)
		stats.NominationRate = &rate
	}

	return &stats, nil
}

type RecentTreatment struct {
	ID           uint64  `json:"id"`
	MenuName     string  `json:"menu_name"`
	Price        uint32  `json:"price"`
	PerformedAt  string  `json:"performed_at"`
	PerformedTime string `json:"performed_time"`
	Notes        *string `json:"notes"`
	ClientName   *string `json:"client_name"`
}

func (u *StudioUsecase) GetRecentTreatments(ctx context.Context, accountID uint64, limit int) ([]*RecentTreatment, error) {
	rows, err := u.db.QueryContext(ctx, `
		SELECT t.id, t.menu_name, t.price, t.performed_at, t.notes, c.name
		FROM treatments t
		JOIN staffs s ON s.id = t.staff_id
		LEFT JOIN customers c ON c.id = t.customer_id
		WHERE s.cygnus_account_id = ?
		ORDER BY t.performed_at DESC
		LIMIT ?`,
		accountID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*RecentTreatment, 0)
	for rows.Next() {
		var r RecentTreatment
		var performedAt time.Time
		if err := rows.Scan(&r.ID, &r.MenuName, &r.Price, &performedAt, &r.Notes, &r.ClientName); err != nil {
			continue
		}
		r.PerformedAt = performedAt.Format("2006-01-02")
		r.PerformedTime = performedAt.Format("15:04")
		list = append(list, &r)
	}
	return list, nil
}

func (u *StudioUsecase) GetTotalTreatmentCount(ctx context.Context, accountID uint64) (uint64, error) {
	var count uint64
	err := u.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM treatments t
		JOIN staffs s ON s.id = t.staff_id
		WHERE s.cygnus_account_id = ?`,
		accountID).Scan(&count)
	return count, err
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
