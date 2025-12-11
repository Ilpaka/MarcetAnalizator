// Package trading provides the core trading engine for executing trades,
// managing positions, and tracking trading statistics.
package trading

import (
	"fmt"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"

	"crypto-trading-bot/internal/risk"
	"crypto-trading-bot/internal/signals"
)

// TradingEngine is the core component responsible for executing trades,
// managing positions, processing signals, and tracking trading statistics.
// It coordinates between paper trading, order management, risk management,
// and signal processing.
type TradingEngine struct {
	paperTrader   *PaperTrader              // Paper trading simulator
	orderManager  *OrderManager             // Limit order manager
	riskManager   *risk.RiskManager         // Risk management calculator
	signalHandler *signals.SignalHandler    // Trading signal processor

	isRunning bool          // Engine running state
	stopChan  chan struct{} // Stop signal channel
	mu        sync.RWMutex // Mutex for thread-safe operations

	config *EngineConfig  // Engine configuration
	stats  *TradingStats  // Trading statistics
}

// EngineConfig holds configuration parameters for the trading engine.
type EngineConfig struct {
	Symbol            string  // Trading symbol (e.g., "BTCUSDT")
	InitialBalance    float64 // Starting balance in USDT
	MaxPositionSize   float64 // Maximum position size in USDT
	RiskPerTrade      float64 // Risk percentage per trade (0.01 = 1%)
	DefaultStopLoss   float64 // Default stop loss percentage
	DefaultTakeProfit float64 // Default take profit percentage
	MinConfidence     float64 // Minimum signal confidence to trade
	MaxDailyTrades    int     // Maximum trades per day
	CooldownMinutes   int     // Cooldown between trades in minutes
}

// TradingStats tracks comprehensive trading performance metrics.
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
	LastTradeTime    time.Time `json:"lastTradeTime" wails:"-"`
	StartTime         time.Time `json:"startTime" wails:"-"`

	mu sync.RWMutex
}

// NewTradingEngine creates a new trading engine instance with the given configuration.
// It initializes all sub-components including paper trader, order manager,
// risk manager, and signal handler.
func NewTradingEngine(config *EngineConfig) *TradingEngine {
	riskConfig := &risk.RiskConfig{
		RiskPerTrade:      config.RiskPerTrade,
		MaxPositionSize:   config.MaxPositionSize,
		DefaultStopLoss:   config.DefaultStopLoss,
		DefaultTakeProfit: config.DefaultTakeProfit,
	}

	return &TradingEngine{
		paperTrader:   NewPaperTrader(config.InitialBalance),
		orderManager:  NewOrderManager(),
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

func (te *TradingEngine) UpdateConfig(newConfig *EngineConfig) {
	te.mu.Lock()
	defer te.mu.Unlock()
	te.config = newConfig
	// Обновляем risk manager
	riskConfig := &risk.RiskConfig{
		RiskPerTrade:      newConfig.RiskPerTrade,
		MaxPositionSize:   newConfig.MaxPositionSize,
		DefaultStopLoss:   newConfig.DefaultStopLoss,
		DefaultTakeProfit: newConfig.DefaultTakeProfit,
	}
	te.riskManager = risk.NewRiskManager(riskConfig)
}

func (te *TradingEngine) GetSymbol() string {
	te.mu.RLock()
	defer te.mu.RUnlock()
	return te.config.Symbol
}

func (te *TradingEngine) ProcessSignal(signal *signals.Signal) {
	// Обрабатываем сигнал напрямую, не получая его заново
	log.Infof("=== ProcessSignal CALLED ===")
	
	// Проверяем, что сигнал для нашего символа
	if signal == nil {
		log.Warnf("ProcessSignal: signal is nil - ABORTING")
		return
	}
	
	log.Infof("ProcessSignal: Received signal - Symbol=%s, Direction=%s, Confidence=%.2f, Price=%.2f, ConfigSymbol=%s", 
		signal.Symbol, signal.Direction, signal.Confidence, signal.Price, te.config.Symbol)
	
	if signal.Symbol != te.config.Symbol {
		log.Warnf("ProcessSignal: signal symbol %s != config symbol %s - ABORTING", signal.Symbol, te.config.Symbol)
		return
	}

	// Проверяем, что сигнал не HOLD
	if signal.Direction == "HOLD" {
		log.Warnf("ProcessSignal: signal is HOLD - ABORTING")
		return
	}

	canTradeResult := te.canTrade()
	log.Infof("ProcessSignal: canTrade() = %v", canTradeResult)
	if !canTradeResult {
		log.Warnf("ProcessSignal: Cannot trade - daily limit or cooldown - ABORTING")
		return
	}

	// Если MinConfidence = 0, то торгуем при любой уверенности
	// Иначе проверяем порог
	if te.config.MinConfidence > 0 && signal.Confidence < te.config.MinConfidence {
		log.Warnf("ProcessSignal: Signal confidence %.2f below minimum %.2f - ABORTING", 
			signal.Confidence, te.config.MinConfidence)
		return
	}

	log.Infof("✅ ProcessSignal: All checks passed! Opening position...")
	log.Infof("   Symbol: %s, Direction: %s, Confidence: %.2f, Price: %.2f", 
		signal.Symbol, signal.Direction, signal.Confidence, signal.Price)

	hasPosition := te.paperTrader.HasOpenPosition(te.config.Symbol)
	log.Infof("ProcessSignal: HasOpenPosition(%s) = %v", te.config.Symbol, hasPosition)
	
	if hasPosition {
		log.Infof("ProcessSignal: Has open position, handling existing position")
		te.handleExistingPosition(signal)
		return
	}

	log.Infof("🚀 ProcessSignal: No open position, calling openPosition()")
	te.openPosition(signal)
	log.Infof("ProcessSignal: openPosition() returned")
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
			te.processOrders()
		}
	}
}

