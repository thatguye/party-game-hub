import type {
  BadgeDefinition,
  BadgeId,
  CareerProfile,
  ChatMessage,
  GameMode,
  GpsPoint,
  LatLng,
  OobStatus,
  PlayerState,
  RoomSettings,
  RoomState,
  RoundPhase,
  ScoreBreakdown,
  TagEvent,
  TeamRole,
} from '../types/game';
import { createDefaultPolygonAround, haversineMeters, totalPathDistanceMeters } from './geo';

export const DEFAULT_COORDS: LatLng = { lat: 37.7694, lng: -122.4862 }; // Golden Gate Park fallback

export const PLAYER_COLORS = [
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#F59E0B', // amber
  '#EF4444', // crimson
  '#8B5CF6', // violet
  '#EC4899', // rose
  '#3B82F6', // blue
  '#84CC16', // lime
  '#F97316', // orange
  '#14B8A6', // teal
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_hunt',
    name: 'First Deployment',
    description: 'Complete your first Finders Keepers round.',
    tier: 'standard',
  },
  {
    id: 'ghost_runner',
    name: 'Untouchable',
    description: 'Survive a full round as a Runner without ever being tagged.',
    tier: 'standard',
  },
  {
    id: 'clean_sweep',
    name: 'Clean Sweep',
    description: 'Tag every Runner in a round as Hunter.',
    tier: 'milestone',
  },
  {
    id: 'marathon_5k',
    name: 'Field Runner 3 Mi',
    description: 'Accumulate 3 miles of tracked GPS pursuit distance.',
    tier: 'standard',
  },
  {
    id: 'night_owl',
    name: 'Night Ops',
    description: 'Complete a round using the Night Tactical map theme.',
    tier: 'standard',
  },
  {
    id: 'imposter_hunter',
    name: 'Mole Catcher',
    description: 'Complete a match of Imposter mode.',
    tier: 'standard',
  },
  {
    id: 'apex_tracker',
    name: 'Apex Tracker',
    description: 'Reach 10 lifetime tags across all games.',
    tier: 'milestone',
  },
  {
    id: 'phantom_legend',
    name: 'Phantom Legend',
    description: 'Earn 5 career victories or 100 career points.',
    tier: 'milestone',
  },
];

export interface BuiltInPreset {
  id: 'quick' | 'standard' | 'big_park';
  name: string;
  summary: string;
  patch: Partial<RoomSettings>;
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    id: 'quick',
    name: 'Quick',
    summary: '15m · 1m ping · 0.5 mi',
    patch: {
      roundLengthMin: 15,
      pingIntervalMin: 1,
      headStartMin: 1,
      zoneShrinkEnabled: true,
      finalZoneDiameterMeters: 244, // 800 ft
    },
  },
  {
    id: 'standard',
    name: 'Standard',
    summary: '60m · 2m ping · 2.0 mi',
    patch: {
      roundLengthMin: 60,
      pingIntervalMin: 2,
      headStartMin: 3,
      zoneShrinkEnabled: true,
      finalZoneDiameterMeters: 483, // 0.3 mi
    },
  },
  {
    id: 'big_park',
    name: 'Big Park',
    summary: '120m · 5m ping · 3.5 mi',
    patch: {
      roundLengthMin: 120,
      pingIntervalMin: 5,
      headStartMin: 5,
      zoneShrinkEnabled: true,
      finalZoneDiameterMeters: 966, // 0.6 mi
    },
  },
];

export function createDefaultSettings(center: LatLng = DEFAULT_COORDS): RoomSettings {
  return {
    mode: 'classic',
    roundLengthMin: 60,
    pingIntervalMin: 2,
    headStartMin: 3,
    zone: {
      shape: 'circle',
      center,
      diameterMeters: 3219, // 2.0 mi
      polygon: createDefaultPolygonAround(center, 650),
    },
    zoneShrinkEnabled: true,
    finalZoneDiameterMeters: 483, // 0.3 mi
    spectatorAccess: 'live',
    units: 'mi',
    mapTheme: 'night',
  };
}

