import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

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

  const body = await parseBody(req);
  const mode = String(body.mode ?? 'old').toLowerCase();
  const today = getTodayDate();

  // --- Mock Service Fallback ---
  if (!isSupabaseReady) {
    if (mode === 'today') {
      const result = mockService.clearToday ? mockService.clearToday() : { cleared: 0 };
      res.json({ message: `ล้างข้อมูลวันนี้แล้ว ${result.cleared} รายการ` });
    } else if (mode === 'all') {
      const result = mockService.clearAll ? mockService.clearAll() : { cleared: 0 };
      res.json({ message: `ล้างข้อมูลทั้งหมดแล้ว ${result.cleared} รายการ` });
    } else {
      const result = mockService.clearOld();
      res.json({ message: `ล้างข้อมูลเก่าแล้ว ${result.cleared} รายการ` });
    }
    return;
  }

  // --- Supabase Logic ---
  let query = supabase.from('parcels').delete({ count: 'exact' });

  if (mode === 'today') {
    // ล้างข้อมูลวันนี้ทั้งหมด
    query = query.eq('date', today);
  } else if (mode === 'all') {
    // ล้างข้อมูลทั้งหมด — ต้องมี filter อย่างน้อย 1 ตัว (Supabase safety)
    query = query.gte('id', 0);
  } else {
    // ล้างข้อมูลเก่า (status = uploaded, ไม่ใช่วันนี้)
    query = query.eq('status', 'uploaded').neq('date', today);
  }

  const { error, count } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const labels = {
    today: 'ล้างข้อมูลวันนี้แล้ว',
    all: 'ล้างข้อมูลทั้งหมดแล้ว',
    old: 'ล้างข้อมูลเก่าแล้ว',
  };

  res.json({ message: `${labels[mode] || labels.old} ${count ?? 0} รายการ` });
}
