@echo off
REM SENTRY v2 — Start Backend API Server
REM Runs FastAPI on port 8082. Keep this window open while using the app.

echo.
echo  🛡️  SENTRY API Backend
echo  ========================
echo  Starting FastAPI on http://localhost:8082
echo  Frontend should be at   http://localhost:3000
echo.
echo  Press Ctrl+C to stop the server.
echo.

cd /d "%~dp0"
.venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8082 --reload
