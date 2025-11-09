@echo off
echo ========================================
echo Starting Price Forecast API Server
echo ========================================
echo.

cd /d "%~dp0"

REM ===== EDIT THIS PATH TO YOUR myenv1 ENVIRONMENT =====
REM Find your environment path by running: conda env list
REM Example paths:
REM   C:\Users\kvpra\Anaconda3\envs\myenv1
REM   C:\Users\kvpra\Miniconda3\envs\myenv1
REM   D:\Anaconda\envs\myenv1
set ENV_PATH=C:\Users\kvpra\OneDrive\Desktop\sample_project_1\myenv1

echo Using Python from: %ENV_PATH%
echo.

echo Starting FastAPI server...
echo Server will be available at: http://localhost:5000
echo API Documentation at: http://localhost:5000/docs
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

"%ENV_PATH%\python.exe" run_api_server.py

pause
