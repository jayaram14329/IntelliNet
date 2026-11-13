@echo off
title IntelliNet Terminator - Kill All Sessions
color 0C

echo ======================================================================
echo    INTELLINET: TERMINATING ALL ACTIVE SESSIONS
echo ======================================================================
echo.

echo [*] Checking and terminating Backend processes on port 8000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r /c:":8000.*LISTENING"') do (
    echo     Terminating Backend process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [*] Checking and terminating Frontend processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r /c:":5173.*LISTENING"') do (
    echo     Terminating Frontend process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [*] Closing dedicated IntelliNet console windows...
taskkill /F /FI "WINDOWTITLE eq IntelliNet Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq IntelliNet Frontend*" >nul 2>&1

echo.
echo ======================================================================
echo    [SUCCESS] ALL INTELLINET SESSIONS AND PROCESSES TERMINATED!
echo ======================================================================
echo.
echo Ports 8000 and 5173 are now completely released and free.
echo You can relaunch the application anytime by double-clicking "run_intellinet.bat".
echo.
echo This window will close automatically in 3 seconds...
timeout /t 3 >nul