func (te *TradingEngine) processSignals() {
	signal := te.signalHandler.GetLatestSignal()
	if signal == nil {
		return
	}

	// Проверяем, что сигнал для нашего символа
	if signal.Symbol != te.config.Symbol {
		return
	}

	// Проверяем, что сигнал не HOLD
	if signal.Direction == "HOLD" {
		return
	}

	if !te.canTrade() {
		log.Debugf("Cannot trade: daily limit or cooldown")
		return
	}

	// Если MinConfidence = 0, то торгуем при любой уверенности
	// Иначе проверяем порог
	if te.config.MinConfidence > 0 && signal.Confidence < te.config.MinConfidence {
		log.Debugf("Signal confidence %.2f below minimum %.2f - SKIPPING TRADE", signal.Confidence, te.config.MinConfidence)
		log.Debugf("Signal details: Direction=%s, TechnicalScore=%.4f, Price=%.2f", 
			signal.Direction, signal.TechnicalSignal, signal.Price)
		return
	}

	log.Infof("Processing signal: symbol=%s, direction=%s, confidence=%.2f, price=%.2f", 
		signal.Symbol, signal.Direction, signal.Confidence, signal.Price)

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
		log.Debugf("Cannot trade: TodayTrades (%d) >= MaxDailyTrades (%d)", 
			te.stats.TodayTrades, te.config.MaxDailyTrades)
		return false
	}

	timeSinceLast := time.Since(te.stats.LastTradeTime)
	if timeSinceLast < time.Duration(te.config.CooldownMinutes)*time.Minute {
		log.Debugf("Cannot trade: Cooldown - time since last trade: %v, required: %d minutes", 
			timeSinceLast, te.config.CooldownMinutes)
		return false
	}

	return true
}

