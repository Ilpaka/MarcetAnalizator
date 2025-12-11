@echo off
REM Сборка Crypto Trading Bot приложения
REM Build Crypto Trading Bot application

echo Сборка Crypto Trading Bot...
echo Building Crypto Trading Bot...
echo.

REM Проверка наличия wails
where wails >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Ошибка: Wails CLI не установлен!
    echo Error: Wails CLI is not installed!
    echo.
    echo Установите Wails:
    echo Install Wails:
    echo   go install github.com/wailsapp/wails/v2/cmd/wails@latest
    echo.
    pause
    exit /b 1
)

REM Сборка приложения
echo Запуск wails build...
wails build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Сборка завершена успешно!
    echo Build completed successfully!
    echo ========================================
    echo.
    echo Приложение находится здесь:
    echo Application is located at:
    echo   build\bin\crypto-trading-bot.exe
    echo.
    echo Для запуска используйте:
    echo To run use:
    echo   start.bat
    echo   или / or
    echo   build\bin\crypto-trading-bot.exe
    echo.
) else (
    echo.
    echo ========================================
    echo Ошибка сборки!
    echo Build failed!
    echo ========================================
    echo.
    pause
    exit /b 1
)

pause


