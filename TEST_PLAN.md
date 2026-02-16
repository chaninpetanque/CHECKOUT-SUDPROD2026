# Test Plan: Sudprodshop Checkout System (End-to-End)

## 1. Objective
To verify the complete functionality, reliability, and data integrity of the Sudprodshop Checkout System in a production-like environment connected to Supabase.

## 2. Scope
The testing will cover the following core modules:
- **Data Import (Upload)**: Verifying file parsing (CSV/Excel) and database insertion.
- **Scanning Process**:
  - **Match**: Scanning an uploaded AWB.
  - **Duplicate**: Scanning the same AWB twice.
  - **Surplus**: Scanning an AWB not in the uploaded list.
- **Dashboard**: Real-time statistics accuracy (Total, Scanned, Missing, Surplus).
- **Data Export**: Generating reports in CSV/Excel formats.
- **System Health**: verifying API health status.

## 3. Environment
- **Backend**: Node.js/Express (Port 3000)
- **Frontend**: React/Vite (Port 5173)
- **Database**: Supabase (Production URL configured)
- **Network**: Localhost (Testing via Loopback)

## 4. Test Data Strategy
- **Unique Identification**: All test data will use a unique prefix (e.g., `TEST-AWB-{Timestamp}`) to prevent conflict with existing data.
- **Cleanup**: Automated tests must attempt to clean up created records after execution.

## 5. Test Cases

| ID | Module | Test Case Description | Expected Result |
|----|--------|-----------------------|-----------------|
| TC-01 | Upload | Upload a CSV file with 5 unique AWBs | HTTP 200, JSON returns `inserted: 5` |
| TC-02 | Scan | Scan a valid AWB from the uploaded list | HTTP 200, Status: `match` |
| TC-03 | Scan | Scan the same AWB again | HTTP 200, Status: `duplicate` |
| TC-04 | Scan | Scan an unknown AWB | HTTP 200, Status: `surplus` |
| TC-05 | Dashboard | Check stats after scanning | Total: 5, Scanned: 1, Surplus: 1 |
| TC-06 | Export | Export "All" report in Excel format | HTTP 200, File Content-Type matches Excel |
| TC-07 | Health | Check System Health | HTTP 200, Status: `ok` |

## 6. Execution Strategy
1. **Integration Testing**: Run `npm run test:backend` (executes `api.test.js` and `supabase.e2e.test.js` and `integration.test.js`).
2. **E2E Testing**: Run `npm run test:e2e` (Playwright) to verify Frontend-Backend integration.

## 7. Acceptance Criteria
- All automated tests must pass (Green).
- No critical errors in server logs.
- Database records must accurately reflect the operations performed.
