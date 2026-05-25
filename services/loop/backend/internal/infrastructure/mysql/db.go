package mysql

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql"
)

func New(host, port, user, password, dbname string) (*sqlx.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Asia%%2FTokyo&charset=utf8mb4",
		user, password, host, port, dbname)
	db, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("mysql.New: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	// Unsafe: struct に対応するフィールドがない列を無視する
	return db.Unsafe(), nil
}
