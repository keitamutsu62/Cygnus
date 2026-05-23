package config

import "os"

type Config struct {
	Port       string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	RedisURL   string
	JWTSecret  string
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8081"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "cygnus"),
		DBPassword: getEnv("DB_PASSWORD", "cygnus"),
		DBName:     getEnv("DB_NAME", "cygnus_dev"),
		RedisURL:   getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:  getEnv("JWT_SECRET", "change-me"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
