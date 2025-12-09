package trading

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type PaperTrader struct {
	initialBalance float64
	balance        float64
	positions      map[string]*Position
	trades         []Trade
	mu             sync.RWMutex
}

type Position struct {
	ID             string    `json:"id"`
	Symbol         string    `json:"symbol"`
	Side           string    `json:"side"` // "LONG" or "SHORT"
	EntryPrice     float64   `json:"entryPrice"`
	Quantity       float64   `json:"quantity"`
	StopLoss       float64   `json:"stopLoss"`
	TakeProfit     float64   `json:"takeProfit"`
	OpenedAt       time.Time `json:"openedAt" wails:"-"`
	SignalID       string    `json:"signalId"`
	UnrealizedPnL  float64   `json:"unrealizedPnL"`
	UnrealizedPnLPct float64 `json:"unrealizedPnLPct"`
}

type Trade struct {
	ID         string        `json:"id"`
	Symbol     string        `json:"symbol"`
	Side       string        `json:"side"`
	EntryPrice float64       `json:"entryPrice"`
	ExitPrice  float64       `json:"exitPrice"`
	Quantity   float64       `json:"quantity"`
	PnL        float64       `json:"pnl"`
	PnLPercent float64       `json:"pnlPercent"`
	Duration   time.Duration `json:"duration" wails:"-"`
	OpenedAt   time.Time     `json:"openedAt" wails:"-"`
	ClosedAt   time.Time     `json:"closedAt" wails:"-"`
	Reason     string        `json:"reason"`
	SignalID   string        `json:"signalId"`
}

func NewPaperTrader(initialBalance float64) *PaperTrader {
	return &PaperTrader{
		initialBalance: initialBalance,
		balance:        initialBalance,
		positions:      make(map[string]*Position),
		trades:         make([]Trade, 0),
	}
}

func (pt *PaperTrader) OpenPosition(pos *Position) error {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	if _, exists := pt.positions[pos.Symbol]; exists {
		log.Warnf("Position already exists for %s", pos.Symbol)
		return fmt.Errorf("position already exists for %s", pos.Symbol)
	}

	cost := pos.EntryPrice * pos.Quantity

	if cost > pt.balance {
		log.Errorf("Insufficient balance to open position: need %.2f, have %.2f", cost, pt.balance)
		return fmt.Errorf("insufficient balance: need %.2f, have %.2f", cost, pt.balance)
	}

	balanceBefore := pt.balance
	pos.ID = uuid.New().String()
	pt.balance -= cost
	pt.positions[pos.Symbol] = pos

	log.Infof("=== POSITION OPENED ===")
	log.Infof("Position ID: %s", pos.ID)
	log.Infof("Symbol: %s, Side: %s", pos.Symbol, pos.Side)
	log.Infof("Entry Price: %.8f, Quantity: %.8f", pos.EntryPrice, pos.Quantity)
	log.Infof("Cost: %.2f USDT", cost)
	log.Infof("Stop Loss: %.8f, Take Profit: %.8f", pos.StopLoss, pos.TakeProfit)
	log.Infof("Balance: %.2f -> %.2f USDT (change: -%.2f)", balanceBefore, pt.balance, cost)
	log.Infof("Signal ID: %s", pos.SignalID)
	log.Info("=== POSITION OPEN COMPLETE ===")

	return nil
}

