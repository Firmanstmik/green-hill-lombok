import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabasePublic } from './supabase';
import { publicOpportunities } from './publicOpportunities';

type Row = Record<string, unknown>;

let cache: Row[] | null = null;
let settled = false;
let started = false;
let pullToken = 0;
let lastStarted = 0;
const listeners = new Set<() => void>();

function publish() {
  listeners.forEach((listener) => listener());
}

/** One retry, and a failed refresh never wipes a list the visitor already has. */
async function pull() {
  const token = ++pullToken;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await publicOpportunities().order('created_at', { ascending: false });
    if (token !== pullToken) return;
    if (!error && Array.isArray(data)) {
      cache = data as Row[];
      settled = true;
      publish();
      return;
    }
    lastError = error;
    if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 450));
    if (token !== pullToken) return;
  }
  console.error('Error fetching properties:', lastError);
  settled = true;
  publish();
}

function requestPull() {
  const now = Date.now();
  if (now - lastStarted < 800) return;
  lastStarted = now;
  void pull();
}

function ensureWatching() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  lastStarted = Date.now();
  void pull();

  const refresh = () => {
    if (document.visibilityState === 'visible') requestPull();
  };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);

  const channel = supabasePublic
    .channel('greenhill-public-properties')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
      lastStarted = 0;
      requestPull();
    })
    .subscribe();

  // The watch lives for the page session. Navigation keeps the same cache.
  void channel;
}

/**
 * The public collection, kept after the first successful read.
 * A later network error does not empty it, and a change in the database
 * refreshes the list without a manual reload.
 */
export function usePublicOpportunities() {
  const [rows, setRows] = useState<Row[]>(() => cache ?? []);
  const [loaded, setLoaded] = useState(() => settled || !isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    const sync = () => {
      if (cache !== null) setRows(cache);
      setLoaded(settled);
    };
    listeners.add(sync);
    ensureWatching();
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { rows, loaded };
}
