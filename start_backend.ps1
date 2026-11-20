# SmartERP AI Backend Starter Script (PowerShell)

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   SmartERP AI Backend Starter" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Check if requirements are installed
$output = pip show fastapi 2>$null
if (-not $output) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Green
}

# Start the backend
Write-Host ""
Write-Host "Starting SmartERP AI Backend..." -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Server: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🔍 ReDoc: http://localhost:8000/redoc" -ForegroundColor Green
Write-Host ""

python main.py
