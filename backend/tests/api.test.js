import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import request from 'supertest';
import app from '../server.js';

const today = new Date().toISOString().split('T')[0];

import { supabase } from '../../lib/supabase.js';

test('upload, scan, and export flow (Mock Mode)', async () => {
  const uniqueId = Date.now();
  const awb1 = `A${uniqueId}-1`;
  const awb2 = `A${uniqueId}-2`;
  const awbSurplus = `B${uniqueId}-SURPLUS`;

  const csvPath = path.join(os.tmpdir(), `awb-${uniqueId}.csv`);
  fs.writeFileSync(csvPath, `AWB\n${awb1}\n${awb2}\n`);

  try {
    // 1. Upload
    const uploadRes = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    assert.equal(uploadRes.status, 200);
    // Note: In mock mode, it might not return inserted count same way if logic differs, 
    // but based on api/upload.js it returns { message, inserted, errors }

    // 2. Dashboard Check
    const statsRes1 = await request(app).get(`/api/dashboard?date=${today}`);
    assert.equal(statsRes1.status, 200);
    // Mock service should have data now
    assert.ok(statsRes1.body.total_expected >= 2);

    // 3. Scan Match
    const scanMatch = await request(app)
      .post('/api/scan')
      .send({ awb: awb1 });
    assert.equal(scanMatch.body.status, 'match');

    // 4. Scan Duplicate
    const scanDup = await request(app)
      .post('/api/scan')
      .send({ awb: awb1 });
    assert.equal(scanDup.body.status, 'duplicate');

    // 5. Scan Surplus
    const scanSurplus = await request(app)
      .post('/api/scan')
      .send({ awb: awbSurplus });
    assert.equal(scanSurplus.body.status, 'surplus');

    // 6. Export CSV
    const exportCsv = await request(app).get(`/api/export?type=all&format=csv&date=${today}`);
    assert.equal(exportCsv.status, 200);
    assert.match(exportCsv.headers['content-type'], /text\/csv/);

    // 7. Export XLSX
    const exportXlsx = await request(app).get(`/api/export?type=all&format=xlsx&date=${today}`);
    assert.equal(exportXlsx.status, 200);
    assert.match(exportXlsx.headers['content-type'], /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);

    // 8. Health Check
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

  } finally {
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    // Cleanup Supabase Data
    await supabase.from('parcels').delete().in('awb', [awb1, awb2, awbSurplus]);
  }
});
