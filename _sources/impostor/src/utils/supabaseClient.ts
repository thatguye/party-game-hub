import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { OnlineRoomState, SupabaseCredentials } from '../types/game';
import { loadSupabaseCredentials } from './storage';

export const ROOMS_TABLE_SQL = `-- Run this once in your Supabase SQL Editor
create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "Allow anonymous party room access" on public.rooms;
create policy "Allow anonymous party room access"
  on public.rooms for all
  using (true)
  with check (true);

alter publication supabase_realtime add table public.rooms;`;

export const DEFAULT_SUPABASE_URL = 'https://bjnhbwqssckkdouohswe.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_BgrOzjkhMZF28tWKVtAOkA_4d6NIo1E';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function resolveSupabaseCredentials(): {
  creds: SupabaseCredentials;
  source: 'env' | 'local' | 'default';
} {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return {
      creds: { url: envUrl.replace(/\/+$/, ''), anonKey: envKey },
      source: 'env',
    };
  }

  const localCreds = loadSupabaseCredentials();
  if (localCreds) {
    return { creds: localCreds, source: 'local' };
  }

  return {
    creds: {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
    },
    source: 'default',
  };
}

export function resetCachedSupabaseClient(): void {
  if (cachedClient) {
    try {
      cachedClient.removeAllChannels();
    } catch {
      // Ignore cleanup errors
    }
  }
  cachedClient = null;
  cachedKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const { creds } = resolveSupabaseCredentials();
  if (!creds) return null;

  const signature = `${creds.url}::${creds.anonKey}`;
  if (cachedClient && cachedKey === signature) {
    return cachedClient;
  }

  resetCachedSupabaseClient();

  cachedClient = createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      worker: true,
    },
  });
  cachedKey = signature;
  return cachedClient;
}

export async function testSupabaseConnection(
  creds: SupabaseCredentials
): Promise<{ ok: boolean; needsTable?: boolean; error?: string }> {
  try {
    const testClient = createClient(
      creds.url.trim().replace(/\/+$/, ''),
      creds.anonKey.trim(),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { worker: true },
      }
    );
    const { error } = await testClient.from('rooms').select('code').limit(1);
    if (error) {
      const msg = error.message || 'Connection failed';
      const missingTable =
        msg.includes('relation') ||
        msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        error.code === '42P01';
      return {
        ok: false,
        needsTable: missingTable,
        error: missingTable
          ? 'Connected to Supabase, but the "rooms" table is missing. Copy and run the SQL below in your Supabase SQL Editor.'
          : msg,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Supabase project.',
    };
  }
}

export async function createRoomRow(room: OnlineRoomState): Promise<OnlineRoomState> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await client
    .from('rooms')
    .insert({
      code: room.code,
      state: room,
      updated_at: new Date().toISOString(),
    })
    .select('state')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return (data?.state as OnlineRoomState) ?? room;
}

export async function fetchRoomRow(code: string): Promise<OnlineRoomState | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await client
    .from('rooms')
    .select('state')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data?.state as OnlineRoomState) ?? null;
}

/**
 * Optimistically reads the latest room JSON row, applies a pure transition function,
 * and writes back. Retries automatically if another player wrote concurrently.
 */
export async function mutateRoomRow(
  code: string,
  mutator: (current: OnlineRoomState) => OnlineRoomState,
  maxRetries = 5
): Promise<OnlineRoomState | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured yet.');
  }

  const cleanCode = code.toUpperCase();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = await fetchRoomRow(cleanCode);
    if (!current) return null;

    const next = mutator(current);
    if (next === current) return current;

    const { data, error } = await client
      .from('rooms')
      .update({
        state: next,
        updated_at: new Date().toISOString(),
      })
      .eq('code', cleanCode)
      .filter('state->>version', 'eq', String(current.version))
      .select('state')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.state) {
      return data.state as OnlineRoomState;
    }
    // Version mismatch due to simultaneous player action — brief backoff and retry
    await new Promise((resolve) => setTimeout(resolve, 40 + attempt * 35));
  }

  // Fallback latest fetch if retries exhausted
  return fetchRoomRow(cleanCode);
}

export function subscribeToRoomRow(
  code: string,
  onRoomUpdate: (room: OnlineRoomState) => void,
  onStatusChange?: (status: string) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const cleanCode = code.toUpperCase();
  const channel: RealtimeChannel = client
    .channel(`room:${cleanCode}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${cleanCode}`,
      },
      (payload) => {
        const record = payload.new as { state?: OnlineRoomState } | null;
        if (record?.state) {
          onRoomUpdate(record.state);
        }
      }
    )
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return () => {
    client.removeChannel(channel);
  };
}
