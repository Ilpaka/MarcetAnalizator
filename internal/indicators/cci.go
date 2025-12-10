package indicators

import "math"

// CCI (Commodity Channel Index) measures price deviation from statistical mean
type CCI struct {
	period   int
	prices   []float64 // Typical price = (high + low + close) / 3
	mean     float64
	dev      float64
	value    float64
}

func NewCCI(period int) *CCI {
	return &CCI{
		period: period,
		prices: make([]float64, 0, period),
	}
}

func DefaultCCI() *CCI {
	return NewCCI(20)
}

func (c *CCI) Update(high, low, close float64) float64 {
	typicalPrice := (high + low + close) / 3.0
	c.prices = append(c.prices, typicalPrice)

	if len(c.prices) > c.period {
		c.prices = c.prices[1:]
	}

	if len(c.prices) < c.period {
		return 0
	}

	// Calculate SMA (mean)
	c.mean = sum(c.prices) / float64(len(c.prices))

	// Calculate mean deviation
	var sumDev float64
	for _, p := range c.prices {
		sumDev += math.Abs(p - c.mean)
	}
	c.dev = sumDev / float64(len(c.prices))

	if c.dev == 0 {
		c.value = 0
		return 0
	}

	// Calculate CCI
	c.value = (typicalPrice - c.mean) / (0.015 * c.dev)

	return c.value
}

func (c *CCI) Value() float64 {
	return c.value
}

func (c *CCI) Signal() Signal {
	// CCI > 100 indicates overbought
	// CCI < -100 indicates oversold
	// For scalping, use tighter thresholds
	
	if c.value > 100 {
		strength := math.Min((c.value-100)/100, 1.0) // Normalize 100-200 to 0-1
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "CCI",
			Reason:    "Overbought condition",
		}
	}

	if c.value < -100 {
		strength := math.Min(math.Abs(c.value+100)/100, 1.0) // Normalize -100 to -200 to 0-1
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "CCI",
			Reason:    "Oversold condition",
		}
	}

	// Moderate signals for scalping
	if c.value > 50 {
		return Signal{
			Type:      "SELL",
			Strength:  0.3,
			Indicator: "CCI",
			Reason:    "Moderate overbought",
		}
	}

	if c.value < -50 {
		return Signal{
			Type:      "BUY",
			Strength:  0.3,
			Indicator: "CCI",
			Reason:    "Moderate oversold",
		}
	}

	return Signal{Type: "HOLD", Indicator: "CCI"}
}

func (c *CCI) Reset() {
	c.prices = c.prices[:0]
	c.mean = 0
	c.dev = 0
	c.value = 0
}

