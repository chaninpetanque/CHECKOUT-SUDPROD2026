import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const extractAwb = (row) => {
  if (!row || typeof row !== 'object') return '';
  let awb = row.AWB ?? row.awb;
  if (!awb) {
    const keys = Object.keys(row);
    const targetKey = keys.find((k) => /awb|track|serial|order/i.test(k));
    if (targetKey) awb = row[targetKey];
    else if (keys.length > 0) awb = row[keys[0]];
  }
  return String(awb ?? '').trim();
};

const parseCsv = (filePath) =>
  new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });

const chunk = (arr, size) => {
  const output = [];
  for (let i = 0; i < arr.length; i += size) {
    output.push(arr.slice(i, i + size));
  }
  return output;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const form = formidable({ multiples: false, keepExtensions: true });
  const [fields, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!file) {
    res.status(400).json({ error: 'ไม่ได้อัปโหลดไฟล์' });
    return;
  }

  const filePath = file.filepath;
  const ext = path.extname(file.originalFilename || '').toLowerCase();
  const today = getTodayDate();

  try {
    let rows = [];
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === '.csv') {
      rows = await parseCsv(filePath);
    } else {
      res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ .xlsx หรือ .csv' });
      return;
    }

    const awbList = rows.map(extractAwb).filter(Boolean);
    if (!awbList.length) {
    res.json({ message: 'ประมวลผลไฟล์แล้ว', inserted: 0, errors: rows.length });
    return;
  }

  // --- Mock Service Fallback ---
  if (!isSupabaseReady) {
    const result = mockService.uploadRows(awbList, today);
    res.json({ message: 'ประมวลผลไฟล์แล้ว', inserted: result.inserted, errors: result.errors });
    return;
  }

  // --- Supabase Logic ---
  // 1. Identify duplicates in existing DB
  const uniqueAwbs = Array.from(new Set(awbList));
    let existingCount = 0;

    for (const batch of chunk(uniqueAwbs, 400)) {
      const { count, error } = await supabase
        .from('parcels')
        .select('awb', { count: 'exact' })
        .eq('date', today)
        .in('awb', batch);
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      existingCount += count ?? 0;
    }

    for (const batch of chunk(uniqueAwbs, 500)) {
      const payload = batch.map((awb) => ({ awb, status: 'uploaded', date: today }));
      const { error } = await supabase
        .from('parcels')
        .insert(payload, { onConflict: 'awb,date', ignoreDuplicates: true });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('parcels')
      .update({ status: 'scanned', updated_at: new Date().toISOString() })
      .eq('date', today)
      .eq('status', 'surplus')
      .in('awb', uniqueAwbs);

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    const errors = awbList.length - uniqueAwbs.length;
    const inserted = Math.max(uniqueAwbs.length - existingCount, 0);
    res.json({ message: 'ประมวลผลไฟล์เรียบร้อยแล้ว', inserted, errors });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
