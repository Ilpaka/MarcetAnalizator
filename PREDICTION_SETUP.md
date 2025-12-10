# Настройка модуля предсказания цен

## Обзор

Модуль предсказания цен использует кастомную LSTM реализацию с нуля (без PyTorch/Keras высокоуровневых API) для прогнозирования цен криптовалют.

## Архитектура

- **Frontend**: React страница "Тестирование предсказаний" (`PredictionTesting.tsx`)
- **Go Backend**: Методы `TrainModel`, `GetModelMetadata`, `PredictPrice` в `app.go`
- **Python ML Service**: Объединенный сервис (`main.py`) с поддержкой:
  - HTTP API на порту 5000 (для обучения моделей)
  - gRPC API на порту 50051 (для предсказаний и анализа)
- **LSTM Model**: Кастомная реализация в `ml_service/models/lstm_scratch.py`

## Установка

### 1. Установите зависимости Python

```bash
cd ml_service
pip install -r requirements.txt
```

### 2. Запустите ML Service

```bash
cd ml_service
python main.py
```

Сервис запустит оба API:
- HTTP API будет доступен на `http://localhost:5000`
- gRPC API будет доступен на `localhost:50051`

### 3. Запустите основное приложение

```bash
wails dev
```

## Использование

1. Откройте страницу "Тестирование предсказаний" в приложении
2. Выберите символ (например, BTCUSDT) и таймфрейм
3. Нажмите "Обучить модель" - обучение запустится в фоновом режиме
4. После завершения обучения нажмите "Предсказать цену"
5. Просмотрите результаты: предсказанная цена, уверенность, метрики модели

## API Endpoints

### Python ML Service

#### HTTP API (порт 5000)

- `POST /train` - Запустить обучение модели
- `GET /model_metadata/<symbol>/<timeframe>` - Получить метаданные модели
- `POST /predict` - Предсказать цену
- `GET /training_status/<symbol>/<timeframe>` - Статус обучения
- `GET /health` - Проверка здоровья сервиса

#### gRPC API (порт 50051)

- `TrainModel` - Обучение модели (streaming)
- `GetModelMetadata` - Получить метаданные модели
- `PredictPrice` - Предсказать цену
- `Predict` - Предсказание направления (ensemble)
- `PredictMultiTimeframe` - Предсказания для нескольких таймфреймов
- `AnalyzeSentiment` - Анализ тональности текста
- `AnalyzeTrumpTweet` - Анализ твитов Трампа
- `HealthCheck` - Проверка здоровья сервиса

### Go Backend (Wails)

- `TrainModel(symbol, timeframe, lookback, hiddenSize, numLayers, epochs, batchSize, learningRate, valSplit)` - Обучение
- `GetModelMetadata(symbol, timeframe)` - Метаданные модели
- `PredictPrice(symbol, timeframe)` - Предсказание цены

## Структура LSTM

LSTM реализована с нуля в `ml_service/models/lstm_scratch.py`:

- **LSTMCell**: Базовая ячейка LSTM с forget, input, output gates
- **LSTM**: Многослойная сеть LSTM
- **BPTT**: Backpropagation Through Time для обучения
- **Adam Optimizer**: Оптимизатор для обновления весов

## Сохранение моделей

Обученные модели сохраняются в `ml_service/trained_models/` с метаданными:
- Веса модели (`lstm_model.pkl`)
- Метаданные (`metadata.pkl`): метрики, scalers, параметры

## Метрики модели

- **MAE** (Mean Absolute Error): Средняя абсолютная ошибка в долларах
- **RMSE** (Root Mean Squared Error): Корень из средней квадратичной ошибки
- **MAPE** (Mean Absolute Percentage Error): Средняя абсолютная процентная ошибка
- **Direction Accuracy**: Точность предсказания направления движения цены

