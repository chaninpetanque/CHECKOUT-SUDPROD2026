import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';
import { getTodayDateTH } from '../lib/timezone.js';

const getTodayDate = getTodayDateTH;

const getQueryDate = (req) => {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const dateParam = url.searchParams.get('date');
  return dateParam || getTodayDateTH();
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
  const [uploadedRes, scannedRes, surplusRes, cancelledRes, missingAwbsRes, surplusAwbsRes, cancelledAwbsRes, tiktokScannedRes, tiktokSurplusRes, tiktokScannedAwbsRes] = await Promise.all([
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'uploaded'),
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'scanned'),
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'surplus'),
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'cancelled'),
    // Fetch actual AWB lists (limited to 200)
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'uploaded')
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'surplus')
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'cancelled')
      .order('created_at', { ascending: false }).limit(200),
    // TikTok parcels (AWB starting with 7) — scanned
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'scanned').like('awb', '7%'),
    // TikTok parcels (AWB starting with 7) — surplus
    supabase.from('parcels').select('*', { count: 'exact', head: true })
      .eq('date', date).eq('status', 'surplus').like('awb', '7%'),
    // TikTok scanned AWB list
    supabase.from('parcels').select('awb')
      .eq('date', date).eq('status', 'scanned').like('awb', '7%')
      .order('created_at', { ascending: false }).limit(200),
  ]);

  const firstError = uploadedRes.error || scannedRes.error || surplusRes.error
    || cancelledRes.error || missingAwbsRes.error || surplusAwbsRes.error || cancelledAwbsRes.error
    || tiktokScannedRes.error || tiktokSurplusRes.error || tiktokScannedAwbsRes.error;
  if (firstError) {
    res.status(500).json({ error: firstError.message });
    return;
  }

  const pending = uploadedRes.count ?? 0;
  const scanned = scannedRes.count ?? 0;
  const surplus = surplusRes.count ?? 0;
  const cancelled = cancelledRes.count ?? 0;
  const tiktokScanned = tiktokScannedRes.count ?? 0;
  const tiktokSurplus = tiktokSurplusRes.count ?? 0;

  // Facebook = all counts minus TikTok counts
  const fbScanned = scanned - tiktokScanned;
  const fbSurplus = surplus - tiktokSurplus;

  const allSurplusAwbs = (surplusAwbsRes.data || []).map((r) => r.awb);

  res.setHeader('Cache-Control', 'public, max-age=5');
  res.json({
    total_expected: pending + fbScanned,
    scanned: fbScanned,
    missing: pending,
    surplus: fbSurplus,
    cancelled,
    total_scanned: fbScanned + fbSurplus,
    tiktok_scanned: tiktokScanned,
    missing_awbs: (missingAwbsRes.data || []).map((r) => r.awb),
    surplus_awbs: allSurplusAwbs.filter((awb) => !awb.startsWith('7')),
    tiktok_surplus_awbs: allSurplusAwbs.filter((awb) => awb.startsWith('7')),
    tiktok_scanned_awbs: (tiktokScannedAwbsRes.data || []).map((r) => r.awb),
    cancelled_awbs: (cancelledAwbsRes.data || []).map((r) => r.awb),
  });
}
