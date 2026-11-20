@echo off
REM SmartERP AI Backend Starter Script

echo.
echo ====================================
echo   SmartERP AI Backend Starter
echo ====================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call .\venv\Scripts\Activate.ps1

REM Check if requirements are installed
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
) else (
    echo Dependencies already installed.
)

REM Start the backend
echo.
echo Starting SmartERP AI Backend...
echo.
echo 🌐 Server: http://localhost:8000
echo 📚 Docs: http://localhost:8000/docs
echo 🔍 ReDoc: http://localhost:8000/redoc
echo.
python main.py

pause
