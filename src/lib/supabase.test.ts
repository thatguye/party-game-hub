import assert from 'node:assert/strict';
import test from 'node:test';
import { getActiveRealtimeChannelCount, getSupabaseClient, resetSupabaseClient } from './supabase';

test('shared Supabase client enforces isolated channel namespaces and strict removeChannel cleanup', async () => {
  const prevStorage = (globalThis as { localStorage?: Storage }).localStorage;
  const prevWindow = (globalThis as { window?: unknown }).window;
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;

  (globalThis as { localStorage?: Storage }).localStorage = mockStorage;
  (globalThis as { window?: unknown }).window = {
    localStorage: mockStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };

  mockStorage.setItem(
    'impostor_supabase_creds_v1',
    JSON.stringify({
      url: 'https://example.supabase.co',
      anonKey: 'test-anon-key',
    })
  );

  try {
    resetSupabaseClient();
    const clientA = getSupabaseClient();
    const clientB = getSupabaseClient();
    assert.ok(clientA, 'shared Supabase client should initialize');
    assert.equal(clientA, clientB, 'should return the exact same module-level singleton instance');
    assert.equal(getActiveRealtimeChannelCount(), 0);

    const impChannel = clientA.channel('impostor:room:K9XP');
    const fkChannel = clientA.channel('fk:room:FK84XP');

    assert.notEqual(impChannel.topic, fkChannel.topic);
    assert.ok(impChannel.topic.includes('impostor:room:K9XP'));
    assert.ok(fkChannel.topic.includes('fk:room:FK84XP'));
    assert.equal(getActiveRealtimeChannelCount(), 2);

    await clientA.removeChannel(impChannel);
    assert.equal(getActiveRealtimeChannelCount(), 1);

    await clientA.removeChannel(fkChannel);
    assert.equal(getActiveRealtimeChannelCount(), 0);
  } finally {
    resetSupabaseClient();
    (globalThis as { localStorage?: Storage }).localStorage = prevStorage;
    (globalThis as { window?: unknown }).window = prevWindow;
  }
});
