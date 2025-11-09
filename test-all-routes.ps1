# Complete Route Connection Test Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TESTING ALL ROUTES" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:3006"
$passed = 0
$failed = 0
$errors = @()

function Test-Route {
    param($method, $path, $description)
    try {
        Write-Host "Testing: $description" -NoNewline
        if ($method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$baseUrl$path" -Method Get -TimeoutSec 5 -ErrorAction Stop
        }
        Write-Host " ✓" -ForegroundColor Green
        $script:passed++
        return $true
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        $script:failed++
        $script:errors += "$description - $($_.Exception.Message)"
        return $false
    }
}

Write-Host "BACKEND ROUTES:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

# Health & Debug Routes
Test-Route "GET" "/api/health" "Health Check"
Test-Route "GET" "/api/ai/test" "AI Test Endpoint"
Test-Route "GET" "/api/debug/env" "Debug Environment"

# Google Sheets Routes
Test-Route "GET" "/api/google/sheets/test" "Google Sheets Test"
Test-Route "GET" "/api/google/sheets/setup" "Google Sheets Setup Instructions"
Test-Route "GET" "/api/google/sheets/registrations" "Google Sheets Registrations"

# Auth Routes
Test-Route "GET" "/api/auth/teacher/requests" "Get Teacher Requests"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESULTS:" -ForegroundColor Yellow
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

if ($errors.Count -gt 0) {
    Write-Host "`nErrors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "✓ ALL ROUTES WORKING!" -ForegroundColor Green -BackgroundColor Black
} else {
    Write-Host "⚠ SOME ROUTES FAILED" -ForegroundColor Red -BackgroundColor Black
}
