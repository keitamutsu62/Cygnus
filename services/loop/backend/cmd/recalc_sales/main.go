// salon_id=1 の staff_daily_sales / daily_sales / staff_menu_sales を
// treatments / retail_sales テーブルから完全再構築するワンショットスクリプト。
// seed データが集計テーブルを汚染した場合のリセットに使う。
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
)

const targetSalonID = 1

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	ctx := context.Background()

	fmt.Printf("==> salon_id=%d の売上集計テーブルをリセットします\n", targetSalonID)

	// ── 1. 対象 store_id を取得 ─────────────────────────────────
	rows, err := db.QueryContext(ctx, `SELECT id FROM stores WHERE salon_id = ?`, targetSalonID)
	if err != nil {
		log.Fatalf("stores取得失敗: %v", err)
	}
	var storeIDs []uint64
	for rows.Next() {
		var id uint64
		rows.Scan(&id)
		storeIDs = append(storeIDs, id)
	}
	rows.Close()
	if len(storeIDs) == 0 {
		log.Fatalf("salon_id=%d に stores が存在しません", targetSalonID)
	}
	fmt.Printf("  対象store_id: %v\n", storeIDs)

	// ── 2. 対象 staff_id を取得 ─────────────────────────────────
	staffRows, err := db.QueryContext(ctx, `SELECT id FROM staffs WHERE salon_id = ?`, targetSalonID)
	if err != nil {
		log.Fatalf("staffs取得失敗: %v", err)
	}
	var staffIDs []uint64
	for staffRows.Next() {
		var id uint64
		staffRows.Scan(&id)
		staffIDs = append(staffIDs, id)
	}
	staffRows.Close()
	fmt.Printf("  対象staff_id: %v\n", staffIDs)

	if len(staffIDs) == 0 {
		log.Fatalf("salon_id=%d に staffs が存在しません", targetSalonID)
	}

	// ── 3. staff_menu_sales → staff_daily_sales の順で削除 ──────
	// staff_menu_sales はまず全削除
	var delMenuSales int64
	for _, sid := range staffIDs {
		res, _ := db.ExecContext(ctx, `
			DELETE sms FROM staff_menu_sales sms
			JOIN staff_daily_sales sds ON sds.id = sms.staff_daily_sale_id
			WHERE sds.staff_id = ?`, sid)
		n, _ := res.RowsAffected()
		delMenuSales += n
	}
	fmt.Printf("  staff_menu_sales 削除: %d行\n", delMenuSales)

	// 孤立した staff_menu_sales（staff_daily_sales が存在しない）も削除
	res, _ := db.ExecContext(ctx, `
		DELETE sms FROM staff_menu_sales sms
		LEFT JOIN staff_daily_sales sds ON sds.id = sms.staff_daily_sale_id
		WHERE sds.id IS NULL`)
	n, _ := res.RowsAffected()
	fmt.Printf("  孤立staff_menu_sales 削除: %d行\n", n)

	// staff_daily_sales 削除
	var delStaffSales int64
	for _, sid := range staffIDs {
		res, _ := db.ExecContext(ctx, `DELETE FROM staff_daily_sales WHERE staff_id = ?`, sid)
		n, _ := res.RowsAffected()
		delStaffSales += n
	}
	fmt.Printf("  staff_daily_sales 削除: %d行\n", delStaffSales)

	// daily_sales 削除
	var delDailySales int64
	for _, sid := range storeIDs {
		res, _ := db.ExecContext(ctx, `DELETE FROM daily_sales WHERE store_id = ?`, sid)
		n, _ := res.RowsAffected()
		delDailySales += n
	}
	fmt.Printf("  daily_sales 削除: %d行\n", delDailySales)

	// ── 4. treatments から staff_daily_sales と staff_menu_sales を再構築 ──
	type treatmentRow struct {
		staffID     uint64
		storeID     uint64
		menuID      *uint64
		price       uint32
		date        string
		performedAt string
	}
	trows, err := db.QueryContext(ctx, `
		SELECT t.staff_id, t.store_id, t.menu_id, t.price,
		       DATE_FORMAT(DATE(t.performed_at), '%Y-%m-%d') AS date,
		       DATE_FORMAT(t.performed_at, '%Y-%m-%d %H:%i:%s') AS performed_at
		FROM treatments t
		WHERE t.salon_id = ? AND t.store_id IS NOT NULL
		ORDER BY t.performed_at ASC`, targetSalonID)
	if err != nil {
		log.Fatalf("treatments取得失敗: %v", err)
	}
	var treatments []treatmentRow
	for trows.Next() {
		var r treatmentRow
		trows.Scan(&r.staffID, &r.storeID, &r.menuID, &r.price, &r.date, &r.performedAt)
		treatments = append(treatments, r)
	}
	trows.Close()
	fmt.Printf("  treatments件数: %d\n", len(treatments))

	// staff_daily_sales を日付×スタッフ単位で集計
	type dayKey struct{ staffID, storeID uint64; date string }
	type daySummary struct{ total, cnt uint32 }
	daySummaries := map[dayKey]*daySummary{}
	// performed_at ごとに1回のチェックアウト = 1客としてカウント
	type visitKey struct{ staffID, storeID uint64; date, performedAt string }
	seenVisits := map[visitKey]bool{}
	for _, t := range treatments {
		k := dayKey{t.staffID, t.storeID, t.date}
		if _, ok := daySummaries[k]; !ok {
			daySummaries[k] = &daySummary{}
		}
		daySummaries[k].total += t.price
		vk := visitKey{t.staffID, t.storeID, t.date, t.performedAt}
		if !seenVisits[vk] {
			seenVisits[vk] = true
			daySummaries[k].cnt++
		}
	}

	// INSERT staff_daily_sales
	staffDaySaleID := map[dayKey]uint64{}
	for k, s := range daySummaries {
		unitPrice := uint32(0)
		if s.cnt > 0 {
			unitPrice = s.total / s.cnt
		}
		res, err := db.ExecContext(ctx, `
			INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
			VALUES (?, ?, ?, ?, ?, ?, 0)
			ON DUPLICATE KEY UPDATE
			  total_sales  = VALUES(total_sales),
			  client_count = VALUES(client_count),
			  unit_price   = VALUES(unit_price)`,
			k.staffID, k.storeID, k.date, s.total, s.cnt, unitPrice)
		if err != nil {
			log.Printf("  staff_daily_sales insert error: %v", err)
			continue
		}
		id, _ := res.LastInsertId()
		if id > 0 {
			staffDaySaleID[k] = uint64(id)
		} else {
			// ON DUPLICATE: 既存のIDを取得
			var eid uint64
			db.QueryRowContext(ctx,
				`SELECT id FROM staff_daily_sales WHERE staff_id=? AND date=?`,
				k.staffID, k.date).Scan(&eid)
			staffDaySaleID[k] = eid
		}
	}
	fmt.Printf("  staff_daily_sales 再挿入: %d行\n", len(daySummaries))

	// INSERT staff_menu_sales (menu_id がある treatment のみ)
	menuSalesInserted := 0
	for _, t := range treatments {
		if t.menuID == nil {
			continue
		}
		k := dayKey{t.staffID, t.storeID, t.date}
		sdsID, ok := staffDaySaleID[k]
		if !ok || sdsID == 0 {
			continue
		}
		_, err := db.ExecContext(ctx, `
			INSERT INTO staff_menu_sales (staff_daily_sale_id, menu_id, count, amount)
			VALUES (?, ?, 1, ?)`,
			sdsID, *t.menuID, t.price)
		if err == nil {
			menuSalesInserted++
		}
	}
	fmt.Printf("  staff_menu_sales 再挿入: %d行\n", menuSalesInserted)

	// retail_sales も staff_daily_sales に加算
	rrows, err := db.QueryContext(ctx, `
		SELECT rs.staff_id, rs.store_id, rs.price, DATE_FORMAT(DATE(rs.sold_at), '%Y-%m-%d') AS date
		FROM retail_sales rs
		JOIN stores st ON st.id = rs.store_id
		WHERE st.salon_id = ? AND rs.store_id IS NOT NULL
		ORDER BY rs.sold_at ASC`, targetSalonID)
	if err == nil {
		defer rrows.Close()
		retailInserted := 0
		for rrows.Next() {
			var staffID, storeID uint64
			var price uint32
			var date string
			rrows.Scan(&staffID, &storeID, &price, &date)
			db.ExecContext(ctx, `
				INSERT INTO staff_daily_sales (staff_id, store_id, date, total_sales, client_count, unit_price, retail_sales)
				VALUES (?, ?, ?, ?, 0, 0, ?)
				ON DUPLICATE KEY UPDATE
				  total_sales  = total_sales + VALUES(retail_sales),
				  retail_sales = retail_sales + VALUES(retail_sales)`,
				staffID, storeID, date, price, price)
			retailInserted++
		}
		fmt.Printf("  retail_sales 反映: %d件\n", retailInserted)
	}

	// ── 5. daily_sales を store 単位で再構築 ──────────────────────
	storeRows2, err := db.QueryContext(ctx, `
		SELECT t.store_id, DATE_FORMAT(DATE(t.performed_at), '%Y-%m-%d') AS date, SUM(t.price) AS tech, COUNT(DISTINCT t.performed_at) AS cnt
		FROM treatments t
		WHERE t.salon_id = ? AND t.store_id IS NOT NULL
		GROUP BY t.store_id, DATE_FORMAT(DATE(t.performed_at), '%Y-%m-%d')`, targetSalonID)
	if err != nil {
		log.Fatalf("store daily集計失敗: %v", err)
	}
	defer storeRows2.Close()
	storeInserted := 0
	for storeRows2.Next() {
		var storeID uint64
		var date string
		var tech, cnt uint32
		storeRows2.Scan(&storeID, &date, &tech, &cnt)

		var retail uint32
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(price), 0) FROM retail_sales
			WHERE DATE(sold_at) = ? AND store_id = ?`, date, storeID).Scan(&retail)

		db.ExecContext(ctx, `
			INSERT INTO daily_sales (store_id, date, total_sales, client_count, tech_sales, retail_sales)
			VALUES (?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
			  total_sales  = VALUES(total_sales),
			  client_count = VALUES(client_count),
			  tech_sales   = VALUES(tech_sales),
			  retail_sales = VALUES(retail_sales)`,
			storeID, date, tech+retail, cnt, tech, retail)
		storeInserted++
	}
	fmt.Printf("  daily_sales 再挿入: %d行\n", storeInserted)

	fmt.Printf("\n✅ salon_id=%d の売上集計を treatments から再構築しました\n", targetSalonID)
}
