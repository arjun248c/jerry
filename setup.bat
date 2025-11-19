@echo off
echo ========================================
echo  Workflow Automation Platform Setup
echo ========================================
echo.

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

cd ..
echo.
echo Building TypeScript...
call npx tsc
if %errorlevel% neq 0 (
    echo Failed to build TypeScript
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup completed successfully!
echo ========================================
echo.
echo To start the application:
echo   npm run dev
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
pause