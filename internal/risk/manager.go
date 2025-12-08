package risk

import (
	"math"
	"sync"
)

type RiskManager struct {
	config     *RiskConfig
	dailyStats *DailyStats
	mu         sync.RWMutex
}

type DailyStats struct {
	Date         string
	TotalTrades  int
	TotalPnL     float64
	MaxDailyLoss float64
	TradesWon    int
	TradesLost   int
}

func NewRiskManager(config *RiskConfig) *RiskManager {
	return &RiskManager{
		config:     config,
		dailyStats: &DailyStats{},
	}
}

func (rm *RiskManager) CalculatePositionSize(balance, entryPrice, stopLossPrice float64) float64 {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	riskAmount := balance * rm.config.RiskPerTrade
	priceRisk := math.Abs(entryPrice - stopLossPrice)

	if priceRisk == 0 {
		return 0
	}

	positionSize := riskAmount / priceRisk
	maxPositionValue := balance * rm.config.MaxPositionSize
	maxQuantity := maxPositionValue / entryPrice

	positionSize = math.Min(positionSize, maxQuantity)
	positionSize = math.Floor(positionSize*1000) / 1000

	return positionSize
}

func (rm *RiskManager) CanOpenPosition(balance, currentExposure float64) bool {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	maxExposure := balance * rm.config.MaxPositionSize * 3
	if currentExposure >= maxExposure {
		return false
	}

	if rm.dailyStats.TotalPnL < -balance*0.05 {
		return false
	}

	return true
}

func (rm *RiskManager) CalculateStopLoss(entryPrice, atr float64, side string) float64 {
	var stopDistance float64

	if atr > 0 {
		stopDistance = atr * 2
	} else {
		stopDistance = entryPrice * rm.config.DefaultStopLoss
	}

	if side == "LONG" {
		return entryPrice - stopDistance
	}
	return entryPrice + stopDistance
}

func (rm *RiskManager) CalculateTakeProfit(entryPrice, stopLoss float64, side string, rrRatio float64) float64 {
	stopDistance := math.Abs(entryPrice - stopLoss)
	profitDistance := stopDistance * rrRatio

	if side == "LONG" {
		return entryPrice + profitDistance
	}
	return entryPrice - profitDistance
}

func (rm *RiskManager) UpdateDailyStats(pnl float64, won bool) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	rm.dailyStats.TotalTrades++
	rm.dailyStats.TotalPnL += pnl

	if won {
		rm.dailyStats.TradesWon++
	} else {
		rm.dailyStats.TradesLost++
	}

	if rm.dailyStats.TotalPnL < rm.dailyStats.MaxDailyLoss {
		rm.dailyStats.MaxDailyLoss = rm.dailyStats.TotalPnL
	}
}

func (rm *RiskManager) ResetDailyStats(date string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	rm.dailyStats = &DailyStats{Date: date}
}

func (rm *RiskManager) GetDailyStats() DailyStats {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return *rm.dailyStats
}

