@echo off
echo ===================================================
echo   NexaBank - Starting Cloud Tunnels...
echo ===================================================
echo.
echo 1. Cleaning up old connections...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"

echo 2. Starting Frontend Web Server (Port 3000)...
start "Frontend Server" cmd /k "npx -y serve Frontend -l 3000"

echo 3. Starting Frontend Tunnel (nexabankui99)...
start "Frontend Tunnel" cmd /k "npx -y localtunnel --port 3000 --subdomain nexabankui99"

echo 4. Starting Backend Tunnel (nexabankapi99)...
start "Backend Tunnel" cmd /k "npx -y localtunnel --port 5000 --subdomain nexabankapi99"

echo.
echo ===================================================
echo ALL TUNNELS STARTED IN SEPARATE WINDOWS
echo ===================================================
echo 👉 Frontend Link to share: https://nexabankui99.loca.lt
echo.
echo IMPORTANT: 
echo - Keep all the new black windows open.
echo - Ensure your backend (start-backend.bat) is ALSO running!
echo ===================================================
pause
