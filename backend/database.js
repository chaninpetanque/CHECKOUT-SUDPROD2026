const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

const createParcelsTableSql = `CREATE TABLE IF NOT EXISTS parcels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  awb TEXT NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(awb, date)
)`;

const createParcelsNewTableSql = `CREATE TABLE IF NOT EXISTS parcels_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  awb TEXT NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(awb, date)
)`;

const createIndexes = () => {
  db.run(`CREATE INDEX IF NOT EXISTS idx_date ON parcels(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_awb_date ON parcels(awb, date)`);
};

const migrateParcelsTable = () => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(createParcelsNewTableSql);
    db.run(`INSERT OR IGNORE INTO parcels_new (id, awb, status, date, created_at, updated_at)
      SELECT id, awb, status, date, created_at, updated_at FROM parcels`);
    db.run(`DROP TABLE parcels`);
    db.run(`ALTER TABLE parcels_new RENAME TO parcels`);
    db.run('COMMIT');
    createIndexes();
  });
};

db.serialize(() => {
  db.run(createParcelsTableSql);
  db.all(`PRAGMA index_list(parcels)`, (err, indexes) => {
    if (err || !indexes || indexes.length === 0) {
      createIndexes();
      return;
    }

    const uniqueIndexes = indexes.filter((idx) => idx.unique);
    if (uniqueIndexes.length === 0) {
      createIndexes();
      return;
    }

    let checked = 0;
    let hasComposite = false;
    let hasAwbOnly = false;

    uniqueIndexes.forEach((idx) => {
      db.all(`PRAGMA index_info(${idx.name})`, (infoErr, cols) => {
        checked += 1;
        if (!infoErr && cols) {
          const names = cols.map((col) => col.name);
          if (names.length === 2 && names.includes('awb') && names.includes('date')) {
            hasComposite = true;
          }
          if (names.length === 1 && names[0] === 'awb') {
            hasAwbOnly = true;
          }
        }
        if (checked === uniqueIndexes.length) {
          if (hasComposite || !hasAwbOnly) {
            createIndexes();
          } else {
            migrateParcelsTable();
          }
        }
      });
    });
  });
});

module.exports = db;
