import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase is not configured — set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
