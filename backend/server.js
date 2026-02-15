const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./database');
const csv = require('csv-parser');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to get local IP
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Helper to get current date in YYYY-MM-DD format
const getTodayDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

// --- API Routes ---

// 1. Upload File
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const today = getTodayDate();

  const processRows = (rows) => {
    let inserted = 0;
    let errors = 0;

    // Use transaction for speed
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const stmt = db.prepare(`
        INSERT INTO parcels (awb, status, date) 
        VALUES (?, 'uploaded', ?) 
        ON CONFLICT(awb, date) DO UPDATE SET 
        status = CASE WHEN status = 'surplus' THEN 'scanned' ELSE status END
      `);

      rows.forEach((row) => {
        // Find the column that likely contains the AWB
        // Priority: 'AWB', 'awb', or the first column
        let awb = row['AWB'] || row['awb'];

        // Robust fallback: Find any key containing 'awb' or 'track' or 'serial' (case insensitive)
        if (!awb) {
          const keys = Object.keys(row);
          const targetKey = keys.find(k => /awb|track|serial|order/i.test(k));
          if (targetKey) awb = row[targetKey];
          else if (keys.length > 0) awb = row[keys[0]]; // Absolute fallback
        }

        if (awb) {
          stmt.run(String(awb).trim(), today, (err) => {
            if (err) errors++;
            else inserted++;
          });
        }
      });

      stmt.finalize();
      db.run("COMMIT", () => {
        fs.unlinkSync(filePath); // Delete temp file
        res.json({ message: 'File processed', inserted, errors });
      });
    });
  };

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    processRows(data);
  } else if (ext === '.csv') {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        processRows(results);
      });
  } else {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Invalid file format. Please upload .xlsx or .csv' });
  }
});

// 2. Scan Parcel
app.post('/api/scan', (req, res) => {
  const { awb } = req.body;
  const today = getTodayDate();

  if (!awb) return res.status(400).json({ error: 'AWB is required' });

  // Check if AWB exists for today
  db.get(`SELECT * FROM parcels WHERE awb = ? AND date = ?`, [awb, today], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      if (row.status === 'uploaded') {
        // Match found, update to scanned
        db.run(`UPDATE parcels SET status = 'scanned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [row.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ status: 'match', message: '✅ Match Found', awb });
        });
      } else if (row.status === 'scanned') {
        // Already scanned
        res.json({ status: 'duplicate', message: '⚠️ Duplicate Scan', awb });
      } else {
        // Should not happen for uploaded/scanned, but just in case
        res.json({ status: 'unknown', message: 'Unknown status', awb });
      }
    } else {
      // Not found in today's upload list -> Surplus (Extra)
      // Check if it was already scanned as surplus today
      db.get(`SELECT * FROM parcels WHERE awb = ? AND date = ? AND status = 'surplus'`, [awb, today], (err, surplusRow) => {
        if (surplusRow) {
          res.json({ status: 'duplicate', message: '⚠️ Duplicate Scan (Surplus)', awb });
        } else {
          // Insert as surplus
          db.run(`INSERT INTO parcels (awb, status, date) VALUES (?, 'surplus', ?)`, [awb, today], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'surplus', message: '❌ Not in List (Surplus)', awb });
          });
        }
      });
    }
  });
});

// 3. Dashboard Stats
app.get('/api/dashboard', (req, res) => {
  const date = req.query.date || getTodayDate();

  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned,
      SUM(CASE WHEN status = 'surplus' THEN 1 ELSE 0 END) as surplus
    FROM parcels WHERE date = ?
  `;

  db.get(query, [date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    // Total uploaded = pending + scanned (assuming scanned were originally uploaded)
    // Actually, total in DB includes surplus.
    // Let's refine:
    // "Uploaded by transport" = status 'uploaded' OR status 'scanned' (if we assume scanned items came from upload list)
    // BUT wait, what if we scan an item that wasn't uploaded? That becomes 'surplus'.
    // So:
    // Total Expected (from file) = status 'uploaded' + status 'scanned' (where it was originally uploaded)
    // Actually, simplest logic:
    // We only have current status. We lose history of "was it uploaded?" if we overwrite status.
    // Better approach: 'uploaded' means present in file but not scanned. 'scanned' means present in file AND scanned.
    // 'surplus' means NOT present in file but scanned.

    // So:
    // Total Expected = pending + scanned
    // Scanned = scanned
    // Missing (Remaining) = pending
    // Surplus = surplus

    const stats = {
      total_expected: (row.pending || 0) + (row.scanned || 0),
      scanned: row.scanned || 0,
      missing: row.pending || 0,
      surplus: row.surplus || 0
    };

    res.json(stats);
  });
});

// 4. History / List
app.get('/api/history', (req, res) => {
  const date = req.query.date || getTodayDate();
  const search = req.query.search || '';

  let query = `SELECT * FROM parcels WHERE date = ?`;
  let params = [date];

  if (search) {
    query += ` AND awb LIKE ?`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY updated_at DESC LIMIT 100`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 5. Clear Data (Archive old data)
app.post('/api/clear', (req, res) => {
  const today = getTodayDate();
  // Delete "uploaded" records that are NOT from today
  // Keep history of scanned items? 
  // User asked: "Clear only 'uploaded' data of old days... or move to Archive"
  // Let's delete 'uploaded' status older than today.
  db.run(`DELETE FROM parcels WHERE status = 'uploaded' AND date != ?`, [today], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Cleared ${this.changes} old pending records.` });
  });
});

// 6. Export Data
app.get('/api/export', (req, res) => {
  const date = req.query.date || getTodayDate();
  const type = req.query.type || 'all';
  const format = (req.query.format || 'csv').toLowerCase();

  let query = `SELECT awb, status, date, updated_at FROM parcels WHERE date = ?`;
  let params = [date];

  if (type === 'missing') {
    query += ` AND status = 'uploaded'`;
  } else if (type === 'surplus') {
    query += ` AND status = 'surplus'`;
  } else if (type === 'scanned') {
    query += ` AND status = 'scanned'`;
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (format === 'csv') {
      const header = ['AWB', 'Status', 'Date', 'Time'];
      const csvRows = [header.join(',')];

      rows.forEach(row => {
        csvRows.push([row.awb, row.status, row.date, row.updated_at].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.csv`);
      return res.send(csvRows.join('\n'));
    }

    if (format === 'xlsx' || format === 'excel') {
      const sheetData = rows.map(row => ({
        AWB: row.awb,
        Status: row.status,
        Date: row.date,
        Time: row.updated_at
      }));

      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.xlsx`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.pdf`);

      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(16).text(`Inventory Report (${date})`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Type: ${type}`);
      doc.moveDown();

      rows.forEach((row, index) => {
        doc.text(`${index + 1}. ${row.awb} | ${row.status} | ${row.date} | ${row.updated_at}`);
      });

      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or pdf.' });
  });
});

// 7. Get IP Address
app.get('/api/ip', (req, res) => {
  res.json({ ip: getLocalIp() });
});

// --- Serve Frontend Static Files (Production Mode) ---
const frontendPath = path.join(__dirname, 'public');
if (fs.existsSync(frontendPath)) {
  console.log('Serving frontend from:', frontendPath);
  app.use(express.static(frontendPath));

  // Catch-all handler for SPA (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.log('Frontend build not found (Running in API-only mode).');
}

// Start Server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local Network: http://${getLocalIp()}:${PORT}`);
  });
}

module.exports = app;
