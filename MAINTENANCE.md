# System Maintenance & Operation Manual

## 1. System Overview
**Sudprodshop Checkout System** is a hybrid inventory tracking application designed for:
- **Importing** daily parcel lists (AWB) via Excel/CSV.
- **Scanning** parcels using mobile devices (QR/Barcode).
- **Monitoring** real-time progress.
- **Exporting** reports (Missing, Surplus, Scanned).

## 2. Environment Setup

### Prerequisites
- Node.js v18 or higher
- Git
- (Optional) Supabase Account for production database

### Installation
```bash
git clone <repository_url>
cd CHECKOUTSUDPROD2026
npm install
cd frontend && npm install
cd ../backend && npm install
```

## 3. Configuration (.env)
Create a `.env` file in the root directory:

```env
# Optional: Supabase Production Keys
# If missing, system falls back to In-Memory Mock Service automatically.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (Backend only)
```

## 4. Running the System

### Local Development (Zero-Config)
To start both Frontend and Backend with one command:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

### Production Deployment
The system is "Vercel-Ready".
1. Push to GitHub.
2. Import project into Vercel.
3. Set Environment Variables in Vercel Dashboard.
4. Deploy.

## 5. Troubleshooting & Maintenance

### Common Issues

**1. "Supabase connection failed"**
- **Cause**: Missing or invalid API keys.
- **Fix**: The system automatically switches to Mock Mode. Check console logs for "Mock Service: Enabled".

**2. "CORS Error"**
- **Cause**: Frontend trying to access Backend from a different origin.
- **Fix**: `backend/server.js` has `cors()` enabled. Ensure Frontend proxies correctly via `vite.config.js`.

**3. "File Upload Failed"**
- **Cause**: Large file size or invalid format.
- **Fix**: Use `.xlsx` or `.csv`. Limit size to 5MB.

### Health Check
Monitor system status via:
`GET /api/health`
Response: `{ "status": "ok", "uptime": 123.45 }`

### Database Maintenance
- **Mock Mode**: Data is lost when the server restarts.
- **Supabase Mode**: Data is persistent. Use the "Clear Old Data" button in Dashboard to archive records.

## 6. Testing
Run the comprehensive test suite before any deployment:
```bash
# Backend Tests
npm run test:backend

# Frontend E2E Tests
npm run test:e2e
```
