# MarcetAnalizator



## Стек:
Wails: GO + REACTJS + ML Python

Фронт делаем на React внутри Wails, графики — Lightweight Charts; данные тянем по WebSocket с Binance; ML обучаем в Python (PyTorch/или sklearn), экспортируем в ONNX и считаем в Go через ONNX Runtime с объяснимостью через SHAP

## Техстек и библиотеки

- Десктоп: Wails v2 (Go + React шаблон, WebView2 на Windows), что позволяет собрать нативный бинарник с веб‑UI.​
    
- Графики: TradingView Lightweight Charts для свечей/объёма/панелей и инструментов рисования.​
    
- Индикаторы: technicalindicators на фронте для быстрых оверлеев и сигналов без похода на бэкенд.​
    
- Альтернатива для расчётов индикаторов в пайплайне обучения: TA‑Lib (150+ индикаторов) в Python.​
    
- Данные: Binance WebSocket Streams для klines/других потоков, с соблюдением формата payload и правил реконнекта.​
    
- ML‑обучение: PyTorch 2.x с экспортом в ONNX как стандартный путь для DL‑моделей.[](https://docs.pytorch.org/docs/stable/onnx.html)​
    
- Классические модели: sklearn → ONNX через skl2onnx для единообразного продакшн‑формата.​
    
- Инференс: onnxruntime_go для запуска моделей в Go с поддержкой CPU/GPU провайдеров
