// HAIR SALON Cygnus デモデータ投入スクリプト
// go run ./cmd/seed_demo
// 既存データがある場合はスキップ（冪等）
// STUDIOプロフィール・ポートフォリオも含む
package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	mathrand "math/rand"
	"math/big"
	"strings"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"golang.org/x/crypto/bcrypt"
)

// csvToJSON converts "a,b,c" to `["a","b","c"]`
func csvToJSON(csv string) string {
	parts := strings.Split(csv, ",")
	b, _ := json.Marshal(parts)
	return string(b)
}

// newCygnusID generates a unique CYG-XXXXX id
func newCygnusID(db interface{ QueryRowContext(context.Context, string, ...any) *sql.Row }, ctx context.Context) string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for {
		b := make([]byte, 5)
		for j := range b {
			n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
			b[j] = chars[n.Int64()]
		}
		id := "CYG-" + string(b)
		var count int
		db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cygnus_accounts WHERE cygnus_id = ?`, id).Scan(&count)
		if count == 0 {
			return id
		}
	}
}

var ctx = context.Background()

const demoSalonName = "HAIR SALON Cygnus"
const demoPassword  = "CygnusDemo2024"

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	exec := func(label, q string, args ...any) int64 {
		r, e := db.ExecContext(ctx, q, args...)
		if e != nil {
			log.Fatalf("[%s] INSERT失敗: %v", label, e)
		}
		id, _ := r.LastInsertId()
		return id
	}
	hash := func(pw string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
		return string(h)
	}
	// ─── プラン ───────────────────────────────────────────────
	var planID int64
	db.QueryRowContext(ctx, `SELECT id FROM plans LIMIT 1`).Scan(&planID)
	if planID == 0 {
		planID = exec("plan", `INSERT INTO plans (name, max_staff_count) VALUES ('スタンダード', 50)`)
	}

	// ─── サロン ───────────────────────────────────────────────
	var salonID int64
	db.QueryRowContext(ctx, `SELECT id FROM salons WHERE name = ?`, demoSalonName).Scan(&salonID)
	salonIsNew := salonID == 0
	if salonIsNew {
		salonID = exec("salon", `INSERT INTO salons (name) VALUES (?)`, demoSalonName)
		exec("subscription",
			`INSERT INTO subscriptions (salon_id, plan_id, status) VALUES (?, ?, 'active')`,
			salonID, planID)
	} else {
		log.Printf("サロン既存 (id=%d)。LOOPデータはスキップし、STUDIOデータを補完します。", salonID)
	}

	// ─── 店舗（1店舗）────────────────────────────────────────
	var storeID int64
	db.QueryRowContext(ctx, `SELECT id FROM stores WHERE salon_id = ?`, salonID).Scan(&storeID)
	if storeID == 0 {
		storeID = exec("store",
			`INSERT INTO stores (salon_id, name, address, phone) VALUES (?, ?, ?, ?)`,
			salonID, "HAIR SALON Cygnus 表参道店", "東京都渋谷区神宮前5-10-1", "03-1234-5678")
		exec("biz_hours",
			`INSERT INTO business_hours (store_id, open_time, close_time, closed_weekday) VALUES (?, '10:00:00', '20:00:00', 2)`,
			storeID)
	}

	// ─── スタッフ（6名）──────────────────────────────────────
	type staffDef struct {
		name, initials, email, role string
		shimei                      uint32
	}
	staffList := []staffDef{
		{"田中 航",   "TW", "tanaka@hair-cygnus.com",    "owner", 3000},
		{"佐藤 彩",   "SA", "sato@hair-cygnus.com",      "admin", 2000},
		{"山本 りく", "YR", "yamamoto@hair-cygnus.com",  "staff", 1500},
		{"伊藤 さくら","IS", "ito@hair-cygnus.com",      "staff", 1500},
		{"中村 蓮",   "NR", "nakamura@hair-cygnus.com",  "staff", 0},
		{"高橋 みほ", "TM", "takahashi@hair-cygnus.com", "staff", 0},
	}

	staffIDs := map[string]int64{}
	if salonIsNew {
		for _, s := range staffList {
			id := exec("staff:"+s.name,
				`INSERT INTO staffs (salon_id, store_id, name, email, password_hash, role, avatar_initials, shimei_charge)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				salonID, storeID, s.name, s.email, hash(demoPassword), s.role, s.initials, s.shimei)
			staffIDs[s.name] = id
		}
	} else {
		for _, s := range staffList {
			var id int64
			db.QueryRowContext(ctx, `SELECT id FROM staffs WHERE email = ?`, s.email).Scan(&id)
			staffIDs[s.name] = id
		}
	}

	if salonIsNew {
	// ─── 顧客（80名）─────────────────────────────────────────
	customers := []struct{ name, phone string }{
		{"山田 花子", "090-1001-0001"}, {"鈴木 美咲", "090-1001-0002"}, {"佐藤 愛",   "090-1001-0003"},
		{"田中 遥",   "090-1001-0004"}, {"渡辺 葵",   "090-1001-0005"}, {"伊藤 桃",   "090-1001-0006"},
		{"中村 柚香", "090-1001-0007"}, {"小林 七海", "090-1001-0008"}, {"加藤 莉子", "090-1001-0009"},
		{"吉田 凛",   "090-1001-0010"}, {"山口 詩織", "090-1001-0011"}, {"松本 このか","090-1001-0012"},
		{"井上 さな", "090-1001-0013"}, {"木村 えな", "090-1001-0014"}, {"林 りこ",   "090-1001-0015"},
		{"清水 まな", "090-1001-0016"}, {"山崎 のの", "090-1001-0017"}, {"池田 ゆい", "090-1001-0018"},
		{"橋本 らら", "090-1001-0019"}, {"石川 みく", "090-1001-0020"}, {"前田 あおい","090-1001-0021"},
		{"藤田 こころ","090-1001-0022"},{"岡田 ひな", "090-1001-0023"}, {"後藤 ゆな", "090-1001-0024"},
		{"長谷川 きら","090-1001-0025"},{"村田 のあ", "090-1001-0026"}, {"近藤 ちか", "090-1001-0027"},
		{"坂本 ゆき", "090-1001-0028"}, {"斎藤 あんな","090-1001-0029"},{"福田 ひより","090-1001-0030"},
		{"西村 まりか","090-1001-0031"},{"太田 ことり","090-1001-0032"},{"岩田 なの", "090-1001-0033"},
		{"浜田 れな", "090-1001-0034"}, {"野口 いちか","090-1001-0035"},{"松田 ひまり","090-1001-0036"},
		{"石井 ふうか","090-1001-0037"},{"丸山 めい", "090-1001-0038"}, {"藤原 ゆうな","090-1001-0039"},
		{"小川 あかり","090-1001-0040"},{"中島 みお", "090-1001-0041"}, {"和田 ここ", "090-1001-0042"},
		{"宮崎 らん", "090-1001-0043"}, {"高木 みな", "090-1001-0044"}, {"菊地 えみ", "090-1001-0045"},
		{"安藤 りん", "090-1001-0046"}, {"杉山 ゆめ", "090-1001-0047"}, {"内田 のぞみ","090-1001-0048"},
		{"柴田 みれい","090-1001-0049"},{"原田 ひな", "090-1001-0050"}, {"広瀬 さき", "090-1001-0051"},
		{"三浦 えりか","090-1001-0052"},{"大塚 まい", "090-1001-0053"}, {"谷口 ちあき","090-1001-0054"},
		{"武田 あさひ","090-1001-0055"},{"上田 こと", "090-1001-0056"}, {"金子 ゆら", "090-1001-0057"},
		{"高田 なつ", "090-1001-0058"}, {"宮本 はな", "090-1001-0059"}, {"永田 りか", "090-1001-0060"},
		{"川口 みさき","090-1001-0061"},{"大野 ひとみ","090-1001-0062"},{"増田 なみ", "090-1001-0063"},
		{"川崎 あや", "090-1001-0064"}, {"田村 るな", "090-1001-0065"}, {"市川 せな", "090-1001-0066"},
		{"佐々木 ゆき","090-1001-0067"},{"松井 あみ", "090-1001-0068"}, {"西田 かの", "090-1001-0069"},
		{"河野 のえ", "090-1001-0070"}, {"森田 ちの", "090-1001-0071"}, {"阿部 みつき","090-1001-0072"},
		{"島田 すず", "090-1001-0073"}, {"酒井 こはる","090-1001-0074"},{"横山 ひめ", "090-1001-0075"},
		{"久保 まりん","090-1001-0076"},{"平野 ゆいか","090-1001-0077"},{"工藤 らいな","090-1001-0078"},
		{"藤井 あいり","090-1001-0079"},{"石田 のか", "090-1001-0080"},
	}
	customerIDs := make([]int64, len(customers))
	for i, c := range customers {
		customerIDs[i] = exec("customer:"+c.name,
			`INSERT INTO customers (salon_id, name, phone) VALUES (?, ?, ?)`,
			salonID, c.name, c.phone)
	}

	// ─── 施術メニュー（12種）─────────────────────────────────
	type menuDef struct {
		name string
		price, dur int
	}
	menus := []menuDef{
		{"カット",              6600,  60},
		{"カラー",              9900,  90},
		{"パーマ",             13200, 120},
		{"トリートメント",       4400,  40},
		{"ヘッドスパ",           5500,  45},
		{"カット＋カラー",      15400, 150},
		{"カット＋パーマ",      17600, 180},
		{"ブリーチ",            13200, 120},
		{"縮毛矯正",            24200, 200},
		{"カット＋縮毛矯正",    28600, 240},
		{"ハイライト",          16500, 150},
		{"インナーカラー",       13200, 120},
	}
	menuIDs := make([]int64, len(menus))
	for i, m := range menus {
		menuIDs[i] = exec("menu:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price, duration) VALUES (?, ?, 'treatment', ?, ?)`,
			salonID, m.name, m.price, m.dur)
	}

	// ─── 物販（6種）─────────────────────────────────────────
	for _, m := range []struct{ name string; price int }{
		{"エルジューダ エマルジョン+", 2970},
		{"ミルボン ジェミールフラン シャンプー", 2640},
		{"ナプラ N. ポリッシュオイル", 3520},
		{"ホーユー ソマルカ トリートメント", 2310},
		{"デミ ウェーボ スプレー", 1980},
		{"クオレ ロレアル ヘアマスク", 4180},
	} {
		exec("retail:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price) VALUES (?, ?, 'retail', ?)`,
			salonID, m.name, m.price)
	}

	// ─── 材料（20品目）───────────────────────────────────────
	type matDef struct {
		name, brand, cat, unit, sizeUnit string
		size, qty, threshold             int
	}
	materials := []matDef{
		{"ミルボン オルディーブ アディクシー",   "MILBON",   "カラー",    "本", "g",  80,  24, 10},
		{"ナプラ N.カラー SB",                "napla",    "カラー",    "本", "g",  80,  18,  8},
		{"ウエラ コレストン パーフェクト",        "WELLA",    "カラー",    "本", "g",  60,  30, 12},
		{"フィヨーレ BFカラー",                "FIORE",    "カラー",    "本", "g",  80,  15,  8},
		{"ホーユー プロマスター",               "HOYU",     "カラー",    "本", "g",  80,  20, 10},
		{"ミルボン ジェミールフラン シャンプー",  "MILBON",   "シャンプー", "本", "ml", 500, 12,  5},
		{"ナプラ ケアテクト HB シャンプー",     "napla",    "シャンプー", "本", "ml", 250, 10,  5},
		{"デミ インプライム シャンプー",         "DEMI",     "シャンプー", "本", "ml", 400,  8,  4},
		{"ミルボン ジェミールフラン トリートメント","MILBON",  "トリートメント","本","ml",500, 10,  4},
		{"ナプラ ケアテクト HB トリートメント",  "napla",    "トリートメント","本","ml",250,  8,  4},
		{"アリミノ スパイスネオ フリーズキープ",  "ARIMINO",  "スタイリング","缶","",    0,  6,  3},
		{"ミルボン ニゼル ドレシア グリース",     "MILBON",   "スタイリング","本","ml",  85,  8,  4},
		{"ロレアル テクニアート ストラクチャー",  "L'Oreal",  "スタイリング","本","ml", 150,  5,  3},
		{"シュワルツコフ BCボンエクア シャンプー","Schwarzkopf","シャンプー","本","ml",250, 12,  5},
		{"デミ ウェーボ デザインキューブ",       "DEMI",     "スタイリング","本","g",   80,  7,  3},
		{"ミルボン プラーミア ヘアセラム",       "MILBON",   "トリートメント","本","ml",120,  9,  4},
		{"ナプラ インプライム ブースターセラム",  "napla",    "トリートメント","本","ml", 50, 10,  5},
		{"タマリス クリームオキシ 6%",          "TAMARIS",  "カラー",    "本", "ml",1000,  6,  3},
		{"ロレアル オキシクリーム 3%",          "L'Oreal",  "カラー",    "本", "ml", 900,  8,  4},
		{"ミルボン グローバルミルボン トリートメント","MILBON","トリートメント","本","ml",200,  7,  3},
	}
	matIDs := make([]int64, len(materials))
	for i, m := range materials {
		var sizeAmt sql.NullInt32
		var sizeUnit sql.NullString
		if m.size > 0 {
			sizeAmt  = sql.NullInt32{Int32: int32(m.size), Valid: true}
			sizeUnit = sql.NullString{String: m.sizeUnit, Valid: true}
		}
		matIDs[i] = exec("material:"+m.name,
			`INSERT INTO materials (salon_id, name, brand, category, size_amount, size_unit, stock_unit)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			salonID, m.name, m.brand, m.cat, sizeAmt, sizeUnit, m.unit)
		exec("inventory:"+m.name,
			`INSERT INTO inventories (store_id, material_id, quantity, threshold, status) VALUES (?, ?, ?, ?, ?)`,
			storeID, matIDs[i], m.qty, m.threshold, func(qty, thr int) string {
				if qty <= thr/2 { return "要発注" }
				if qty <= thr   { return "注意" }
				if qty > thr*2  { return "過剰" }
				return "正常"
			}(m.qty, m.threshold))
	}

	// ─── 仕入れ先（3社）─────────────────────────────────────
	dealerIDs := make([]int64, 3)
	for i, d := range []struct{ name, method, contact string }{
		{"ミルボン 東京営業所",         "email", "order-tokyo@milbon.co.jp"},
		{"ナプラ 南関東エリア",          "LINE",  "@napla_tokyo"},
		{"ビューティーサプライ 渋谷",    "LINE",  "@bsupply_shibuya"},
	} {
		dealerIDs[i] = exec("dealer:"+d.name,
			`INSERT INTO dealers (salon_id, name, contact_method, contact_info, status) VALUES (?, ?, ?, ?, 'active')`,
			salonID, d.name, d.method, d.contact)
	}

	// ─── 発注履歴（5件）─────────────────────────────────────
	orderStatuses := []string{"sent", "sent", "delivered", "delivered", "draft"}
	for i, status := range orderStatuses {
		orderID := exec("order",
			`INSERT INTO orders (salon_id, store_id, dealer_id, status, is_next_month_invoice)
			 VALUES (?, ?, ?, ?, ?)`,
			salonID, storeID, dealerIDs[i%3], status, i%2 == 0)
		for j := 0; j < 3; j++ {
			matIdx := (i*3 + j) % len(materials)
			exec("order_item",
				`INSERT INTO order_items (order_id, material_id, quantity, unit, estimated_cost) VALUES (?, ?, ?, ?, ?)`,
				orderID, matIDs[matIdx], (j+1)*5, materials[matIdx].unit, (j+1)*5000)
		}
	}

	// ─── 売上データ（過去180日）──────────────────────────────
	rng  := mathrand.New(mathrand.NewSource(2024))
	today := time.Now()

	// スタッフ別の客単価レンジ（シニアほど高単価）
	priceRanges := map[string][2]int{
		"田中 航":   {18000, 28000},
		"佐藤 彩":   {15000, 22000},
		"山本 りく": {10000, 16000},
		"伊藤 さくら":{10000, 15000},
		"中村 蓮":   {6600, 9900},
		"高橋 みほ": {6600, 8800},
	}
	clientsRange := map[string][2]int{
		"田中 航":    {4, 6},
		"佐藤 彩":    {5, 7},
		"山本 りく":  {5, 8},
		"伊藤 さくら": {5, 8},
		"中村 蓮":    {6, 9},
		"高橋 みほ":  {4, 7},
	}

	for daysAgo := 180; daysAgo >= 1; daysAgo-- {
		d := today.AddDate(0, 0, -daysAgo)
		if int(d.Weekday()) == 2 { // 火曜定休
			continue
		}
		dateStr := d.Format("2006-01-02")

		storeTech, storeRetail, storeClients := 0, 0, 0

		for _, s := range staffList {
			sfID := staffIDs[s.name]
			pr := priceRanges[s.name]
			cr := clientsRange[s.name]

			clients := cr[0] + rng.Intn(cr[1]-cr[0]+1)
			unitPrice := pr[0] + rng.Intn(pr[1]-pr[0]+1)
			tech := unitPrice * clients

			retail := 0
			if s.role != "staff" || rng.Intn(4) == 0 {
				if rng.Intn(3) != 0 {
					retail = []int{2970, 3520, 2640, 4180}[rng.Intn(4)] * (rng.Intn(2) + 1)
				}
			}
			total := tech + retail

			exec("staff_sales",
				`INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
				 VALUES (?, ?, ?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
				sfID, storeID, dateStr, total, clients, unitPrice, retail)

			storeTech   += tech
			storeRetail += retail
			storeClients += clients
		}

		exec("store_sales",
			`INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
			storeID, dateStr, storeTech+storeRetail, storeClients, storeTech, storeRetail)
	}
	} // end salonIsNew

	// ─── STUDIO: Cygnusアカウント + プロフィール ──────────────
	type studioProfile struct {
		staffName, bio, specialties, instagram string
		startYear                              uint16
		startMonth                             uint8
	}
	profiles := []studioProfile{
		{
			"田中 航",
			"表参道で10年以上のキャリアを持つスタイリスト。骨格に合わせたカットと透明感カラーが得意。",
			"ショート,ボブ,透明感カラー,骨格診断",
			"@tanaka_hair_cygnus",
			2013, 4,
		},
		{
			"佐藤 彩",
			"ハイライト・インナーカラーを得意とするカラーリスト。トレンドを取り入れつつ再現性の高いスタイルを提案。",
			"ハイライト,インナーカラー,ブリーチ,トレンドカラー",
			"@sato_color_cygnus",
			2016, 4,
		},
		{
			"山本 りく",
			"パーマ・縮毛矯正のスペシャリスト。ダメージを最小限に抑えながらスタイルを実現します。",
			"パーマ,縮毛矯正,デジタルパーマ,ケアブリーチ",
			"@yamamoto_perm_cygnus",
			2018, 4,
		},
		{
			"伊藤 さくら",
			"ヘアケア・トリートメントを専門とするスタイリスト。傷んだ髪を美しく蘇らせることに情熱を注いでいます。",
			"トリートメント,ヘアケア,髪質改善,ナチュラルカラー",
			"@ito_care_cygnus",
			2019, 4,
		},
	}

	// staffName → email マップ（profilesで使う）
	staffEmailMap := map[string]string{}
	for _, s := range staffList {
		staffEmailMap[s.name] = s.email
	}

	for _, p := range profiles {
		// スタッフIDをemailで直接DB検索（staffIDsに依存しない）
		var sfID int64
		if sfEmail, ok := staffEmailMap[p.staffName]; ok {
			db.QueryRowContext(ctx, `SELECT id FROM staffs WHERE email = ?`, sfEmail).Scan(&sfID)
		}
		if sfID == 0 {
			log.Fatalf("[studio:%s] スタッフが見つかりません (email: %s)", p.staffName, staffEmailMap[p.staffName])
		}

		// Cygnusアカウント作成（既存の場合はSELECTで取得）
		caEmail := fmt.Sprintf("studio_%d@hair-cygnus.com", sfID)
		var accountID int64
		db.QueryRowContext(ctx, `SELECT id FROM cygnus_accounts WHERE email = ?`, caEmail).Scan(&accountID)
		if accountID == 0 {
			cygnusID := newCygnusID(db, ctx)
			accountID = exec("cygnus_account:"+p.staffName,
				`INSERT INTO cygnus_accounts (cygnus_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`,
				cygnusID, caEmail, hash(demoPassword), p.staffName)
		}

		// スタッフとCygnusアカウントを紐付け
		db.ExecContext(ctx,
			`UPDATE staffs SET cygnus_account_id = ? WHERE id = ?`,
			accountID, sfID)

		// プロフィール
		exec("profile:"+p.staffName,
			`INSERT IGNORE INTO profiles (cygnus_account_id, bio, specialties, instagram_url, is_published, shimei_charge)
			 VALUES (?, ?, ?, ?, 1, ?)`,
			accountID, p.bio, csvToJSON(p.specialties), p.instagram,
			func() uint32 {
				for _, s := range staffList {
					if s.name == p.staffName { return s.shimei }
				}
				return 0
			}())

		// 経歴
		exec("career:"+p.staffName,
			`INSERT IGNORE INTO studio_careers (cygnus_account_id, salon_name, role, start_year, start_month, is_current)
			 VALUES (?, ?, ?, ?, ?, 1)`,
			accountID, "HAIR SALON Cygnus 表参道店", "スタイリスト", p.startYear, p.startMonth)

		// ポートフォリオ（画像URLはプレースホルダー・後で差し替え）
		workTitles := []struct{ title, desc, tags string }{
			{"透明感ショートボブ",     "骨格に合わせたショートボブ。柔らかいカラーで透明感を演出。",    "ショートボブ,透明感,外国人風"},
			{"ハイライトミディアム",   "立体感を出すハイライト。日差しの中でも輝くスタイル。",        "ハイライト,ミディアム,立体感"},
			{"ナチュラルウェーブ",     "柔らかいウェーブパーマで動きをプラス。自然な仕上がり。",      "パーマ,ウェーブ,ナチュラル"},
			{"インナーカラーボブ",     "さりげないインナーカラーでおしゃれ感UP。職場でも映えるデザイン。","インナーカラー,ボブ,オフィス"},
			{"アッシュグレージュ",     "トレンドのグレージュカラー。透明感と艶感を両立。",            "グレージュ,アッシュ,トレンド"},
			{"ショートレイヤー",       "軽やかなレイヤーで小顔効果。スタイリングが楽なショートスタイル。","ショート,レイヤー,小顔"},
			{"ケアブリーチハイライト", "ダメージを最小限に抑えたケアブリーチ。ツヤツヤのハイライト。",  "ハイライト,ケアブリーチ,ダメージレス"},
			{"縮毛矯正ナチュラル",     "自然なストレートに仕上げた縮毛矯正。硬い印象ゼロ。",          "縮毛矯正,ナチュラル,ストレート"},
			{"ピンクベージュカラー",   "今季トレンドのピンクベージュ。柔らかく可愛らしい印象に。",      "ピンクベージュ,トレンドカラー,可愛い"},
			{"グラデーションカラー",   "根元から毛先にかけて自然なグラデーション。立体感抜群。",        "グラデーション,カラー,立体感"},
		}
		for j, w := range workTitles {
			title := w.title
			desc  := w.desc
			tags  := w.tags
			exec(fmt.Sprintf("work:%s:%d", p.staffName, j),
				`INSERT IGNORE INTO works (cygnus_account_id, title, description, image_url, tags, is_published)
				 VALUES (?, ?, ?, ?, ?, 1)`,
				accountID, title, desc,
				fmt.Sprintf("https://studio.cygnus.style/demo-works/%s_%02d.jpg", p.staffName, j+1),
				csvToJSON(tags))
		}
	}

	fmt.Println("✅ HAIR SALON Cygnus デモデータ投入完了！")
	fmt.Println()
	fmt.Printf("  ━━ LOOP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("  URL:      https://loop.cygnus.style\n")
	fmt.Printf("  メール:   tanaka@hair-cygnus.com\n")
	fmt.Printf("  パスワード: %s\n", demoPassword)
	fmt.Printf("  サロン:   %s（1店舗・6スタッフ・80顧客）\n", demoSalonName)
	fmt.Println()
	fmt.Printf("  ━━ STUDIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("  URL:      https://studio.cygnus.style\n")
	fmt.Printf("  ※ 田中・佐藤・山本・伊藤のプロフィールを公開済み\n")
	fmt.Printf("  ※ ポートフォリオ画像は差し替えが必要です\n")
}
