@echo off
setlocal
cd /d "%~dp0.."
echo Building Sunny with RU/EN locales and creating a compressed .7z archive...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\build-archive.ps1"
set "buildResult=%ERRORLEVEL%"
if not "%buildResult%"=="0" echo Build failed. See the error above.
pause
exit /b %buildResult%
