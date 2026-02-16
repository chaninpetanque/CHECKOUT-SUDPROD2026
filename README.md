# Sudprodshop Checkout System

A production-grade barcode scanning and parcel management system built with the MERN-inspired stack (Node.js, Express, React, Supabase/Mock).

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-stable-green.svg)

## 🚀 Features

- **Real-time Barcode Scanning**: Supports camera-based scanning (QR/Barcode) and manual entry.
- **Smart Validation**: instant feedback for Matches, Duplicates, and Surplus items.
- **Offline/Demo Mode**: Automatically switches to a Mock Service when the backend/database is unavailable.
- **Dashboard Analytics**: Visualizes scanning progress and daily statistics.
- **Mobile-First Design**: Optimized for warehouse handheld devices and mobile phones.
- **Modern UI/UX**: Built with Tailwind CSS, Shadcn/UI, and Framer Motion for smooth interactions.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, React Query, Zustand.
- **Backend**: Node.js, Express.
- **Database**: Supabase (PostgreSQL) with local Mock Fallback.
- **Testing**: Playwright (E2E), Jest (Unit - Backend).

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/checkout-sudprod2026.git
   cd checkout-sudprod2026
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Configuration (Optional)**
   Create a `.env` file in the root directory if you want to connect to a real Supabase instance.
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   PORT=3000
   ```
   *Note: If no `.env` is provided, the system defaults to **Demo Mode** using mock data.*

## 🏃 Usage

### Development Mode
Run both frontend and backend concurrently:
```bash
npm run dev
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)

### Production Build
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the server (serves API):
   ```bash
   npm start
   ```

## 🧪 Testing

- **Backend Tests**: `npm run test:backend`
- **E2E Tests**: `npm run test:e2e`

## 📂 Project Structure

```
├── api/                # Shared API Logic (Backend handlers)
├── backend/            # Express Server & Tests
├── frontend/           # React Application (Vite)
├── lib/                # Shared Libraries (Supabase client, Mock Service)
├── scripts/            # Utility Scripts
└── package.json        # Root configuration
```

## 🔒 Security

- All sensitive keys are managed via environment variables.
- API endpoints have basic error handling and validation.
- **Demo Mode** is safe for public preview as it resets on reload.

---

© 2026 Sudprodshop. All rights reserved.
