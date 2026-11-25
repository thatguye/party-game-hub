import type { LatLng, PlayerState, RoomState } from '../types/game';
import {
  computeNextZone,
  haversineMeters,
  isPointInZone,
  movePointByBearing,
  roundCoord,
} from './geo';
import {
  assignTeams,
  createDefaultSettings,
  DEFAULT_COORDS,
  evaluateOobState,
  generateRoomCode,
  PLAYER_COLORS,
  processTag,
} from './rules';

const BOT_NAMES = ['Viper', 'Kestrel', 'Shadow', 'Echo', 'Nova', 'Strider'];

export function createSoloDemoRoom(
  userId: string,
  userName: string,
  userPos: LatLng = DEFAULT_COORDS,
  userRolePref: 'hunter' | 'runner' | 'random' = 'hunter',
  mode: RoomState['settings']['mode'] = 'classic',
  nowMs: number = Date.now()
): RoomState {
  const settings = createDefaultSettings(userPos);
  settings.mode = mode;
  settings.roundLengthMin = 15;
  settings.pingIntervalMin = 1;
  settings.headStartMin = 0.25; // 15 seconds fast scatter in solo demo so players feel both phases quickly
  settings.zone.diameterMeters = 805; // 0.5 mi
  settings.finalZoneDiameterMeters = 244; // 800 ft
  settings.zoneShrinkEnabled = true;

  const resolvedUserRole: 'hunter' | 'runner' =
    userRolePref === 'random' ? (Math.random() < 0.5 ? 'hunter' : 'runner') : userRolePref;

  const userPlayer: PlayerState = {
    id: userId,
    name: userName || 'Agent One',
    isHost: true,
    isBot: false,
    preference: userRolePref,
    role: resolvedUserRole,
    eliminated: false,
    tagsCount: 0,
    color: PLAYER_COLORS[0],
    lastPos: { lat: roundCoord(userPos.lat), lng: roundCoord(userPos.lng), ts: nowMs },
    trail: [{ lat: roundCoord(userPos.lat), lng: roundCoord(userPos.lng), ts: nowMs }],
    oobStartedAt: null,
    oobStatus: 'inside',
    connected: true,
    lastSeenAt: nowMs,
  };

  const botCount = 5;
  const bots: PlayerState[] = Array.from({ length: botCount }).map((_, idx) => {
    const bearing = (idx * 360) / botCount + 25;
    const dist = 190 + idx * 42;
    const pos = movePointByBearing(userPos, dist, bearing);
    const pref = idx === 0 && resolvedUserRole === 'runner' ? 'hunter' : idx === 1 ? 'hunter' : 'runner';
    return {
      id: `bot_${idx + 1}`,
      name: `${BOT_NAMES[idx]} (AI)`,
      isHost: false,
      isBot: true,
      preference: pref,
      role: pref,
      eliminated: false,
      tagsCount: 0,
      color: PLAYER_COLORS[(idx + 1) % PLAYER_COLORS.length],
      lastPos: { lat: pos.lat, lng: pos.lng, ts: nowMs },
      trail: [{ lat: pos.lat, lng: pos.lng, ts: nowMs }],
      oobStartedAt: null,
      oobStatus: 'inside',
      connected: true,
      lastSeenAt: nowMs,
    };
  });

  const assigned = assignTeams([userPlayer, ...bots], mode);
  // Guarantee user gets their resolved demo role while keeping their original preference (e.g. 'random')
  const fixedPlayers = assigned.map((p) => {
    if (p.id === userId) {
      return { ...p, preference: userRolePref, role: resolvedUserRole, initialRole: resolvedUserRole };
    }
    return p;
  });

  // Ensure at least 1 hunter and at least 2 runners
  if (!fixedPlayers.some((p) => p.role === 'hunter')) {
    fixedPlayers[1].role = 'hunter';
    fixedPlayers[1].initialRole = 'hunter';
  }
  if (fixedPlayers.filter((p) => p.role === 'runner').length < 2) {
    fixedPlayers[fixedPlayers.length - 1].role = 'runner';
    fixedPlayers[fixedPlayers.length - 1].initialRole = 'runner';
  }

  const headStartMs = Math.round(settings.headStartMin * 60_000);
  const roundDurationMs = Math.round(settings.roundLengthMin * 60_000);
  const pingMs = settings.pingIntervalMin > 0 ? settings.pingIntervalMin * 60_000 : null;

  const nextPreview = computeNextZone(
    settings.zone,
    settings.finalZoneDiameterMeters,
    mode === 'curfew'
  );

  return {
    code: generateRoomCode(),
    isSoloDemo: true,
    hostId: userId,
    phase: headStartMs > 0 ? 'head_start' : 'hunt',
    settings,
    currentZone: settings.zone,
    nextZonePreview: nextPreview,
    nextZoneTransitionAt: nowMs + headStartMs + 45_000,
    shrinkStep: 0,
    players: fixedPlayers,
    pings: [],
    tags: [],
    chatMessages: [
      {
        id: `msg_welcome_${nowMs}`,
        scope: 'team',
        team: resolvedUserRole,
        senderId: fixedPlayers.find((p) => p.isBot && p.role === resolvedUserRole)?.id ?? 'bot_2',
        senderName:
          fixedPlayers.find((p) => p.isBot && p.role === resolvedUserRole)?.name ?? 'Kestrel (AI)',
        senderColor:
          fixedPlayers.find((p) => p.isBot && p.role === resolvedUserRole)?.color ?? '#06B6D4',
        kind: 'text',
        text:
          resolvedUserRole === 'hunter'
            ? 'Scanning sector — ready for the first radar ping.'
            : 'Scattering into cover — watch the zone edge.',
        ts: nowMs,
      },
    ],
    roundStartedAt: nowMs,
    headStartEndsAt: nowMs + headStartMs,
    roundEndsAt: nowMs + headStartMs + roundDurationMs,
    lastPingAt: null,
    nextPingAt: pingMs ? nowMs + headStartMs + 20_000 : null,
    pausedAt: null,
    emergency: null,
    meeting: null,
    winner: null,
    updatedAt: nowMs,
  };
}

