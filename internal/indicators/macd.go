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
	// Bullish crossover: MACD crosses above signal
	if m.macdLine > m.signal && m.histogram > 0 {
		strength := m.histogram / m.signal * 10
		if strength > 1.0 {
			strength = 1.0
		}
		return Signal{
			Type:      "BUY",
			Strength:  strength,
			Indicator: "MACD",
			Reason:    "Bullish crossover",
		}
	}

	// Bearish crossover: MACD crosses below signal
	if m.macdLine < m.signal && m.histogram < 0 {
		strength := math.Abs(m.histogram/m.signal) * 10
		if strength > 1.0 {
			strength = 1.0
		}
		return Signal{
			Type:      "SELL",
			Strength:  strength,
			Indicator: "MACD",
			Reason:    "Bearish crossover",
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
