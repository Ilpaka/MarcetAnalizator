@echo off
REM Запуск Crypto Trading Bot приложения
REM Start Crypto Trading Bot application

set APP_PATH=build\bin\crypto-trading-bot.exe

if exist "%APP_PATH%" (
    echo Запуск Crypto Trading Bot...
    echo Starting Crypto Trading Bot...
    echo.
    start "" "%APP_PATH%"
) else (
    echo Ошибка: Приложение не найдено!
    echo Error: Application not found at: %APP_PATH%
    echo.
    echo Сначала соберите приложение:
    echo First build the application:
    echo   wails build
    echo.
    pause
    exit /b 1
)