func (te *TradingEngine) openPosition(signal *signals.Signal) {
	log.Infof("=== BOT OPENING POSITION ===")
	log.Infof("Signal: ID=%s, Symbol=%s, Direction=%s, Confidence=%.2f, Price=%.8f", 
		signal.ID, signal.Symbol, signal.Direction, signal.Confidence, signal.Price)

	balance := te.paperTrader.GetBalance()
	currentPrice := signal.Price

	stopLoss := te.calculateStopLoss(signal)
	positionSize := te.riskManager.CalculatePositionSize(balance, currentPrice, stopLoss)

	log.Infof("Position calculation: Balance=%.2f, CurrentPrice=%.8f, StopLoss=%.8f, PositionSize=%.8f",
		balance, currentPrice, stopLoss, positionSize)

	if positionSize <= 0 {
		log.Warnf("Position size is 0 or negative, skipping position opening")
		return
	}

	takeProfit := te.calculateTakeProfit(signal)
	position := &Position{
		Symbol:     te.config.Symbol,
		Side:       signal.Direction,
		EntryPrice: currentPrice,
		Quantity:   positionSize,
		StopLoss:   stopLoss,
		TakeProfit: takeProfit,
		OpenedAt:   time.Now(),
		SignalID:   signal.ID,
	}

	log.Infof("Position details: Symbol=%s, Side=%s, EntryPrice=%.8f, Quantity=%.8f, StopLoss=%.8f, TakeProfit=%.8f",
		position.Symbol, position.Side, position.EntryPrice, position.Quantity, position.StopLoss, position.TakeProfit)

	err := te.paperTrader.OpenPosition(position)
	if err != nil {
		log.Errorf("Failed to open position: %v", err)
		return
	}

	te.updateStats(nil)

	log.Info("=== BOT POSITION OPENED SUCCESSFULLY ===")
}

func (te *TradingEngine) handleExistingPosition(signal *signals.Signal) {
	position := te.paperTrader.GetPosition(te.config.Symbol)
	if position == nil {
		return
	}

	// For scalping: more aggressive reversal (lower threshold)
	// Close position if opposite signal with moderate confidence
	if signal.Direction != position.Side && signal.Confidence > 0.5 {
		te.closePosition(position, "Signal reversal")
		te.openPosition(signal)
		return
	}

	currentPrice := signal.Price
	pnlPercent := te.calculatePnLPercent(position, currentPrice)

	// For scalping: move stop to breakeven faster (0.5% instead of 1.0%)
	if pnlPercent > 0.5 {
		if position.Side == "LONG" && position.StopLoss < position.EntryPrice {
			position.StopLoss = position.EntryPrice
			log.Info("Stop loss moved to breakeven (scalping)")
		} else if position.Side == "SHORT" && position.StopLoss > position.EntryPrice {
			position.StopLoss = position.EntryPrice
			log.Info("Stop loss moved to breakeven (scalping)")
		}
	}
	
	// For scalping: take profit earlier if we have small profit
	// Close position if we have 0.3% profit and signal is weakening
	if pnlPercent > 0.3 && signal.Confidence < 0.4 {
		te.closePosition(position, "Quick profit taken (scalping)")
		return
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
	log.Infof("=== BOT CLOSING POSITION ===")
	log.Infof("Position: ID=%s, Symbol=%s, Side=%s, EntryPrice=%.8f, Quantity=%.8f", 
		pos.ID, pos.Symbol, pos.Side, pos.EntryPrice, pos.Quantity)
	log.Infof("Reason: %s", reason)

	currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)
	log.Infof("Current price: %.8f", currentPrice)

	trade, err := te.paperTrader.ClosePosition(pos.Symbol, currentPrice, reason)
	if err != nil {
		log.Errorf("Failed to close position: %v", err)
		return
	}

	te.updateStats(trade)

	log.Infof("=== BOT POSITION CLOSED SUCCESSFULLY ===")
	log.Infof("Trade: ID=%s, PnL=%.2f USDT (%.2f%%), Duration=%v", 
		trade.ID, trade.PnL, trade.PnLPercent, trade.Duration)
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
		// For scalping, use tighter stop loss
		atr = signal.Price * te.config.DefaultStopLoss / 100
	}

	// For scalping: tighter stops (1.5x ATR instead of 2x)
	// This allows for smaller profits but more frequent trades
	stopMultiplier := 1.5
	
	// Adjust based on confidence - higher confidence = tighter stop
	if signal.Confidence > 0.7 {
		stopMultiplier = 1.2 // Very tight for high confidence
	} else if signal.Confidence < 0.4 {
		stopMultiplier = 1.8 // Slightly wider for low confidence
	}

	if signal.Direction == "LONG" {
		return signal.Price - stopMultiplier*atr
	}
	return signal.Price + stopMultiplier*atr
}

