import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const today = getTodayDate();

  if (!isSupabaseReady) {
    const result = mockService.clearOld();
    res.json({ message: `Cleared ${result.cleared} old pending records.` });
    return;
  }

  const { error, count } = await supabase
    .from('parcels')
    .delete({ count: 'exact' })
    .eq('status', 'uploaded')
    .neq('date', today);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: `Cleared ${count ?? 0} old pending records.` });
}
