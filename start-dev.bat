@echo off
echo ========================================
echo    TechBlog Development Startup
echo ========================================
echo.
echo This script will start the development environment
echo.
echo Prerequisites:
echo - Node.js 16+ installed
echo - PostgreSQL running
echo - Environment variables configured
echo.
echo Starting development servers...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PostgreSQL is running (basic check)
echo Checking PostgreSQL connection...
echo.

REM Install dependencies if needed
echo Installing dependencies...
call npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting development servers...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start the development environment
call npm run dev

pause
