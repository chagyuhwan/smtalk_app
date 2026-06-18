# smtalk backend - Railway deploy script
# Usage:
#   1. railway login
#   2. .\deploy-railway.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Railway deploy ===" -ForegroundColor Cyan

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

railway whoami 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Railway login required. Run:" -ForegroundColor Red
    Write-Host "  railway login" -ForegroundColor White
    exit 1
}

$whoami = railway whoami 2>&1
Write-Host "Logged in: $whoami" -ForegroundColor Green

if (-not (Test-Path ".railway")) {
    Write-Host ""
    Write-Host "Creating Railway project..." -ForegroundColor Yellow
    railway init --name smtalk-backend
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Railway project creation failed." -ForegroundColor Red
        Write-Host "If you see 'trial has expired', open https://railway.app and select a plan first." -ForegroundColor Yellow
        Write-Host "Then run: railway init --name smtalk-backend" -ForegroundColor White
        exit 1
    }
}

railway status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "No linked Railway project. Run:" -ForegroundColor Red
    Write-Host "  railway link" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Deploying..." -ForegroundColor Yellow
railway up --detach

Write-Host ""
Write-Host "Setting up public domain..." -ForegroundColor Yellow
railway domain 2>$null

Write-Host ""
railway status

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add variables from env.railway.example in Railway dashboard" -ForegroundColor White
Write-Host "2. Set BACKEND_BASE_URL to your Railway HTTPS URL" -ForegroundColor White
Write-Host "3. Register Railway server IP in NICE admin portal" -ForegroundColor White
Write-Host "4. Update eas.json EXPO_PUBLIC_NICE_BACKEND_URL and rebuild app" -ForegroundColor White
Write-Host ""
Write-Host "Health check:" -ForegroundColor Gray
Write-Host "  curl https://YOUR-RAILWAY-URL/health" -ForegroundColor Gray
Write-Host "NICE token test:" -ForegroundColor Gray
Write-Host "  curl -X POST https://YOUR-RAILWAY-URL/api/nice/token" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
