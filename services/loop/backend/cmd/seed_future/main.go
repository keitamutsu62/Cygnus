// go run ./cmd/seed_future  で未来日付の売上ダミーデータを投入する。
// 今日の翌日〜2026-08-31 の staff_daily_sales / daily_sales を生成。
// ON DUPLICATE KEY UPDATE なので何度実行しても安全。
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
)

var ctx = context.Background()

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	// ─── 既存の salon / store / staff を取得 ───────────────────
	var salonID int64
	if err := db.QueryRowContext(ctx, `SELECT id FROM salons WHERE name = 'Hair SALON test'`).Scan(&salonID); err != nil {
		log.Fatalf("サロンが見つかりません（先に seed を実行してください）: %v", err)
	}

	rows, err := db.QueryContext(ctx, `SELECT id FROM stores WHERE salon_id = ?`, salonID)
	if err != nil {
		log.Fatalf("店舗取得失敗: %v", err)
	}
	var allStoreIDs []int64
	for rows.Next() {
		var id int64
		rows.Scan(&id)
		allStoreIDs = append(allStoreIDs, id)
	}
	rows.Close()

	staffRows, err := db.QueryContext(ctx, `SELECT id, store_id FROM staffs WHERE salon_id = ?`, salonID)
	if err != nil {
		log.Fatalf("スタッフ取得失敗: %v", err)
	}
	staffsForStore := map[int64][]int64{}
	for staffRows.Next() {
		var sfID, sID int64
		staffRows.Scan(&sfID, &sID)
		staffsForStore[sID] = append(staffsForStore[sID], sfID)
	}
	staffRows.Close()

	// ─── 未来データ生成（明日〜2026-08-31）───────────────────
	rng := rand.New(rand.NewSource(42))
	today := time.Now()
	end := time.Date(2026, 8, 31, 0, 0, 0, 0, today.Location())

	inserted := 0
	for d := today.AddDate(0, 0, 1); !d.After(end); d = d.AddDate(0, 0, 1) {
		if int(d.Weekday()) == 2 { // 火曜定休
			continue
		}
		dateStr := d.Format("2006-01-02")

		for _, sID := range allStoreIDs {
			staffList := staffsForStore[sID]
			storeTech, storeRetail, storeClients := 0, 0, 0

			for _, sfID := range staffList {
				clients := rng.Intn(6) + 3
				techPerClient := []int{5500, 8800, 13200, 11000, 4400}[rng.Intn(5)]
				tech := techPerClient * clients
				retail := 0
				if rng.Intn(3) == 0 {
					retail = 3300 * (rng.Intn(3) + 1)
				}
				total := tech + retail
				unitPrice := total / clients

				_, err := db.ExecContext(ctx,
					`INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
					sfID, sID, dateStr, total, clients, unitPrice, retail)
				if err != nil {
					log.Fatalf("staff_daily_sales INSERT失敗 (%s, staff=%d): %v", dateStr, sfID, err)
				}

				storeTech += tech
				storeRetail += retail
				storeClients += clients
			}

			_, err := db.ExecContext(ctx,
				`INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE total_sales=VALUES(total_sales)`,
				sID, dateStr, storeTech+storeRetail, storeClients, storeTech, storeRetail)
			if err != nil {
				log.Fatalf("daily_sales INSERT失敗 (%s, store=%d): %v", dateStr, sID, err)
			}
		}
		inserted++
	}

	fmt.Printf("✓ 未来データ投入完了！ %d 日分（明日〜2026-08-31）\n", inserted)
}
