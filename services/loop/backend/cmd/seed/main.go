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

const salonName = "Hair SALON test"

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	// 冪等チェック
	var count int
	db.QueryRowContext(ctx, `SELECT COUNT(*) FROM salons WHERE name = ?`, salonName).Scan(&count)
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
	planID := exec("plan", `INSERT INTO plans (name, max_staff_count) VALUES ('ベーシック', 100)`)

	// ─── サロン ───────────────────────────────────────────────
	salonID := exec("salon", `INSERT INTO salons (name) VALUES (?)`, salonName)
	exec("subscription", `INSERT INTO subscriptions (salon_id, plan_id, status) VALUES (?, ?, 'active')`, salonID, planID)

	// ─── 店舗（8店舗）────────────────────────────────────────
	storeDefs := []struct{ name, addr string }{
		{"柏の葉キャンパス店", "千葉県柏市若柴178-4"},
		{"柏店",             "千葉県柏市柏1-2-3"},
		{"松戸店",            "千葉県松戸市松戸1-1-1"},
		{"船橋店",            "千葉県船橋市本町2-3-4"},
		{"流山おおたかの森店",  "千葉県流山市おおたかの森3-4-5"},
		{"八潮店",            "埼玉県八潮市中央4-5-6"},
		{"六丁店",            "埼玉県草加市六丁目5-6-7"},
		{"北千住店",           "東京都足立区千住2-3-4"},
	}
	storeIDs := map[string]int64{}
	for _, s := range storeDefs {
		id := exec("store:"+s.name,
			`INSERT INTO stores (salon_id, name, address) VALUES (?, ?, ?)`,
			salonID, s.name, s.addr)
		storeIDs[s.name] = id
		exec("biz_hours:"+s.name,
			`INSERT INTO business_hours (store_id, open_time, close_time, closed_weekday) VALUES (?, '10:00:00', '20:00:00', 2)`,
			id)
	}

	// ─── スタッフ（オーナー1 + 店長8 + スタッフ各3 = 33名）──
	type staffRow struct{ name, initials, email, role, store string }

	// オーナー（柏の葉キャンパス店所属）
	ownerDefs := []staffRow{
		{"山田 健一", "YK", "owner@salon-test.com", "owner", "柏の葉キャンパス店"},
	}

	// 店長（各店舗1名）
	adminDefs := []staffRow{
		{"田中 彩花", "TA", "mgr.kashiwanoha@salon-test.com",  "admin", "柏の葉キャンパス店"},
		{"林 大輝",   "HD", "mgr.kashiwa@salon-test.com",      "admin", "柏店"},
		{"吉田 沙織", "YS", "mgr.matsudo@salon-test.com",      "admin", "松戸店"},
		{"石井 奈々", "IN", "mgr.funabashi@salon-test.com",    "admin", "船橋店"},
		{"渡辺 翔",   "WS", "mgr.nagareyama@salon-test.com",   "admin", "流山おおたかの森店"},
		{"佐藤 みく", "SM", "mgr.yashio@salon-test.com",       "admin", "八潮店"},
		{"中村 健太", "NK", "mgr.rokkucho@salon-test.com",     "admin", "六丁店"},
		{"伊藤 あかり","IA", "mgr.kitasenju@salon-test.com",   "admin", "北千住店"},
	}

	// スタッフ（各店舗3名）
	staffNames := map[string][]staffRow{
		"柏の葉キャンパス店": {
			{"坂本 ひな",  "SH", "st01.kashiwanoha@salon-test.com", "staff", "柏の葉キャンパス店"},
			{"岡田 蓮",    "OR", "st02.kashiwanoha@salon-test.com", "staff", "柏の葉キャンパス店"},
			{"前田 陸",    "MR", "st03.kashiwanoha@salon-test.com", "staff", "柏の葉キャンパス店"},
		},
		"柏店": {
			{"高橋 さくら", "TS", "st01.kashiwa@salon-test.com", "staff", "柏店"},
			{"小林 莉子",   "KR", "st02.kashiwa@salon-test.com", "staff", "柏店"},
			{"加藤 ゆい",   "KY", "st03.kashiwa@salon-test.com", "staff", "柏店"},
		},
		"松戸店": {
			{"鈴木 陽子",  "SY", "st01.matsudo@salon-test.com", "staff", "松戸店"},
			{"佐々木 葵",  "SA", "st02.matsudo@salon-test.com", "staff", "松戸店"},
			{"村田 あおい", "MA", "st03.matsudo@salon-test.com", "staff", "松戸店"},
		},
		"船橋店": {
			{"西村 みく",  "NM", "st01.funabashi@salon-test.com", "staff", "船橋店"},
			{"橋本 光",    "HH", "st02.funabashi@salon-test.com", "staff", "船橋店"},
			{"清水 桃花",  "SM2", "st03.funabashi@salon-test.com", "staff", "船橋店"},
		},
		"流山おおたかの森店": {
			{"山本 凛",   "YR", "st01.nagareyama@salon-test.com", "staff", "流山おおたかの森店"},
			{"長谷川 花", "HH2","st02.nagareyama@salon-test.com", "staff", "流山おおたかの森店"},
			{"野口 夏",   "NG", "st03.nagareyama@salon-test.com", "staff", "流山おおたかの森店"},
		},
		"八潮店": {
			{"藤田 悠",   "FY", "st01.yashio@salon-test.com", "staff", "八潮店"},
			{"井上 彩",   "IH", "st02.yashio@salon-test.com", "staff", "八潮店"},
			{"松本 春香", "MH", "st03.yashio@salon-test.com", "staff", "八潮店"},
		},
		"六丁店": {
			{"木村 咲",   "KS", "st01.rokkucho@salon-test.com", "staff", "六丁店"},
			{"斎藤 りん", "SR", "st02.rokkucho@salon-test.com", "staff", "六丁店"},
			{"福田 奈緒", "FN", "st03.rokkucho@salon-test.com", "staff", "六丁店"},
		},
		"北千住店": {
			{"池田 七海",  "IN2", "st01.kitasenju@salon-test.com", "staff", "北千住店"},
			{"浜田 亜美",  "HA",  "st02.kitasenju@salon-test.com", "staff", "北千住店"},
			{"近藤 ゆか",  "KG",  "st03.kitasenju@salon-test.com", "staff", "北千住店"},
		},
	}

	staffIDs := map[string]int64{}
	insertStaff := func(defs []staffRow) {
		for _, s := range defs {
			id := exec("staff:"+s.name,
				`INSERT INTO staffs (salon_id, store_id, name, email, password_hash, role, avatar_initials)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				salonID, storeIDs[s.store], s.name, s.email, hash("demo1234"), s.role, s.initials)
			staffIDs[s.name] = id
		}
	}
	insertStaff(ownerDefs)
	insertStaff(adminDefs)
	for _, defs := range staffNames {
		insertStaff(defs)
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
		{"松田 れな",   "090-9999-1111"},
		{"山口 ひより", "090-1234-5678"},
	} {
		exec("customer:"+c.name, `INSERT INTO customers (salon_id, name, phone) VALUES (?, ?, ?)`, salonID, c.name, c.phone)
	}

	// ─── 施術メニュー ──────────────────────────────────────────
	for _, m := range []struct {
		name string
		price, dur int
	}{
		{"カット",          5500,  60},
		{"カラー",          8800,  90},
		{"パーマ",         11000, 120},
		{"トリートメント",    3300,  30},
		{"ヘッドスパ",       4400,  45},
		{"カット＋カラー",   13200, 150},
		{"カット＋パーマ",   15400, 180},
		{"ブリーチ",        11000, 120},
		{"縮毛矯正",        22000, 180},
	} {
		exec("menu:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price, duration) VALUES (?, ?, 'treatment', ?, ?)`,
			salonID, m.name, m.price, m.dur)
	}

	// ─── 物販商品 ───────────────────────────────────────────
	for _, m := range []struct {
		name  string
		price int
	}{
		{"エルジューダ エマルジョン+", 2750},
		{"エルジューダ FO",           2750},
		{"ミルボン シャンプー",        2200},
		{"ミルボン トリートメント",    2420},
		{"スムージングオイル",         3300},
		{"ヘアマスク",                3850},
	} {
		exec("retail:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price) VALUES (?, ?, 'retail', ?)`,
			salonID, m.name, m.price)
	}

	// ─── 材料 & 在庫 ─────────────────────────────────────────
	type matDef struct {
		name, brand, cat, unit, sizeUnit string
		size                             int
	}
	matList := []matDef{
		{"ミルボン オルディーブ N",            "MILBON",  "カラー",                  "本", "g",  80},
		{"ナプラ N.カラー SB",               "napla",   "カラー",                  "本", "g",  80},
		{"ウエラ コレストン",                  "WELLA",   "カラー",                  "本", "g",  60},
		{"ミルボン ジェミールフラン シャンプー",  "MILBON",  "シャンプー・トリートメント", "本", "ml", 500},
		{"ナプラ ケアテクト HB トリートメント",  "napla",   "シャンプー・トリートメント", "本", "ml", 250},
		{"アリミノ スパイスネオ フリーズキープ", "ARIMINO", "スタイリング",             "缶", "",   0},
		{"ミルボン ニゼル ドレシア",            "MILBON",  "スタイリング",             "本", "ml", 85},
	}

	allStoreIDs := make([]int64, len(storeDefs))
	for i, s := range storeDefs {
		allStoreIDs[i] = storeIDs[s.name]
	}

	quantities := [][]int{
		{3,  8, 12,  5,  7,  4,  6,  9},
		{2,  5,  7,  3,  6,  2,  4,  5},
		{6, 10, 15,  8, 12,  5,  9, 11},
		{4,  6,  8,  5,  7,  3,  5,  8},
		{2,  4,  6,  3,  5,  2,  4,  6},
		{1,  3,  4,  2,  3,  1,  2,  4},
		{5,  7, 10,  6,  8,  4,  7,  9},
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

	// 店舗ごとの担当スタッフ（店長 + 一般スタッフ）
	staffsForStore := map[int64][]string{}
	for _, s := range adminDefs {
		staffsForStore[storeIDs[s.store]] = append(staffsForStore[storeIDs[s.store]], s.name)
	}
	for storeName, defs := range staffNames {
		sID := storeIDs[storeName]
		for _, s := range defs {
			staffsForStore[sID] = append(staffsForStore[sID], s.name)
		}
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
	fmt.Printf("  ログイン: owner@salon-test.com / demo1234\n")
	fmt.Printf("  サロン:   %s（8店舗・33スタッフ）\n", salonName)
}
