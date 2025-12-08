package main

import (
	"context"
	"crypto-trading-bot/internal/binance"
	"crypto-trading-bot/internal/indicators"

	log "github.com/sirupsen/logrus"
)

// App struct
type App struct {
	ctx              context.Context
	binanceClient    *binance.Client
	binanceWS        *binance.WSClient
	indicatorManager *indicators.IndicatorManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Info("Application starting...")

	// Initialize Binance client
	a.binanceClient = binance.NewClient()
	log.Info("Binance REST client initialized")

	// Initialize WebSocket client
	a.binanceWS = binance.NewWSClient()
	if err := a.binanceWS.Connect(); err != nil {
		log.Errorf("Failed to connect WebSocket: %v", err)
	} else {
		log.Info("Binance WebSocket connected")
	}

	// Initialize indicator manager
	a.indicatorManager = indicators.NewIndicatorManager()
	log.Info("Indicator manager initialized")

	log.Info("Application started successfully")
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	log.Info("Application shutting down...")

	if a.binanceWS != nil {
		a.binanceWS.Close()
	}

	log.Info("Application shutdown complete")
}

// GetKlines retrieves historical candlestick data
func (a *App) GetKlines(symbol, interval string, limit int) ([]binance.Kline, error) {
	return a.binanceClient.GetKlines(symbol, interval, limit)
}

// GetTicker24h retrieves 24hr ticker statistics
func (a *App) GetTicker24h(symbol string) (*binance.Ticker, error) {
	return a.binanceClient.GetTicker24h(symbol)
}

// GetAllTickers retrieves all tickers
func (a *App) GetAllTickers() ([]binance.Ticker, error) {
	return a.binanceClient.GetAllTickers()
}

// SubscribeKline subscribes to real-time kline updates
func (a *App) SubscribeKline(symbol, interval string) error {
	_, err := a.binanceWS.SubscribeKline(symbol, interval)
	return err
}

// CalculateIndicators calculates technical indicators for given candle data
func (a *App) CalculateIndicators(symbol, timeframe string, high, low, close, volume float64) *indicators.IndicatorValues {
	set := a.indicatorManager.GetOrCreate(symbol, timeframe)
	return set.UpdateAll(high, low, close, volume)
}

// GetSignals returns trading signals based on current indicators
func (a *App) GetSignals(symbol, timeframe string, price float64) []indicators.Signal {
	set := a.indicatorManager.GetOrCreate(symbol, timeframe)
	return set.GetSignals(price)
}
