import { supabase } from './supabase';

/** Statuses a visitor may see. Drafts and archived records never leave the admin. */
export const PUBLIC_OPPORTUNITY_STATUSES = ['available', 'reserved', 'sold'] as const;

/**
 * Every public read of opportunities goes through here.
 * RLS already enforces the same rule; the explicit filter keeps a signed-in
 * admin browsing the public site from seeing drafts or private records.
 */
export function publicOpportunities() {
  return supabase
    .from('properties')
    .select('*')
    .eq('visibility', 'public')
    .in('status', [...PUBLIC_OPPORTUNITY_STATUSES]);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Memo URLs accept either the record id or its slug. */
export function publicOpportunityByKey(key: string) {
  const query = publicOpportunities();
  return UUID_PATTERN.test(key) ? query.eq('id', key) : query.eq('slug', key);
}

/** Count only. Private records themselves are never sent to the browser. */
export async function privateOpportunityCount(): Promise<number> {
  const { data, error } = await supabase.rpc('private_opportunity_count');
  if (error || typeof data !== 'number') return 0;
  return data;
}
