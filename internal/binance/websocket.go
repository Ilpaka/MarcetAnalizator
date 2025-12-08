package binance

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

type WSClient struct {
	conn        *websocket.Conn
	url         string
	subscribers map[string][]chan interface{}
	mu          sync.RWMutex
	done        chan struct{}
	reconnect   bool
}

type KlineWSMessage struct {
	EventType string `json:"e"`
	EventTime int64  `json:"E"`
	Symbol    string `json:"s"`
	Kline     struct {
		StartTime   int64  `json:"t"`
		CloseTime   int64  `json:"T"`
		Symbol      string `json:"s"`
		Interval    string `json:"i"`
		Open        string `json:"o"`
		Close       string `json:"c"`
		High        string `json:"h"`
		Low         string `json:"l"`
		Volume      string `json:"v"`
		TradeCount  int    `json:"n"`
		IsFinal     bool   `json:"x"`
		QuoteVolume string `json:"q"`
	} `json:"k"`
}

type TickerWSMessage struct {
	EventType          string `json:"e"`
	EventTime          int64  `json:"E"`
	Symbol             string `json:"s"`
	PriceChange        string `json:"p"`
	PriceChangePercent string `json:"P"`
	LastPrice          string `json:"c"`
	Volume             string `json:"v"`
	QuoteVolume        string `json:"q"`
}

func NewWSClient() *WSClient {
	return &WSClient{
		url:         "wss://stream.binance.com:9443/ws",
		subscribers: make(map[string][]chan interface{}),
		done:        make(chan struct{}),
		reconnect:   true,
	}
}

// Connect establishes WebSocket connection
func (ws *WSClient) Connect() error {
	var err error
	ws.conn, _, err = websocket.DefaultDialer.Dial(ws.url, nil)
	if err != nil {
		return fmt.Errorf("websocket dial error: %w", err)
	}

	go ws.readLoop()
	go ws.pingLoop()

	log.Info("WebSocket connected to Binance")
	return nil
}

// SubscribeKline subscribes to kline/candlestick stream
// symbol: lowercase, e.g., "btcusdt"
// interval: e.g., "1m", "5m", "1h"
func (ws *WSClient) SubscribeKline(symbol, interval string) (chan *KlineWSMessage, error) {
	stream := fmt.Sprintf("%s@kline_%s", strings.ToLower(symbol), interval)

	// Subscribe message
	msg := map[string]interface{}{
		"method": "SUBSCRIBE",
		"params": []string{stream},
		"id":     time.Now().UnixNano(),
	}

	if err := ws.conn.WriteJSON(msg); err != nil {
		return nil, err
	}

	ch := make(chan *KlineWSMessage, 100)
	genericCh := make(chan interface{}, 100)

	// Convert generic channel to typed channel
	go func() {
		for msg := range genericCh {
			if kline, ok := msg.(*KlineWSMessage); ok {
				ch <- kline
			}
		}
	}()

	ws.mu.Lock()
	ws.subscribers[stream] = append(ws.subscribers[stream], genericCh)
	ws.mu.Unlock()

	return ch, nil
}

// SubscribeTicker subscribes to 24hr ticker stream
func (ws *WSClient) SubscribeTicker(symbol string) (chan *TickerWSMessage, error) {
	stream := fmt.Sprintf("%s@ticker", strings.ToLower(symbol))

	msg := map[string]interface{}{
		"method": "SUBSCRIBE",
		"params": []string{stream},
		"id":     time.Now().UnixNano(),
	}

	if err := ws.conn.WriteJSON(msg); err != nil {
		return nil, err
	}

	ch := make(chan *TickerWSMessage, 100)
	genericCh := make(chan interface{}, 100)

	// Convert generic channel to typed channel
	go func() {
		for msg := range genericCh {
			if ticker, ok := msg.(*TickerWSMessage); ok {
				ch <- ticker
			}
		}
	}()

	ws.mu.Lock()
	ws.subscribers[stream] = append(ws.subscribers[stream], genericCh)
	ws.mu.Unlock()

	return ch, nil
}

// SubscribeAllTickers subscribes to all market tickers
func (ws *WSClient) SubscribeAllTickers() (chan *TickerWSMessage, error) {
	stream := "!ticker@arr"

	msg := map[string]interface{}{
		"method": "SUBSCRIBE",
		"params": []string{stream},
		"id":     time.Now().UnixNano(),
	}

	if err := ws.conn.WriteJSON(msg); err != nil {
		return nil, err
	}

	ch := make(chan *TickerWSMessage, 1000)
	genericCh := make(chan interface{}, 1000)

	// Convert generic channel to typed channel
	go func() {
		for msg := range genericCh {
			if ticker, ok := msg.(*TickerWSMessage); ok {
				ch <- ticker
			}
		}
	}()

	ws.mu.Lock()
	ws.subscribers[stream] = append(ws.subscribers[stream], genericCh)
	ws.mu.Unlock()

	return ch, nil
}

func (ws *WSClient) handleMessage(data []byte) {
	// Try to parse as kline message
	var kline KlineWSMessage
	if err := json.Unmarshal(data, &kline); err == nil && kline.EventType == "kline" {
		stream := fmt.Sprintf("%s@kline_%s", strings.ToLower(kline.Symbol), kline.Kline.Interval)
		ws.broadcast(stream, &kline)
		return
	}

	// Try to parse as ticker message
	var ticker TickerWSMessage
	if err := json.Unmarshal(data, &ticker); err == nil && ticker.EventType == "24hrTicker" {
		stream := fmt.Sprintf("%s@ticker", strings.ToLower(ticker.Symbol))
		ws.broadcast(stream, &ticker)
		return
	}
}

func (ws *WSClient) broadcast(stream string, msg interface{}) {
	ws.mu.RLock()
	defer ws.mu.RUnlock()

	if subs, ok := ws.subscribers[stream]; ok {
		for _, ch := range subs {
			select {
			case ch <- msg:
			default:
				// Channel full, skip
			}
		}
	}
}

func (ws *WSClient) pingLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ws.done:
			return
		case <-ticker.C:
			if err := ws.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Errorf("Ping error: %v", err)
				return
			}
		}
	}
}

func (ws *WSClient) readLoop() {
	defer func() {
		if ws.reconnect {
			ws.handleReconnect()
		}
	}()

	for {
		select {
		case <-ws.done:
			return
		default:
			_, message, err := ws.conn.ReadMessage()
			if err != nil {
				log.Errorf("WebSocket read error: %v", err)
				return
			}

			ws.handleMessage(message)
		}
	}
}

func (ws *WSClient) handleReconnect() {
	log.Info("Attempting WebSocket reconnect...")
	time.Sleep(5 * time.Second)

	if err := ws.Connect(); err != nil {
		log.Errorf("Reconnect failed: %v", err)
		ws.handleReconnect()
	}
}

func (ws *WSClient) Close() {
	ws.reconnect = false
	close(ws.done)
	if ws.conn != nil {
		ws.conn.Close()
	}
}
