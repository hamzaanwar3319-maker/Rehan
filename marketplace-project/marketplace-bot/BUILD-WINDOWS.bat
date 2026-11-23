@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required for the one-time Windows build.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
cd desktop
call npm install
if errorlevel 1 goto fail
call npm run build:win
if errorlevel 1 goto fail
echo.
echo Build complete. Installer is in desktop\release.
pause
exit /b 0
:fail
echo Build failed. Check the messages above.
pause
exit /b 1
