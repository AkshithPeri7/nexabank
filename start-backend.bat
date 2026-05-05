@echo off
echo =========================================
echo Starting NexBank Backend API Server
echo =========================================
cd Backend
echo Installing dependencies...
call npm install
echo   Starting server...
call npm start
pause       