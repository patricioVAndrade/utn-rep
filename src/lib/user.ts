import type { User } from '@supabase/supabase-js';

export function displayName(user: Pick<User, 'email' | 'user_metadata'>): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'
  );
}
