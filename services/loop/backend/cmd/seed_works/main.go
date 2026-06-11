// デモスタッフのworksのimage_urlを実S3 URLに更新するワンショットスクリプト
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
)

const imageBase = "https://cygnus-studio-works.s3.ap-northeast-1.amazonaws.com/works"

// デモスタッフのプロフィール順（seed_demo/main.go の profiles と同順）
var demoStaffEmails = []string{
	"tanaka@hair-cygnus.com",
	"sato@hair-cygnus.com",
	"yamamoto@hair-cygnus.com",
	"ito@hair-cygnus.com",
}

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	ctx := context.Background()

	// staffのemailからcygnus_account_idを取得
	type accountInfo struct {
		name      string
		accountID int64
	}
	var accounts []accountInfo
	for _, email := range demoStaffEmails {
		var staffID int64
		var caID int64
		db.QueryRowContext(ctx, `SELECT id FROM staffs WHERE email = ?`, email).Scan(&staffID)
		if staffID == 0 {
			log.Printf("⚠️  スタッフが見つかりません: %s (スキップ)", email)
			continue
		}
		caEmail := fmt.Sprintf("studio_%d@hair-cygnus.com", staffID)
		db.QueryRowContext(ctx, `SELECT id FROM cygnus_accounts WHERE email = ?`, caEmail).Scan(&caID)
		if caID == 0 {
			log.Printf("⚠️  cygnus_accountが見つかりません: %s (スキップ)", caEmail)
			continue
		}
		accounts = append(accounts, accountInfo{email, caID})
		log.Printf("対象: %s → staff_id=%d, cygnus_account_id=%d", email, staffID, caID)
	}

	if len(accounts) == 0 {
		log.Fatal("対象スタッフが見つかりません。seed_demoを先に実行してください。")
	}

	// image割り当て: 30枚を全worksに巡回で割り当て
	// 画像番号 = (プロフィール番号 * 10 + works内インデックス) % 30 + 1
	const totalImages = 30
	totalUpdated := 0

	for pi, acc := range accounts {
		// このアカウントのworksをid順に取得
		rows, err := db.QueryContext(ctx,
			`SELECT id FROM works WHERE cygnus_account_id = ? ORDER BY id ASC`, acc.accountID)
		if err != nil {
			log.Fatalf("works取得失敗: %v", err)
		}
		var workIDs []int64
		for rows.Next() {
			var wid int64
			rows.Scan(&wid)
			workIDs = append(workIDs, wid)
		}
		rows.Close()

		for wi, wid := range workIDs {
			imgNum := (pi*10+wi)%totalImages + 1
			imageURL := fmt.Sprintf("%s/work_%02d.jpg", imageBase, imgNum)
			_, err := db.ExecContext(ctx,
				`UPDATE works SET image_url = ? WHERE id = ?`, imageURL, wid)
			if err != nil {
				log.Printf("work_id=%d 更新失敗: %v", wid, err)
				continue
			}
			totalUpdated++
		}
		fmt.Printf("✅ %s: %d件更新\n", acc.name, len(workIDs))
	}

	fmt.Printf("\n✅ 合計 %d件のworksにS3 image URLを設定しました\n", totalUpdated)
	fmt.Printf("画像URL例: %s/work_01.jpg\n", imageBase)
}
