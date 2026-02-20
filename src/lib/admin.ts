/** Admin user IDs — loaded from env var ADMIN_IDS (comma-separated UUIDs) */
const raw = import.meta.env.ADMIN_IDS || '';
export const ADMIN_IDS: string[] = raw
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean);

export function isAdmin(userId?: string | null): boolean {
  return !!userId && ADMIN_IDS.includes(userId);
}
