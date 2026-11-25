import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, EmergencyAlert, GpsPoint, RoomState, TagEvent } from '../types/game';
import { roundCoord } from '../game/geo';

const FALLBACK_SUPABASE_URL = 'https://bjnhbwqssckkdouohswe.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_BgrOzjkhMZF28tWKVtAOkA_4d6NIo1E';

const OFFLINE_QUEUE_KEY = 'fk_offline_queue_v1';

export type QueuedAction =
  | {
      type: 'gps';
      roomCode: string;
      payload: { playerId: string; lat: number; lng: number; ts: number };
      queuedAt: number;
    }
  | {
      type: 'tag';
      roomCode: string;
      payload: {
        taggedId: string;
        taggerId?: string;
        reason: TagEvent['reason'];
        ts: number;
      };
      queuedAt: number;
    }
  | {
      type: 'emergency';
      roomCode: string;
      payload: EmergencyAlert;
      queuedAt: number;
    }
  | {
      type: 'room_sync';
      roomCode: string;
      payload: RoomState;
      queuedAt: number;
    };

export interface RoomBroadcastHandlers {
  onGpsDelta: (delta: { playerId: string; lat: number; lng: number; ts: number }) => void;
  onRoomUpdate: (room: RoomState) => void;
  onTagSignal: (tag: {
    taggedId: string;
    taggerId?: string;
    reason: TagEvent['reason'];
    ts: number;
  }) => void;
  onEmergencySignal: (alert: EmergencyAlert | null) => void;
  onChatMessage: (message: ChatMessage) => void;
  onMeetingVote: (vote: { voterId: string; targetId: string }) => void;
  onQueueCountChange?: (count: number) => void;
}

class SupabaseSyncService {
  private client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private activeRoomCode: string | null = null;
  private handlers: RoomBroadcastHandlers | null = null;
  private queue: QueuedAction[] = [];
  private flushing = false;
  private flushTimer: number | null = null;

  constructor() {
    const url =
      (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || FALLBACK_SUPABASE_URL;
    const key =
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
      FALLBACK_SUPABASE_KEY;

    this.client = createClient(url, key, {
      realtime: {
        worker: true,
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.loadQueue();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.flushQueue();
      });
    }
  }

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private persistQueue(): void {
    try {
      // Cap queue to 60 items to keep localStorage lean during long dead zones
      const trimmed = this.queue.slice(-60);
      this.queue = trimmed;
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed));
      this.handlers?.onQueueCountChange?.(this.queue.length);
    } catch {
      // ignore
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  private enqueue(action: QueuedAction): void {
    // Deduplicate GPS updates for same player in queue (keep newest)
    if (action.type === 'gps') {
      this.queue = this.queue.filter(
        (q) =>
          !(
            q.type === 'gps' &&
            q.roomCode === action.roomCode &&
            q.payload.playerId === action.payload.playerId
          )
      );
    }
    this.queue.push(action);
    this.persistQueue();
  }

  public async persistRoom(room: RoomState): Promise<boolean> {
    if (room.isSoloDemo) return true;
    const code = room.code.toUpperCase();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueue({ type: 'room_sync', roomCode: code, payload: room, queuedAt: Date.now() });
      return false;
    }

    try {
      // Upsert authoritative room state into scram_rooms (code + state JSONB)
      const { error } = await this.client.from('scram_rooms').upsert(
        {
          code,
          state: room,
          updated_at: new Date(room.updatedAt).toISOString(),
        },
        { onConflict: 'code' }
      );
      if (error) {
        // Fallback: try minimal column set (code + data) if schema differs, otherwise keep working via Realtime Broadcast
        await this.client.from('scram_rooms').upsert(
          {
            code,
            data: room,
          },
          { onConflict: 'code' }
        );
      }

      if (this.channel && this.activeRoomCode === code) {
        await this.channel.send({
          type: 'broadcast',
          event: 'room_state',
          payload: room,
        });
      }
      return true;
    } catch {
      this.enqueue({ type: 'room_sync', roomCode: code, payload: room, queuedAt: Date.now() });
      return false;
    }
  }

  public async fetchRoom(codeInput: string): Promise<RoomState | null> {
    const code = codeInput.trim().toUpperCase();
    if (!code) return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return null;
    }
    try {
      const { data, error } = await this.client
        .from('scram_rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error || !data) return null;
      const candidate = (data.state ?? data.data ?? data.room_state) as RoomState | undefined;
      if (candidate && candidate.code) {
        return candidate;
      }
      return null;
    } catch {
      return null;
    }
  }

