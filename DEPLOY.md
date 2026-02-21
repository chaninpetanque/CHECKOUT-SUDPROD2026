# 🚀 Deployment Guide: Sudprodshop Checkout (Updated)

## ✅ Phase 1: GitHub Repository
Code has been successfully pushed to:
**[https://github.com/chaninpetanque/CHECKOUT-SUDPROD2026](https://github.com/chaninpetanque/CHECKOUT-SUDPROD2026)**

---

## ⚡ Phase 2: Deploy to Vercel (The "Standard" Way)

Follow these steps to deploy your application to Vercel:

1.  **Log in to Vercel:**
    Go to [vercel.com](https://vercel.com) and log in with your GitHub account.

2.  **Add New Project:**
    - Click **"Add New..."** -> **"Project"**.
    - Select **"Import"** next to the `CHECKOUT-SUDPROD2026` repository.

3.  **Configure Project (Crucial Step):**
    Vercel should automatically detect the settings, but please **manually verify** these settings to avoid 404 errors:
    
    *   **Framework Preset:** `Vite`
    *   **Root Directory:** `.` (Leave as default / root)
    *   **Build Command:** `npm run build` 
        *(This runs the root script which triggers the frontend build)*
    *   **Output Directory:** `dist` 
        *(IMPORTANT: Do NOT use `frontend/dist`. We have configured Vite to output to the root `dist` folder)*
    *   **Install Command:** `npm install` (Default)

4.  **Environment Variables:**
    Copy the values from your `.env` (or `.env.example`) and add them in the **"Environment Variables"** section:
    
    | Key | Value Description |
    |-----|-------------------|
    | `SUPABASE_URL` | Your Supabase Project URL |
    | `SUPABASE_KEY` | Your Supabase Anon Key |
    | `SUPABASE_SERVICE_ROLE_KEY` | (Optional) Your Supabase Service Role Key |

5.  **Deploy:**
    - Click **"Deploy"**.
    - Wait for the build to complete (approx. 1-2 minutes).

---

## 🔍 Phase 3: Verification

Once deployed, Vercel will provide a URL (e.g., `https://checkout-sudprod2026.vercel.app`).

**Checklist:**
1.  **Frontend:** Open the URL. You should see the Dashboard.
2.  **API:** Test scanning a barcode. If you haven't set Supabase keys, it should fall back to Mock Mode (check the toast notification).
3.  **Mobile Scan:** Click "Mobile Scanner" and verify the QR code generation.
4.  **Localization:** Ensure all text is in Thai.

---

## 🛠 Troubleshooting

*   **Build Fails?** Check the "Build Logs" in Vercel. Ensure `npm install` succeeded.
*   **API 404?** Ensure `vercel.json` rewrites are working (Vercel usually handles `api/` functions automatically).
*   **Supabase Connection Error?** Verify your Environment Variables in Vercel Settings.
