package trading

import (
	"sync"
	"time"

	log "github.com/sirupsen/logrus"

	"crypto-trading-bot/internal/risk"
	"crypto-trading-bot/internal/signals"
)

type TradingEngine struct {
	paperTrader   *PaperTrader
	riskManager   *risk.RiskManager
	signalHandler *signals.SignalHandler

	isRunning bool
	stopChan  chan struct{}
	mu        sync.RWMutex

	config *EngineConfig
	stats  *TradingStats
}

type EngineConfig struct {
	Symbol            string
	InitialBalance    float64
	MaxPositionSize   float64
	RiskPerTrade      float64
	DefaultStopLoss   float64
	DefaultTakeProfit float64
	MinConfidence     float64
	MaxDailyTrades    int
	CooldownMinutes   int
}

type TradingStats struct {
	TotalTrades      int       `json:"totalTrades"`
	WinningTrades    int       `json:"winningTrades"`
	LosingTrades     int       `json:"losingTrades"`
	TotalPnL         float64   `json:"totalPnL"`
	TotalPnLPercent  float64   `json:"totalPnLPercent"`
	WinRate          float64   `json:"winRate"`
	AvgWin           float64   `json:"avgWin"`
	AvgLoss          float64   `json:"avgLoss"`
	ProfitFactor     float64   `json:"profitFactor"`
	MaxDrawdown      float64   `json:"maxDrawdown"`
	CurrentDrawdown  float64   `json:"currentDrawdown"`
	PeakBalance      float64   `json:"peakBalance"`
	DailyPnL         float64   `json:"dailyPnL"`
	TodayTrades      int       `json:"todayTrades"`
	LastTradeTime    time.Time `json:"lastTradeTime"`
	StartTime         time.Time `json:"startTime"`

	mu sync.RWMutex
}

func NewTradingEngine(config *EngineConfig) *TradingEngine {
	riskConfig := &risk.RiskConfig{
		RiskPerTrade:      config.RiskPerTrade,
		MaxPositionSize:   config.MaxPositionSize,
		DefaultStopLoss:   config.DefaultStopLoss,
		DefaultTakeProfit: config.DefaultTakeProfit,
	}

	return &TradingEngine{
		paperTrader:   NewPaperTrader(config.InitialBalance),
		riskManager:   risk.NewRiskManager(riskConfig),
		signalHandler: signals.NewSignalHandler(),
		config:        config,
		stats:         &TradingStats{StartTime: time.Now()},
		stopChan:      make(chan struct{}),
	}
}

func (te *TradingEngine) Start() error {
	te.mu.Lock()
	defer te.mu.Unlock()

	if te.isRunning {
		return nil
	}

	te.isRunning = true
	te.stopChan = make(chan struct{})

	go te.mainLoop()

	log.Info("Trading engine started")
	return nil
}

func (te *TradingEngine) Stop() {
	te.mu.Lock()
	defer te.mu.Unlock()

	if !te.isRunning {
		return
	}

	close(te.stopChan)
	te.isRunning = false

	log.Info("Trading engine stopped")
}

func (te *TradingEngine) IsRunning() bool {
	te.mu.RLock()
	defer te.mu.RUnlock()
	return te.isRunning
}

func (te *TradingEngine) mainLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-te.stopChan:
			return
		case <-ticker.C:
			te.processSignals()
			te.checkPositions()
		}
	}
}

func (te *TradingEngine) processSignals() {
	signal := te.signalHandler.GetLatestSignal()
	if signal == nil {
		return
	}

	if !te.canTrade() {
		return
	}

	if signal.Confidence < te.config.MinConfidence {
		return
	}

	if te.paperTrader.HasOpenPosition(te.config.Symbol) {
		te.handleExistingPosition(signal)
		return
	}

	te.openPosition(signal)
}

func (te *TradingEngine) canTrade() bool {
	te.stats.mu.RLock()
	defer te.stats.mu.RUnlock()

	if te.stats.TodayTrades >= te.config.MaxDailyTrades {
		return false
	}

	timeSinceLast := time.Since(te.stats.LastTradeTime)
	if timeSinceLast < time.Duration(te.config.CooldownMinutes)*time.Minute {
		return false
	}

	return true
}

func (te *TradingEngine) openPosition(signal *signals.Signal) {
	balance := te.paperTrader.GetBalance()
	currentPrice := signal.Price

	stopLoss := te.calculateStopLoss(signal)
	positionSize := te.riskManager.CalculatePositionSize(balance, currentPrice, stopLoss)

	if positionSize <= 0 {
		return
	}

	position := &Position{
		Symbol:     te.config.Symbol,
		Side:       signal.Direction,
		EntryPrice: currentPrice,
		Quantity:   positionSize,
		StopLoss:   stopLoss,
		TakeProfit: te.calculateTakeProfit(signal),
		OpenedAt:   time.Now(),
		SignalID:   signal.ID,
	}

	err := te.paperTrader.OpenPosition(position)
	if err != nil {
		log.Errorf("Failed to open position: %v", err)
		return
	}

	te.updateStats(nil)

	log.WithFields(log.Fields{
		"symbol":     position.Symbol,
		"side":       position.Side,
		"entry":      position.EntryPrice,
		"quantity":   position.Quantity,
		"stopLoss":   position.StopLoss,
		"takeProfit": position.TakeProfit,
	}).Info("Position opened")
}

