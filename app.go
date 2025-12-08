package main

import (
	"context"
	"fmt"
	"crypto-trading-bot/internal/binance"
	"crypto-trading-bot/internal/bot"
	"crypto-trading-bot/internal/config"
	"crypto-trading-bot/internal/indicators"
	"crypto-trading-bot/internal/sentiment"
	"crypto-trading-bot/internal/signals"
	"crypto-trading-bot/internal/trading"

	log "github.com/sirupsen/logrus"
)

// App struct
type App struct {
	ctx              context.Context
	binanceClient    *binance.Client
	binanceWS        *binance.WSClient
	indicatorManager *indicators.IndicatorManager
	tradingEngine    *trading.TradingEngine
	autonomousBot    *bot.AutonomousBot
	signalHandler    *signals.SignalHandler
	sentimentManager *sentiment.SentimentManager
	cfg              *config.Config
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

	// Load configuration
	a.cfg = config.Load()
	log.Info("Configuration loaded")

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

	// Initialize signal handler
	a.signalHandler = signals.NewSignalHandler()
	log.Info("Signal handler initialized")

	// Initialize sentiment manager
	a.sentimentManager = sentiment.NewSentimentManager()
	log.Info("Sentiment manager initialized")

	// Initialize trading engine
	engineConfig := &trading.EngineConfig{
		Symbol:            "BTCUSDT",
		InitialBalance:    a.cfg.InitialBalance,
		MaxPositionSize:   a.cfg.MaxPositionSize,
		RiskPerTrade:      a.cfg.RiskPerTrade,
		DefaultStopLoss:   0.02,
		DefaultTakeProfit: 0.04,
		MinConfidence:     a.cfg.MinConfidence,
		MaxDailyTrades:    a.cfg.MaxDailyTrades,
		CooldownMinutes:   a.cfg.CooldownMinutes,
	}
	a.tradingEngine = trading.NewTradingEngine(engineConfig)
	log.Info("Trading engine initialized")

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
	if a.binanceWS == nil {
		return fmt.Errorf("WebSocket client not initialized")
	}
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

// StartBot starts the autonomous trading bot
func (a *App) StartBot(symbols []string, timeframes []string) error {
	if a.autonomousBot != nil && a.autonomousBot.IsRunning() {
		return nil
	}

	botConfig := &bot.BotConfig{
		Symbols:         symbols,
		Timeframes:      timeframes,
		InitialBalance:  a.cfg.InitialBalance,
		RiskPerTrade:    a.cfg.RiskPerTrade,
		MaxPositionSize: a.cfg.MaxPositionSize,
		MinConfidence:   a.cfg.MinConfidence,
		MaxDailyTrades:  a.cfg.MaxDailyTrades,
		CooldownMinutes:  a.cfg.CooldownMinutes,
		MLServiceAddr:   a.cfg.MLServiceAddr,
		EnableSentiment: false,
	}

	// Используем существующий WebSocket клиент из App
	a.autonomousBot = bot.NewAutonomousBotWithWS(botConfig, a.binanceWS)
	return a.autonomousBot.Start(a.ctx)
}

// StopBot stops the autonomous trading bot
func (a *App) StopBot() {
	if a.autonomousBot != nil {
		a.autonomousBot.Stop()
	}
}

// GetBotStats returns bot trading statistics
func (a *App) GetBotStats() trading.TradingStats {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetStats()
	}
	if a.tradingEngine == nil {
		return trading.TradingStats{}
	}
	return a.tradingEngine.GetStats()
}

// GetPositions returns all open positions
func (a *App) GetPositions() []trading.Position {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetPositions()
	}
	if a.tradingEngine == nil {
		return []trading.Position{}
	}
	return a.tradingEngine.GetPositions()
}

// GetTradeHistory returns trade history
func (a *App) GetTradeHistory() []trading.Trade {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetTradeHistory()
	}
	if a.tradingEngine == nil {
		return []trading.Trade{}
	}
	return a.tradingEngine.GetTradeHistory()
}

// GetBalance returns current balance
func (a *App) GetBalance() float64 {
	if a.tradingEngine == nil {
		return 0.0
	}
	return a.tradingEngine.GetBalance()
}

// GetSignalsList returns all current signals
func (a *App) GetSignalsList() []*signals.Signal {
	return a.signalHandler.GetAllSignals()
}

// GetSentimentScore returns current sentiment score
func (a *App) GetSentimentScore() sentiment.SentimentScore {
	return a.sentimentManager.GetScore()
}
