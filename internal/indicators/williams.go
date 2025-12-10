package indicators

import "math"

// Williams %R measures overbought/oversold conditions
type Williams struct {
	period int
	highs  []float64
	lows   []float64
	value  float64
}

func NewWilliams(period int) *Williams {
	return &Williams{
		period: period,
		highs:  make([]float64, 0, period),
		lows:   make([]float64, 0, period),
	}
}

func DefaultWilliams() *Williams {
	return NewWilliams(14)
}

func (w *Williams) Update(high, low, close float64) float64 {
	w.highs = append(w.highs, high)
	w.lows = append(w.lows, low)

	if len(w.highs) > w.period {
		w.highs = w.highs[1:]
		w.lows = w.lows[1:]
	}

	if len(w.highs) < w.period {
		return 0
	}

	// Find highest high and lowest low
	highestHigh := w.highs[0]
	lowestLow := w.lows[0]
	for i := 1; i < len(w.highs); i++ {
		if w.highs[i] > highestHigh {
			highestHigh = w.highs[i]
		}
		if w.lows[i] < lowestLow {
			lowestLow = w.lows[i]
		}
	}

	if highestHigh == lowestLow {
		w.value = -50
		return w.value
	}

	// Calculate Williams %R
	w.value = -100.0 * (highestHigh - close) / (highestHigh - lowestLow)

	return w.value
}

func (w *Williams) Value() float64 {
	return w.value
}

func (w *Williams) Signal() Signal {
	// Williams %R ranges from -100 to 0
	// -80 to -100: oversold (buy signal)
	// -20 to 0: overbought (sell signal)
	// For scalping, use tighter thresholds
	
	if w.value <= -80 {
		strength := math.Min(math.Abs(w.value+80)/20, 1.0) // Normalize -80 to -100 to 0-1
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "Williams%R",
			Reason:    "Oversold condition",
		}
	}

	if w.value >= -20 {
		strength := math.Min((w.value+20)/20, 1.0) // Normalize -20 to 0 to 0-1
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "Williams%R",
			Reason:    "Overbought condition",
		}
	}

	// Moderate signals for scalping
	if w.value <= -60 {
		return Signal{
			Type:      "BUY",
			Strength:  0.4,
			Indicator: "Williams%R",
			Reason:    "Moderate oversold",
		}
	}

	if w.value >= -40 {
		return Signal{
			Type:      "SELL",
			Strength:  0.4,
			Indicator: "Williams%R",
			Reason:    "Moderate overbought",
		}
	}

	return Signal{Type: "HOLD", Indicator: "Williams%R"}
}

func (w *Williams) Reset() {
	w.highs = w.highs[:0]
	w.lows = w.lows[:0]
	w.value = 0
}

