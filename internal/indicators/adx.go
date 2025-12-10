package indicators

import "math"

// ADX (Average Directional Index) measures trend strength
type ADX struct {
	period      int
	adxPeriod   int
	plusDM      []float64
	minusDM     []float64
	tr          []float64
	plusDI      float64
	minusDI     float64
	adx         float64
	prevHigh    float64
	prevLow     float64
	prevClose   float64
	count       int
}

func NewADX(period, adxPeriod int) *ADX {
	return &ADX{
		period:    period,
		adxPeriod: adxPeriod,
		plusDM:    make([]float64, 0, period),
		minusDM:   make([]float64, 0, period),
		tr:        make([]float64, 0, period),
	}
}

func DefaultADX() *ADX {
	return NewADX(14, 14)
}

func (a *ADX) Update(high, low, close float64) float64 {
	a.count++

	if a.count == 1 {
		a.prevHigh = high
		a.prevLow = low
		a.prevClose = close
		return 0
	}

	// Calculate directional movement
	plusDM := high - a.prevHigh
	minusDM := a.prevLow - low

	if plusDM < 0 {
		plusDM = 0
	}
	if minusDM < 0 {
		minusDM = 0
	}

	if plusDM > minusDM {
		minusDM = 0
	} else if minusDM > plusDM {
		plusDM = 0
	} else {
		plusDM = 0
		minusDM = 0
	}

	// Calculate True Range
	tr1 := high - low
	tr2 := math.Abs(high - a.prevClose)
	tr3 := math.Abs(low - a.prevClose)
	tr := math.Max(tr1, math.Max(tr2, tr3))

	a.plusDM = append(a.plusDM, plusDM)
	a.minusDM = append(a.minusDM, minusDM)
	a.tr = append(a.tr, tr)

	if len(a.plusDM) > a.period {
		a.plusDM = a.plusDM[1:]
		a.minusDM = a.minusDM[1:]
		a.tr = a.tr[1:]
	}

	a.prevHigh = high
	a.prevLow = low
	a.prevClose = close

	if len(a.plusDM) < a.period {
		return 0
	}

	// Calculate smoothed averages
	plusDMAvg := sum(a.plusDM) / float64(len(a.plusDM))
	minusDMAvg := sum(a.minusDM) / float64(len(a.minusDM))
	trAvg := sum(a.tr) / float64(len(a.tr))

	if trAvg == 0 {
		return 0
	}

	// Calculate DI+ and DI-
	a.plusDI = 100.0 * (plusDMAvg / trAvg)
	a.minusDI = 100.0 * (minusDMAvg / trAvg)

	// Calculate DX
	diSum := a.plusDI + a.minusDI
	if diSum == 0 {
		return 0
	}
	dx := 100.0 * math.Abs(a.plusDI-a.minusDI) / diSum

	// Calculate ADX (simplified - using current DX as ADX)
	// In full implementation, ADX would be smoothed average of DX
	a.adx = dx

	return a.adx
}

func (a *ADX) Value() float64 {
	return a.adx
}

func (a *ADX) PlusDI() float64 {
	return a.plusDI
}

func (a *ADX) MinusDI() float64 {
	return a.minusDI
}

func (a *ADX) Signal() Signal {
	// ADX > 25 indicates strong trend
	// DI+ > DI- indicates bullish trend
	// DI- > DI+ indicates bearish trend
	
	if a.adx < 20 {
		return Signal{Type: "HOLD", Indicator: "ADX"}
	}

	if a.plusDI > a.minusDI && a.adx > 25 {
		strength := math.Min((a.adx-25)/25, 1.0) // Normalize 25-50 to 0-1
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "ADX",
			Reason:    "Strong bullish trend",
		}
	}

	if a.minusDI > a.plusDI && a.adx > 25 {
		strength := math.Min((a.adx-25)/25, 1.0)
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "ADX",
			Reason:    "Strong bearish trend",
		}
	}

	return Signal{Type: "HOLD", Indicator: "ADX"}
}

func (a *ADX) Reset() {
	a.plusDM = a.plusDM[:0]
	a.minusDM = a.minusDM[:0]
	a.tr = a.tr[:0]
	a.plusDI = 0
	a.minusDI = 0
	a.adx = 0
	a.prevHigh = 0
	a.prevLow = 0
	a.prevClose = 0
	a.count = 0
}

