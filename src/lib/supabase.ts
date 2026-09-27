import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Green Hill isolation gate.
 * When credentials are absent, no network calls are made to any Supabase project.
 * Only a dedicated Green Hill project's credentials may ever be configured.
 */
export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    /^https?:\/\//i.test(supabaseUrl)
);

const disconnectedError = {
  message: 'Supabase is not configured. Green Hill is isolated from external databases.',
  name: 'SupabaseDisconnectedError',
  status: 0,
} as const;

type DisconnectedResult = {
  data: null;
  error: typeof disconnectedError;
  count: null;
  status: 0;
  statusText: 'DISCONNECTED';
};

function createDisconnectedThenable(): PromiseLike<DisconnectedResult> & Record<string, unknown> {
  const result: DisconnectedResult = {
    data: null,
    error: disconnectedError,
    count: null,
    status: 0,
    statusText: 'DISCONNECTED',
  };
  const promise = Promise.resolve(result);

  const chain: Record<string, unknown> = {};
  const get = (_target: unknown, prop: string | symbol) => {
    if (prop === 'then') return promise.then.bind(promise);
    if (prop === 'catch') return promise.catch.bind(promise);
    if (prop === 'finally') return promise.finally.bind(promise);
    return (..._args: unknown[]) => new Proxy(chain, { get, apply: () => new Proxy(chain, { get }) });
  };

  return new Proxy(chain, { get, apply: () => new Proxy(chain, { get }) }) as PromiseLike<DisconnectedResult> &
    Record<string, unknown>;
}

function createDisconnectedClient(): SupabaseClient {
  const authStub = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => undefined, id: 'disconnected', callback: () => undefined } },
    }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: disconnectedError }),
    signUp: async () => ({ data: { user: null, session: null }, error: disconnectedError }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: disconnectedError }),
    updateUser: async () => ({ data: { user: null }, error: disconnectedError }),
    exchangeCodeForSession: async () => ({ data: { session: null, user: null }, error: disconnectedError }),
    setSession: async () => ({ data: { session: null, user: null }, error: disconnectedError }),
  };

  const storageBucket = {
    upload: async () => ({ data: null, error: disconnectedError }),
    download: async () => ({ data: null, error: disconnectedError }),
    remove: async () => ({ data: null, error: disconnectedError }),
    list: async () => ({ data: null, error: disconnectedError }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
  };

  const client = {
    from: () => createDisconnectedThenable(),
    rpc: () => createDisconnectedThenable(),
    auth: authStub,
    storage: {
      from: () => storageBucket,
    },
    functions: {
      invoke: async () => ({ data: null, error: disconnectedError }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => undefined }) }),
      subscribe: () => ({ unsubscribe: () => undefined }),
      unsubscribe: () => undefined,
    }),
    removeChannel: () => undefined,
    removeAllChannels: () => undefined,
    getChannels: () => [],
  };

  return client as unknown as SupabaseClient;
}

/**
 * Some mobile browsers never release `navigator.locks`. `getSession()` then
 * never returns, and the admin stays on "Checking your session". Skipping the
 * lock keeps sign-in and the public reads moving.
 */
const authLock = async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn();

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { lock: authLock },
    })
  : createDisconnectedClient();

/**
 * Reads for visitors. Never attaches a stored login.
 * A stale session on a phone was sent as the bearer token, the database
 * rejected it, and the collection rendered as empty while a signed-in laptop
 * still saw the rows. Some mobile browsers also break the auth lock, so this
 * client does not take it.
 */
export const supabasePublic: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-greenhill-public',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        lock: authLock,
      },
    })
  : createDisconnectedClient();
