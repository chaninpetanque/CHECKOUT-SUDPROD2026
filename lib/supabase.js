import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_KEY ??
  '';
const isSupabaseReady = Boolean(supabaseUrl && supabaseKey);

const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

export { supabase, isSupabaseReady };
