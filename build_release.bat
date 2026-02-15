@echo off
echo [BUILD] Starting production build process...

echo [1/4] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/4] Building Frontend for Production...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%
cd ..

echo [3/4] Creating Release Package...
if exist release rmdir /s /q release
mkdir release
mkdir release\public

echo [COPY] Copying Backend Files...
copy backend\package.json release\
copy backend\server.js release\
copy backend\database.js release\

echo [COPY] Copying Frontend Build Artifacts...
xcopy frontend\dist release\public /E /I /Y

echo [4/4] Creating Server Scripts...

(
echo @echo off
echo [INSTALL] Installing Server Dependencies...
echo This may take a few minutes. Please wait...
echo.
echo npm install --production
echo call npm install --production
echo.
echo [DONE] Installation Complete!
echo You can now run 'start_server.bat'
echo.
echo pause
) > release\install_server.bat

(
echo @echo off
echo [START] Starting Inventory Server...
echo.
echo Server is running at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo.
echo node server.js
echo call node server.js
echo.
echo pause
) > release\start_server.bat

echo.
echo ========================================================
echo   BUILD SUCCESSFUL!
echo ========================================================
echo.
echo The deployment package is ready in the "release" folder.
echo.
echo [INSTRUCTIONS FOR NEW SERVER]
echo 1. Copy the "release" folder to the new computer.
echo 2. Open the folder on the new computer.
echo 3. Double-click "install_server.bat" (Run once).
echo 4. Double-click "start_server.bat" to run the program.
echo.
pause