func (te *TradingEngine) calculateTakeProfit(signal *signals.Signal) float64 {
	atr := signal.ATR
	if atr == 0 {
		atr = signal.Price * te.config.DefaultTakeProfit / 100
	}

	// For scalping: smaller take profit (1.5-2x ATR instead of 3x)
	// Target smaller profits more frequently
	tpMultiplier := 1.5
	
	// Adjust based on confidence
	if signal.Confidence > 0.7 {
		tpMultiplier = 2.0 // Higher target for high confidence
	} else if signal.Confidence < 0.4 {
		tpMultiplier = 1.2 // Lower target for low confidence (quick profit)
	}

	if signal.Direction == "LONG" {
		return signal.Price + tpMultiplier*atr
	}
	return signal.Price - tpMultiplier*atr
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

// PlaceBuyOrder places a manual buy order
func (te *TradingEngine) PlaceBuyOrder(position *Position) error {
	// Update position PnL before opening
	if te.paperTrader.HasOpenPosition(position.Symbol) {
		return fmt.Errorf("position already exists for %s", position.Symbol)
	}

	position.Side = "BUY"
	return te.paperTrader.OpenPosition(position)
}

// PlaceSellOrder places a manual sell order
func (te *TradingEngine) processOrders() {
	// Process limit orders for current symbol
	if te.config.Symbol != "" {
		currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)
		if currentPrice > 0 {
			_, err := te.orderManager.ProcessLimitOrders(te.config.Symbol, currentPrice, te.paperTrader)
			if err != nil {
				log.Errorf("Error processing orders: %v", err)
			}
		}
	}
}

// ProcessOrdersForSymbol processes limit orders for a specific symbol
func (te *TradingEngine) ProcessOrdersForSymbol(symbol string, currentPrice float64) ([]*Order, error) {
	return te.orderManager.ProcessLimitOrders(symbol, currentPrice, te.paperTrader)
}

// CreateLimitOrder creates a new limit order
func (te *TradingEngine) CreateLimitOrder(symbol, side string, price, quantity float64) error {
	log.Infof("=== CREATING LIMIT ORDER ===")
	log.Infof("Symbol: %s, Side: %s, Price: %.8f, Quantity: %.8f", symbol, side, price, quantity)

	// For SELL orders, check if position exists
	if side == "SELL" {
		position := te.paperTrader.GetPosition(symbol)
		if position == nil {
			log.Errorf("No position found for %s", symbol)
			return fmt.Errorf("no position found for %s", symbol)
		}
		if quantity > position.Quantity {
			log.Errorf("Insufficient quantity: need %.8f, have %.8f", quantity, position.Quantity)
			return fmt.Errorf("insufficient quantity: need %.8f, have %.8f", quantity, position.Quantity)
		}
		log.Infof("Sell order validated: position quantity %.8f", position.Quantity)
	}

	order := &Order{
		Symbol:   symbol,
		Side:     side,
		Type:     "LIMIT",
		Price:    price,
		Quantity: quantity,
	}

	// Reserve balance for BUY orders
	if side == "BUY" {
		cost := price * quantity
		balanceBefore := te.paperTrader.GetBalance()
		if err := te.paperTrader.ReserveBalance(cost); err != nil {
			log.Errorf("Failed to reserve balance: %v", err)
			return err
		}
		balanceAfter := te.paperTrader.GetBalance()
		log.Infof("Balance reserved: %.2f -> %.2f USDT (reserved: %.2f)", balanceBefore, balanceAfter, cost)
	}

	err := te.orderManager.CreateOrder(order)
	if err != nil {
		log.Errorf("Failed to create limit order: %v", err)
	} else {
		log.Infof("Limit order created successfully: Order ID: %s", order.ID)
	}
	log.Info("=== LIMIT ORDER CREATION COMPLETE ===")

	return err
}

