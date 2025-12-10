package indicators

import "math"

type MACD struct {
	fastEMA   *EMA
	slowEMA   *EMA
	signalEMA *EMA
	macdLine  float64
	signal    float64
	histogram float64
	count     int
}

func NewMACD(fastPeriod, slowPeriod, signalPeriod int) *MACD {
	return &MACD{
		fastEMA:   NewEMA(fastPeriod),
		slowEMA:   NewEMA(slowPeriod),
		signalEMA: NewEMA(signalPeriod),
	}
}

// DefaultMACD creates MACD with standard 12, 26, 9 parameters
func DefaultMACD() *MACD {
	return NewMACD(12, 26, 9)
}

func (m *MACD) Update(price float64) (macdLine, signal, histogram float64) {
	m.count++

	fast := m.fastEMA.Update(price)
	slow := m.slowEMA.Update(price)

	m.macdLine = fast - slow
	m.signal = m.signalEMA.Update(m.macdLine)
	m.histogram = m.macdLine - m.signal

	return m.macdLine, m.signal, m.histogram
}

func (m *MACD) Values() (macdLine, signal, histogram float64) {
	return m.macdLine, m.signal, m.histogram
}

func (m *MACD) MACDLine() float64 {
	return m.macdLine
}

func (m *MACD) SignalLine() float64 {
	return m.signal
}

func (m *MACD) Histogram() float64 {
	return m.histogram
}

func (m *MACD) Signal() Signal {
	// More sensitive MACD signals for scalping
	
	// Strong bullish: MACD above signal with positive histogram
	if m.macdLine > m.signal && m.histogram > 0 {
		// Normalize strength based on histogram magnitude
		histNorm := math.Abs(m.histogram) / (math.Abs(m.signal) + 0.0001)
		strength := math.Min(histNorm*50, 1.0)
		if strength < 0.3 {
			strength = 0.3 // Minimum strength for signal
		}
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "MACD",
			Reason:    "Bullish MACD",
		}
	}

	// Strong bearish: MACD below signal with negative histogram
	if m.macdLine < m.signal && m.histogram < 0 {
		histNorm := math.Abs(m.histogram) / (math.Abs(m.signal) + 0.0001)
		strength := math.Min(histNorm*50, 1.0)
		if strength < 0.3 {
			strength = 0.3
		}
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "MACD",
			Reason:    "Bearish MACD",
		}
	}
	
	// Weak bullish: MACD above signal but histogram near zero (momentum building)
	if m.macdLine > m.signal && m.histogram >= -0.0001 {
		return Signal{
			Type:      "BUY",
			Strength:  0.25,
			Indicator: "MACD",
			Reason:    "MACD momentum building",
		}
	}
	
	// Weak bearish: MACD below signal but histogram near zero
	if m.macdLine < m.signal && m.histogram <= 0.0001 {
		return Signal{
			Type:      "SELL",
			Strength:  0.25,
			Indicator: "MACD",
			Reason:    "MACD momentum weakening",
		}
	}

	return Signal{Type: "HOLD", Indicator: "MACD"}
}

func (m *MACD) Reset() {
	m.fastEMA.Reset()
	m.slowEMA.Reset()
	m.signalEMA.Reset()
	m.macdLine = 0
	m.signal = 0
	m.histogram = 0
	m.count = 0
}
