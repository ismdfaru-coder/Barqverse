@echo off
cd /d "%~dp0"
echo Installing Playwright Chromium (first time only)...
call npm run playwright:install
echo.
echo Starting backend (port 5000) and frontend (port 3000)...
start "use.ai backend" cmd /k "node backend-server.js"
timeout /t 3 /nobreak >nul
start "use.ai frontend" cmd /k "node frontend-server.js"
echo.
echo Dashboard: http://localhost:3000/
echo Chat UI:   http://localhost:3000/app
echo Debug:     http://localhost:5000/debug
pause
