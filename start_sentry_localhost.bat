@echo off
setlocal EnableExtensions

REM SENTRY v2 — Localhost Launcher
REM Starts backend on :8082 and frontend on :3000 in separate windows.

cd /d "%~dp0"

echo.
echo  ==========================================
echo   SENTRY Localhost Launcher

echo  ==========================================
echo  Frontend: http://localhost:3000
echo  Backend : http://localhost:8082
echo  Health  : http://localhost:8082/api/health
echo.

if not exist "package.json" (
  echo  [ERROR] Run this from the SENTRY_v2-main root.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] npm not found on PATH.
  exit /b 1
)

for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "FRONTEND_PID=%%P"
if not "%FRONTEND_PID%"=="" (
  echo  [INFO] Port 3000 is currently in use by PID %FRONTEND_PID%.
  echo  [INFO] Attempting to stop that process so Vite can bind to the expected port...
  powershell -NoProfile -Command "try { Stop-Process -Id %FRONTEND_PID% -Force -ErrorAction Stop; Write-Host '  [OK] Stopped PID %FRONTEND_PID%' } catch { Write-Host '  [WARN] Could not stop PID %FRONTEND_PID%. Continuing...' }"
)

start "SENTRY Backend" cmd /k "cd /d "%~dp0backend" && call start_backend.bat"
start "SENTRY Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo  [OK] Launch commands sent.

echo  Open http://localhost:3000 once both windows finish booting.

echo.
