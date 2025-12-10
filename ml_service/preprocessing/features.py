import numpy as np
import pandas as pd

class TechnicalIndicators:
    @staticmethod
    def sma(data, window):
        result = np.zeros(len(data))
        for i in range(window - 1, len(data)):
            result[i] = np.mean(data[i - window + 1:i + 1])
        result[:window - 1] = np.nan
        return result

    @staticmethod
    def ema(data, window):
        alpha = 2 / (window + 1)
        result = np.zeros(len(data))
        result[0] = data[0]

        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i - 1]

        return result

    @staticmethod
    def rsi(data, window=14):
        deltas = np.diff(data)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.zeros(len(data))
        avg_loss = np.zeros(len(data))

        avg_gain[window] = np.mean(gains[:window])
        avg_loss[window] = np.mean(losses[:window])

        for i in range(window + 1, len(data)):
            avg_gain[i] = (avg_gain[i - 1] * (window - 1) + gains[i - 1]) / window
            avg_loss[i] = (avg_loss[i - 1] * (window - 1) + losses[i - 1]) / window

        rs = avg_gain / (avg_loss + 1e-10)
        rsi = 100 - (100 / (1 + rs))
        rsi[:window] = np.nan

        return rsi

    @staticmethod
    def macd(data, fast=12, slow=26, signal=9):
        ema_fast = TechnicalIndicators.ema(data, fast)
        ema_slow = TechnicalIndicators.ema(data, slow)

        macd_line = ema_fast - ema_slow
        signal_line = TechnicalIndicators.ema(macd_line, signal)
        histogram = macd_line - signal_line

        return macd_line, signal_line, histogram

    @staticmethod
    def bollinger_bands(data, window=20, num_std=2):
        sma = TechnicalIndicators.sma(data, window)

        std = np.zeros(len(data))
        for i in range(window - 1, len(data)):
            std[i] = np.std(data[i - window + 1:i + 1])
        std[:window - 1] = np.nan

        upper = sma + (std * num_std)
        lower = sma - (std * num_std)

        return upper, sma, lower

    @staticmethod
    def atr(high, low, close, window=14):
        tr = np.zeros(len(high))

        for i in range(1, len(high)):
            hl = high[i] - low[i]
            hc = abs(high[i] - close[i - 1])
            lc = abs(low[i] - close[i - 1])
            tr[i] = max(hl, hc, lc)

        atr = TechnicalIndicators.sma(tr, window)
        return atr

    @staticmethod
    def obv(close, volume):
        obv = np.zeros(len(close))
        obv[0] = volume[0]

        for i in range(1, len(close)):
            if close[i] > close[i - 1]:
                obv[i] = obv[i - 1] + volume[i]
            elif close[i] < close[i - 1]:
                obv[i] = obv[i - 1] - volume[i]
            else:
                obv[i] = obv[i - 1]

        return obv

