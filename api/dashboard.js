import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getQueryDate = (req) => {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const dateParam = url.searchParams.get('date');
  return dateParam || new Date().toISOString().split('T')[0];
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const date = getQueryDate(req);

  // --- Mock Service Fallback ---
  if (!isSupabaseReady) {
    const result = mockService.dashboard(date);
    res.json(result);
    return;
  }

  // --- Supabase Logic (parallel aggregate queries + AWB lists) ---
  const [uploadedRes, scannedRes, surplusRes, missingAwbsRes, surplusAwbsRes] = await Promise.all([
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'uploaded'),
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'scanned'),
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'surplus'),
    // Fetch actual AWB lists (limited to 200)
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'uploaded')
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'surplus')
      .order('created_at', { ascending: false }).limit(200),
  ]);

  const firstError = uploadedRes.error || scannedRes.error || surplusRes.error
    || missingAwbsRes.error || surplusAwbsRes.error;
  if (firstError) {
    res.status(500).json({ error: firstError.message });
    return;
  }

  const pending = uploadedRes.count ?? 0;
  const scanned = scannedRes.count ?? 0;
  const surplus = surplusRes.count ?? 0;

  res.setHeader('Cache-Control', 'public, max-age=5');
  res.json({
    total_expected: pending + scanned,
    scanned,
    missing: pending,
    surplus,
    missing_awbs: (missingAwbsRes.data || []).map((r) => r.awb),
    surplus_awbs: (surplusAwbsRes.data || []).map((r) => r.awb),
  });
}
