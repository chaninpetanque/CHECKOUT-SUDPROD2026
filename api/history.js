import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getQuery = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    date: url.searchParams.get('date') || getTodayDate(),
    search: url.searchParams.get('search') || ''
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { date, search } = getQuery(req);

  if (!isSupabaseReady) {
    res.json(mockService.history(date, search));
    return;
  }

  let query = supabase
    .from('parcels')
    .select('id, awb, status, date, created_at, updated_at')
    .eq('date', date)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (search) {
    query = query.ilike('awb', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=3');
  res.json(data);
}
