package indicators

import "math"

// Momentum measures the rate of price change
type Momentum struct {
	period int
	prices []float64
	value  float64
}

func NewMomentum(period int) *Momentum {
	return &Momentum{
		period: period,
		prices: make([]float64, 0, period+1),
	}
}

func DefaultMomentum() *Momentum {
	return NewMomentum(10)
}

func (m *Momentum) Update(close float64) float64 {
	m.prices = append(m.prices, close)

	if len(m.prices) > m.period+1 {
		m.prices = m.prices[1:]
	}

	if len(m.prices) < m.period+1 {
		return 0
	}

	// Momentum = current price - price N periods ago
	currentPrice := m.prices[len(m.prices)-1]
	oldPrice := m.prices[0]

	if oldPrice == 0 {
		return 0
	}

	// Calculate momentum as percentage change
	m.value = ((currentPrice - oldPrice) / oldPrice) * 100.0

	return m.value
}

func (m *Momentum) Value() float64 {
	return m.value
}

func (m *Momentum) Signal() Signal {
	// Positive momentum indicates upward price movement
	// Negative momentum indicates downward price movement
	// For scalping, use smaller thresholds
	
	if m.value > 1.0 {
		strength := math.Min(m.value/5.0, 1.0) // Normalize 1-5% to 0.2-1.0
		if strength < 0.3 {
			strength = 0.3
		}
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "Momentum",
			Reason:    "Positive momentum",
		}
	}

	if m.value < -1.0 {
		strength := math.Min(math.Abs(m.value)/5.0, 1.0)
		if strength < 0.3 {
			strength = 0.3
		}
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "Momentum",
			Reason:    "Negative momentum",
		}
	}

	// Weak signals for scalping
	if m.value > 0.3 {
		return Signal{
			Type:      "BUY",
			Strength:  0.25,
			Indicator: "Momentum",
			Reason:    "Weak positive momentum",
		}
	}

	if m.value < -0.3 {
		return Signal{
			Type:      "SELL",
			Strength:  0.25,
			Indicator: "Momentum",
			Reason:    "Weak negative momentum",
		}
	}

	return Signal{Type: "HOLD", Indicator: "Momentum"}
}

func (m *Momentum) Reset() {
	m.prices = m.prices[:0]
	m.value = 0
}

