@echo off
setlocal

cd /d "%~dp0"

echo PangoChain Windows setup
echo This window will install/check dependencies, then tell you the next command.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Setup finished with errors. Read the messages above.
) else (
  echo Setup finished.
)
echo.
pause
exit /b %EXIT_CODE%
