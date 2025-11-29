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

REM Try using stripe from PATH first
where stripe >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo Using stripe from PATH...
    stripe listen --forward-to "localhost:3000/api/payment?action=webhook"
) else (
    echo Using stripe from local installation...
    "%LOCALAPPDATA%\stripe-cli\stripe.exe" listen --forward-to "localhost:3000/api/payment?action=webhook"
)

pause

