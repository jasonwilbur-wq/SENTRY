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

set "BOOTSTRAP_MODE=uv"
where uv >nul 2>nul
if errorlevel 1 (
  set "BOOTSTRAP_MODE=venv"
  echo  [WARN] uv not found on PATH. Falling back to built-in Python venv bootstrap.
)

if /I "%BOOTSTRAP_MODE%"=="uv" (
  if not exist ".venv\Scripts\python.exe" (
    echo  [SETUP] Creating project virtual environment with uv...
    uv venv .venv
    if errorlevel 1 (
      echo  [ERROR] Failed to create .venv with uv.
      exit /b 1
    )
  )

  echo  [SETUP] Syncing backend dependencies with uv...
  uv pip install --python .venv\Scripts\python.exe --index-url https://pypi.ci.artifacts.walmart.com/artifactory/api/pypi/external-pypi/simple --allow-insecure-host pypi.ci.artifacts.walmart.com -r requirements.txt
  if errorlevel 1 (
    echo  [ERROR] Dependency install failed.
    exit /b 1
  )
) else (
  where py >nul 2>nul
  if errorlevel 1 (
    where python >nul 2>nul
    if errorlevel 1 (
      echo  [ERROR] Neither uv, py, nor python was found on PATH.
      exit /b 1
    )
    set "PYTHON_BOOTSTRAP=python"
  ) else (
    set "PYTHON_BOOTSTRAP=py -3"
  )

  if not exist ".venv\Scripts\python.exe" (
    echo  [SETUP] Creating project virtual environment with %PYTHON_BOOTSTRAP%...
    call %PYTHON_BOOTSTRAP% -m venv .venv
    if errorlevel 1 (
      echo  [ERROR] Failed to create .venv with %PYTHON_BOOTSTRAP%.
      exit /b 1
    )
  )

  echo  [SETUP] Syncing backend dependencies with pip...
  .venv\Scripts\python.exe -m pip install --upgrade pip
  if errorlevel 1 (
    echo  [ERROR] Failed to upgrade pip.
    exit /b 1
  )
  .venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 (
    echo  [ERROR] Dependency install failed via pip.
    exit /b 1
  )
)

for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "PORT_PID=%%P"
if not "%PORT_PID%"=="" (
  echo  [INFO] Port %PORT% is currently in use by PID %PORT_PID%.
  echo  [INFO] Attempting to stop that process...
  powershell -NoProfile -Command "try { Stop-Process -Id %PORT_PID% -Force -ErrorAction Stop; Write-Host '  [OK] Stopped PID %PORT_PID%' } catch { Write-Host '  [WARN] Could not stop PID %PORT_PID%. Continuing...' }"
)

set "UVICORN_ARGS=--host 0.0.0.0 --port %PORT%"
if /I "%SENTRY_BACKEND_RELOAD%"=="1" (
  echo  [DEV] Auto-reload enabled via SENTRY_BACKEND_RELOAD=1
  set "UVICORN_ARGS=%UVICORN_ARGS% --reload"
) else (
  echo  [STABLE] Auto-reload disabled to prevent WatchFiles restart loops.
  echo  [STABLE] Set SENTRY_BACKEND_RELOAD=1 if you explicitly want live reload.
)

echo.
echo  Starting FastAPI on http://localhost:%PORT%
echo  Frontend should be at   http://localhost:3000
echo  Health endpoint:        http://localhost:%PORT%/api/health
echo  Press Ctrl+C to stop.
echo.

.venv\Scripts\python.exe -m uvicorn main:app %UVICORN_ARGS%
