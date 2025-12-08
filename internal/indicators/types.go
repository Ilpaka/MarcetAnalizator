package indicators

// Indicator interface for all technical indicators
type Indicator interface {
	Update(price float64) float64
	Value() float64
	Reset()
}

// MultiValueIndicator for indicators returning multiple values
type MultiValueIndicator interface {
	Update(high, low, close, volume float64)
	Values() map[string]float64
	Reset()
}

// Signal represents a trading signal
type Signal struct {
	Type      string  // "BUY", "SELL", "HOLD"
	Strength  float64 // 0-1
	Indicator string
	Reason    string
	Timestamp int64
}

// IndicatorResult holds indicator values for a single candle
type IndicatorResult struct {
	Timestamp int64              `json:"timestamp"`
	Values    map[string]float64 `json:"values"`
}
