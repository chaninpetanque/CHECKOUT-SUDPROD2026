import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';
import { getTodayDateTH, getNowTH } from '../lib/timezone.js';

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
  const awb = String(body.awb ?? '').trim();
  const today = getTodayDateTH();

  if (!awb) {
    res.status(400).json({ error: 'กรุณาระบุเลขพัสดุ' });
    return;
  }

  if (!awb.startsWith('864')) {
    res.status(400).json({ error: 'รูปแบบเลขพัสดุไม่ถูกต้อง (ต้องขึ้นต้นด้วย 864)' });
    return;
  }

  // --- Mock Service Fallback ---
  if (!isSupabaseReady) {
    const result = mockService.cancel(awb, today);
    res.json(result);
    return;
  }

  // --- Supabase Logic ---
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

  if (!row) {
    res.status(404).json({ error: 'ไม่พบเลขพัสดุนี้ในระบบ', awb });
    return;
  }

  if (row.status === 'cancelled') {
    res.json({ status: 'already_cancelled', message: '⚠️ ยกเลิกไปแล้ว', awb });
    return;
  }

  const { error: updateError } = await supabase
    .from('parcels')
    .update({ status: 'cancelled', updated_at: getNowTH() })
    .eq('id', row.id);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.json({
    status: 'cancelled',
    message: `✅ ยกเลิกสำเร็จ (เดิม: ${row.status === 'uploaded' ? 'รอสแกน' : row.status === 'scanned' ? 'สแกนแล้ว' : row.status})`,
    awb,
    previous_status: row.status,
  });
}
