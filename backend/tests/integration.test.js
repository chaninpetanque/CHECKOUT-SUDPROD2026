import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import app from '../server.js';
import { supabase } from '../../lib/supabase.js';

test('Full Integration Flow (Upload -> Scan -> Verify -> Cleanup)', async (t) => {
  const today = new Date().toISOString().split('T')[0];
  const testId = `INT-${Date.now()}`;
  const awb1 = `${testId}-1`;
  const awb2 = `${testId}-2`;
  const awbSurplus = `${testId}-SURPLUS`;

  // 1. Prepare CSV File
  const csvPath = path.join(os.tmpdir(), `${testId}.csv`);
  fs.writeFileSync(csvPath, `AWB\n${awb1}\n${awb2}\n`);

  try {
    // 2. Upload CSV
    const uploadRes = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);
    
    assert.equal(uploadRes.status, 200, 'Upload should succeed');
    // Note: inserted count depends on existing data, but we use unique IDs so it should be 2.
    // However, if run very fast, maybe date overlap? No, testId ensures uniqueness.
    // Actually, uniqueness is (awb, date). So same date, unique AWB.
    
    // 3. Verify Database Insertion (Direct Check)
    if (supabase) {
      const { count } = await supabase
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('awb', [awb1, awb2]);
      assert.equal(count, 2, 'Should find 2 uploaded records in DB');
    }

    // 4. Scan AWB1 (Match)
    const scanMatch = await request(app)
      .post('/api/scan')
      .send({ awb: awb1 });
    assert.equal(scanMatch.status, 200);
    assert.equal(scanMatch.body.status, 'match');

    // 5. Scan AWB1 again (Duplicate)
    const scanDup = await request(app)
      .post('/api/scan')
      .send({ awb: awb1 });
    assert.equal(scanDup.status, 200);
    assert.equal(scanDup.body.status, 'duplicate');

    // 6. Scan Surplus (Not in list)
    const scanSurplus = await request(app)
      .post('/api/scan')
      .send({ awb: awbSurplus });
    assert.equal(scanSurplus.status, 200);
    assert.equal(scanSurplus.body.status, 'surplus');

    // 7. Verify Dashboard Stats
    const dashRes = await request(app).get(`/api/dashboard?date=${today}`);
    assert.equal(dashRes.status, 200);
    // Since other tests might run, we can't assert exact total counts easily unless we filter.
    // But we can check structure.
    assert.ok(dashRes.body.total_expected >= 2);
    assert.ok(dashRes.body.scanned >= 1);
    assert.ok(dashRes.body.surplus >= 1);

    // 8. Export Data
    const exportRes = await request(app).get(`/api/export?type=all&format=xlsx&date=${today}`);
    assert.equal(exportRes.status, 200);
    assert.match(exportRes.headers['content-type'], /spreadsheet/);

  } finally {
    // 9. Cleanup
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }

    if (supabase) {
      // Clean up test data from Supabase
      await supabase
        .from('parcels')
        .delete()
        .eq('date', today)
        .in('awb', [awb1, awb2, awbSurplus]);
    }
  }
});
