// salon_id=1 のオーナーに CYG-00001 を付与するワンショットスクリプト
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
)

const targetCygnusID = "CYG-00001"

func main() {
	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	ctx := context.Background()

	// CYG-00001 が既に使われていないか確認
	var existingID int64
	db.QueryRowContext(ctx, `SELECT id FROM cygnus_accounts WHERE cygnus_id = ?`, targetCygnusID).Scan(&existingID)
	if existingID != 0 {
		log.Printf("CYG-00001 は既に存在します (account_id=%d)", existingID)
		return
	}

	// salon_id=1 のオーナースタッフを取得
	var staffID int64
	var staffEmail, staffName string
	var cygnusAccountID *int64
	err = db.QueryRowContext(ctx,
		`SELECT id, email, name, cygnus_account_id FROM staffs WHERE salon_id = 1 AND role = 'owner' LIMIT 1`,
	).Scan(&staffID, &staffEmail, &staffName, &cygnusAccountID)
	if err != nil {
		log.Fatalf("オーナースタッフ取得失敗: %v", err)
	}
	log.Printf("対象スタッフ: id=%d name=%s email=%s cygnus_account_id=%v", staffID, staffName, staffEmail, cygnusAccountID)

	if cygnusAccountID != nil {
		// 既存アカウントのcygnus_idを更新
		_, err = db.ExecContext(ctx,
			`UPDATE cygnus_accounts SET cygnus_id = ? WHERE id = ?`,
			targetCygnusID, *cygnusAccountID)
		if err != nil {
			log.Fatalf("cygnus_id更新失敗: %v", err)
		}
		log.Printf("✅ cygnus_id を %s に更新しました (account_id=%d)", targetCygnusID, *cygnusAccountID)
	} else {
		// cygnus_account を新規作成
		r, err := db.ExecContext(ctx,
			`INSERT INTO cygnus_accounts (cygnus_id, email, password_hash, display_name) VALUES (?, ?, '', ?)`,
			targetCygnusID, staffEmail, staffName)
		if err != nil {
			log.Fatalf("cygnus_account作成失敗: %v", err)
		}
		accountID, _ := r.LastInsertId()

		// スタッフと紐付け
		_, err = db.ExecContext(ctx,
			`UPDATE staffs SET cygnus_account_id = ? WHERE id = ?`, accountID, staffID)
		if err != nil {
			log.Fatalf("スタッフ紐付け失敗: %v", err)
		}
		log.Printf("✅ cygnus_account作成 + 紐付け完了 (account_id=%d, cygnus_id=%s)", accountID, targetCygnusID)
	}

	fmt.Printf("\nあなたのCygnus ID: %s\n", targetCygnusID)
}
