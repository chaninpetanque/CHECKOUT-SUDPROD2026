# CHECKOUT SUDPROD 2026

A web application for scanning and verifying parcel statuses with barcode support, export, and Supabase-ready APIs.

## Features
- **Upload**: Supports .xlsx and .csv files with AWB column detection.
- **Dashboard**: Real-time stats (Total, Scanned, Missing, Surplus).
- **Barcode Scanner**: USB/Bluetooth keyboard-style input and mobile camera scan.
- **Audio Feedback**: Distinct sounds for Match, Duplicate, and Not Found.
- **History**: Searchable scan history.
- **Export**: CSV, Excel, and PDF reports.
- **Auto Export**: Auto-download when all parcels are checked.
- **Supabase Ready**: Serverless APIs for Vercel with mock fallback.

## Prerequisites
- Node.js installed
- Supabase project (for production)

## Installation (Local)
1. Open a terminal in the project root.
2. Install dependencies:
```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

## Running the Application (Local)
### Terminal 1: Backend
```bash
cd backend
npm start
```
Server runs on port 3000.

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on port 5173.

## How to Use
1. Open the web app in your browser.
2. Upload your shipment file (Excel/CSV).
3. Use the barcode scanner:
   - USB/Bluetooth scanners work as keyboard input in the dashboard.
   - Mobile camera scanner is available at `/scan`.
4. Export results via CSV/Excel/PDF.

## File Format
- Excel (.xlsx) or CSV (.csv)
- Must contain a header row
- One column must be named **AWB** (case-insensitive)

## Supabase Setup (Production)
Create table and indexes:
```sql
create table if not exists parcels (
  id bigserial primary key,
  awb text not null,
  status text not null,
  date text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (awb, date)
);

create index if not exists idx_parcels_date on parcels (date);
create index if not exists idx_parcels_awb_date on parcels (awb, date);
```

## Environment Variables (Vercel)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set environment variables.
4. Deploy.
