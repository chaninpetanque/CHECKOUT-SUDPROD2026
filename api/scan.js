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
  const awb = String(body.awb ?? '').trim();
  const today = getTodayDate();

  if (!awb) {
    res.status(400).json({ error: 'AWB is required' });
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
        .update({ status: 'scanned', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
      }
      res.json({ status: 'match', message: '✅ Match Found', awb });
      return;
    }
    if (row.status === 'scanned') {
      res.json({ status: 'duplicate', message: '⚠️ Duplicate Scan', awb });
      return;
    }
    if (row.status === 'surplus') {
      res.json({ status: 'duplicate', message: '⚠️ Duplicate Scan (Surplus)', awb });
      return;
    }
    res.json({ status: 'unknown', message: 'Unknown status', awb });
    return;
  }

  const { error: insertError } = await supabase
    .from('parcels')
    .insert([{ awb, status: 'surplus', date: today }]);
  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }
  res.json({ status: 'surplus', message: '❌ Not in List (Surplus)', awb });
}
