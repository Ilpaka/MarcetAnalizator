package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// MLPrediction структура предсказания от ML сервиса
type MLPrediction struct {
	PredictedPrice float64 `json:"predicted_price"`
	CurrentPrice   float64 `json:"current_price"`
	ChangePercent  float64 `json:"change_percent"`
	Direction      string  `json:"direction"`
	Confidence     float64 `json:"confidence"`
	Timestamp      int64   `json:"timestamp"`
}

// MLModelInfo информация о модели
type MLModelInfo struct {
	Loaded            bool    `json:"loaded"`
	Symbol            string  `json:"symbol"`
	Interval          string  `json:"interval"`
	MAE               float64 `json:"mae"`
	RMSE              float64 `json:"rmse"`
	MAPE              float64 `json:"mape"`
	DirectionAccuracy float64 `json:"direction_accuracy"`
	Lookback          int     `json:"lookback"`
}

// App struct
type App struct {
	ctx            context.Context
	wsConn         *websocket.Conn
	wsActive       bool
	wsMutex        sync.Mutex
	currentSymbol  string
	currentCandles []CandleData
}

// CandleData представляет свечу
type CandleData struct {
	Time   int64   `json:"time"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume float64 `json:"volume"`
}

// BinanceKlineWs структура WebSocket kline от Binance
type BinanceKlineWs struct {
	EventType string `json:"e"`
	EventTime int64  `json:"E"`
	Symbol    string `json:"s"`
	Kline     struct {
		StartTime           int64       `json:"t"`
		EndTime             int64       `json:"T"`
		Symbol              string      `json:"s"`
		Interval            string      `json:"i"`
		OpenPrice           interface{} `json:"o"` // Может быть string или number
		ClosePrice          interface{} `json:"c"`
		HighPrice           interface{} `json:"h"`
		LowPrice            interface{} `json:"l"` // Это была проблема!
		Volume              interface{} `json:"v"`
		IsClosed            bool        `json:"x"`
		NumberOfTrades      int         `json:"n"`
		QuoteAssetVolume    interface{} `json:"q"`
		TakerBuyBaseVolume  interface{} `json:"V"`
		TakerBuyQuoteVolume interface{} `json:"Q"`
	} `json:"k"`
}

func NewApp() *App {
	return &App{
		wsActive:       false,
		currentCandles: make([]CandleData, 0),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	fmt.Println("🚀 Приложение запущено!")
}

func (a *App) shutdown(ctx context.Context) {
	a.StopRealtime()
}

func (a *App) GetCryptoData(symbol string, resolution string, daysBack int) ([]CandleData, error) {
	binanceSymbol := symbol[:3] + "USDT"

	intervalMap := map[string]string{
		"1":  "1m",
		"5":  "5m",
		"15": "15m",
		"60": "1h",
		"D":  "1d",
		"W":  "1w",
	}

	interval := intervalMap[resolution]
	if interval == "" {
		interval = "1d"
	}

	limit := calculateLimit(resolution, daysBack)
	if limit > 1000 {
		limit = 1000
	}

	url := fmt.Sprintf(
		"https://api.binance.com/api/v3/klines?symbol=%s&interval=%s&limit=%d",
		binanceSymbol, interval, limit,
	)

	fmt.Printf("📡 REST API: %s\n", binanceSymbol)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("ошибка запроса: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("код %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var klines [][]interface{}
	if err := json.Unmarshal(body, &klines); err != nil {
		return nil, err
	}

	if len(klines) == 0 {
		return nil, fmt.Errorf("нет данных")
	}

	candles := make([]CandleData, 0, len(klines))

	for _, kline := range klines {
		if len(kline) < 6 {
			continue
		}

		timestamp := int64(kline[0].(float64)) / 1000
		open := parseFloat(kline[1])
		high := parseFloat(kline[2])
		low := parseFloat(kline[3])
		close := parseFloat(kline[4])
		volume := parseFloat(kline[5])

		if open == 0 || high == 0 || low == 0 || close == 0 {
			continue
		}

		candles = append(candles, CandleData{
			Time:   timestamp,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  close,
			Volume: volume,
		})
	}

	sort.Slice(candles, func(i, j int) bool {
		return candles[i].Time < candles[j].Time
	})

	a.wsMutex.Lock()
	a.currentCandles = candles
	a.currentSymbol = binanceSymbol
	a.wsMutex.Unlock()

	fmt.Printf("✅ Загружено %d свечей\n", len(candles))

	return candles, nil
}

func (a *App) StartRealtime(symbol string, resolution string) error {
	a.StopRealtime()

	binanceSymbol := symbol[:3] + "USDT"

	intervalMap := map[string]string{
		"1":  "1m",
		"5":  "5m",
		"15": "15m",
		"60": "1h",
		"D":  "1d",
		"W":  "1w",
	}

	interval := intervalMap[resolution]
	if interval == "" {
		interval = "1d"
	}

	wsURL := fmt.Sprintf(
		"wss://stream.binance.com:9443/ws/%s@kline_%s",
		toLower(binanceSymbol),
		interval,
	)

	fmt.Printf("🔌 Подключаюсь к WebSocket: %s\n", wsURL)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		fmt.Printf("❌ Ошибка подключения: %v\n", err)
		return fmt.Errorf("ошибка подключения: %v", err)
	}

	a.wsMutex.Lock()
	a.wsConn = conn
	a.wsActive = true
	a.wsMutex.Unlock()

	go a.readWebSocketMessages()

	fmt.Println("✅ WebSocket подключен и слушает")

	return nil
}

func (a *App) readWebSocketMessages() {
	defer func() {
		a.wsMutex.Lock()
		if a.wsConn != nil {
			a.wsConn.Close()
		}
		a.wsActive = false
		a.wsMutex.Unlock()
		fmt.Println("🔴 WebSocket отключен")
	}()

	messageCount := 0

	for {
		a.wsMutex.Lock()
		if !a.wsActive || a.wsConn == nil {
			a.wsMutex.Unlock()
			break
		}
		conn := a.wsConn
		a.wsMutex.Unlock()

		_, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Printf("❌ Ошибка чтения: %v\n", err)
			break
		}

		messageCount++

		if messageCount%10 == 1 {
			fmt.Printf("📨 Сообщение #%d (длина: %d байт)\n", messageCount, len(message))
		}

		var wsData BinanceKlineWs
		if err := json.Unmarshal(message, &wsData); err != nil {
			fmt.Printf("⚠️ Ошибка парсинга: %v\n", err)
			fmt.Printf("📄 Сырой JSON: %s\n", string(message[:200])) // Первые 200 символов
			continue
		}

		if wsData.EventType != "kline" {
			continue
		}

		// 🔥 ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ ПАРСИНГА
		newCandle := CandleData{
			Time:   wsData.Kline.StartTime / 1000,
			Open:   parseInterfaceFloat(wsData.Kline.OpenPrice),
			High:   parseInterfaceFloat(wsData.Kline.HighPrice),
			Low:    parseInterfaceFloat(wsData.Kline.LowPrice),
			Close:  parseInterfaceFloat(wsData.Kline.ClosePrice),
			Volume: parseInterfaceFloat(wsData.Kline.Volume),
		}

		fmt.Printf("🕯️ %s | O:%.2f H:%.2f L:%.2f C:%.2f | Закрыта:%v\n",
			wsData.Symbol,
			newCandle.Open,
			newCandle.High,
			newCandle.Low,
			newCandle.Close,
			wsData.Kline.IsClosed,
		)

		a.wsMutex.Lock()
		updated := false
		for i := len(a.currentCandles) - 1; i >= 0; i-- {
			if a.currentCandles[i].Time == newCandle.Time {
				a.currentCandles[i] = newCandle
				updated = true
				break
			}
		}

		if !updated && wsData.Kline.IsClosed {
			a.currentCandles = append(a.currentCandles, newCandle)
			fmt.Printf("➕ Новая свеча (всего: %d)\n", len(a.currentCandles))
		}
		a.wsMutex.Unlock()

		// Отправляем в React
		fmt.Printf("📤 Отправляю событие в React\n")
		runtime.EventsEmit(a.ctx, "candle:update", newCandle)

		if wsData.Kline.IsClosed {
			fmt.Printf("🎉 Свеча закрылась: %s @ $%.2f\n", wsData.Symbol, newCandle.Close)
		}
	}

	fmt.Printf("ℹ️ Всего получено: %d сообщений\n", messageCount)
}

func (a *App) StopRealtime() error {
	a.wsMutex.Lock()
	defer a.wsMutex.Unlock()

	if a.wsConn != nil {
		a.wsActive = false
		a.wsConn.Close()
		a.wsConn = nil
		fmt.Println("🛑 WebSocket остановлен")
	}

	return nil
}

func (a *App) IsRealtimeActive() bool {
	a.wsMutex.Lock()
	defer a.wsMutex.Unlock()
	return a.wsActive
}

func (a *App) GetAvailableSymbols() []string {
	return []string{
		"BTC_USD", "ETH_USD", "BNB_USD", "SOL_USD",
		"XRP_USD", "ADA_USD", "DOGE_USD", "MATIC_USD",
		"DOT_USD", "AVAX_USD", "LINK_USD", "UNI_USD",
	}
}

// Вспомогательные функции
func calculateLimit(resolution string, daysBack int) int {
	switch resolution {
	case "1":
		return daysBack * 24 * 60
	case "5":
		return daysBack * 24 * 12
	case "15":
		return daysBack * 24 * 4
	case "60":
		return daysBack * 24
	case "D":
		return daysBack
	case "W":
		return daysBack / 7
	default:
		return daysBack
	}
}

func parseFloat(val interface{}) float64 {
	switch v := val.(type) {
	case string:
		f, _ := strconv.ParseFloat(v, 64)
		return f
	case float64:
		return v
	case int:
		return float64(v)
	default:
		return 0
	}
}

// 🔥 НОВАЯ ФУНКЦИЯ для парсинга interface{}
func parseInterfaceFloat(val interface{}) float64 {
	switch v := val.(type) {
	case string:
		f, _ := strconv.ParseFloat(v, 64)
		return f
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case json.Number:
		f, _ := v.Float64()
		return f
	default:
		// Если все равно не удалось распарсить, логируем и возвращаем 0
		fmt.Printf("⚠️ Неизвестный тип: %T (значение: %v)\n", v, v)
		return 0
	}
}

func parseFloatStr(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func toLower(s string) string {
	result := ""
	for _, r := range s {
		if r >= 'A' && r <= 'Z' {
			result += string(r + 32)
		} else {
			result += string(r)
		}
	}
	return result
}

func (a *App) GetMLPrediction(symbol string, resolution string) (*MLPrediction, error) {
	// Получаем исторические данные
	candles, err := a.GetCryptoData(symbol, resolution, 200) // Больше данных для ML
	if err != nil {
		return nil, fmt.Errorf("ошибка получения данных: %v", err)
	}

	if len(candles) < 100 {
		return nil, fmt.Errorf("недостаточно данных: %d свечей", len(candles))
	}

	// Формируем запрос
	requestData := map[string]interface{}{
		"candles": candles,
		"symbol":  symbol,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return nil, fmt.Errorf("ошибка сериализации: %v", err)
	}

	// Отправляем запрос к Python ML сервису
	resp, err := http.Post(
		"http://localhost:8000/predict",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("ML сервис недоступен: %v (запустите ml-service)", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ML сервис вернул ошибку: %s", string(body))
	}

	// Парсим ответ
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения ответа: %v", err)
	}

	var prediction MLPrediction
	if err := json.Unmarshal(body, &prediction); err != nil {
		return nil, fmt.Errorf("ошибка парсинга ответа: %v", err)
	}

	fmt.Printf("🤖 ML Предсказание: $%.2f (%s %.2f%%) [Confidence: %.0f%%]\n",
		prediction.PredictedPrice,
		prediction.Direction,
		prediction.ChangePercent,
		prediction.Confidence)

	return &prediction, nil
}

// GetMLModelInfo получает информацию о загруженной ML модели
func (a *App) GetMLModelInfo() (*MLModelInfo, error) {
	resp, err := http.Get("http://localhost:8000/model/info")
	if err != nil {
		return nil, fmt.Errorf("ML сервис недоступен: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var info MLModelInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}

	return &info, nil
}

// CheckMLServiceHealth проверяет доступность ML сервиса
func (a *App) CheckMLServiceHealth() bool {
	resp, err := http.Get("http://localhost:8000/")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200
}
