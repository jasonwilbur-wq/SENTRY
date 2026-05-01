@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM SENTRY v2 — Robust Backend Starter
REM - Ensures local .venv exists
REM - Installs backend deps via uv + Walmart index
REM - Starts FastAPI on configured port (default 8082)

set "PORT=%BACKEND_PORT%"
if "%PORT%"=="" set "PORT=8082"

cd /d "%~dp0"

echo.
echo  🛡️  SENTRY API Backend
echo  ========================
echo  Target URL: http://localhost:%PORT%
echo.

where uv >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] uv not found on PATH.
  echo  Install uv, then re-run this script.
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo  [SETUP] Creating project virtual environment...
  uv venv .venv
  if errorlevel 1 (
    echo  [ERROR] Failed to create .venv
    exit /b 1
  )
)

echo  [SETUP] Syncing backend dependencies...
uv pip install --python .venv\Scripts\python.exe --index-url https://pypi.ci.artifacts.walmart.com/artifactory/api/pypi/external-pypi/simple --allow-insecure-host pypi.ci.artifacts.walmart.com -r requirements.txt
if errorlevel 1 (
  echo  [ERROR] Dependency install failed.
  exit /b 1
)

for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "PORT_PID=%%P"
if not "%PORT_PID%"=="" (
  echo  [INFO] Port %PORT% is currently in use by PID %PORT_PID%.
  echo  [INFO] Attempting to stop that process...
  powershell -NoProfile -Command "try { Stop-Process -Id %PORT_PID% -Force -ErrorAction Stop; Write-Host '  [OK] Stopped PID %PORT_PID%' } catch { Write-Host '  [WARN] Could not stop PID %PORT_PID%. Continuing...' }"
)

echo.
echo  Starting FastAPI on http://localhost:%PORT%
echo  Frontend should be at   http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port %PORT% --reload
