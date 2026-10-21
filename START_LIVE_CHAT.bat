@echo off
title NLPChat - Live Public Link Server
cd /d "%~dp0"
echo ===============================================================
echo            Starting NLPChat Live Public Server...
echo ===============================================================
echo.
call npm run live
pause
