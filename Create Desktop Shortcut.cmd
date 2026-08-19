@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"
if errorlevel 1 (
  echo.
  echo The shortcut could not be created.
  pause
  exit /b 1
)
echo.
echo Production Line Simulator V1.1 shortcut created on the Desktop.
pause
