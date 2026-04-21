import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';
import { getTodayDateTH, getNowTH } from '../lib/timezone.js';
import { validateAwb } from '../lib/awb-validation.js';

const getTodayDate = getTodayDateTH;

const parseBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  const awb = String(body.awb ?? '').trim();
  const today = getTodayDate();

  if (!awb) {
    res.status(400).json({ error: 'กรุณาระบุเลขพัสดุ' });
    return;
  }

  // Validate AWB format (prefix + minimum length)
  const validation = validateAwb(awb);
  if (!validation.valid) {
    res.status(400).json({ status: 'invalid', error: validation.error, awb });
    return;
  }

  // --- Mock Service Fallback ---
  // If Supabase is not configured (no ENV vars), use in-memory mock service.
  if (!isSupabaseReady) {
    const result = mockService.scan(awb, today);
    res.json(result);
    return;
  }

  // --- Supabase Logic ---
  // 1. Check if parcel exists in manifest (uploaded)
  const { data: row, error } = await supabase
    .from('parcels')
    .select('id, awb, status')
    .eq('awb', awb)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (row) {
    if (row.status === 'uploaded') {
      const { error: updateError } = await supabase
        .from('parcels')
        .update({ status: 'scanned', updated_at: getNowTH() })
        .eq('id', row.id);
      if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
      }
      res.json({ status: 'match', message: '✅ จับคู่สำเร็จ', awb });
      return;
    }
    if (row.status === 'scanned') {
      res.json({ status: 'duplicate', message: '⚠️ สแกนซ้ำ', awb });
      return;
    }
    if (row.status === 'surplus') {
      res.json({ status: 'duplicate', message: '⚠️ สแกนซ้ำ (เกินจำนวน)', awb });
      return;
    }
    if (row.status === 'cancelled') {
      res.json({ status: 'cancelled', message: '⚠️ รายการนี้ถูกยกเลิกแล้ว', awb });
      return;
    }
    res.json({ status: 'unknown', message: 'สถานะไม่ทราบค่า', awb });
    return;
  }

  const { error: insertError } = await supabase
    .from('parcels')
    .insert([{ awb, status: 'surplus', date: today }]);
  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }
  res.json({ status: 'surplus', message: '❌ ไม่อยู่ในรายการ (เกินจำนวน)', awb });
}