  public subscribeRoom(codeInput: string, handlers: RoomBroadcastHandlers): void {
    const code = codeInput.trim().toUpperCase();
    this.unsubscribe();
    this.activeRoomCode = code;
    this.handlers = handlers;
    handlers.onQueueCountChange?.(this.queue.length);

    const channelName = `fk-${code}`;
    const channel = this.client.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on('broadcast', { event: 'gps' }, ({ payload }) => {
        if (payload && typeof payload.lat === 'number' && typeof payload.lng === 'number') {
          this.handlers?.onGpsDelta(payload);
        }
      })
      .on('broadcast', { event: 'room_state' }, ({ payload }) => {
        if (payload && payload.code) {
          this.handlers?.onRoomUpdate(payload as RoomState);
        }
      })
      .on('broadcast', { event: 'tag' }, ({ payload }) => {
        if (payload && payload.taggedId) {
          this.handlers?.onTagSignal(payload);
        }
      })
      .on('broadcast', { event: 'emergency' }, ({ payload }) => {
        this.handlers?.onEmergencySignal(payload?.alert ?? null);
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (payload && payload.id && payload.kind) {
          this.handlers?.onChatMessage(payload as ChatMessage);
        }
      })
      .on('broadcast', { event: 'meeting_vote' }, ({ payload }) => {
        if (payload && payload.voterId) {
          this.handlers?.onMeetingVote(payload);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void this.flushQueue();
        }
      });

    this.channel = channel;

    // Periodic queue retry for dead-zone recovery
    if (typeof window !== 'undefined') {
      if (this.flushTimer) window.clearInterval(this.flushTimer);
      this.flushTimer = window.setInterval(() => {
        if (navigator.onLine && this.queue.length > 0) {
          void this.flushQueue();
        }
      }, 6000);
    }
  }

  public unsubscribe(): void {
    if (this.flushTimer && typeof window !== 'undefined') {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.channel) {
      void this.client.removeChannel(this.channel);
      this.channel = null;
    }
    this.activeRoomCode = null;
    this.handlers = null;
  }

  public async sendGpsDelta(roomCode: string, playerId: string, point: GpsPoint): Promise<void> {
    const payload = {
      playerId,
      lat: roundCoord(point.lat),
      lng: roundCoord(point.lng),
      ts: point.ts,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueue({ type: 'gps', roomCode, payload, queuedAt: Date.now() });
      return;
    }

    if (!this.channel || this.activeRoomCode !== roomCode.toUpperCase()) {
      this.enqueue({ type: 'gps', roomCode, payload, queuedAt: Date.now() });
      return;
    }

    try {
      const res = await this.channel.send({
        type: 'broadcast',
        event: 'gps',
        payload,
      });
      if (res !== 'ok') {
        this.enqueue({ type: 'gps', roomCode, payload, queuedAt: Date.now() });
      }
    } catch {
      this.enqueue({ type: 'gps', roomCode, payload, queuedAt: Date.now() });
    }
  }

  public async sendTagSignal(
    roomCode: string,
    taggedId: string,
    taggerId: string | undefined,
    reason: TagEvent['reason'],
    ts: number
  ): Promise<void> {
    const payload = { taggedId, taggerId, reason, ts };
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || !this.channel) {
      this.enqueue({ type: 'tag', roomCode, payload, queuedAt: Date.now() });
      return;
    }
    try {
      const res = await this.channel.send({ type: 'broadcast', event: 'tag', payload });
      if (res !== 'ok') {
        this.enqueue({ type: 'tag', roomCode, payload, queuedAt: Date.now() });
      }
    } catch {
      this.enqueue({ type: 'tag', roomCode, payload, queuedAt: Date.now() });
    }
  }

  public async sendEmergencySignal(roomCode: string, alert: EmergencyAlert | null): Promise<void> {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || !this.channel) {
      if (alert) {
        this.enqueue({ type: 'emergency', roomCode, payload: alert, queuedAt: Date.now() });
      }
      return;
    }
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'emergency',
        payload: { alert },
      });
    } catch {
      if (alert) {
        this.enqueue({ type: 'emergency', roomCode, payload: alert, queuedAt: Date.now() });
      }
    }
  }

  public async sendChatMessage(message: ChatMessage): Promise<void> {
    if (!this.channel || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: message,
      });
    } catch {
      // chat broadcast best-effort during dead zone
    }
  }

  public async sendMeetingVote(voterId: string, targetId: string): Promise<void> {
    if (!this.channel) return;
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'meeting_vote',
        payload: { voterId, targetId },
      });
    } catch {
      // ignore
    }
  }

  public async flushQueue(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    this.flushing = true;

    const pending = [...this.queue];
    const remaining: QueuedAction[] = [];

    for (const item of pending) {
      // Drop stale items older than 20 min
      if (Date.now() - item.queuedAt > 20 * 60_000) continue;
      try {
        if (item.type === 'room_sync') {
          const ok = await this.persistRoom(item.payload);
          if (!ok) remaining.push(item);
        } else if (this.channel && this.activeRoomCode === item.roomCode.toUpperCase()) {
          const eventName =
            item.type === 'gps' ? 'gps' : item.type === 'tag' ? 'tag' : 'emergency';
          const payload = item.type === 'emergency' ? { alert: item.payload } : item.payload;
          const res = await this.channel.send({ type: 'broadcast', event: eventName, payload });
          if (res !== 'ok') remaining.push(item);
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    this.queue = remaining;
    this.persistQueue();
    this.flushing = false;
  }
}

export const supabaseSync = new SupabaseSyncService();
