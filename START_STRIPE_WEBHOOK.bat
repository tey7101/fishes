@echo off
echo ========================================
echo Starting Stripe Webhook Listener
echo ========================================
echo.
echo This will forward Stripe webhook events to your local server
echo Keep this window open while testing
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

REM Read PORT from .env.local (default to 3000)
set PORT=3000
for /f "tokens=1,2 delims==" %%a in (.env.local) do (
    if "%%a"=="PORT" set PORT=%%b
)

echo Using port: %PORT%
echo.

REM Try using stripe from PATH first
where stripe >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo Using stripe from PATH...
    stripe listen --forward-to "localhost:%PORT%/api/payment?action=webhook"
) else (
    echo Using stripe from local installation...
    "%LOCALAPPDATA%\stripe-cli\stripe.exe" listen --forward-to "localhost:%PORT%/api/payment?action=webhook"
)

pause

