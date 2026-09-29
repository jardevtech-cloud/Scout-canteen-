@echo off
title SCOUTS CANTEEN POS - Launcher
color 1F

echo ==============================================================
echo                 UGANDA SCOUTS ASSOCIATION
echo                    SCOUTS CANTEEN POS
echo ==============================================================
echo.
echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org (version 18 or higher)
    echo and run this file again.
    pause
    exit /b 1
)

echo Node.js is ready.
echo.

if not exist "node_modules" (
    echo First-time setup detected. Installing required dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed!
        pause
        exit /b 1
    )
)

echo Starting Scouts Canteen POS System...
echo Default Admin:   admin / scouts2026
echo Default Cashier: cashier / scouts123
echo Currency:        UGX (Uganda Shillings)
echo.
echo Opening browser at http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start http://localhost:3000

call npm run dev
pause
