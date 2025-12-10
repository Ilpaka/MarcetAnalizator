package indicators

import "math"

type BollingerBands struct {
	period     int
	multiplier float64
	prices     []float64
	upper      float64
	middle     float64
	lower      float64
}

func NewBollingerBands(period int, multiplier float64) *BollingerBands {
	return &BollingerBands{
		period:     period,
		multiplier: multiplier,
		prices:     make([]float64, 0, period),
	}
}

// DefaultBollingerBands creates BB with standard 20, 2.0 parameters
func DefaultBollingerBands() *BollingerBands {
	return NewBollingerBands(20, 2.0)
}

func (bb *BollingerBands) Update(price float64) (upper, middle, lower float64) {
	bb.prices = append(bb.prices, price)

	if len(bb.prices) > bb.period {
		bb.prices = bb.prices[1:]
	}

	if len(bb.prices) < bb.period {
		bb.middle = price
		bb.upper = price
		bb.lower = price
		return bb.upper, bb.middle, bb.lower
	}

	// Calculate SMA (middle band)
	bb.middle = sum(bb.prices) / float64(bb.period)

	// Calculate standard deviation
	var variance float64
	for _, p := range bb.prices {
		diff := p - bb.middle
		variance += diff * diff
	}
	stdDev := math.Sqrt(variance / float64(bb.period))

	// Calculate bands
	bb.upper = bb.middle + bb.multiplier*stdDev
	bb.lower = bb.middle - bb.multiplier*stdDev

	return bb.upper, bb.middle, bb.lower
}

func (bb *BollingerBands) Values() (upper, middle, lower float64) {
	return bb.upper, bb.middle, bb.lower
}

func (bb *BollingerBands) Upper() float64 {
	return bb.upper
}

func (bb *BollingerBands) Middle() float64 {
	return bb.middle
}

func (bb *BollingerBands) Lower() float64 {
	return bb.lower
}

// PercentB returns where price is relative to bands (0 = lower, 1 = upper)
func (bb *BollingerBands) PercentB(price float64) float64 {
	if bb.upper == bb.lower {
		return 0.5
	}
	return (price - bb.lower) / (bb.upper - bb.lower)
}

// Bandwidth returns the width of bands relative to middle
func (bb *BollingerBands) Bandwidth() float64 {
	if bb.middle == 0 {
		return 0
	}
	return (bb.upper - bb.lower) / bb.middle
}

func (bb *BollingerBands) Signal(price float64) Signal {
	percentB := bb.PercentB(price)

	// More sensitive thresholds for scalping
	
	// Strong buy: Price at or below lower band
	if percentB <= 0.05 {
		return Signal{
			Type:      "BUY",
			Strength:  0.9 + (0.05-percentB)*2, // 0.9-1.0
			Indicator: "BollingerBands",
			Reason:    "Price at lower band",
		}
	}
	
	// Moderate buy: Price in lower 20% of band
	if percentB <= 0.20 {
		return Signal{
			Type:      "BUY",
			Strength:  0.5 + (0.20-percentB)/0.15*0.4, // 0.5-0.9
			Indicator: "BollingerBands",
			Reason:    "Price in lower band region",
		}
	}
	
	// Weak buy: Price in lower 35% of band
	if percentB <= 0.35 {
		return Signal{
			Type:      "BUY",
			Strength:  0.3 + (0.35-percentB)/0.15*0.2, // 0.3-0.5
			Indicator: "BollingerBands",
			Reason:    "Price approaching lower band",
		}
	}

	// Strong sell: Price at or above upper band
	if percentB >= 0.95 {
		return Signal{
			Type:      "SELL",
			Strength:  0.9 + (percentB-0.95)*2, // 0.9-1.0
			Indicator: "BollingerBands",
			Reason:    "Price at upper band",
		}
	}
	
	// Moderate sell: Price in upper 20% of band
	if percentB >= 0.80 {
		return Signal{
			Type:      "SELL",
			Strength:  0.5 + (percentB-0.80)/0.15*0.4, // 0.5-0.9
			Indicator: "BollingerBands",
			Reason:    "Price in upper band region",
		}
	}
	
	// Weak sell: Price in upper 35% of band
	if percentB >= 0.65 {
		return Signal{
			Type:      "SELL",
			Strength:  0.3 + (percentB-0.65)/0.15*0.2, // 0.3-0.5
			Indicator: "BollingerBands",
			Reason:    "Price approaching upper band",
		}
	}

	return Signal{Type: "HOLD", Indicator: "BollingerBands"}
}

func (bb *BollingerBands) Reset() {
	bb.prices = bb.prices[:0]
	bb.upper = 0
	bb.middle = 0
	bb.lower = 0
}
