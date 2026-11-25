@echo off
setlocal
cd /d "%~dp0.."
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install it or use the same environment as the game.
  pause
  exit /b 1
)
powershell -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:5174/api/cards' -TimeoutSec 2; if ($r.version -eq 1) { exit 0 } } catch {}; exit 1"
if not errorlevel 1 goto open
start "Sunny feedback" /min cmd /c "cd /d ""%~dp0.."" && node scripts/feedback-server.mjs & pause"
powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(15); do { try { $r=Invoke-RestMethod 'http://127.0.0.1:5174/api/cards' -TimeoutSec 1; if ($r.version -eq 1) { exit 0 } } catch {}; Start-Sleep -Milliseconds 250 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo Could not start feedback board. Check the Sunny feedback window.
  pause
  exit /b 1
)
:open
start "" "http://127.0.0.1:5174/"
