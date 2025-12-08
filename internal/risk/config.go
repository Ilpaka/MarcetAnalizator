package risk

// RiskConfig holds risk management configuration
type RiskConfig struct {
	RiskPerTrade      float64
	MaxPositionSize   float64
	DefaultStopLoss   float64
	DefaultTakeProfit float64
}
