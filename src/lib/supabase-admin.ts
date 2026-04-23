import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client with the SERVICE ROLE key.
 * This bypasses RLS — use ONLY in server-side admin API routes
 * after verifying the caller is an admin via isAdmin().
 */
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || '', {
  auth: { autoRefreshToken: false, persistSession: false },
});
