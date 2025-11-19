@echo off
echo ========================================
echo  Testing Workflow Platform Setup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js: OK

echo.
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)
echo npm: OK

echo.
echo Checking TypeScript compilation...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ERROR: TypeScript compilation failed
    echo Please check for syntax errors
    pause
    exit /b 1
)
echo TypeScript: OK

echo.
echo Checking backend dependencies...
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

echo.
echo Checking frontend dependencies...
cd client
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
cd ..

echo.
echo ========================================
echo  All checks passed!
echo ========================================
echo.
echo The workflow platform is ready to run.
echo Use 'start.bat' to launch the application.
echo.
pause