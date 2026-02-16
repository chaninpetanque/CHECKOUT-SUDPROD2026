import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

test('supabase rls e2e', async (t) => {
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    '';

  if (!supabaseUrl || !supabaseKey) {
    t.skip('Missing SUPABASE_URL or key');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const date = new Date().toISOString().split('T')[0];
  const awb = `E2E-${Date.now()}`;

  // 1. Insert
  const insertRes = await supabase.from('parcels').insert([{ awb, status: 'uploaded', date }]);
  assert.equal(insertRes.error, null);

  // 2. Select (Uploaded)
  const selectRes = await supabase
    .from('parcels')
    .select('awb,status,date')
    .eq('awb', awb)
    .eq('date', date)
    .maybeSingle();
  assert.equal(selectRes.error, null);
  assert.equal(selectRes.data?.status, 'uploaded');

  // 3. Update (Scanned)
  const updateRes = await supabase
    .from('parcels')
    .update({ status: 'scanned', updated_at: new Date().toISOString() })
    .eq('awb', awb)
    .eq('date', date);
  assert.equal(updateRes.error, null);

  // 4. Select (Scanned)
  const selectRes2 = await supabase
    .from('parcels')
    .select('status')
    .eq('awb', awb)
    .eq('date', date)
    .maybeSingle();
  assert.equal(selectRes2.error, null);
  assert.equal(selectRes2.data?.status, 'scanned');

  // 5. Delete
  const deleteRes = await supabase
    .from('parcels')
    .delete()
    .eq('awb', awb)
    .eq('date', date);
  assert.equal(deleteRes.error, null);
});
