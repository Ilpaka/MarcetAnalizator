from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime

from app.preprocessing.features import create_features

app = FastAPI(title="Crypto ML Predictor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],

    allow_headers=["*"],
)

LOADED_MODEL = None
LOADED_METADATA = None

class CandleData(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class PredictionRequest(BaseModel):
    candles: List[CandleData]
    symbol: str = "BTC"

class PredictionResponse(BaseModel):
    predicted_price: float
    current_price: float
    change_percent: float
    direction: str
    confidence: float
    timestamp: int

class ModelInfo(BaseModel):
    loaded: bool
    symbol: Optional[str] = None
    interval: Optional[str] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    mape: Optional[float] = None
    direction_accuracy: Optional[float] = None
    lookback: Optional[int] = None

def load_model(model_dir: str):
    global LOADED_MODEL, LOADED_METADATA

    model_path = os.path.join(model_dir, 'lstm_model.pkl')
    metadata_path = os.path.join(model_dir, 'metadata.pkl')

    if not os.path.exists(model_path) or not os.path.exists(metadata_path):
        raise FileNotFoundError(f"Модель не найдена в {model_dir}")

    with open(model_path, 'rb') as f:
        LOADED_MODEL = pickle.load(f)

    with open(metadata_path, 'rb') as f:
        LOADED_METADATA = pickle.load(f)

    print(f"✅ Модель загружена: {model_dir}")
    print(f"   MAE: ${LOADED_METADATA['mae']:.2f}")
    print(f"   Direction Accuracy: {LOADED_METADATA['direction_accuracy']:.2f}%")

@app.on_event("startup")
async def startup_event():
    models_dir = 'models'
    if os.path.exists(models_dir):
        model_dirs = [d for d in os.listdir(models_dir)
                     if os.path.isdir(os.path.join(models_dir, d))]

        if model_dirs:
            latest_model = sorted(model_dirs)[-1]
            model_path = os.path.join(models_dir, latest_model)

            try:
                load_model(model_path)
                print(f"🚀 ML Service запущен! Модель: {latest_model}")
            except Exception as e:
                print(f"⚠️ Ошибка загрузки модели: {e}")
                print("⚠️ ML Service запущен без модели. Обучите модель сначала!")
        else:
            print("⚠️ Нет обученных моделей. Запустите train.py")

@app.get("/")
async def root():
    return {
        "service": "Crypto ML Predictor",
        "status": "running",
        "model_loaded": LOADED_MODEL is not None
    }

@app.get("/model/info", response_model=ModelInfo)
async def get_model_info():
    if LOADED_MODEL is None or LOADED_METADATA is None:
        return ModelInfo(loaded=False)

    return ModelInfo(
        loaded=True,
        symbol=LOADED_METADATA.get('symbol'),
        interval=LOADED_METADATA.get('interval'),
        mae=LOADED_METADATA.get('mae'),
        rmse=LOADED_METADATA.get('rmse'),
        mape=LOADED_METADATA.get('mape'),
        direction_accuracy=LOADED_METADATA.get('direction_accuracy'),
        lookback=LOADED_METADATA.get('lookback')
    )

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if LOADED_MODEL is None or LOADED_METADATA is None:
        raise HTTPException(
            status_code=503,
            detail="Модель не загружена. Обучите модель сначала."
        )

    try:
        candles_data = [c.dict() for c in request.candles]
        df = pd.DataFrame(candles_data)

        lookback = LOADED_METADATA['lookback']
        if len(df) < lookback + 50:
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно данных. Нужно минимум {lookback + 50} свечей, получено {len(df)}"
            )

        df_features = create_features(df)

        if len(df_features) < lookback:
            raise HTTPException(
                status_code=400,
                detail=f"После feature engineering недостаточно данных: {len(df_features)} < {lookback}"
            )

        feature_cols = LOADED_METADATA['feature_cols']
        X_data = LOADED_METADATA['scaler'].transform(df_features[feature_cols].values)

        close_values = df_features['close'].values.reshape(-1, 1)
        close_normalized = LOADED_METADATA['close_scaler'].transform(close_values).flatten()
        X_data = np.column_stack([close_normalized, X_data])

        X_input = X_data[-lookback:].reshape(1, lookback, -1)

        y_pred_normalized = LOADED_MODEL.predict(X_input)
        y_pred = LOADED_METADATA['close_scaler'].inverse_transform(
            y_pred_normalized.reshape(-1, 1)
        )[0][0]

        current_price = df['close'].iloc[-1]

        change = y_pred - current_price
        change_percent = (change / current_price) * 100

        direction = "UP" if change_percent > 0 else "DOWN"

        confidence = min(abs(change_percent) * 10, 95)

        return PredictionResponse(
            predicted_price=float(y_pred),
            current_price=float(current_price),
            change_percent=float(change_percent),
            direction=direction,
            confidence=float(confidence),
            timestamp=int(datetime.now().timestamp())
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка предсказания: {str(e)}"
        )

@app.post("/model/reload")
async def reload_model(model_dir: str):
    try:
        load_model(model_dir)
        return {"status": "success", "message": f"Модель перезагружена: {model_dir}"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка перезагрузки: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
