@echo off
title IntelliNet Launcher - Intelligent Network Monitoring System
color 0B

echo ======================================================================
echo    INTELLINET: INTELLIGENT NETWORK MONITORING SYSTEM
echo    Intrusion Detection (CIC-IDS2017) & Congestion Forecasting
echo ======================================================================
echo.

:: Navigate to project root directory
cd /d "%~dp0"

echo [*] Initializing IntelliNet Full-Stack Services...
echo.

:: 1. Launch FastAPI Backend
echo [1/3] Starting Backend API Server (Port 8000)...
start "IntelliNet Backend (FastAPI :8000)" cmd /k "cd /d "%~dp0backend" && echo [IntelliNet Backend] Starting Uvicorn Server... && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: Wait 3 seconds for backend models and database to initialize
timeout /t 3 /nobreak >nul

:: 2. Launch React Frontend
echo [2/3] Starting Frontend Dev Server (Port 5173)...
start "IntelliNet Frontend (Vite :5173)" cmd /k "cd /d "%~dp0frontend" && echo [IntelliNet Frontend] Starting Vite Server... && npm run dev"

:: Wait 2 seconds for Vite to bind
timeout /t 2 /nobreak >nul

:: 3. Launch Web Browser
echo [3/3] Opening Dashboard in Web Browser...
start http://localhost:5173

echo.
echo ======================================================================
echo    INTELLINET SYSTEM RUNNING SUCCESSFULLY!
echo ======================================================================
echo    Web Dashboard:   http://localhost:5173
echo    Backend API:     http://127.0.0.1:8000
echo    API Docs:        http://127.0.0.1:8000/docs
echo.
echo    DEFAULT LOGIN CREDENTIALS:
echo    ---------------------------------------------
echo    Admin Account:   admin   / Admin@123456
echo    Analyst Account: analyst / Analyst@123456
echo ======================================================================
echo.
echo NOTE: To stop all servers, simply run "stop_intellinet.bat"
echo Keep this window open or press any key to close this launcher.
echo (The backend and frontend services will continue running in their own windows).
pause >nul
