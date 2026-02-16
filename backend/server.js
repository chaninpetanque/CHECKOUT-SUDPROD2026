import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import uploadHandler from '../api/upload.js';
import scanHandler from '../api/scan.js';
import dashboardHandler from '../api/dashboard.js';
import historyHandler from '../api/history.js';
import exportHandler from '../api/export.js';
import clearHandler from '../api/clear.js';
import ipHandler from '../api/ip.js';
import healthHandler from '../api/health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

app.all('/api/upload', wrap(uploadHandler));
app.all('/api/scan', wrap(scanHandler));
app.all('/api/dashboard', wrap(dashboardHandler));
app.all('/api/history', wrap(historyHandler));
app.all('/api/export', wrap(exportHandler));
app.all('/api/clear', wrap(clearHandler));
app.all('/api/ip', wrap(ipHandler));
app.all('/api/health', wrap(healthHandler));

// Root route
app.get('/', (req, res) => {
  res.send('Sudprodshop Checkout API is running');
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`- Upload: POST /api/upload`);
    console.log(`- Scan: POST /api/scan`);
    console.log(`- Dashboard: GET /api/dashboard`);
    console.log(`- History: GET /api/history`);
    console.log(`- Export: GET /api/export`);
    console.log(`- Clear: POST /api/clear`);
    console.log(`- IP: GET /api/ip`);
    console.log(`- Health: GET /api/health`);
  });
}

export default app;
