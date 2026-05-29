// go run ./cmd/seed  でデモデータを投入する。
// 既存データがある場合は何もしない（salon 名で判定）。
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"golang.org/x/crypto/bcrypt"
)

var ctx = context.Background()

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	// 冪等チェック
	var count int
	db.QueryRowContext(ctx, `SELECT COUNT(*) FROM salons WHERE name = 'Hair Studio LUNA'`).Scan(&count)
	if count > 0 {
		log.Println("デモデータは既に存在します。スキップします。")
		return
	}

	must := func(label string, r sql.Result, e error) int64 {
		if e != nil {
			log.Fatalf("[%s] INSERT失敗: %v", label, e)
		}
		id, _ := r.LastInsertId()
		return id
	}
	exec := func(label, q string, args ...any) int64 {
		r, e := db.ExecContext(ctx, q, args...)
		return must(label, r, e)
	}

	hash := func(pw string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
		return string(h)
	}

	// ─── プラン ───────────────────────────────────────────────
	planID := exec("plan", `INSERT INTO plans (name, max_staff_count) VALUES ('ベーシック', 20)`)

	// ─── サロン ───────────────────────────────────────────────
	salonID := exec("salon", `INSERT INTO salons (name) VALUES ('Hair Studio LUNA')`)
	exec("subscription", `INSERT INTO subscriptions (salon_id, plan_id, status) VALUES (?, ?, 'active')`, salonID, planID)

	// ─── 店舗 ─────────────────────────────────────────────────
	storeIDs := map[string]int64{}
	for _, s := range []struct{ name, addr string }{
		{"LUNA 柏本店",     "千葉県柏市柏1-1-1"},
		{"LUNA 柏たなか店",  "千葉県柏市田中1-2-3"},
		{"LUNA 三郷中央店",  "埼玉県三郷市中央4-5-6"},
		{"hair Lanish +", "千葉県流山市おおたかの森7-8-9"},
	} {
		id := exec("store:"+s.name,
			`INSERT INTO stores (salon_id, name, address) VALUES (?, ?, ?)`,
			salonID, s.name, s.addr)
		storeIDs[s.name] = id
		exec("biz_hours:"+s.name,
			`INSERT INTO business_hours (store_id, open_time, close_time, closed_weekday) VALUES (?, '10:00:00', '20:00:00', 2)`,
			id)
	}

	// ─── スタッフ ─────────────────────────────────────────────
	type staffRow struct{ name, initials, email, role, store string }
	staffDefs := []staffRow{
		{"山田 健一", "YK", "owner@luna.com",    "owner", "LUNA 柏本店"},
		{"田中 彩花", "TA", "tanaka@luna.com",   "admin", "LUNA 柏たなか店"},
		{"林 大輝",   "HD", "hayashi@luna.com",  "staff", "LUNA 柏たなか店"},
		{"坂本 ひな", "SH", "sakamoto@luna.com", "staff", "LUNA 柏たなか店"},
		{"吉田 沙織", "YS", "yoshida@luna.com",  "admin", "LUNA 三郷中央店"},
		{"岡田 蓮",   "OR", "okada@luna.com",    "staff", "LUNA 三郷中央店"},
		{"石井 奈々", "IN", "ishii@luna.com",    "admin", "hair Lanish +"},
		{"前田 陸",   "MR", "maeda@luna.com",    "staff", "hair Lanish +"},
	}
	staffIDs := map[string]int64{}
	for _, s := range staffDefs {
		id := exec("staff:"+s.name,
			`INSERT INTO staffs (salon_id, store_id, name, email, password_hash, role, avatar_initials)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			salonID, storeIDs[s.store], s.name, s.email, hash("demo1234"), s.role, s.initials)
		staffIDs[s.name] = id
	}

	// ─── 顧客 ─────────────────────────────────────────────────
	for _, c := range []struct{ name, phone string }{
		{"佐藤 美咲",   "090-1111-2222"},
		{"鈴木 陽子",   "090-2222-3333"},
		{"高橋 さくら", "090-3333-4444"},
		{"伊藤 花音",   "090-4444-5555"},
		{"渡辺 愛",    "090-5555-6666"},
		{"中村 千春",   "090-6666-7777"},
		{"小林 莉子",   "090-7777-8888"},
		{"加藤 ゆい",   "090-8888-9999"},
	} {
		exec("customer:"+c.name, `INSERT INTO customers (salon_id, name, phone) VALUES (?, ?, ?)`, salonID, c.name, c.phone)
	}

	// ─── メニュー ─────────────────────────────────────────────
	type menuDef struct {
		name string
		price, dur int
	}
	for _, m := range []menuDef{
		{"カット",       5500,  60},
		{"カラー",       8800,  90},
		{"パーマ",      11000, 120},
		{"トリートメント",  3300,  30},
		{"ヘッドスパ",    4400,  45},
		{"カット＋カラー", 13200, 150},
		{"カット＋パーマ", 15400, 180},
		{"ブリーチ",     11000, 120},
		{"縮毛矯正",     22000, 180},
	} {
		exec("menu:"+m.name,
			`INSERT INTO menus (salon_id, name, price, duration) VALUES (?, ?, ?, ?)`,
			salonID, m.name, m.price, m.dur)
	}

	// ─── 材料 & 在庫 ─────────────────────────────────────────
	type matDef struct {
		name, brand, cat, unit, sizeUnit string
		size                             int
	}
	matList := []matDef{
		{"ミルボン オルディーブ N",            "MILBON",   "カラー",                  "本", "g",  80},
		{"ナプラ N.カラー SB",               "napla",    "カラー",                  "本", "g",  80},
		{"ウエラ コレストン",                  "WELLA",    "カラー",                  "本", "g",  60},
		{"ミルボン ジェミールフラン シャンプー",  "MILBON",   "シャンプー・トリートメント", "本", "ml", 500},
		{"ナプラ ケアテクト HB トリートメント",  "napla",    "シャンプー・トリートメント", "本", "ml", 250},
		{"アリミノ スパイスネオ フリーズキープ", "ARIMINO",  "スタイリング",             "缶", "",  0},
		{"ミルボン ニゼル ドレシア",            "MILBON",   "スタイリング",             "本", "ml", 85},
	}

	allStoreIDs := []int64{storeIDs["LUNA 柏本店"], storeIDs["LUNA 柏たなか店"], storeIDs["LUNA 三郷中央店"], storeIDs["hair Lanish +"]}
	quantities := [][]int{
		{3,  8, 12,  5},
		{2,  5,  7,  3},
		{6, 10, 15,  8},
		{4,  6,  8,  5},
		{2,  4,  6,  3},
		{1,  3,  4,  2},
		{5,  7, 10,  6},
	}
	thresholds := []int{5, 5, 8, 4, 3, 2, 4}

	statusFor := func(qty, thr int) string {
		switch {
		case qty <= thr/2:
			return "要発注"
		case qty <= thr:
			return "注意"
		case qty > thr*2:
			return "過剰"
		default:
			return "正常"
		}
	}

	for i, m := range matList {
		var sizeAmount sql.NullInt32
		var sizeUnit   sql.NullString
		if m.size > 0 {
			sizeAmount = sql.NullInt32{Int32: int32(m.size), Valid: true}
			sizeUnit   = sql.NullString{String: m.sizeUnit, Valid: true}
		}
		matID := exec("material:"+m.name,
			`INSERT INTO materials (salon_id, name, brand, category, size_amount, size_unit, stock_unit)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			salonID, m.name, m.brand, m.cat, sizeAmount, sizeUnit, m.unit)

		for j, sID := range allStoreIDs {
			qty := quantities[i][j]
			thr := thresholds[i]
			exec("inventory",
				`INSERT INTO inventories (store_id, material_id, quantity, threshold, status) VALUES (?, ?, ?, ?, ?)`,
				sID, matID, qty, thr, statusFor(qty, thr))
		}
	}

	// ─── 仕入れ先 ─────────────────────────────────────────────
	for _, d := range []struct{ name, method, contact string }{
		{"ミルボン 東日本ディーラー",  "email", "order-east@milbon.co.jp"},
		{"ナプラ 千葉営業所",          "LINE",  "@napla_chiba"},
		{"ビューティーストア 柏",       "LINE",  "@beautystore_kashiwa"},
	} {
		exec("dealer:"+d.name,
			`INSERT INTO dealers (salon_id, name, contact_method, contact_info, status) VALUES (?, ?, ?, ?, 'active')`,
			salonID, d.name, d.method, d.contact)
	}

	// ─── 売上データ（過去60日）────────────────────────────────
	rng := rand.New(rand.NewSource(42))
	today := time.Now()

	staffsForStore := map[int64][]string{
		storeIDs["LUNA 柏本店"]:    {"山田 健一"},
		storeIDs["LUNA 柏たなか店"]: {"田中 彩花", "林 大輝", "坂本 ひな"},
		storeIDs["LUNA 三郷中央店"]: {"吉田 沙織", "岡田 蓮"},
		storeIDs["hair Lanish +"]: {"石井 奈々", "前田 陸"},
	}

	for daysAgo := 60; daysAgo >= 0; daysAgo-- {
		d := today.AddDate(0, 0, -daysAgo)
		if int(d.Weekday()) == 2 { // 火曜定休
			continue
		}
		dateStr := d.Format("2006-01-02")

		for _, sID := range allStoreIDs {
			staffList := staffsForStore[sID]
			storeTech, storeRetail, storeClients := 0, 0, 0

			for _, sName := range staffList {
				sfID := staffIDs[sName]
				clients := rng.Intn(6) + 3
				techPerClient := []int{5500, 8800, 13200, 11000, 4400}[rng.Intn(5)]
				tech := techPerClient * clients
				retail := 0
				if rng.Intn(3) == 0 {
					retail = 3300 * (rng.Intn(3) + 1)
				}
				total := tech + retail
				unitPrice := total / clients

				exec("staff_sales",
					`INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
					sfID, sID, dateStr, total, clients, unitPrice, retail)

				storeTech += tech
				storeRetail += retail
				storeClients += clients
			}

			exec("store_sales",
				`INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
				sID, dateStr, storeTech+storeRetail, storeClients, storeTech, storeRetail)
		}
	}

	fmt.Println("✓ デモデータ投入完了！")
	fmt.Println("  ログイン: owner@luna.com / demo1234")
	fmt.Println("  サロン:   Hair Studio LUNA（4店舗・8スタッフ）")
}
