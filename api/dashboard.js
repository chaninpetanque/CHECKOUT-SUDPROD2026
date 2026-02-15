import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getQueryDate = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return url.searchParams.get('date') || getTodayDate();
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const date = getQueryDate(req);

  if (!isSupabaseReady) {
    res.json(mockService.dashboard(date));
    return;
  }

  const { data, error } = await supabase
    .from('parcels')
    .select('status', { count: 'exact' })
    .eq('date', date);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const pending = data.filter((row) => row.status === 'uploaded').length;
  const scanned = data.filter((row) => row.status === 'scanned').length;
  const surplus = data.filter((row) => row.status === 'surplus').length;

  res.json({
    total_expected: pending + scanned,
    scanned,
    missing: pending,
    surplus
  });
}
