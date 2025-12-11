// Package binance provides integration with Binance cryptocurrency exchange API.
// It includes REST API client for market data and WebSocket client for real-time updates.
package binance

import (
	"context"
	"fmt"
	"strconv"

	"github.com/adshao/go-binance/v2"
)

// Client wraps the Binance REST API client for market data operations.
// It provides methods to fetch candlestick data, ticker information, and order book data.
type Client struct {
	client *binance.Client // Binance SDK client
	ctx    context.Context // Context for API requests
}

// Kline represents a candlestick/OHLCV data point from Binance.
type Kline struct {
	OpenTime  int64   `json:"openTime"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
	CloseTime int64   `json:"closeTime"`
}

// Ticker represents 24-hour ticker price statistics for a symbol.
type Ticker struct {
	Symbol             string  `json:"symbol"`
	PriceChange        float64 `json:"priceChange"`
	PriceChangePercent float64 `json:"priceChangePercent"`
	LastPrice          float64 `json:"lastPrice"`
	Volume             float64 `json:"volume"`
	QuoteVolume        float64 `json:"quoteVolume"`
}

// NewClient creates a new Binance REST API client.
// Uses public API endpoints, no API keys required for market data.
func NewClient() *Client {
	return &Client{
		client: binance.NewClient("", ""), // Public API, no keys needed for market data
		ctx:    context.Background(),
	}
}

// GetKlines retrieves historical candlestick data
// symbol: e.g., "BTCUSDT"
// interval: e.g., "1m", "5m", "15m", "1h", "4h", "1d"
// limit: max 1000
func (c *Client) GetKlines(symbol, interval string, limit int) ([]Kline, error) {
	klines, err := c.client.NewKlinesService().
		Symbol(symbol).
		Interval(interval).
		Limit(limit).
		Do(c.ctx)

	if err != nil {
		return nil, err
	}

	result := make([]Kline, len(klines))
	for i, k := range klines {
		result[i] = Kline{
			OpenTime:  k.OpenTime,
			Open:      parseFloat(k.Open),
			High:      parseFloat(k.High),
			Low:       parseFloat(k.Low),
			Close:     parseFloat(k.Close),
			Volume:    parseFloat(k.Volume),
			CloseTime: k.CloseTime,
		}
	}

	return result, nil
}

// GetTicker24h retrieves 24hr ticker statistics
func (c *Client) GetTicker24h(symbol string) (*Ticker, error) {
	ticker, err := c.client.NewListPriceChangeStatsService().
		Symbol(symbol).
		Do(c.ctx)

	if err != nil {
		return nil, err
	}

	if len(ticker) == 0 {
		return nil, fmt.Errorf("no ticker data for %s", symbol)
	}

	t := ticker[0]
	return &Ticker{
		Symbol:             t.Symbol,
		PriceChange:        parseFloat(t.PriceChange),
		PriceChangePercent: parseFloat(t.PriceChangePercent),
		LastPrice:          parseFloat(t.LastPrice),
		Volume:             parseFloat(t.Volume),
		QuoteVolume:        parseFloat(t.QuoteVolume),
	}, nil
}

// GetAllTickers retrieves all tickers with 24h statistics
func (c *Client) GetAllTickers() ([]Ticker, error) {
	tickers, err := c.client.NewListPriceChangeStatsService().Do(c.ctx)
	if err != nil {
		return nil, err
	}

	result := make([]Ticker, len(tickers))
	for i, t := range tickers {
		result[i] = Ticker{
			Symbol:             t.Symbol,
			PriceChange:        parseFloat(t.PriceChange),
			PriceChangePercent: parseFloat(t.PriceChangePercent),
			LastPrice:          parseFloat(t.LastPrice),
			Volume:             parseFloat(t.Volume),
			QuoteVolume:        parseFloat(t.QuoteVolume),
		}
	}

	return result, nil
}

func parseFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}
