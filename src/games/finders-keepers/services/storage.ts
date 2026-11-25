import type {
  BadgeId,
  CareerProfile,
  CustomPreset,
  LeaderboardEntry,
  RoomState,
  ScoreBreakdown,
} from '../types/game';
import { evaluateUnlockedBadges } from '../game/rules';

const PRESETS_KEY = 'fk_custom_presets_v1';
const PROFILE_KEY = 'fk_career_profile_v1';
const SESSION_KEY = 'fk_session_v1';
const ROOM_CACHE_KEY = 'fk_active_room_v1';

export interface RejoinSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  isSoloDemo?: boolean;
}

function makePlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 12);
  }
  return `p_${Math.random().toString(36).slice(2, 12)}`;
}

export function loadCareerProfile(): CareerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CareerProfile;
      if (parsed && parsed.playerId) {
        return {
          ...parsed,
          badges: Array.isArray(parsed.badges) ? parsed.badges : [],
          leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        };
      }
    }
  } catch {
    // ignore storage failures
  }
  const fresh: CareerProfile = {
    playerId: makePlayerId(),
    name: '',
    roundsPlayed: 0,
    wins: 0,
    tags: 0,
    cleanSweeps: 0,
    totalDistanceMeters: 0,
    totalPoints: 0,
    badges: [],
    leaderboard: [],
  };
  saveCareerProfile(fresh);
  return fresh;
}

export function saveCareerProfile(profile: CareerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function recordCompletedRound(
  profile: CareerProfile,
  room: RoomState,
  scores: ScoreBreakdown[]
): { updatedProfile: CareerProfile; newlyUnlocked: BadgeId[] } {
  const myScore = scores.find((s) => s.playerId === profile.playerId);
  const didWin =
    !!myScore &&
    ((room.winner === 'runners' && myScore.initialRole === 'runner') ||
      (room.winner === 'hunters' && myScore.role === 'hunter') ||
      (room.winner === 'imposters' &&
        room.players.find((p) => p.id === profile.playerId)?.isImposter));

  const nextLeaderboardMap = new Map<string, LeaderboardEntry>();
  for (const entry of profile.leaderboard) {
    nextLeaderboardMap.set(entry.playerId, { ...entry });
  }

  for (const s of scores) {
    const existing = nextLeaderboardMap.get(s.playerId);
    const playerWon =
      (room.winner === 'runners' && s.initialRole === 'runner') ||
      (room.winner === 'hunters' && s.role === 'hunter');
    if (existing) {
      existing.name = s.playerName;
      existing.totalPoints += s.points;
      existing.wins += playerWon ? 1 : 0;
      existing.tags += s.tagsCount;
      existing.distanceMeters += s.distanceMeters;
    } else {
      nextLeaderboardMap.set(s.playerId, {
        playerId: s.playerId,
        name: s.playerName,
        totalPoints: s.points,
        wins: playerWon ? 1 : 0,
        tags: s.tagsCount,
        distanceMeters: s.distanceMeters,
      });
    }
  }

  const leaderboard = Array.from(nextLeaderboardMap.values())
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 25);

  const tentative: CareerProfile = {
    ...profile,
    roundsPlayed: profile.roundsPlayed + 1,
    wins: profile.wins + (didWin ? 1 : 0),
    tags: profile.tags + (myScore?.tagsCount ?? 0),
    cleanSweeps: profile.cleanSweeps + (myScore?.cleanSweepBonus ? 1 : 0),
    totalDistanceMeters: profile.totalDistanceMeters + (myScore?.distanceMeters ?? 0),
    totalPoints: profile.totalPoints + (myScore?.points ?? 0),
    leaderboard,
  };

  const prevBadges = new Set(profile.badges);
  const allBadges = evaluateUnlockedBadges(tentative, room, myScore);
  const newlyUnlocked = allBadges.filter((b) => !prevBadges.has(b));
  const updatedProfile: CareerProfile = {
    ...tentative,
    badges: allBadges,
  };
  saveCareerProfile(updatedProfile);
  return { updatedProfile, newlyUnlocked };
}

export function loadCustomPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: CustomPreset): CustomPreset[] {
  const existing = loadCustomPresets().filter((p) => p.id !== preset.id);
  const next = [preset, ...existing];
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function deleteCustomPreset(id: string): CustomPreset[] {
  const next = loadCustomPresets().filter((p) => p.id !== id);
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function saveSessionRejoin(session: RejoinSession | null): void {
  try {
    if (!session) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
}

export function loadSessionRejoin(): RejoinSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RejoinSession;
  } catch {
    return null;
  }
}

export function saveLocalRoomSnapshot(room: RoomState | null): void {
  try {
    if (!room) {
      localStorage.removeItem(ROOM_CACHE_KEY);
    } else {
      localStorage.setItem(ROOM_CACHE_KEY, JSON.stringify(room));
    }
  } catch {
    // ignore
  }
}

export function loadLocalRoomSnapshot(code?: string): RoomState | null {
  try {
    const raw = localStorage.getItem(ROOM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomState;
    if (code && parsed.code !== code) return null;
    return parsed;
  } catch {
    return null;
  }
}
