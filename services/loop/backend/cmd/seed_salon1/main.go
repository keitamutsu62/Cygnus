// salon_id=1 にデモデータを投入するワンショットスクリプト（冪等）
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	mathrand "math/rand"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"golang.org/x/crypto/bcrypt"
)

const (
	salonID  = 1
	storeID  = 1
	password = "Cygnus2024!"
)

var ctx = context.Background()

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	execIgnore := func(label, q string, args ...any) int64 {
		r, e := db.ExecContext(ctx, q, args...)
		if e != nil {
			log.Fatalf("[%s] 失敗: %v", label, e)
		}
		id, _ := r.LastInsertId()
		return id
	}
	hash := func(pw string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
		return string(h)
	}

	// ─── スタッフ追加（5名）──────────────────────────────────────
	type staffDef struct {
		name, initials, email, role string
		shimei                      uint32
	}
	newStaffs := []staffDef{
		{"村上 咲良", "MS", "murakami@cygnus.style",  "admin", 2500},
		{"橋本 颯太", "HS", "hashimoto@cygnus.style", "staff", 1500},
		{"小川 莉奈", "OR", "ogawa@cygnus.style",     "staff", 1500},
		{"藤田 蓮",   "FR", "fujita@cygnus.style",    "staff", 1000},
		{"石井 みく", "IM", "ishii@cygnus.style",     "staff", 0},
	}
	staffIDs := map[string]int64{}

	// 既存のオーナー(keita)を取得
	var keitaID int64
	db.QueryRowContext(ctx, `SELECT id FROM staffs WHERE salon_id = ? AND role = 'owner' LIMIT 1`, salonID).Scan(&keitaID)
	staffIDs["陸浦 圭太"] = keitaID

	for _, s := range newStaffs {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM staffs WHERE email = ?`, s.email).Scan(&existing)
		if existing != 0 {
			staffIDs[s.name] = existing
			log.Printf("スタッフ既存: %s", s.name)
			continue
		}
		id := execIgnore("staff:"+s.name,
			`INSERT INTO staffs (salon_id, store_id, name, email, password_hash, role, avatar_initials, shimei_charge)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			salonID, storeID, s.name, s.email, hash(password), s.role, s.initials, s.shimei)
		staffIDs[s.name] = id
		fmt.Printf("✅ スタッフ追加: %s\n", s.name)
	}

	// ─── 施術メニュー（12種）─────────────────────────────────────
	type menuDef struct {
		name       string
		price, dur int
	}
	menus := []menuDef{
		{"カット", 6600, 60},
		{"カラー", 9900, 90},
		{"パーマ", 13200, 120},
		{"トリートメント", 4400, 40},
		{"ヘッドスパ", 5500, 45},
		{"カット＋カラー", 15400, 150},
		{"カット＋パーマ", 17600, 180},
		{"ブリーチ", 13200, 120},
		{"縮毛矯正", 24200, 200},
		{"カット＋縮毛矯正", 28600, 240},
		{"ハイライト", 16500, 150},
		{"インナーカラー", 13200, 120},
	}
	menuIDs := make([]int64, len(menus))
	for i, m := range menus {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM menus WHERE salon_id = ? AND name = ? AND menu_type = 'treatment'`, salonID, m.name).Scan(&existing)
		if existing != 0 {
			menuIDs[i] = existing
			continue
		}
		menuIDs[i] = execIgnore("menu:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price, duration) VALUES (?, ?, 'treatment', ?, ?)`,
			salonID, m.name, m.price, m.dur)
	}
	fmt.Printf("✅ 施術メニュー: %d件\n", len(menus))

	// ─── 物販（6種）─────────────────────────────────────────────
	retailItems := []struct {
		name  string
		price int
	}{
		{"エルジューダ エマルジョン+", 2970},
		{"ミルボン ジェミールフラン シャンプー", 2640},
		{"ナプラ N. ポリッシュオイル", 3520},
		{"ホーユー ソマルカ トリートメント", 2310},
		{"デミ ウェーボ スプレー", 1980},
		{"クオレ ロレアル ヘアマスク", 4180},
	}
	for _, m := range retailItems {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM menus WHERE salon_id = ? AND name = ? AND menu_type = 'retail'`, salonID, m.name).Scan(&existing)
		if existing != 0 {
			continue
		}
		execIgnore("retail:"+m.name,
			`INSERT INTO menus (salon_id, name, menu_type, price) VALUES (?, ?, 'retail', ?)`,
			salonID, m.name, m.price)
	}
	fmt.Printf("✅ 物販メニュー: %d件\n", len(retailItems))

	// ─── 顧客（80名）─────────────────────────────────────────────
	customers := []struct{ name, phone string }{
		{"山田 花子", "090-2001-0001"}, {"鈴木 美咲", "090-2001-0002"}, {"佐藤 愛", "090-2001-0003"},
		{"田中 遥", "090-2001-0004"}, {"渡辺 葵", "090-2001-0005"}, {"伊藤 桃", "090-2001-0006"},
		{"中村 柚香", "090-2001-0007"}, {"小林 七海", "090-2001-0008"}, {"加藤 莉子", "090-2001-0009"},
		{"吉田 凛", "090-2001-0010"}, {"山口 詩織", "090-2001-0011"}, {"松本 このか", "090-2001-0012"},
		{"井上 さな", "090-2001-0013"}, {"木村 えな", "090-2001-0014"}, {"林 りこ", "090-2001-0015"},
		{"清水 まな", "090-2001-0016"}, {"山崎 のの", "090-2001-0017"}, {"池田 ゆい", "090-2001-0018"},
		{"橋本 らら", "090-2001-0019"}, {"石川 みく", "090-2001-0020"}, {"前田 あおい", "090-2001-0021"},
		{"藤田 こころ", "090-2001-0022"}, {"岡田 ひな", "090-2001-0023"}, {"後藤 ゆな", "090-2001-0024"},
		{"長谷川 きら", "090-2001-0025"}, {"村田 のあ", "090-2001-0026"}, {"近藤 ちか", "090-2001-0027"},
		{"坂本 ゆき", "090-2001-0028"}, {"斎藤 あんな", "090-2001-0029"}, {"福田 ひより", "090-2001-0030"},
		{"西村 まりか", "090-2001-0031"}, {"太田 ことり", "090-2001-0032"}, {"岩田 なの", "090-2001-0033"},
		{"浜田 れな", "090-2001-0034"}, {"野口 いちか", "090-2001-0035"}, {"松田 ひまり", "090-2001-0036"},
		{"石井 ふうか", "090-2001-0037"}, {"丸山 めい", "090-2001-0038"}, {"藤原 ゆうな", "090-2001-0039"},
		{"小川 あかり", "090-2001-0040"}, {"中島 みお", "090-2001-0041"}, {"和田 ここ", "090-2001-0042"},
		{"宮崎 らん", "090-2001-0043"}, {"高木 みな", "090-2001-0044"}, {"菊地 えみ", "090-2001-0045"},
		{"安藤 りん", "090-2001-0046"}, {"杉山 ゆめ", "090-2001-0047"}, {"内田 のぞみ", "090-2001-0048"},
		{"柴田 みれい", "090-2001-0049"}, {"原田 ひな", "090-2001-0050"}, {"広瀬 さき", "090-2001-0051"},
		{"三浦 えりか", "090-2001-0052"}, {"大塚 まい", "090-2001-0053"}, {"谷口 ちあき", "090-2001-0054"},
		{"武田 あさひ", "090-2001-0055"}, {"上田 こと", "090-2001-0056"}, {"金子 ゆら", "090-2001-0057"},
		{"高田 なつ", "090-2001-0058"}, {"宮本 はな", "090-2001-0059"}, {"永田 りか", "090-2001-0060"},
		{"川口 みさき", "090-2001-0061"}, {"大野 ひとみ", "090-2001-0062"}, {"増田 なみ", "090-2001-0063"},
		{"川崎 あや", "090-2001-0064"}, {"田村 るな", "090-2001-0065"}, {"市川 せな", "090-2001-0066"},
		{"佐々木 ゆき", "090-2001-0067"}, {"松井 あみ", "090-2001-0068"}, {"西田 かの", "090-2001-0069"},
		{"河野 のえ", "090-2001-0070"}, {"森田 ちの", "090-2001-0071"}, {"阿部 みつき", "090-2001-0072"},
		{"島田 すず", "090-2001-0073"}, {"酒井 こはる", "090-2001-0074"}, {"横山 ひめ", "090-2001-0075"},
		{"久保 まりん", "090-2001-0076"}, {"平野 ゆいか", "090-2001-0077"}, {"工藤 らいな", "090-2001-0078"},
		{"藤井 あいり", "090-2001-0079"}, {"石田 のか", "090-2001-0080"},
	}
	customerCount := 0
	for _, c := range customers {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM customers WHERE salon_id = ? AND phone = ?`, salonID, c.phone).Scan(&existing)
		if existing != 0 {
			continue
		}
		execIgnore("customer:"+c.name,
			`INSERT INTO customers (salon_id, name, phone) VALUES (?, ?, ?)`,
			salonID, c.name, c.phone)
		customerCount++
	}
	fmt.Printf("✅ 顧客: %d件追加\n", customerCount)

	// ─── 材料（20品目）+ 在庫 ────────────────────────────────────
	type matDef struct {
		name, brand, cat, unit, sizeUnit string
		size, qty, threshold             int
	}
	materials := []matDef{
		{"ミルボン オルディーブ アディクシー", "MILBON", "カラー", "本", "g", 80, 24, 10},
		{"ナプラ N.カラー SB", "napla", "カラー", "本", "g", 80, 18, 8},
		{"ウエラ コレストン パーフェクト", "WELLA", "カラー", "本", "g", 60, 30, 12},
		{"フィヨーレ BFカラー", "FIORE", "カラー", "本", "g", 80, 15, 8},
		{"ホーユー プロマスター", "HOYU", "カラー", "本", "g", 80, 20, 10},
		{"ミルボン ジェミールフラン シャンプー", "MILBON", "シャンプー", "本", "ml", 500, 12, 5},
		{"ナプラ ケアテクト HB シャンプー", "napla", "シャンプー", "本", "ml", 250, 10, 5},
		{"デミ インプライム シャンプー", "DEMI", "シャンプー", "本", "ml", 400, 8, 4},
		{"ミルボン ジェミールフラン トリートメント", "MILBON", "トリートメント", "本", "ml", 500, 10, 4},
		{"ナプラ ケアテクト HB トリートメント", "napla", "トリートメント", "本", "ml", 250, 8, 4},
		{"アリミノ スパイスネオ フリーズキープ", "ARIMINO", "スタイリング", "缶", "", 0, 6, 3},
		{"ミルボン ニゼル ドレシア グリース", "MILBON", "スタイリング", "本", "ml", 85, 8, 4},
		{"ロレアル テクニアート ストラクチャー", "L'Oreal", "スタイリング", "本", "ml", 150, 5, 3},
		{"シュワルツコフ BCボンエクア シャンプー", "Schwarzkopf", "シャンプー", "本", "ml", 250, 12, 5},
		{"デミ ウェーボ デザインキューブ", "DEMI", "スタイリング", "本", "g", 80, 7, 3},
		{"ミルボン プラーミア ヘアセラム", "MILBON", "トリートメント", "本", "ml", 120, 9, 4},
		{"ナプラ インプライム ブースターセラム", "napla", "トリートメント", "本", "ml", 50, 10, 5},
		{"タマリス クリームオキシ 6%", "TAMARIS", "カラー", "本", "ml", 1000, 6, 3},
		{"ロレアル オキシクリーム 3%", "L'Oreal", "カラー", "本", "ml", 900, 8, 4},
		{"ミルボン グローバルミルボン トリートメント", "MILBON", "トリートメント", "本", "ml", 200, 7, 3},
	}
	matIDs := make([]int64, len(materials))
	for i, m := range materials {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM materials WHERE salon_id = ? AND name = ?`, salonID, m.name).Scan(&existing)
		if existing != 0 {
			matIDs[i] = existing
		} else {
			var sizeAmt sql.NullInt32
			var sizeUnit sql.NullString
			if m.size > 0 {
				sizeAmt = sql.NullInt32{Int32: int32(m.size), Valid: true}
				sizeUnit = sql.NullString{String: m.sizeUnit, Valid: true}
			}
			matIDs[i] = execIgnore("material:"+m.name,
				`INSERT INTO materials (salon_id, name, brand, category, size_amount, size_unit, stock_unit)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				salonID, m.name, m.brand, m.cat, sizeAmt, sizeUnit, m.unit)
		}
		// 在庫（なければ作成）
		var invExisting int64
		db.QueryRowContext(ctx, `SELECT id FROM inventories WHERE store_id = ? AND material_id = ?`, storeID, matIDs[i]).Scan(&invExisting)
		if invExisting == 0 {
			status := func(qty, thr int) string {
				if qty <= thr/2 {
					return "要発注"
				}
				if qty <= thr {
					return "注意"
				}
				if qty > thr*2 {
					return "過剰"
				}
				return "正常"
			}(m.qty, m.threshold)
			execIgnore("inventory:"+m.name,
				`INSERT INTO inventories (store_id, material_id, quantity, threshold, status) VALUES (?, ?, ?, ?, ?)`,
				storeID, matIDs[i], m.qty, m.threshold, status)
		}
	}
	fmt.Printf("✅ 材料・在庫: %d品目\n", len(materials))

	// ─── 仕入れ先（3社）─────────────────────────────────────────
	dealerDefs := []struct{ name, method, contact string }{
		{"ミルボン 東京営業所", "email", "order-tokyo@milbon.co.jp"},
		{"ナプラ 南関東エリア", "LINE", "@napla_tokyo"},
		{"ビューティーサプライ 渋谷", "LINE", "@bsupply_shibuya"},
	}
	dealerIDs := make([]int64, len(dealerDefs))
	for i, d := range dealerDefs {
		var existing int64
		db.QueryRowContext(ctx, `SELECT id FROM dealers WHERE salon_id = ? AND name = ?`, salonID, d.name).Scan(&existing)
		if existing != 0 {
			dealerIDs[i] = existing
			continue
		}
		dealerIDs[i] = execIgnore("dealer:"+d.name,
			`INSERT INTO dealers (salon_id, name, contact_method, contact_info, status) VALUES (?, ?, ?, ?, 'active')`,
			salonID, d.name, d.method, d.contact)
	}
	fmt.Printf("✅ 仕入れ先: %d社\n", len(dealerDefs))

	// ─── 発注履歴（5件）─────────────────────────────────────────
	var orderCount int
	db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders WHERE salon_id = ?`, salonID).Scan(&orderCount)
	if orderCount == 0 {
		for i, status := range []string{"sent", "sent", "delivered", "delivered", "draft"} {
			orderID := execIgnore("order",
				`INSERT INTO orders (salon_id, store_id, dealer_id, status, is_next_month_invoice)
				 VALUES (?, ?, ?, ?, ?)`,
				salonID, storeID, dealerIDs[i%3], status, i%2 == 0)
			for j := 0; j < 3; j++ {
				matIdx := (i*3 + j) % len(materials)
				execIgnore("order_item",
					`INSERT INTO order_items (order_id, material_id, quantity, unit, estimated_cost) VALUES (?, ?, ?, ?, ?)`,
					orderID, matIDs[matIdx], (j+1)*5, materials[matIdx].unit, (j+1)*5000)
			}
		}
		fmt.Println("✅ 発注履歴: 5件")
	}

	// ─── 売上データ（過去180日）──────────────────────────────────
	var salesCount int
	db.QueryRowContext(ctx, `SELECT COUNT(*) FROM daily_sales WHERE store_id = ?`, storeID).Scan(&salesCount)
	if salesCount > 0 {
		fmt.Printf("✅ 売上データ: 既存 %d件（スキップ）\n", salesCount)
	} else {
		allStaff := []struct {
			name   string
			id     int64
			prMin  int
			prMax  int
			clMin  int
			clMax  int
		}{
			{"陸浦 圭太", staffIDs["陸浦 圭太"], 20000, 32000, 4, 6},
			{"村上 咲良", staffIDs["村上 咲良"], 14000, 20000, 5, 7},
			{"橋本 颯太", staffIDs["橋本 颯太"], 10000, 15000, 5, 8},
			{"小川 莉奈", staffIDs["小川 莉奈"], 10000, 14000, 5, 8},
			{"藤田 蓮",   staffIDs["藤田 蓮"],   7000, 10000, 6, 9},
			{"石井 みく", staffIDs["石井 みく"],  6600, 9000, 4, 7},
		}

		rng := mathrand.New(mathrand.NewSource(2025))
		today := time.Now()
		days := 0

		for daysAgo := 180; daysAgo >= 1; daysAgo-- {
			d := today.AddDate(0, 0, -daysAgo)
			if int(d.Weekday()) == 2 { // 火曜定休
				continue
			}
			dateStr := d.Format("2006-01-02")

			storeTech, storeRetail, storeClients := 0, 0, 0
			for _, s := range allStaff {
				if s.id == 0 {
					continue
				}
				clients := s.clMin + rng.Intn(s.clMax-s.clMin+1)
				unitPrice := s.prMin + rng.Intn(s.prMax-s.prMin+1)
				tech := unitPrice * clients
				retail := 0
				if rng.Intn(3) != 0 {
					retail = []int{2970, 3520, 2640, 4180}[rng.Intn(4)] * (rng.Intn(2) + 1)
				}
				execIgnore("staff_sales",
					`INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
					s.id, storeID, dateStr, tech+retail, clients, unitPrice, retail)
				storeTech += tech
				storeRetail += retail
				storeClients += clients
			}
			execIgnore("store_sales",
				`INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
				storeID, dateStr, storeTech+storeRetail, storeClients, storeTech, storeRetail)
			days++
		}
		fmt.Printf("✅ 売上データ: %d日分\n", days)
	}

	fmt.Println("\n✅ salon_id=1 デモデータ投入完了！")
	fmt.Println("  スタッフ追加: 村上 咲良 / 橋本 颯太 / 小川 莉奈 / 藤田 蓮 / 石井 みく")
	fmt.Printf("  ログイン: keita.mutsuura@gmail.com / %s\n", password)
}
