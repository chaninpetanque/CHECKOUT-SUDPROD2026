const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const request = require('supertest');

const tmpDbPath = path.join(os.tmpdir(), `inventory-test-${Date.now()}.db`);
process.env.DB_PATH = tmpDbPath;

const app = require('../server');
const db = require('../database');

const today = new Date().toISOString().split('T')[0];

test('upload, scan, and export flow', async () => {
  const csvPath = path.join(os.tmpdir(), `awb-${Date.now()}.csv`);
  fs.writeFileSync(csvPath, 'AWB\nA1001\nA1002\n');

  try {
    const uploadRes = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    assert.equal(uploadRes.status, 200);

    const statsRes1 = await request(app).get(`/api/dashboard?date=${today}`);
    assert.equal(statsRes1.status, 200);
    assert.equal(statsRes1.body.total_expected, 2);
    assert.equal(statsRes1.body.missing, 2);

    const scanMatch = await request(app)
      .post('/api/scan')
      .send({ awb: 'A1001' });
    assert.equal(scanMatch.body.status, 'match');

    const scanDup = await request(app)
      .post('/api/scan')
      .send({ awb: 'A1001' });
    assert.equal(scanDup.body.status, 'duplicate');

    const scanSurplus = await request(app)
      .post('/api/scan')
      .send({ awb: 'B9999' });
    assert.equal(scanSurplus.body.status, 'surplus');

    const statsRes2 = await request(app).get(`/api/dashboard?date=${today}`);
    assert.equal(statsRes2.body.scanned, 1);
    assert.equal(statsRes2.body.surplus, 1);

    const exportCsv = await request(app).get(`/api/export?type=all&format=csv&date=${today}`);
    assert.equal(exportCsv.status, 200);
    assert.match(exportCsv.headers['content-type'], /text\/csv/);

    const exportXlsx = await request(app).get(`/api/export?type=all&format=xlsx&date=${today}`);
    assert.equal(exportXlsx.status, 200);
    assert.match(exportXlsx.headers['content-type'], /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);

    const exportPdf = await request(app).get(`/api/export?type=all&format=pdf&date=${today}`);
    assert.equal(exportPdf.status, 200);
    assert.match(exportPdf.headers['content-type'], /application\/pdf/);
  } finally {
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    if (fs.existsSync(tmpDbPath)) {
      fs.unlinkSync(tmpDbPath);
    }
  }
});
