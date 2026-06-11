// salon_id=1 オーナーのパスワードをリセットするワンショットスクリプト
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/config"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/infrastructure/mysql"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	newPassword := os.Getenv("NEW_PASSWORD")
	if newPassword == "" {
		log.Fatal("NEW_PASSWORD 環境変数が未設定です")
	}

	cfg := config.Load()
	db, err := mysql.New(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	ctx := context.Background()

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("ハッシュ生成失敗: %v", err)
	}

	// オーナー情報を取得
	var staffID int64
	var staffEmail string
	var cygnusAccountID sql.NullInt64
	err = db.QueryRowContext(ctx,
		`SELECT id, email, cygnus_account_id FROM staffs WHERE salon_id = 1 AND role = 'owner' LIMIT 1`,
	).Scan(&staffID, &staffEmail, &cygnusAccountID)
	if err != nil {
		log.Fatalf("オーナー取得失敗: %v", err)
	}
	fmt.Printf("オーナー: staff_id=%d email=%s cygnus_account_id=%v\n", staffID, staffEmail, cygnusAccountID)

	// LOOP (staffs)
	r, err := db.ExecContext(ctx,
		`UPDATE staffs SET password_hash = ? WHERE id = ?`, string(hash), staffID)
	if err != nil {
		log.Fatalf("staffs UPDATE失敗: %v", err)
	}
	n, _ := r.RowsAffected()
	fmt.Printf("✅ LOOP パスワードリセット完了（%d件更新）\n", n)

	// STUDIO (cygnus_accounts)
	var caID int64
	if cygnusAccountID.Valid {
		caID = cygnusAccountID.Int64
	} else {
		// cygnus_account_id未設定 → emailで検索してリンク
		db.QueryRowContext(ctx, `SELECT id FROM cygnus_accounts WHERE email = ?`, staffEmail).Scan(&caID)
		if caID != 0 {
			db.ExecContext(ctx, `UPDATE staffs SET cygnus_account_id = ? WHERE id = ?`, caID, staffID)
			fmt.Printf("🔗 staffs.cygnus_account_id を %d にリンクしました\n", caID)
		}
	}

	if caID == 0 {
		fmt.Printf("⚠️  cygnus_accountが見つかりません (email=%s) — STUDIOは未連携です\n", staffEmail)
		return
	}

	var caEmail string
	db.QueryRowContext(ctx, `SELECT email FROM cygnus_accounts WHERE id = ?`, caID).Scan(&caEmail)

	r2, err := db.ExecContext(ctx,
		`UPDATE cygnus_accounts SET password_hash = ? WHERE id = ?`, string(hash), caID)
	if err != nil {
		log.Fatalf("cygnus_accounts UPDATE失敗: %v", err)
	}
	n2, _ := r2.RowsAffected()
	fmt.Printf("✅ STUDIO パスワードリセット完了（%d件更新）\n", n2)
	fmt.Printf("📧 STUDIOログイン用メール: %s\n", caEmail)
}
