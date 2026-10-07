# Start Zoom Clone Backend & Frontend
$root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Zoom Clone Fullstack Video Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nServers launched in background windows!" -ForegroundColor Green
Write-Host "Frontend Application : http://localhost:3000" -ForegroundColor White
Write-Host "Backend API & Docs   : http://localhost:8000/docs`n" -ForegroundColor White
