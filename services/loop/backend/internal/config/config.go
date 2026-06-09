package config

import "os"

type Config struct {
	Port        string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	RedisURL    string
	JWTSecret   string
	FrontendURL string
	AdminToken  string
	// Cloudflare R2（未設定時はbase64をDBに直接保存するLocalStorageにフォールバック）
	R2AccountID string
	R2AccessKey string
	R2SecretKey string
	R2Bucket    string
	R2PublicURL string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8081"),
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "3306"),
		DBUser:      getEnv("DB_USER", "cygnus"),
		DBPassword:  getEnv("DB_PASSWORD", "cygnus"),
		DBName:      getEnv("DB_NAME", "cygnus_dev"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
		AdminToken:  getEnv("ADMIN_TOKEN", "change-me-admin"),
		R2AccountID: getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKey: getEnv("R2_ACCESS_KEY", ""),
		R2SecretKey: getEnv("R2_SECRET_KEY", ""),
		R2Bucket:    getEnv("R2_BUCKET", ""),
		R2PublicURL: getEnv("R2_PUBLIC_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
