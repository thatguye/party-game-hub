import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

const LOCAL_CREDS_KEY = 'impostor_supabase_creds_v1';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function readLocalCredentials(): SupabaseCredentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseCredentials>;
    if (
      typeof parsed?.url === 'string' &&
      parsed.url.trim().length > 0 &&
      typeof parsed?.anonKey === 'string' &&
      parsed.anonKey.trim().length > 0
    ) {
      return {
        url: normalizeUrl(parsed.url),
        anonKey: parsed.anonKey.trim(),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export function resolveSupabaseConfig(): {
  creds: SupabaseCredentials | null;
  source: 'env' | 'local' | 'none';
} {
  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const envUrl = metaEnv?.VITE_SUPABASE_URL?.trim();
  const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY?.trim();

  if (envUrl && envKey) {
    return {
      creds: { url: normalizeUrl(envUrl), anonKey: envKey },
      source: 'env',
    };
  }

  const localCreds = readLocalCredentials();
  if (localCreds) {
    return { creds: localCreds, source: 'local' };
  }

  return { creds: null, source: 'none' };
}

function buildClient(creds: SupabaseCredentials): SupabaseClient {
  return createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      worker: typeof Worker !== 'undefined',
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// Single module-level Supabase client shared across Impostor and Finders Keepers
const initialConfig = resolveSupabaseConfig();
let activeSignature = initialConfig.creds
  ? `${initialConfig.creds.url}::${initialConfig.creds.anonKey}`
  : '';
let sharedClient: SupabaseClient | null = initialConfig.creds
  ? buildClient(initialConfig.creds)
  : null;

export const supabase: SupabaseClient | null = sharedClient;

export function getSupabaseClient(): SupabaseClient | null {
  const { creds } = resolveSupabaseConfig();
  if (!creds) return null;

  const signature = `${creds.url}::${creds.anonKey}`;
  if (sharedClient && activeSignature === signature) {
    return sharedClient;
  }

  if (sharedClient) {
    try {
      void sharedClient.removeAllChannels();
    } catch {
      // Ignore cleanup errors
    }
  }

  sharedClient = buildClient(creds);
  activeSignature = signature;
  return sharedClient;
}

export function resetSupabaseClient(): void {
  if (sharedClient) {
    try {
      void sharedClient.removeAllChannels();
    } catch {
      // Ignore cleanup errors
    }
  }
  const { creds } = resolveSupabaseConfig();
  if (creds) {
    sharedClient = buildClient(creds);
    activeSignature = `${creds.url}::${creds.anonKey}`;
  } else {
    sharedClient = null;
    activeSignature = '';
  }
}

export function removeSupabaseChannel(channel: RealtimeChannel | null | undefined): void {
  if (!channel) return;
  const client = sharedClient ?? getSupabaseClient();
  if (!client) return;
  try {
    void client.removeChannel(channel);
  } catch {
    // Ignore channel teardown errors
  }
}

export function getActiveRealtimeChannelCount(): number {
  if (!sharedClient) return 0;
  try {
    return sharedClient.getChannels().length;
  } catch {
    return 0;
  }
}

// Expose read-only channel count helper for diagnostics & browser verification
if (typeof window !== 'undefined') {
  (window as Window & { __PARTY_HUB_CHANNELS__?: () => string[] }).__PARTY_HUB_CHANNELS__ = () => {
    if (!sharedClient) return [];
    try {
      return sharedClient.getChannels().map((ch) => ch.topic);
    } catch {
      return [];
    }
  };
}
