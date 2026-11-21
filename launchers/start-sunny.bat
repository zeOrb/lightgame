@echo off
setlocal
cd /d "%~dp0.."

if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Run npm install in this folder first.
  pause
  exit /b 1
)

echo Starting Sunny dev server on http://127.0.0.1:5173 ...
start "Sunny dev server" cmd /k "cd /d ""%~dp0.."" && npm.cmd run dev -- --configLoader runner --host 127.0.0.1 --port 5173 --strictPort"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(20); do { try { $client=New-Object Net.Sockets.TcpClient; $client.Connect('127.0.0.1',5173); $client.Close(); exit 0 } catch { Start-Sleep -Milliseconds 250 } } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo Server did not become ready. Check the Sunny dev server window for errors.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173"
