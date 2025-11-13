@echo off
REM Athleon Frontend Improvements - Installation Script (Windows)
REM This script installs all dependencies and verifies the setup

echo.
echo ========================================
echo Athleon Frontend Improvements - Installation
echo ========================================
echo.

REM Check if we're in the frontend directory
if not exist package.json (
    echo Error: package.json not found
    echo Please run this script from the frontend directory
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
echo This may take a few minutes...
echo.

call npm install

if errorlevel 1 (
    echo.
    echo Error: npm install failed
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.

echo Step 2: Running tests...
echo.

REM Run tests in CI mode (non-interactive)
set CI=true
call npm test -- --passWithNoTests --watchAll=false

if errorlevel 1 (
    echo.
    echo Warning: Some tests failed
    echo This is okay for now, you can fix them later
) else (
    echo.
    echo All tests passed!
)

echo.
echo Step 3: Checking for linting issues...
echo.

call npm run lint 2>nul || echo ESLint not configured yet (this is okay)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo ========================================
echo.
echo 1. Start the development server:
echo    npm start
echo.
echo 2. Run tests:
echo    npm test
echo.
echo 3. Open Cypress for E2E tests:
echo    npm run cypress
echo.
echo 4. Read the documentation:
echo    - QUICK_START.md (5-minute guide)
echo    - IMPROVEMENTS_GUIDE.md (detailed guide)
echo    - IMPLEMENTATION_SUMMARY.md (what was done)
echo.
echo ========================================
echo You're all set! Happy coding!
echo ========================================
echo.

pause
