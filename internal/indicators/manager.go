package indicators

import (
	"sync"
)

// IndicatorSet holds all indicators for a symbol/timeframe combination
type IndicatorSet struct {
	EMA9     *EMA
	EMA21    *EMA
	EMA50    *EMA
	EMA200   *EMA
	RSI14    *RSI
	RSI7     *RSI
	MACD     *MACD
	BB       *BollingerBands
	ATR14    *ATR
	StochRSI *StochRSI
	OBV      *OBV
	mu       sync.RWMutex
}

func NewIndicatorSet() *IndicatorSet {
	return &IndicatorSet{
		EMA9:     NewEMA(9),
		EMA21:    NewEMA(21),
		EMA50:    NewEMA(50),
		EMA200:   NewEMA(200),
		RSI14:    NewRSI(14),
		RSI7:     NewRSI(7),
		MACD:     DefaultMACD(),
		BB:       DefaultBollingerBands(),
		ATR14:    NewATR(14),
		StochRSI: DefaultStochRSI(),
		OBV:      NewOBV(),
	}
}

// UpdateAll updates all indicators with new candle data
func (is *IndicatorSet) UpdateAll(high, low, close, volume float64) *IndicatorValues {
	is.mu.Lock()
	defer is.mu.Unlock()

	// Update all indicators
	ema9 := is.EMA9.Update(close)
	ema21 := is.EMA21.Update(close)
	ema50 := is.EMA50.Update(close)
	ema200 := is.EMA200.Update(close)

	rsi14 := is.RSI14.Update(close)
	rsi7 := is.RSI7.Update(close)

	macdLine, macdSignal, macdHist := is.MACD.Update(close)

	bbUpper, bbMiddle, bbLower := is.BB.Update(close)

	atr := is.ATR14.Update(high, low, close)

	stochK, stochD := is.StochRSI.Update(close)

	obv := is.OBV.Update(close, volume)

	return &IndicatorValues{
		EMA9:       ema9,
		EMA21:      ema21,
		EMA50:      ema50,
		EMA200:     ema200,
		RSI14:      rsi14,
		RSI7:       rsi7,
		MACDLine:   macdLine,
		MACDSignal: macdSignal,
		MACDHist:   macdHist,
		BBUpper:    bbUpper,
		BBMiddle:   bbMiddle,
		BBLower:    bbLower,
		BBPercentB: is.BB.PercentB(close),
		ATR14:      atr,
		StochRSI_K: stochK,
		StochRSI_D: stochD,
		OBV:        obv,
	}
}

// GetSignals returns all current signals
func (is *IndicatorSet) GetSignals(price float64) []Signal {
	is.mu.RLock()
	defer is.mu.RUnlock()

	signals := []Signal{
		is.RSI14.Signal(),
		is.RSI7.Signal(),
		is.MACD.Signal(),
		is.BB.Signal(price),
		is.StochRSI.Signal(),
	}

	// EMA crossover signals
	if is.EMA9.Value() > is.EMA21.Value() {
		signals = append(signals, Signal{
			Type:      "BUY",
			Strength:  0.6,
			Indicator: "EMA",
			Reason:    "EMA9 above EMA21",
		})
	} else if is.EMA9.Value() < is.EMA21.Value() {
		signals = append(signals, Signal{
			Type:      "SELL",
			Strength:  0.6,
			Indicator: "EMA",
			Reason:    "EMA9 below EMA21",
		})
	}

	return signals
}

func (is *IndicatorSet) Reset() {
	is.mu.Lock()
	defer is.mu.Unlock()

	is.EMA9.Reset()
	is.EMA21.Reset()
	is.EMA50.Reset()
	is.EMA200.Reset()
	is.RSI14.Reset()
	is.RSI7.Reset()
	is.MACD.Reset()
	is.BB.Reset()
	is.ATR14.Reset()
	is.StochRSI.Reset()
	is.OBV.Reset()
}

// IndicatorValues holds all calculated values
type IndicatorValues struct {
	EMA9       float64 `json:"ema9"`
	EMA21      float64 `json:"ema21"`
	EMA50      float64 `json:"ema50"`
	EMA200     float64 `json:"ema200"`
	RSI14      float64 `json:"rsi14"`
	RSI7       float64 `json:"rsi7"`
	MACDLine   float64 `json:"macdLine"`
	MACDSignal float64 `json:"macdSignal"`
	MACDHist   float64 `json:"macdHist"`
	BBUpper    float64 `json:"bbUpper"`
	BBMiddle   float64 `json:"bbMiddle"`
	BBLower    float64 `json:"bbLower"`
	BBPercentB float64 `json:"bbPercentB"`
	ATR14      float64 `json:"atr14"`
	StochRSI_K float64 `json:"stochRsiK"`
	StochRSI_D float64 `json:"stochRsiD"`
	OBV        float64 `json:"obv"`
}

// IndicatorManager manages indicators for multiple symbols/timeframes
type IndicatorManager struct {
	sets map[string]*IndicatorSet // key: "symbol:timeframe"
	mu   sync.RWMutex
}

func NewIndicatorManager() *IndicatorManager {
	return &IndicatorManager{
		sets: make(map[string]*IndicatorSet),
	}
}

func (im *IndicatorManager) GetOrCreate(symbol, timeframe string) *IndicatorSet {
	key := symbol + ":" + timeframe

	im.mu.RLock()
	if set, ok := im.sets[key]; ok {
		im.mu.RUnlock()
		return set
	}
	im.mu.RUnlock()

	im.mu.Lock()
	defer im.mu.Unlock()

	// Double-check after acquiring write lock
	if set, ok := im.sets[key]; ok {
		return set
	}

	set := NewIndicatorSet()
	im.sets[key] = set
	return set
}
