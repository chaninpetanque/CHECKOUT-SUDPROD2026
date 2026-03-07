@echo off
cd /d "c:\Users\MSI\Documents\Sudprodshop\CHECKOUTSUDPROD2026"
echo === Adding files ===
git add lib/timezone.js api/clear.js api/dashboard.js api/export.js api/history.js api/scan.js api/upload.js lib/mock-service.js release/server.js frontend/src/components/Dashboard.jsx frontend/src/components/Scanner.jsx frontend/src/components/dashboard/HistoryTable.jsx
echo === Committing ===
git commit -m "fix: update timestamps to Thailand timezone UTC+7"
echo === Pushing ===
git push
echo === Done ===
pause
