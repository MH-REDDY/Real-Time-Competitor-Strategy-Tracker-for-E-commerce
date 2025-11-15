@echo off
echo ========================================
echo LLM Backend Setup
echo ========================================
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    echo.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo.
)

REM Check if Groq API key is set
findstr /C:"YOUR_GROQ_API_KEY_HERE" .env >nul
if %errorlevel%==0 (
    echo ========================================
    echo IMPORTANT: Groq API Key Setup Required
    echo ========================================
    echo.
    echo 1. Visit: https://console.groq.com
    echo 2. Sign up/Login (FREE)
    echo 3. Go to API Keys section
    echo 4. Create new API key
    echo 5. Copy the key
    echo 6. Open .env file and replace YOUR_GROQ_API_KEY_HERE with your key
    echo.
    echo Press any key after you've added your API key...
    pause >nul
)

echo.
echo Running backend tests...
python test_backend.py

if %errorlevel%==0 (
    echo.
    echo ========================================
    echo SUCCESS! Backend is ready
    echo ========================================
    echo.
    echo Run: start_server.bat to start the API
) else (
    echo.
    echo ========================================
    echo Setup incomplete - please fix errors above
    echo ========================================
)

pause