// ExecuteMarketOrder executes a market order immediately
// If stopLoss and takeProfit are provided (> 0), they will be set for the position
func (te *TradingEngine) ExecuteMarketOrder(symbol, side string, price, quantity float64, stopLoss, takeProfit float64) error {
	log.Infof("=== EXECUTING MARKET ORDER ===")
	log.Infof("Symbol: %s, Side: %s, Price: %.8f, Quantity: %.8f", symbol, side, price, quantity)
	if stopLoss > 0 {
		log.Infof("StopLoss: %.8f, TakeProfit: %.8f", stopLoss, takeProfit)
	}

	position := &Position{
		Symbol:     symbol,
		Side:       side,
		EntryPrice: price,
		Quantity:   quantity,
		OpenedAt:   time.Now(),
	}

	// Устанавливаем StopLoss и TakeProfit если они указаны
	if stopLoss > 0 {
		position.StopLoss = stopLoss
	}
	if takeProfit > 0 {
		position.TakeProfit = takeProfit
	}

	var err error
	if side == "BUY" {
		position.Side = "BUY"
		err = te.paperTrader.OpenPosition(position)
		if err != nil {
			log.Errorf("Failed to open position for market buy order: %v", err)
		} else {
			log.Infof("Market buy order executed successfully")
		}
	} else {
		// For selling, close existing position
		log.Infof("Executing market sell order")
		err = te.PlaceSellOrder(symbol, quantity, price)
		if err != nil {
			log.Errorf("Failed to execute market sell order: %v", err)
		} else {
			log.Infof("Market sell order executed successfully")
		}
	}
	log.Info("=== MARKET ORDER EXECUTION COMPLETE ===")

	return err
}

// CancelOrder cancels an order
func (te *TradingEngine) CancelOrder(orderID string) error {
	log.Infof("=== CANCELLING ORDER ===")
	log.Infof("Order ID: %s", orderID)

	order := te.orderManager.GetOrder(orderID)
	if order == nil {
		log.Errorf("Order not found: %s", orderID)
		return fmt.Errorf("order not found")
	}

	log.Infof("Order details: Symbol=%s, Side=%s, Type=%s, Price=%.8f, Quantity=%.8f, Status=%s, FilledQty=%.8f",
		order.Symbol, order.Side, order.Type, order.Price, order.Quantity, order.Status, order.FilledQty)

	// Refund reserved balance for BUY orders
	if order.Side == "BUY" && order.Status == "PENDING" {
		refund := order.Price * (order.Quantity - order.FilledQty)
		balanceBefore := te.paperTrader.GetBalance()
		te.paperTrader.RefundBalance(refund)
		balanceAfter := te.paperTrader.GetBalance()
		log.Infof("Balance refunded: %.2f -> %.2f USDT (refund: %.2f)", balanceBefore, balanceAfter, refund)
	}

	err := te.orderManager.CancelOrder(orderID)
	if err != nil {
		log.Errorf("Failed to cancel order: %v", err)
	} else {
		log.Infof("Order %s cancelled successfully", orderID)
	}
	log.Info("=== ORDER CANCELLATION COMPLETE ===")

	return err
}

// GetOrders returns orders
func (te *TradingEngine) GetOrders(symbol string) []Order {
	return te.orderManager.GetOrders(symbol)
}

// GetAllOrders returns all orders including filled and cancelled
func (te *TradingEngine) GetAllOrders() []Order {
	return te.orderManager.GetAllOrders()
}

func (te *TradingEngine) PlaceSellOrder(symbol string, quantity float64, price float64) error {
	position := te.paperTrader.GetPosition(symbol)
	if position == nil {
		return fmt.Errorf("no position found for %s", symbol)
	}

	if quantity > position.Quantity {
		quantity = position.Quantity
	}

	// If selling all, close position
	if quantity >= position.Quantity {
		_, err := te.paperTrader.ClosePosition(symbol, price, "Manual sell")
		return err
	}

	// If selling part, we need to adjust position
	// For simplicity, we'll close the entire position and create a new one with remaining quantity
	_, err := te.paperTrader.ClosePosition(symbol, price, "Partial sell")
	if err != nil {
		return err
	}

	remainingQty := position.Quantity - quantity
	if remainingQty > 0 {
		newPosition := &Position{
			Symbol:     symbol,
			Side:       position.Side,
			EntryPrice: position.EntryPrice,
			Quantity:   remainingQty,
			StopLoss:   position.StopLoss,
			TakeProfit: position.TakeProfit,
			OpenedAt:   time.Now(),
		}
		return te.paperTrader.OpenPosition(newPosition)
	}

	return nil
}

