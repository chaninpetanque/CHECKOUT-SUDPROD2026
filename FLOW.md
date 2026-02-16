# End-to-End System Flow

## Overview
This document illustrates the complete workflow of the Sudprodshop Checkout System, covering the User Journey and Data Flow.

## 1. Sequence Diagram: Upload & Scan Process

```mermaid
sequenceDiagram
    participant Admin as Admin (PC)
    participant Scanner as Scanner (Mobile)
    participant Frontend as Frontend (React)
    participant Backend as Backend (API)
    participant DB as Supabase/Mock

    Note over Admin, DB: Phase 1: Data Preparation
    Admin->>Frontend: Upload Excel/CSV (AWB List)
    Frontend->>Backend: POST /api/upload (Multipart)
    Backend->>DB: Check if Supabase Ready?
    alt Supabase Ready
        Backend->>DB: INSERT INTO parcels (awb, status='uploaded')
    else Fallback
        Backend->>DB: Store in Mock Memory
    end
    Backend-->>Frontend: { inserted: N, errors: M }
    Frontend-->>Admin: Show Success Toast

    Note over Admin, DB: Phase 2: Operation
    Scanner->>Frontend: Scan QR Code (AWB)
    Frontend->>Backend: POST /api/scan { awb: "123" }
    Backend->>DB: SELECT * FROM parcels WHERE awb="123" AND date=TODAY
    alt Found & Status='uploaded'
        Backend->>DB: UPDATE status='scanned'
        DB-->>Backend: Success
        Backend-->>Frontend: { status: 'match', message: '✅ Match' }
        Frontend-->>Scanner: Play Success Sound
    else Found & Status='scanned'
        Backend-->>Frontend: { status: 'duplicate', message: '⚠️ Duplicate' }
        Frontend-->>Scanner: Play Error Sound
    else Not Found
        Backend->>DB: INSERT (status='surplus')
        Backend-->>Frontend: { status: 'surplus', message: '❌ Surplus' }
        Frontend-->>Scanner: Play Warning Sound
    end

    Note over Admin, DB: Phase 3: Monitoring & Export
    loop Every 2 Seconds
        Admin->>Frontend: View Dashboard
        Frontend->>Backend: GET /api/dashboard
        Backend->>DB: Count(uploaded, scanned, surplus)
        DB-->>Backend: Stats
        Backend-->>Frontend: Update UI Charts
    end
    Admin->>Frontend: Click Export Report
    Frontend->>Backend: GET /api/export?type=missing&format=xlsx
    Backend->>DB: Fetch Rows
    Backend->>Backend: Generate Excel File
    Backend-->>Frontend: Download File
```

## 2. System Architecture Flowchart

```mermaid
graph TD
    UserPC[User (PC)] -->|Upload/Monitor| DashboardUI[Dashboard UI]
    UserMobile[User (Mobile)] -->|Scan QR| ScannerUI[Scanner UI]
    
    DashboardUI -->|HTTP Requests| API[API Gateway / Backend]
    ScannerUI -->|HTTP Requests| API
    
    API -->|Route: /api/upload| HandlerUpload[Upload Handler]
    API -->|Route: /api/scan| HandlerScan[Scan Handler]
    API -->|Route: /api/dashboard| HandlerDash[Dashboard Handler]
    
    HandlerUpload --> Logic{Supabase Ready?}
    HandlerScan --> Logic
    HandlerDash --> Logic
    
    Logic -->|Yes| Supabase[(Supabase DB)]
    Logic -->|No| MockService[(In-Memory Mock)]
    
    Supabase -->|Real-time Data| API
    MockService -->|Session Data| API
```