export function applyBuiltInPreset(current: RoomSettings, presetId: BuiltInPreset['id']): RoomSettings {
  const found = BUILT_IN_PRESETS.find((p) => p.id === presetId);
  if (!found) return current;
  const diameterMap: Record<BuiltInPreset['id'], number> = {
    quick: 805, // 0.5 mi
    standard: 3219, // 2.0 mi
    big_park: 5633, // 3.5 mi
  };
  return {
    ...current,
    ...found.patch,
    zone: {
      ...current.zone,
      diameterMeters: diameterMap[presetId],
    },
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Auto-balances teams at round start:
 * - Minimum 1 Hunter per 10 players: Math.max(1, Math.ceil(n / 10))
 * - Never more Hunters than Runners (maxHunters = Math.floor(n / 2) when n >= 2)
 * - Respects player preferences ('hunter', 'runner', 'random') as closely as constraints allow.
 * - Assigns secret Imposters in 'imposter' mode.
 */
export function assignTeams(
  players: PlayerState[],
  mode: GameMode,
  rng: () => number = Math.random
): PlayerState[] {
  const n = players.length;
  if (n === 0) return [];

  const minHunters = n >= 2 ? Math.max(1, Math.ceil(n / 10)) : 1;
  const maxHunters = n >= 2 ? Math.floor(n / 2) : 1;

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const wantHunter = shuffle(players.filter((p) => p.preference === 'hunter'));
  const wantRunner = shuffle(players.filter((p) => p.preference === 'runner'));
  const wantRandom = shuffle(players.filter((p) => p.preference === 'random'));

  const hunterIds = new Set<string>();

  // 1. Honor Hunter preferences up to maxHunters
  for (const p of wantHunter) {
    if (hunterIds.size < maxHunters) {
      hunterIds.add(p.id);
    }
  }

  // 2. Fill up to minHunters from Random, then Runner if required
  for (const p of wantRandom) {
    if (hunterIds.size < minHunters) {
      hunterIds.add(p.id);
    }
  }
  for (const p of wantRunner) {
    if (hunterIds.size < minHunters) {
      hunterIds.add(p.id);
    }
  }

  // 3. Assign secret imposters if mode === 'imposter'
  const imposterIds = new Set<string>();
  if (mode === 'imposter' && n >= 3) {
    const imposterCount = Math.max(1, Math.floor(n / 4));
    const runnerCandidates = shuffle(players.filter((p) => !hunterIds.has(p.id)));
    for (const candidate of runnerCandidates.slice(0, imposterCount)) {
      imposterIds.add(candidate.id);
    }
  }

  return players.map((p) => {
    const role: TeamRole = hunterIds.has(p.id) ? 'hunter' : 'runner';
    return {
      ...p,
      role,
      initialRole: role,
      isImposter: imposterIds.has(p.id),
      eliminated: false,
      eliminatedAt: undefined,
      taggedBy: undefined,
      tagsCount: 0,
      oobStartedAt: null,
      oobStatus: 'inside',
    };
  });
}

export const OOB_COUNTDOWN_SECONDS = 30;

export type LocationAccessStatus = 'checking' | 'granted' | 'denied' | 'unavailable';

/**
 * Mandatory GPS gate: players must have granted real device location access
 * with finite coordinates before hosting, joining, or starting a game.
 */
export function canAccessGameWithLocation(
  status: LocationAccessStatus,
  pos: LatLng | null | undefined
): pos is LatLng {
  return (
    status === 'granted' &&
    !!pos &&
    Number.isFinite(pos.lat) &&
    Number.isFinite(pos.lng)
  );
}

export interface OobEvaluation {
  status: OobStatus;
  elapsedSec: number;
  secondsUntilExposed: number;
  secondsUntilEliminated: number;
}

/**
 * Single-stage Out-of-Bounds Elimination Rule (No Grace Period):
 * - 0..29.9s outside: 'warning' (30-second countdown to return inside boundary)
 * - >= 30s outside: 'eliminated' (automatically out / tagged immediately)
 */
export function evaluateOobState(
  isOutside: boolean,
  oobStartedAt: number | null | undefined,
  nowMs: number
): OobEvaluation {
  if (!isOutside || !oobStartedAt) {
    return {
      status: 'inside',
      elapsedSec: 0,
      secondsUntilExposed: OOB_COUNTDOWN_SECONDS,
      secondsUntilEliminated: OOB_COUNTDOWN_SECONDS,
    };
  }
  const elapsedSec = Math.max(0, (nowMs - oobStartedAt) / 1000);
  if (elapsedSec >= OOB_COUNTDOWN_SECONDS) {
    return {
      status: 'eliminated',
      elapsedSec,
      secondsUntilExposed: 0,
      secondsUntilEliminated: 0,
    };
  }
  const remaining = Math.ceil(OOB_COUNTDOWN_SECONDS - elapsedSec);
  return {
    status: 'warning',
    elapsedSec,
    secondsUntilExposed: remaining,
    secondsUntilEliminated: remaining,
  };
}

/**
 * Cellular data optimization throttle:
 * - Moving > 3 meters: upload every 4 seconds
 * - Stationary <= 3 meters: upload every 12 seconds
 */
export function shouldThrottleGpsUpload(
  lastUploaded: GpsPoint | null | undefined,
  nextPoint: GpsPoint
): boolean {
  if (!lastUploaded) return true;
  const elapsedMs = nextPoint.ts - lastUploaded.ts;
  const movedMeters = haversineMeters(lastUploaded, nextPoint);
  if (movedMeters > 3) {
    return elapsedMs >= 4000;
  }
  return elapsedMs >= 12000;
}

export function checkWinCondition(
  room: RoomState,
  nowMs: number
): { winner: RoomState['winner']; reason?: string } {
  if (room.phase === 'lobby' || room.phase === 'head_start') {
    return { winner: null };
  }

  const activeRunners = room.players.filter((p) => p.role === 'runner' && !p.eliminated);

  if (room.settings.mode === 'imposter') {
    const activeImposters = room.players.filter((p) => p.isImposter && !p.eliminated);
    const activeCrewRunners = activeRunners.filter((p) => !p.isImposter);
    if (activeImposters.length === 0) {
      return { winner: 'runners', reason: 'All Imposters were identified and voted out!' };
    }
    if (activeCrewRunners.length === 0) {
      return { winner: 'imposters', reason: 'Imposters & Hunters eliminated all loyal Runners!' };
    }
  }

  if (activeRunners.length === 0) {
    return {
      winner: 'hunters',
      reason:
        room.settings.mode === 'infection'
          ? 'Every Runner has been infected!'
          : 'Clean sweep! All Runners were tagged.',
    };
  }

  if (room.roundEndsAt && nowMs >= room.roundEndsAt) {
    return {
      winner: 'runners',
      reason: `${activeRunners.length} Runner${activeRunners.length === 1 ? '' : 's'} survived until 00:00!`,
    };
  }

  return { winner: null };
}

export function processTag(
  room: RoomState,
  taggedPlayerId: string,
  taggerId: string | undefined,
  reason: TagEvent['reason'],
  nowMs: number
): RoomState {
  const target = room.players.find((p) => p.id === taggedPlayerId);
  if (!target || target.eliminated) return room;

  const isInfection = room.settings.mode === 'infection' && reason !== 'voted_out';
  const resultingRole: TeamRole = isInfection ? 'hunter' : 'spectator';

  const tagger = taggerId ? room.players.find((p) => p.id === taggerId) : undefined;

  const updatedPlayers = room.players.map((p) => {
    if (p.id === taggedPlayerId) {
      return {
        ...p,
        role: resultingRole,
        eliminated: !isInfection,
        eliminatedAt: nowMs,
        taggedBy: tagger?.id,
        oobStartedAt: null,
        oobStatus: 'inside' as OobStatus,
      };
    }
    if (tagger && p.id === tagger.id) {
      return {
        ...p,
        tagsCount: p.tagsCount + 1,
      };
    }
    return p;
  });

  const tagEvent: TagEvent = {
    id: `tag_${nowMs}_${taggedPlayerId}`,
    taggedId: target.id,
    taggedName: target.name,
    taggerId: tagger?.id,
    taggerName: tagger?.name,
    reason,
    ts: nowMs,
    resultingRole,
  };

  const nextRoom: RoomState = {
    ...room,
    players: updatedPlayers,
    tags: [...room.tags, tagEvent],
    updatedAt: nowMs,
  };

  const winCheck = checkWinCondition(nextRoom, nowMs);
  if (winCheck.winner) {
    return {
      ...nextRoom,
      phase: 'ended',
      winner: winCheck.winner,
      winReason: winCheck.reason,
    };
  }
  return nextRoom;
}

/**
 * Strict Asymmetrical Fog-of-War Visibility Filter:
 * - Emergency Alert: The player in distress is ALWAYS visible to everyone.
 * - Head Start: Hunters see ONLY fellow Hunters; Runners see fellow Runners.
 * - Hunt:
 *   - Hunters see fellow Hunters live, NEVER see Runners live EXCEPT OOB 'exposed' (>=30s outside).
 *   - Runners see fellow Runners live, NEVER see Hunters live.
 *   - Spectators follow settings.spectatorAccess ('live' | 'delayed_1m' | 'disabled').
 */
export interface VisiblePlayerMarker {
  player: PlayerState;
  position: GpsPoint;
  isExposedOob: boolean;
  isEmergencyPin: boolean;
  isDelayed: boolean;
}

export function filterVisiblePlayers(
  viewer: PlayerState | undefined,
  room: RoomState,
  nowMs: number
): VisiblePlayerMarker[] {
  if (!viewer) return [];
  const results: VisiblePlayerMarker[] = [];

  for (const p of room.players) {
    const isSelf = p.id === viewer.id;
    const isEmergencyPin =
      !!room.emergency?.active && room.emergency.triggeredById === p.id;

    if (isEmergencyPin) {
      const emergencyPos: GpsPoint = p.lastPos ?? {
        lat: room.emergency!.lat,
        lng: room.emergency!.lng,
        ts: room.emergency!.triggeredAt,
      };
      results.push({
        player: p,
        position: emergencyPos,
        isExposedOob: false,
        isEmergencyPin: true,
        isDelayed: false,
      });
      continue;
    }

    if (!p.lastPos) continue;

    if (isSelf) {
      results.push({
        player: p,
        position: p.lastPos,
        isExposedOob: p.oobStatus === 'exposed',
        isEmergencyPin: false,
        isDelayed: false,
      });
      continue;
    }

    if (room.phase === 'ended') {
      results.push({
        player: p,
        position: p.lastPos,
        isExposedOob: false,
        isEmergencyPin: false,
        isDelayed: false,
      });
      continue;
    }

    if (viewer.role === 'hunter') {
      // Hunters ALWAYS see fellow Hunters live
      if (p.role === 'hunter') {
        results.push({
          player: p,
          position: p.lastPos,
          isExposedOob: false,
          isEmergencyPin: false,
          isDelayed: false,
        });
      } else if (
        room.phase === 'hunt' &&
        p.role === 'runner' &&
        !p.eliminated &&
        p.oobStatus === 'exposed'
      ) {
        // 30-second Out-of-Bounds penalty exposes Runner's live GPS to Hunters
        results.push({
          player: p,
          position: p.lastPos,
          isExposedOob: true,
          isEmergencyPin: false,
          isDelayed: false,
        });
      }
      continue;
    }

    if (viewer.role === 'runner') {
      // Runners ONLY see fellow live Runners, NEVER Hunters
      if (p.role === 'runner' && !p.eliminated) {
        results.push({
          player: p,
          position: p.lastPos,
          isExposedOob: p.oobStatus === 'exposed',
          isEmergencyPin: false,
          isDelayed: false,
        });
      }
      continue;
    }

    if (viewer.role === 'spectator') {
      const access = room.settings.spectatorAccess;
      if (access === 'disabled') continue;
      if (access === 'live') {
        results.push({
          player: p,
          position: p.lastPos,
          isExposedOob: p.oobStatus === 'exposed',
          isEmergencyPin: false,
          isDelayed: false,
        });
      } else if (access === 'delayed_1m') {
        const cutoff = nowMs - 60_000;
        const delayedPt = [...p.trail].reverse().find((pt) => pt.ts <= cutoff) ?? p.trail[0];
        if (delayedPt) {
          results.push({
            player: p,
            position: delayedPt,
            isExposedOob: false,
            isEmergencyPin: false,
            isDelayed: true,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Scoring System:
 * - Runners: +1 point per 3 minutes survived + +10 points for never getting caught.
 * - Hunters: +3 points per tag + +10 points for a clean sweep (all Runners tagged).
 */
export function calculateScores(room: RoomState, nowMs: number): ScoreBreakdown[] {
  const start = room.roundStartedAt ?? nowMs;
  const end = room.phase === 'ended' ? room.updatedAt : nowMs;
  const activeRunnersRemaining = room.players.filter(
    (p) => p.role === 'runner' && !p.eliminated
  ).length;
  const isCleanSweep = activeRunnersRemaining === 0 && room.players.some((p) => p.initialRole === 'runner');

  return room.players
    .map((p) => {
      const initialRole = p.initialRole ?? p.role;
      const distanceMeters = totalPathDistanceMeters(p.trail);
      const survivedEnd = p.eliminatedAt ?? end;
      const survivalMinutes = Math.max(0, (survivedEnd - start) / 60_000);
      const survivedAll = initialRole === 'runner' && p.role === 'runner' && !p.eliminated && !p.eliminatedAt;

      let points = 0;
      if (initialRole === 'runner') {
        points += Math.floor(survivalMinutes / 3);
        if (survivedAll) points += 10;
        // If infected and later tagged others as a Hunter, award tag points too
        if (p.role === 'hunter' && p.tagsCount > 0) {
          points += p.tagsCount * 3;
        }
      } else if (initialRole === 'hunter') {
        points += p.tagsCount * 3;
        if (isCleanSweep) points += 10;
      }

      return {
        playerId: p.id,
        playerName: p.name,
        role: p.role,
        initialRole,
        points,
        survivalMinutes: Number(survivalMinutes.toFixed(1)),
        survivedAll,
        tagsCount: p.tagsCount,
        cleanSweepBonus: initialRole === 'hunter' && isCleanSweep,
        distanceMeters,
        color: p.color,
      };
    })
    .sort((a, b) => b.points - a.points || b.tagsCount - a.tagsCount);
}

export function evaluateUnlockedBadges(
  profile: CareerProfile,
  roundRoom: RoomState,
  playerScore: ScoreBreakdown | undefined
): BadgeId[] {
  const unlocked = new Set<BadgeId>(profile.badges);
  unlocked.add('first_hunt');

  if (playerScore?.survivedAll) {
    unlocked.add('ghost_runner');
  }
  if (playerScore?.cleanSweepBonus) {
    unlocked.add('clean_sweep');
  }
  if (profile.totalDistanceMeters >= 4828) {
    unlocked.add('marathon_5k');
  }
  if (roundRoom.settings.mapTheme === 'night') {
    unlocked.add('night_owl');
  }
  if (roundRoom.settings.mode === 'imposter') {
    unlocked.add('imposter_hunter');
  }
  if (profile.tags >= 10) {
    unlocked.add('apex_tracker');
  }
  if (profile.wins >= 5 || profile.totalPoints >= 100) {
    unlocked.add('phantom_legend');
  }

  return Array.from(unlocked);
}

/**
 * Extracts the uppercase first letter of a player's callsign for map markers and avatars.
 */
export function getCallsignInitial(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'A';
  const match = trimmed.match(/[A-Za-z0-9]/);
  return (match ? match[0] : trimmed[0]).toUpperCase();
}

/**
 * Enforces team-only isolation for Team chat during active rounds while allowing Global chat for everyone.
 */
export function filterVisibleChatMessages(
  messages: ChatMessage[] | undefined,
  viewer: PlayerState | undefined,
  phase: RoundPhase
): ChatMessage[] {
  if (!messages || messages.length === 0) return [];
  return messages.filter((msg) => {
    if (msg.scope === 'global') return true;
    if (phase === 'lobby' || phase === 'ended') return true;
    if (!viewer) return false;
    return msg.team === viewer.role;
  });
}

/**
 * Returns true when the player chose Random team preference and should get the tap-to-reveal role screen.
 */
export function shouldShowRoleReveal(viewer: PlayerState | undefined): boolean {
  return viewer?.preference === 'random';
}

/**
 * Stamps changelog releases with real local timestamps (persisted per version, never fake hardcoded months).
 */
export function resolveReleaseTimestamps(
  releases: { version: string; offsetMinutesAgo: number }[],
  nowMs: number,
  stored: Record<string, number> = {}
): Record<string, number> {
  const result: Record<string, number> = { ...stored };
  for (const rel of releases) {
    if (typeof result[rel.version] !== 'number' || !Number.isFinite(result[rel.version])) {
      result[rel.version] = nowMs - rel.offsetMinutesAgo * 60_000;
    }
  }
  return result;
}

export function formatRealDateTime(ts: number): string {
  const d = new Date(ts);
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