func (te *TradingEngine) handleExistingPosition(signal *signals.Signal) {
	position := te.paperTrader.GetPosition(te.config.Symbol)
	if position == nil {
		return
	}

	if signal.Direction != position.Side && signal.Confidence > 0.7 {
		te.closePosition(position, "Signal reversal")
		te.openPosition(signal)
		return
	}

	currentPrice := signal.Price
	pnlPercent := te.calculatePnLPercent(position, currentPrice)

	if pnlPercent > 1.0 {
		if position.Side == "LONG" && position.StopLoss < position.EntryPrice {
			position.StopLoss = position.EntryPrice
			log.Info("Stop loss moved to breakeven")
		} else if position.Side == "SHORT" && position.StopLoss > position.EntryPrice {
			position.StopLoss = position.EntryPrice
			log.Info("Stop loss moved to breakeven")
		}
	}
}

func (te *TradingEngine) checkPositions() {
	positions := te.paperTrader.GetAllPositions()
	currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)

	for _, pos := range positions {
		if te.isStopLossHit(&pos, currentPrice) {
			te.closePosition(&pos, "Stop loss hit")
			continue
		}

		if te.isTakeProfitHit(&pos, currentPrice) {
			te.closePosition(&pos, "Take profit hit")
			continue
		}
	}
}

func (te *TradingEngine) closePosition(pos *Position, reason string) {
	currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)

	trade, err := te.paperTrader.ClosePosition(pos.Symbol, currentPrice, reason)
	if err != nil {
		log.Errorf("Failed to close position: %v", err)
		return
	}

	te.updateStats(trade)

	log.WithFields(log.Fields{
		"symbol":   trade.Symbol,
		"pnl":      trade.PnL,
		"pnl%":     trade.PnLPercent,
		"reason":   trade.Reason,
		"duration": trade.Duration,
	}).Info("Position closed")
}

func (te *TradingEngine) isStopLossHit(pos *Position, price float64) bool {
	if pos.Side == "LONG" {
		return price <= pos.StopLoss
	}
	return price >= pos.StopLoss
}

func (te *TradingEngine) isTakeProfitHit(pos *Position, price float64) bool {
	if pos.Side == "LONG" {
		return price >= pos.TakeProfit
	}
	return price <= pos.TakeProfit
}

func (te *TradingEngine) calculateStopLoss(signal *signals.Signal) float64 {
	atr := signal.ATR
	if atr == 0 {
		atr = signal.Price * te.config.DefaultStopLoss / 100
	}

	if signal.Direction == "LONG" {
		return signal.Price - 2*atr
	}
	return signal.Price + 2*atr
}

func (te *TradingEngine) calculateTakeProfit(signal *signals.Signal) float64 {
	atr := signal.ATR
	if atr == 0 {
		atr = signal.Price * te.config.DefaultTakeProfit / 100
	}

	if signal.Direction == "LONG" {
		return signal.Price + 3*atr
	}
	return signal.Price - 3*atr
}

func (te *TradingEngine) calculatePnLPercent(pos *Position, currentPrice float64) float64 {
	if pos.Side == "LONG" {
		return (currentPrice - pos.EntryPrice) / pos.EntryPrice * 100
	}
	return (pos.EntryPrice - currentPrice) / pos.EntryPrice * 100
}

func (te *TradingEngine) updateStats(trade *Trade) {
	te.stats.mu.Lock()
	defer te.stats.mu.Unlock()

	if trade != nil {
		te.stats.TotalTrades++
		te.stats.TotalPnL += trade.PnL
		te.stats.TodayTrades++
		te.stats.LastTradeTime = time.Now()

		if trade.PnL > 0 {
			te.stats.WinningTrades++
			te.stats.AvgWin = (te.stats.AvgWin*float64(te.stats.WinningTrades-1) + trade.PnLPercent) / float64(te.stats.WinningTrades)
		} else {
			te.stats.LosingTrades++
			te.stats.AvgLoss = (te.stats.AvgLoss*float64(te.stats.LosingTrades-1) + trade.PnLPercent) / float64(te.stats.LosingTrades)
		}

		if te.stats.TotalTrades > 0 {
			te.stats.WinRate = float64(te.stats.WinningTrades) / float64(te.stats.TotalTrades) * 100
		}
	}

	balance := te.paperTrader.GetBalance()
	initialBalance := te.paperTrader.GetInitialBalance()

	te.stats.TotalPnLPercent = (balance - initialBalance) / initialBalance * 100

	if balance > te.stats.PeakBalance {
		te.stats.PeakBalance = balance
	}

	if te.stats.PeakBalance > 0 {
		te.stats.CurrentDrawdown = (te.stats.PeakBalance - balance) / te.stats.PeakBalance * 100
		if te.stats.CurrentDrawdown > te.stats.MaxDrawdown {
			te.stats.MaxDrawdown = te.stats.CurrentDrawdown
		}
	}

	if te.stats.AvgLoss != 0 && te.stats.LosingTrades > 0 {
		totalWins := te.stats.AvgWin * float64(te.stats.WinningTrades)
		totalLosses := -te.stats.AvgLoss * float64(te.stats.LosingTrades)
		if totalLosses != 0 {
			te.stats.ProfitFactor = totalWins / totalLosses
		}
	}
}

func (te *TradingEngine) GetStats() TradingStats {
	te.stats.mu.RLock()
	defer te.stats.mu.RUnlock()
	return *te.stats
}

func (te *TradingEngine) GetBalance() float64 {
	return te.paperTrader.GetBalance()
}

func (te *TradingEngine) GetPositions() []Position {
	return te.paperTrader.GetAllPositions()
}

func (te *TradingEngine) GetTradeHistory() []Trade {
	return te.paperTrader.GetTradeHistory()
}

func (te *TradingEngine) SetSignalHandler(handler *signals.SignalHandler) {
	te.signalHandler = handler
}

