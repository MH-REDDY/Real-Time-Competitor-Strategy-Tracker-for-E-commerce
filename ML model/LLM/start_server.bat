@echo off
echo Starting LLM Chatbot Server...
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    echo.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies if needed
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and add your GROQ_API_KEY
    echo.
    pause
    exit /b 1
)

REM Start the server
echo Starting chatbot API server on port 5001...
echo.
python chatbot_api.py
