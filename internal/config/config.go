package config

import (
	"os"
	"strconv"
)

type Config struct {
	BinanceAPIKey    string
	BinanceSecretKey string
	MLServiceAddr    string
	TwitterBearerToken string
	InitialBalance   float64
	RiskPerTrade     float64
	MaxPositionSize  float64
	MinConfidence    float64
	MaxDailyTrades   int
	CooldownMinutes  int
	DatabasePath     string
	RedisAddr        string
}

func Load() *Config {
	cfg := &Config{
		BinanceAPIKey:     getEnv("BINANCE_API_KEY", ""),
		BinanceSecretKey:  getEnv("BINANCE_SECRET_KEY", ""),
		MLServiceAddr:     getEnv("ML_SERVICE_ADDR", "localhost:50051"),
		TwitterBearerToken: getEnv("TWITTER_BEARER_TOKEN", ""),
		InitialBalance:    getFloatEnv("INITIAL_BALANCE", 50000.0),
		RiskPerTrade:      getFloatEnv("RISK_PER_TRADE", 0.05),      // Увеличено для более активной торговли
		MaxPositionSize:   getFloatEnv("MAX_POSITION_SIZE", 0.2),    // Увеличено
		MinConfidence:     getFloatEnv("MIN_CONFIDENCE", 0.3),        // Снижено для большего количества сделок
		MaxDailyTrades:    getIntEnv("MAX_DAILY_TRADES", 20),         // Увеличено
		CooldownMinutes:   getIntEnv("COOLDOWN_MINUTES", 2),          // Уменьшено для более частых сделок
		DatabasePath:      getEnv("DATABASE_PATH", "./trading.db"),
		RedisAddr:         getEnv("REDIS_ADDR", "localhost:6379"),
	}

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