/**
 * Advances simulated AI bots in Solo Practice Mode by dtSec:
 * - Runners scatter away from nearest Hunter, steer back inside next zone preview.
 * - Hunters patrol and converge toward the newest Radar Ping or exposed OOB Runner.
 */
export function stepSoloBots(room: RoomState, dtSec: number, nowMs: number): RoomState {
  if (!room.isSoloDemo) return room;
  if (room.phase !== 'head_start' && room.phase !== 'hunt') return room;

  const activeZone = room.currentZone;
  const targetZone = room.nextZonePreview ?? room.currentZone;
  const latestPingsByPlayer = new Map<string, { lat: number; lng: number }>();
  for (const ping of room.pings) {
    latestPingsByPlayer.set(ping.playerId, { lat: ping.lat, lng: ping.lng });
  }

  let updatedRoom = room;
  const nextPlayers = room.players.map((p, idx) => {
    if (!p.isBot || p.eliminated || !p.lastPos) return p;

    // During Head Start, Hunter bots wait stationary
    if (room.phase === 'head_start' && p.role === 'hunter') {
      return { ...p, lastSeenAt: nowMs };
    }

    const speedMps = p.role === 'hunter' ? 7.5 : 6.4; // Brisk simulated field pace for visible map movement
    const stepMeters = speedMps * dtSec;
    let bearing = ((nowMs / 1000) * 14 + idx * 73) % 360;

    if (p.role === 'runner') {
      const hunters = room.players.filter((h) => h.role === 'hunter' && h.lastPos);
      // If outside target zone preview, steer back toward target zone center
      if (!isPointInZone(p.lastPos, targetZone)) {
        bearing = bearingBetween(p.lastPos, targetZone.center);
      } else if (hunters.length > 0) {
        // Evade nearest hunter with lateral juke
        let nearest = hunters[0];
        let minDist = haversineMeters(p.lastPos, hunters[0].lastPos!);
        for (const h of hunters.slice(1)) {
          const d = haversineMeters(p.lastPos, h.lastPos!);
          if (d < minDist) {
            minDist = d;
            nearest = h;
          }
        }
        const away = (bearingBetween(nearest.lastPos!, p.lastPos) + 25 * Math.sin(nowMs / 4000 + idx)) % 360;
        bearing = (away + 360) % 360;
      }
    } else if (p.role === 'hunter') {
      // Chase exposed runner or latest radar ping
      const exposedRunner = room.players.find(
        (r) => r.role === 'runner' && !r.eliminated && r.oobStatus === 'exposed' && r.lastPos
      );
      if (exposedRunner?.lastPos) {
        bearing = bearingBetween(p.lastPos, exposedRunner.lastPos);
      } else if (latestPingsByPlayer.size > 0) {
        const targets = Array.from(latestPingsByPlayer.values());
        const target = targets[idx % targets.length];
        if (haversineMeters(p.lastPos, target) > 15) {
          bearing = bearingBetween(p.lastPos, target);
        }
      } else if (!isPointInZone(p.lastPos, activeZone)) {
        bearing = bearingBetween(p.lastPos, activeZone.center);
      }
    }

    const moved = movePointByBearing(p.lastPos, stepMeters, bearing);
    const nextPt = { lat: moved.lat, lng: moved.lng, ts: nowMs };
    const outside = !isPointInZone(nextPt, activeZone);
    const oobStartedAt = outside ? p.oobStartedAt ?? nowMs : null;
    const oobEval = evaluateOobState(outside, oobStartedAt, nowMs);

    const lastTrailPt = p.trail[p.trail.length - 1];
    const shouldAppendTrail =
      !lastTrailPt || haversineMeters(lastTrailPt, nextPt) >= 6 || nowMs - lastTrailPt.ts >= 5000;

    return {
      ...p,
      lastPos: nextPt,
      trail: shouldAppendTrail ? [...p.trail.slice(-240), nextPt] : p.trail,
      oobStartedAt,
      oobStatus: oobEval.status,
      lastSeenAt: nowMs,
    };
  });

  updatedRoom = { ...room, players: nextPlayers, updatedAt: nowMs };

  // In Hunt phase, if a Hunter bot closes within 14m of a Runner bot, execute a tag
  if (updatedRoom.phase === 'hunt') {
    const hunterBots = updatedRoom.players.filter((p) => p.isBot && p.role === 'hunter' && p.lastPos);
    const runnerBots = updatedRoom.players.filter(
      (p) => p.isBot && p.role === 'runner' && !p.eliminated && p.lastPos
    );
    for (const h of hunterBots) {
      for (const r of runnerBots) {
        if (haversineMeters(h.lastPos!, r.lastPos!) <= 14) {
          updatedRoom = processTag(updatedRoom, r.id, h.id, 'physical', nowMs);
          break;
        }
      }
    }
  }

  return updatedRoom;
}

function bearingBetween(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
