package signals

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type Signal struct {
	ID             string    `json:"id"`
	Symbol         string    `json:"symbol"`
	Timeframe      string    `json:"timeframe"`
	Direction      string    `json:"direction"`
	Confidence     float64   `json:"confidence"`
	Probability    float64   `json:"probability"`
	Price          float64   `json:"price"`
	ATR            float64   `json:"atr"`
	TechnicalSignal float64 `json:"technicalSignal"`
	MLSignal       float64  `json:"mlSignal"`
	SentimentSignal float64 `json:"sentimentSignal"`
	Timestamp      time.Time `json:"timestamp" wails:"-"`
	Reasons        []string  `json:"reasons"`
	Model          string    `json:"model"`
}

type SignalHandler struct {
	signals     map[string]*Signal
	prices      map[string]float64
	mu          sync.RWMutex
	subscribers []chan *Signal
}

func NewSignalHandler() *SignalHandler {
	return &SignalHandler{
		signals:     make(map[string]*Signal),
		prices:      make(map[string]float64),
		subscribers: make([]chan *Signal, 0),
	}
}

func (sh *SignalHandler) UpdateSignal(signal *Signal) {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	if signal.ID == "" {
		signal.ID = uuid.New().String()
	}
	if signal.Timestamp.IsZero() {
		signal.Timestamp = time.Now()
	}

	key := signal.Symbol + ":" + signal.Timeframe
	sh.signals[key] = signal

	for _, ch := range sh.subscribers {
		select {
		case ch <- signal:
		default:
		}
	}
}

func (sh *SignalHandler) UpdatePrice(symbol string, price float64) {
	sh.mu.Lock()
	defer sh.mu.Unlock()
	sh.prices[symbol] = price
}

func (sh *SignalHandler) GetLatestSignal() *Signal {
	sh.mu.RLock()
	defer sh.mu.RUnlock()

	var latest *Signal
	for _, sig := range sh.signals {
		if latest == nil || sig.Timestamp.After(latest.Timestamp) {
			latest = sig
		}
	}

	return latest
}

func (sh *SignalHandler) GetSignal(symbol, timeframe string) *Signal {
	sh.mu.RLock()
	defer sh.mu.RUnlock()

	key := symbol + ":" + timeframe
	if sig, ok := sh.signals[key]; ok {
		return sig
	}
	return nil
}

func (sh *SignalHandler) GetCurrentPrice(symbol string) float64 {
	sh.mu.RLock()
	defer sh.mu.RUnlock()
	return sh.prices[symbol]
}

func (sh *SignalHandler) Subscribe() chan *Signal {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	ch := make(chan *Signal, 100)
	sh.subscribers = append(sh.subscribers, ch)
	return ch
}

func (sh *SignalHandler) GetAllSignals() []*Signal {
	sh.mu.RLock()
	defer sh.mu.RUnlock()

	signals := make([]*Signal, 0, len(sh.signals))
	for _, sig := range sh.signals {
		signals = append(signals, sig)
	}
	return signals
}

func (sh *SignalHandler) GetLatestSignalForSymbol(symbol string) *Signal {
	sh.mu.RLock()
	defer sh.mu.RUnlock()

	var latest *Signal
	for key, sig := range sh.signals {
		// Key format is "symbol:timeframe", so check if it starts with symbol
		if len(key) >= len(symbol) && key[:len(symbol)] == symbol {
			// Check if there's a colon after symbol (to match "symbol:timeframe" format)
			if len(key) > len(symbol) && key[len(symbol)] == ':' {
				if latest == nil || sig.Timestamp.After(latest.Timestamp) {
					latest = sig
				}
			}
		}
	}

	return latest
}