def create_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    close = df['close'].values
    high = df['high'].values
    low = df['low'].values
    volume = df['volume'].values

    ti = TechnicalIndicators()

    print("📊 Создаю фичи...")

    df['returns'] = np.concatenate([[0], np.diff(close) / close[:-1]])
    df['log_returns'] = np.concatenate([[0], np.log(close[1:] / close[:-1])])

    df['sma_7'] = ti.sma(close, 7)
    df['sma_20'] = ti.sma(close, 20)
    df['sma_50'] = ti.sma(close, 50)
    df['ema_12'] = ti.ema(close, 12)
    df['ema_26'] = ti.ema(close, 26)

    df['dist_sma_20'] = (close - df['sma_20'].values) / (df['sma_20'].values + 1e-10)
    df['dist_sma_50'] = (close - df['sma_50'].values) / (df['sma_50'].values + 1e-10)

    df['rsi'] = ti.rsi(close, 14)
    df['rsi_sma'] = ti.sma(df['rsi'].values, 14)

    macd, macd_signal, macd_hist = ti.macd(close)
    df['macd'] = macd
    df['macd_signal'] = macd_signal
    df['macd_hist'] = macd_hist

    bb_upper, bb_middle, bb_lower = ti.bollinger_bands(close)
    df['bb_upper'] = bb_upper
    df['bb_middle'] = bb_middle
    df['bb_lower'] = bb_lower
    df['bb_width'] = (bb_upper - bb_lower) / (bb_middle + 1e-10)
    df['bb_position'] = (close - bb_lower) / (bb_upper - bb_lower + 1e-10)

    df['atr'] = ti.atr(high, low, close)

    volatility = np.zeros(len(close))
    for i in range(20, len(close)):
        volatility[i] = np.std(df['returns'].values[i - 20:i])
    df['volatility'] = volatility

    df['obv'] = ti.obv(close, volume)
    df['volume_sma'] = ti.sma(volume, 20)
    df['volume_ratio'] = volume / (df['volume_sma'].values + 1e-10)

    df['high_low_range'] = (high - low) / (close + 1e-10)
    df['close_open_range'] = (df['close'].values - df['open'].values) / (df['open'].values + 1e-10)
    
    # Momentum indicators
    for period in [5, 10, 20]:
        momentum = np.zeros(len(close))
        for i in range(period, len(close)):
            momentum[i] = (close[i] - close[i - period]) / close[i - period]
        df[f'momentum_{period}'] = momentum
    
    # Rate of Change (ROC)
    for period in [5, 10, 20]:
        roc = np.zeros(len(close))
        for i in range(period, len(close)):
            roc[i] = ((close[i] - close[i - period]) / close[i - period]) * 100
        df[f'roc_{period}'] = roc
    
    # Price position in range
    for window in [10, 20, 50]:
        price_position = np.zeros(len(close))
        for i in range(window, len(close)):
            window_high = np.max(high[i - window:i])
            window_low = np.min(low[i - window:i])
            if window_high > window_low:
                price_position[i] = (close[i] - window_low) / (window_high - window_low)
        df[f'price_position_{window}'] = price_position
    
    # Trend strength
    for period in [10, 20]:
        trend_strength = np.zeros(len(close))
        for i in range(period, len(close)):
            window_returns = df['returns'].values[i - period:i]
            trend_strength[i] = np.sum(np.sign(window_returns)) / period
        df[f'trend_strength_{period}'] = trend_strength

    for lag in [1, 2, 3, 5, 10]:
        df[f'close_lag_{lag}'] = np.concatenate([np.full(lag, np.nan), close[:-lag]])
        df[f'returns_lag_{lag}'] = np.concatenate([np.full(lag, np.nan), df['returns'].values[:-lag]])
        df[f'volume_lag_{lag}'] = np.concatenate([np.full(lag, np.nan), volume[:-lag]])

    for window in [5, 10, 20]:
        rolling_mean = np.zeros(len(close))
        rolling_std = np.zeros(len(close))
        rolling_min = np.zeros(len(close))
        rolling_max = np.zeros(len(close))

        for i in range(window, len(close)):
            window_data = close[i - window:i]
            rolling_mean[i] = np.mean(window_data)
            rolling_std[i] = np.std(window_data)
            rolling_min[i] = np.min(window_data)
            rolling_max[i] = np.max(window_data)

        df[f'close_rolling_mean_{window}'] = rolling_mean
        df[f'close_rolling_std_{window}'] = rolling_std
        df[f'close_rolling_min_{window}'] = rolling_min
        df[f'close_rolling_max_{window}'] = rolling_max

    if 'time' in df.columns:
        timestamps = pd.to_datetime(df['time'], unit='s')
        df['hour'] = timestamps.dt.hour.values
        df['day_of_week'] = timestamps.dt.dayofweek.values
        df['is_weekend'] = (df['day_of_week'].values >= 5).astype(int)

    df = df.dropna()

    print(f"✅ Создано {len(df.columns)} фичей")
    return df

class StandardScaler:
    def __init__(self):
        self.mean = None
        self.std = None

    def fit(self, X):
        self.mean = np.mean(X, axis=0)
        self.std = np.std(X, axis=0) + 1e-8
        return self

    def transform(self, X):
        if self.mean is None or self.std is None:
            raise ValueError("Scaler не обучен! Вызови fit() сначала.")
        return (X - self.mean) / self.std

    def fit_transform(self, X):
        self.fit(X)
        return self.transform(X)

    def inverse_transform(self, X):
        return X * self.std + self.mean

def prepare_sequences(data, target_col_idx=0, lookback=60, forecast_horizon=1):
    X, y = [], []

    for i in range(lookback, len(data) - forecast_horizon + 1):
        X.append(data[i - lookback:i])
        y.append(data[i + forecast_horizon - 1, target_col_idx])

    X = np.array(X)
    y = np.array(y).reshape(-1, 1)

    print(f"📦 Sequences: X={X.shape}, y={y.shape}")
    return X, y