func (pt *PaperTrader) ClosePosition(symbol string, exitPrice float64, reason string) (*Trade, error) {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	pos, exists := pt.positions[symbol]
	if !exists {
		log.Warnf("No position found for %s", symbol)
		return nil, fmt.Errorf("no position for %s", symbol)
	}

	var pnl float64
	if pos.Side == "LONG" || pos.Side == "BUY" {
		pnl = (exitPrice - pos.EntryPrice) * pos.Quantity
	} else {
		pnl = (pos.EntryPrice - exitPrice) * pos.Quantity
	}

	pnlPercent := pnl / (pos.EntryPrice * pos.Quantity) * 100

	trade := Trade{
		ID:         uuid.New().String(),
		Symbol:     pos.Symbol,
		Side:       pos.Side,
		EntryPrice: pos.EntryPrice,
		ExitPrice:  exitPrice,
		Quantity:   pos.Quantity,
		PnL:        pnl,
		PnLPercent: pnlPercent,
		Duration:   time.Since(pos.OpenedAt),
		OpenedAt:   pos.OpenedAt,
		ClosedAt:   time.Now(),
		Reason:     reason,
		SignalID:   pos.SignalID,
	}

	balanceBefore := pt.balance
	pt.balance += pos.EntryPrice*pos.Quantity + pnl
	delete(pt.positions, symbol)
	pt.trades = append(pt.trades, trade)

	log.Infof("=== POSITION CLOSED ===")
	log.Infof("Trade ID: %s, Position ID: %s", trade.ID, pos.ID)
	log.Infof("Symbol: %s, Side: %s", pos.Symbol, pos.Side)
	log.Infof("Entry Price: %.8f, Exit Price: %.8f", pos.EntryPrice, exitPrice)
	log.Infof("Quantity: %.8f", pos.Quantity)
	log.Infof("PnL: %.2f USDT (%.2f%%)", pnl, pnlPercent)
	log.Infof("Duration: %v", trade.Duration)
	log.Infof("Reason: %s", reason)
	log.Infof("Balance: %.2f -> %.2f USDT (change: +%.2f)", balanceBefore, pt.balance, pnl)
	log.Infof("Signal ID: %s", pos.SignalID)
	log.Info("=== POSITION CLOSE COMPLETE ===")

	return &trade, nil
}

func (pt *PaperTrader) UpdatePosition(symbol string, currentPrice float64) {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	pos, exists := pt.positions[symbol]
	if !exists {
		return
	}

	if pos.Side == "LONG" || pos.Side == "BUY" {
		pos.UnrealizedPnL = (currentPrice - pos.EntryPrice) * pos.Quantity
	} else {
		pos.UnrealizedPnL = (pos.EntryPrice - currentPrice) * pos.Quantity
	}

	pos.UnrealizedPnLPct = pos.UnrealizedPnL / (pos.EntryPrice * pos.Quantity) * 100
}

func (pt *PaperTrader) HasOpenPosition(symbol string) bool {
	pt.mu.RLock()
	defer pt.mu.RUnlock()
	_, exists := pt.positions[symbol]
	return exists
}

func (pt *PaperTrader) GetPosition(symbol string) *Position {
	pt.mu.RLock()
	defer pt.mu.RUnlock()

	if pos, exists := pt.positions[symbol]; exists {
		copy := *pos
		return &copy
	}
	return nil
}

func (pt *PaperTrader) GetAllPositions() []Position {
	pt.mu.RLock()
	defer pt.mu.RUnlock()

	positions := make([]Position, 0, len(pt.positions))
	for _, pos := range pt.positions {
		positions = append(positions, *pos)
	}
	return positions
}

func (pt *PaperTrader) GetTradeHistory() []Trade {
	pt.mu.RLock()
	defer pt.mu.RUnlock()

	trades := make([]Trade, len(pt.trades))
	copy(trades, pt.trades)
	return trades
}

func (pt *PaperTrader) GetBalance() float64 {
	pt.mu.RLock()
	defer pt.mu.RUnlock()
	return pt.balance
}

func (pt *PaperTrader) GetInitialBalance() float64 {
	return pt.initialBalance
}

func (pt *PaperTrader) GetEquity() float64 {
	pt.mu.RLock()
	defer pt.mu.RUnlock()

	equity := pt.balance
	for _, pos := range pt.positions {
		equity += pos.EntryPrice*pos.Quantity + pos.UnrealizedPnL
	}
	return equity
}

func (pt *PaperTrader) Reset() {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	pt.balance = pt.initialBalance
	pt.positions = make(map[string]*Position)
	pt.trades = make([]Trade, 0)
}

// ReserveBalance reserves balance for an order
func (pt *PaperTrader) ReserveBalance(amount float64) error {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	if amount > pt.balance {
		return fmt.Errorf("insufficient balance: need %.2f, have %.2f", amount, pt.balance)
	}

	pt.balance -= amount
	return nil
}

// RefundBalance refunds reserved balance
func (pt *PaperTrader) RefundBalance(amount float64) {
	pt.mu.Lock()
	defer pt.mu.Unlock()
	pt.balance += amount
}

