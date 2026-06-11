// 今日の日付の staff_daily_sales / daily_sales を treatments から再計算するワンショットスクリプト。
// seed データが今日の集計を汚染した場合のリセットに使う。
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
)

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	ctx := context.Background()
	today := time.Now().Format("2006-01-02")
	fmt.Printf("==> 対象日: %s\n", today)

	// ── 1. 今日のデータを削除 ──────────────────────────────────
	res, _ := db.ExecContext(ctx, `DELETE FROM staff_daily_sales WHERE date = ?`, today)
	n, _ := res.RowsAffected()
	fmt.Printf("  staff_daily_sales 削除: %d行\n", n)

	res, _ = db.ExecContext(ctx, `DELETE FROM daily_sales WHERE date = ?`, today)
	n, _ = res.RowsAffected()
	fmt.Printf("  daily_sales 削除: %d行\n", n)

	// ── 2. treatments から今日分を再集計 ──────────────────────
	rows, err := db.QueryContext(ctx, `
		SELECT staff_id, store_id, SUM(price) AS total, COUNT(DISTINCT performed_at) AS cnt
		FROM treatments
		WHERE DATE(performed_at) = ? AND store_id IS NOT NULL
		GROUP BY staff_id, store_id`, today)
	if err != nil {
		log.Fatalf("treatments 取得失敗: %v", err)
	}
	defer rows.Close()

	staffInserted := 0
	type staffRow struct {
		staffID, storeID uint64
		total            uint32
		cnt              uint32
	}
	var staffRows []staffRow
	for rows.Next() {
		var r staffRow
		rows.Scan(&r.staffID, &r.storeID, &r.total, &r.cnt)
		staffRows = append(staffRows, r)
	}
	rows.Close()

	for _, r := range staffRows {
		unitPrice := uint32(0)
		if r.cnt > 0 {
			unitPrice = r.total / r.cnt
		}
		_, err := db.ExecContext(ctx, `
			INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
			VALUES (?, ?, ?, ?, ?, ?, 0)
			ON DUPLICATE KEY UPDATE
			  total_sales  = VALUES(total_sales),
			  client_count = VALUES(client_count),
			  unit_price   = VALUES(unit_price)`,
			r.staffID, r.storeID, today, r.total, r.cnt, unitPrice)
		if err != nil {
			log.Printf("  staff_daily_sales insert error staff=%d: %v", r.staffID, err)
			continue
		}
		staffInserted++
	}

	// retail_sales も加算
	rrows, err := db.QueryContext(ctx, `
		SELECT staff_id, store_id, SUM(price) AS total
		FROM retail_sales
		WHERE DATE(sold_at) = ? AND store_id IS NOT NULL
		GROUP BY staff_id, store_id`, today)
	if err == nil {
		defer rrows.Close()
		for rrows.Next() {
			var staffID, storeID uint64
			var total uint32
			rrows.Scan(&staffID, &storeID, &total)
			db.ExecContext(ctx, `
				INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
				VALUES (?, ?, ?, ?, 0, 0, ?)
				ON DUPLICATE KEY UPDATE
				  total_sales  = total_sales + VALUES(retail_sales),
				  retail_sales = retail_sales + VALUES(retail_sales)`,
				staffID, storeID, today, total, total)
		}
	}

	fmt.Printf("  staff_daily_sales 再挿入: %d行\n", staffInserted)

	// ── 3. daily_sales を store 単位で再集計 ──────────────────
	storeRows, err := db.QueryContext(ctx, `
		SELECT store_id, SUM(price) AS tech, COUNT(DISTINCT performed_at) AS cnt
		FROM treatments
		WHERE DATE(performed_at) = ? AND store_id IS NOT NULL
		GROUP BY store_id`, today)
	if err != nil {
		log.Fatalf("store daily_sales 取得失敗: %v", err)
	}
	defer storeRows.Close()

	storeInserted := 0
	for storeRows.Next() {
		var storeID uint64
		var tech, cnt uint32
		storeRows.Scan(&storeID, &tech, &cnt)

		var retail uint32
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(price), 0) FROM retail_sales
			WHERE DATE(sold_at) = ? AND store_id = ?`, today, storeID).Scan(&retail)

		_, err := db.ExecContext(ctx, `
			INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
			VALUES (?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
			  total_sales  = VALUES(total_sales),
			  client_count = VALUES(client_count),
			  tech_sales   = VALUES(tech_sales),
			  retail_sales = VALUES(retail_sales)`,
			storeID, today, tech+retail, cnt, tech, retail)
		if err != nil {
			log.Printf("  daily_sales insert error store=%d: %v", storeID, err)
			continue
		}
		storeInserted++
	}
	fmt.Printf("  daily_sales 再挿入: %d行\n", storeInserted)

	fmt.Printf("\n✅ %s の売上集計をリセットしました\n", today)
}
