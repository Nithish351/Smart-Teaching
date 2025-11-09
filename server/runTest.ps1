Write-Host "`n🔍 Checking if backend has restarted with new code..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if backend is running
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3006/api/health" -Method Get -TimeoutSec 3
    Write-Host "✅ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Please start it first with: npm start" -ForegroundColor Yellow
    exit
}

Write-Host "`n🧪 Running comprehensive test..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

cd "C:\Users\Nithish\OneDrive\Desktop\smart---teaching - Copy\lovable\teach-smart-now-main\teach-smart-now-main\server"
node testRejectComplete.js
