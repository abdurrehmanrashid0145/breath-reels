@echo off
title Breath Reels setup
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org then run this again. & pause & exit /b 1)
node src\setup.js
pause
