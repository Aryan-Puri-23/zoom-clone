@echo off
echo ========================================================
echo   Starting Zoom Clone Video Conferencing Platform
echo ========================================================
echo.

start "Zoom Clone Backend (FastAPI)" cmd /k "cd /d %~dp0\backend && ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

start "Zoom Clone Frontend (Next.js)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:3000
echo Backend API & Swagger: http://localhost:8000/docs
echo.
