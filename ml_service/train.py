import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import pickle
import os
import sys
from datetime import datetime
import requests

print("🔧 Импорты загружены...")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("📦 Импортирую модули...")

from models.lstm_scratch import LSTM
from preprocessing.features import (
    create_features,
    StandardScaler,
    prepare_sequences
)

def download_binance_data(symbol='BTCUSDT', interval='1h', limit=1000):
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"

    print(f"📡 Загружаю данные {symbol} ({interval})...")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Ошибка API: {response.text}")

    klines = response.json()

    df = pd.DataFrame(klines, columns=[
        'time', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])

    df['time'] = (df['time'] / 1000).astype(int)
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)

    df = df[['time', 'open', 'high', 'low', 'close', 'volume']]

    print(f"✅ Загружено {len(df)} свечей")
    return df

def train_model(symbol='BTCUSDT',
                interval='1h',
                lookback=30,
                hidden_size=32,
                num_layers=1,
                epochs=20,
                batch_size=16,
                learning_rate=0.001,
                val_split=0.2,
                progress_callback=None):
    print("\n" + "=" * 70)
    print("🚀 НАЧИНАЮ ОБУЧЕНИЕ LSTM МОДЕЛИ")
    print("=" * 70)

    df = download_binance_data(symbol, interval, limit=1000)

    print("\n📊 Feature Engineering...")
    df_features = create_features(df)

    feature_cols = [col for col in df_features.columns
                   if col not in ['time', 'close'] and 'lag' not in col]

    print(f"📌 Используется {len(feature_cols)} фичей")

    print("\n🔧 Подготовка данных...")

    scaler = StandardScaler()
    X_data = scaler.fit_transform(df_features[feature_cols].values)

    close_scaler = StandardScaler()
    close_values = df_features['close'].values.reshape(-1, 1)
    close_scaler.fit(close_values)

    close_normalized = close_scaler.transform(close_values).flatten()
    X_data = np.column_stack([close_normalized, X_data])

    X, y = prepare_sequences(X_data, target_col_idx=0,
                            lookback=lookback, forecast_horizon=1)

    split_idx = int(len(X) * (1 - val_split))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    print(f"📦 Train: {X_train.shape}, Val: {X_val.shape}")

    print("\n🧠 Создание LSTM модели...")
    input_size = X_train.shape[2]
    output_size = 1

    model = LSTM(
        input_size=input_size,
        hidden_size=hidden_size,
        output_size=output_size,
        num_layers=num_layers,
        learning_rate=learning_rate
    )

    print("\n🏋️ Начинаю обучение...")
    print(f"Epochs: {epochs}, Batch size: {batch_size}")
    print("-" * 70)

    train_losses = []
    val_losses = []
    best_val_loss = float('inf')
    patience_counter = 0
    patience = 5

    for epoch in range(epochs):
        epoch_losses = []

        n_batches = len(X_train) // batch_size

        for batch_idx in range(n_batches):
            start_idx = batch_idx * batch_size
            end_idx = start_idx + batch_size

            X_batch = X_train[start_idx:end_idx]
            y_batch = y_train[start_idx:end_idx]

            loss, _ = model.train_step(X_batch, y_batch)
            epoch_losses.append(loss)

        avg_train_loss = np.mean(epoch_losses)
        train_losses.append(avg_train_loss)

        y_val_pred = model.predict(X_val)
        val_loss = np.mean((y_val - y_val_pred) ** 2)
        val_losses.append(val_loss)

        print(f"Epoch {epoch + 1}/{epochs} | "
              f"Train Loss: {avg_train_loss:.6f} | "
              f"Val Loss: {val_loss:.6f}")

        # Call progress callback if provided
        if progress_callback:
            try:
                progress_callback({
                    'epoch': epoch + 1,
                    'train_loss': float(avg_train_loss),
                    'val_loss': float(val_loss),
                    'completed': False
                })
            except Exception as e:
                print(f"Warning: Progress callback failed: {e}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            print(f"  ✅ Новая лучшая модель!")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\n⚠️ Early stopping на epoch {epoch + 1}")
                if progress_callback:
                    try:
                        progress_callback({
                            'epoch': epoch + 1,
                            'train_loss': float(avg_train_loss),
                            'val_loss': float(val_loss),
                            'completed': True,
                            'message': f'Early stopping at epoch {epoch + 1}'
                        })
                    except:
                        pass
                break

    print("\n" + "=" * 70)
    print("✅ ОБУЧЕНИЕ ЗАВЕРШЕНО!")
    print("=" * 70)
    
    # Final progress callback
    if progress_callback:
        try:
            progress_callback({
                'epoch': epochs,
                'train_loss': float(train_losses[-1]) if train_losses else 0.0,
                'val_loss': float(val_losses[-1]) if val_losses else 0.0,
                'completed': True,
                'message': 'Training completed successfully'
            })
        except:
            pass

    print("\n📈 Оценка модели на валидационном сете...")

    y_val_pred = model.predict(X_val)

    y_val_real = close_scaler.inverse_transform(y_val)
    y_val_pred_real = close_scaler.inverse_transform(y_val_pred.reshape(-1, 1))

    mae = np.mean(np.abs(y_val_real - y_val_pred_real))
    rmse = np.sqrt(np.mean((y_val_real - y_val_pred_real) ** 2))
    mape = np.mean(np.abs((y_val_real - y_val_pred_real) / (y_val_real + 1e-8))) * 100

    print(f"MAE:  ${mae:.2f}")
    print(f"RMSE: ${rmse:.2f}")
    print(f"MAPE: {mape:.2f}%")

    y_val_direction = np.sign(np.diff(y_val_real.flatten()))
    y_pred_direction = np.sign(np.diff(y_val_pred_real.flatten()))
    direction_accuracy = np.mean(y_val_direction == y_pred_direction) * 100

    print(f"Direction Accuracy: {direction_accuracy:.2f}%")

    print("\n💾 Сохранение модели...")

    os.makedirs('models', exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_dir = f'models/{symbol}_{interval}_{timestamp}'
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, 'lstm_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

    import time
    metadata = {
        'scaler': scaler,
        'close_scaler': close_scaler,
        'feature_cols': feature_cols,
        'lookback': lookback,
        'input_size': input_size,
        'hidden_size': hidden_size,
        'num_layers': num_layers,
        'symbol': symbol,
        'interval': interval,
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),
        'direction_accuracy': float(direction_accuracy),
        'train_losses': train_losses,
        'val_losses': val_losses,
        'trained_at': int(time.time() * 1000),
        'model_path': model_dir,
    }

    metadata_path = os.path.join(model_dir, 'metadata.pkl')
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)

    print(f"✅ Модель сохранена: {model_dir}")

    return model, metadata

if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("🎯 CRYPTO ML TRAINER - LSTM from Scratch")
    print("=" * 70)

    model, metadata = train_model(
        symbol='BTCUSDT',
        interval='1m',
        lookback=60,
        hidden_size=64,
        num_layers=2,
        epochs=30,
        batch_size=32,
        learning_rate=0.001,
        val_split=0.2
    )

    print("\n" + "=" * 70)
    print("🎉 ВСЁ ГОТОВО! перезапуск ML сервиса:")
    print("   cd ml-service")
    print("   python -m app.main")
    print("=" * 70)
