/** Admin user IDs — these users can see real names on anonymous reviews and delete any review */
export const ADMIN_IDS: string[] = [
  '51cad8fd-7691-4fbb-8ca3-1bb57a9748c5',
  '9a7385bb-999c-4cf0-8217-70bf54b83dcc',
];

export function isAdmin(userId?: string | null): boolean {
  return !!userId && ADMIN_IDS.includes(userId);
}
