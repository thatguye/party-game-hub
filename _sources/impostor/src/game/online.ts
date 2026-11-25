import {
  CategoryDeck,
  GameSettings,
  OnlineRoomPlayer,
  OnlineRoomState,
  VoteOutcome,
} from '../types/game';
import {
  calculateRoundScoreDeltas,
  callZeroImpostors,
  createRound,
  eliminatePlayer,
  submitPlayerAnswer,
} from './engine';

export const ZERO_IMPOSTORS_VOTE = '__ZERO_IMPOSTORS__';
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(rng() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[idx] ?? 'K';
  }
  return code;
}

export function createInitialRoomState(params: {
  code: string;
  host: Omit<OnlineRoomPlayer, 'isHost' | 'joinedAt' | 'lastSeenAt'>;
  settings: GameSettings;
  selectedDeckIds: string[];
  customDecks: CategoryDeck[];
  now?: number;
}): OnlineRoomState {
  const now = params.now ?? Date.now();
  return {
    code: normalizeRoomCode(params.code),
    version: 1,
    hostId: params.host.id,
    phase: 'lobby',
    players: [
      {
        ...params.host,
        isHost: true,
        joinedAt: now,
        lastSeenAt: now,
      },
    ],
    settings: { ...params.settings },
    selectedDeckIds: [...params.selectedDeckIds],
    customDecks: [...params.customDecks],
    usedHistory: { word: [], question: [] },
    scores: {},
    roundScoreDeltas: {},
    roundNumber: 0,
    round: null,
    readyPlayerIds: [],
    timerEndsAt: null,
    timerPausedRemainingSec: null,
    votes: {},
    voteOutcome: null,
    updatedAt: now,
  };
}

export function addOrRejoinRoomPlayer(
  room: OnlineRoomState,
  player: Omit<OnlineRoomPlayer, 'isHost' | 'joinedAt' | 'lastSeenAt'>,
  now: number = Date.now()
): OnlineRoomState {
  const cleanName = player.name.trim().slice(0, 22) || 'Player';
  const existingIdx = room.players.findIndex((p) => p.id === player.id);

  if (existingIdx >= 0) {
    const updatedPlayers = room.players.map((p, i) =>
      i === existingIdx
        ? {
            ...p,
            name: cleanName,
            emoji: player.emoji || p.emoji,
            color: player.color || p.color,
            lastSeenAt: now,
          }
        : p
    );
    return {
      ...room,
      version: room.version + 1,
      players: updatedPlayers,
      updatedAt: now,
    };
  }

  // Only allow brand-new players to join while in lobby
  if (room.phase !== 'lobby') {
    return room;
  }

  const nextPlayer: OnlineRoomPlayer = {
    id: player.id,
    name: cleanName,
    emoji: player.emoji || '🦊',
    color: player.color || '#22D3EE',
    isHost: false,
    joinedAt: now,
    lastSeenAt: now,
  };

  return {
    ...room,
    version: room.version + 1,
    players: [...room.players, nextPlayer],
    updatedAt: now,
  };
}

export function removeRoomPlayer(
  room: OnlineRoomState,
  targetPlayerId: string,
  now: number = Date.now()
): OnlineRoomState {
  const remaining = room.players.filter((p) => p.id !== targetPlayerId);
  if (remaining.length === room.players.length) return room;

  let nextHostId = room.hostId;
  let normalizedPlayers = remaining;
  if (targetPlayerId === room.hostId && remaining.length > 0) {
    nextHostId = remaining[0].id;
    normalizedPlayers = remaining.map((p, idx) => ({
      ...p,
      isHost: idx === 0,
    }));
  }

  const nextVotes = { ...room.votes };
  delete nextVotes[targetPlayerId];

  return {
    ...room,
    version: room.version + 1,
    hostId: nextHostId,
    players: normalizedPlayers,
    readyPlayerIds: room.readyPlayerIds.filter((id) => id !== targetPlayerId),
    votes: nextVotes,
    updatedAt: now,
  };
}

export function updateRoomLobbyConfig(
  room: OnlineRoomState,
  patch: {
    settings?: GameSettings;
    selectedDeckIds?: string[];
    customDecks?: CategoryDeck[];
  },
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'lobby') return room;
  return {
    ...room,
    version: room.version + 1,
    settings: patch.settings ? { ...patch.settings } : room.settings,
    selectedDeckIds: patch.selectedDeckIds ? [...patch.selectedDeckIds] : room.selectedDeckIds,
    customDecks: patch.customDecks ? [...patch.customDecks] : room.customDecks,
    updatedAt: now,
  };
}

export function getAlivePlayerIds(room: OnlineRoomState): string[] {
  if (!room.round) return room.players.map((p) => p.id);
  return room.round.playerOrder.filter((id) => !room.round?.assignments[id]?.eliminated);
}

export function startOnlineRound(
  room: OnlineRoomState,
  allAvailableDecks: CategoryDeck[],
  rng: () => number = Math.random,
  now: number = Date.now()
): OnlineRoomState {
  if (room.players.length < 3) return room;

  const mergedDecksMap = new Map<string, CategoryDeck>();
  for (const d of allAvailableDecks) mergedDecksMap.set(d.id, d);
  for (const d of room.customDecks) mergedDecksMap.set(d.id, d);

  const selectedSet = new Set(room.selectedDeckIds);
  const activeDecks = Array.from(mergedDecksMap.values()).filter((d) => {
    if (!selectedSet.has(d.id)) return false;
    return room.settings.mode === 'word' ? d.words.length > 0 : d.questions.length > 0;
  });

  if (activeDecks.length === 0) return room;

  const nextRoundNumber = room.roundNumber + 1;
  const created = createRound(
    room.players,
    activeDecks,
    room.settings,
    room.usedHistory,
    nextRoundNumber,
    rng
  );
  if (!created) return room;

  return {
    ...room,
    version: room.version + 1,
    phase: 'role_reveal',
    roundNumber: nextRoundNumber,
    round: created.round,
    usedHistory: created.updatedHistory,
    roundScoreDeltas: {},
    readyPlayerIds: [],
    timerEndsAt: null,
    timerPausedRemainingSec: null,
    votes: {},
    voteOutcome: null,
    updatedAt: now,
  };
}

function buildInitialDiscussionTimer(settings: GameSettings, now: number): {
  timerEndsAt: number | null;
  timerPausedRemainingSec: number | null;
} {
  if (settings.discussionTimer <= 0) {
    return { timerEndsAt: null, timerPausedRemainingSec: null };
  }
  return {
    timerEndsAt: now + settings.discussionTimer * 1000,
    timerPausedRemainingSec: null,
  };
}

export function markPlayerReadyWordMode(
  room: OnlineRoomState,
  playerId: string,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'role_reveal' || !room.round || room.round.mode !== 'word') {
    return room;
  }
  if (!room.players.some((p) => p.id === playerId)) return room;

  const nextReady = room.readyPlayerIds.includes(playerId)
    ? room.readyPlayerIds
    : [...room.readyPlayerIds, playerId];

  const allReady = room.round.playerOrder.every((id) => nextReady.includes(id));

  if (allReady) {
    const timer = buildInitialDiscussionTimer(room.settings, now);
    return {
      ...room,
      version: room.version + 1,
      phase: 'discussion',
      readyPlayerIds: nextReady,
      ...timer,
      updatedAt: now,
    };
  }

  return {
    ...room,
    version: room.version + 1,
    readyPlayerIds: nextReady,
    updatedAt: now,
  };
}

export function forceStartOnlineDiscussion(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'role_reveal' || !room.round) return room;
  const timer = buildInitialDiscussionTimer(room.settings, now);
  return {
    ...room,
    version: room.version + 1,
    phase: 'discussion',
    ...timer,
    updatedAt: now,
  };
}

export function submitOnlineQuestionAnswer(
  room: OnlineRoomState,
  playerId: string,
  answer: string,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'role_reveal' || !room.round || room.round.mode !== 'question') {
    return room;
  }
  const updatedRound = submitPlayerAnswer(room.round, playerId, answer);
  if (updatedRound === room.round) return room;

  const nextReady = room.readyPlayerIds.includes(playerId)
    ? room.readyPlayerIds
    : [...room.readyPlayerIds, playerId];

  const allAnswered = updatedRound.playerOrder.every(
    (id) => (updatedRound.submittedAnswers[id] ?? '').trim().length > 0
  );

  if (allAnswered) {
    const timer = buildInitialDiscussionTimer(room.settings, now);
    return {
      ...room,
      version: room.version + 1,
      phase: 'discussion',
      round: updatedRound,
      readyPlayerIds: nextReady,
      ...timer,
      updatedAt: now,
    };
  }

  return {
    ...room,
    version: room.version + 1,
    round: updatedRound,
    readyPlayerIds: nextReady,
    updatedAt: now,
  };
}

export function updateOnlineTimer(
  room: OnlineRoomState,
  action: 'pause' | 'resume' | 'add30',
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'discussion' || room.settings.discussionTimer <= 0) return room;

  if (action === 'pause') {
    if (room.timerPausedRemainingSec !== null) return room;
    const remaining = room.timerEndsAt
      ? Math.max(0, Math.ceil((room.timerEndsAt - now) / 1000))
      : 0;
    return {
      ...room,
      version: room.version + 1,
      timerEndsAt: null,
      timerPausedRemainingSec: remaining,
      updatedAt: now,
    };
  }

  if (action === 'resume') {
    if (room.timerPausedRemainingSec === null) return room;
    return {
      ...room,
      version: room.version + 1,
      timerEndsAt: now + room.timerPausedRemainingSec * 1000,
      timerPausedRemainingSec: null,
      updatedAt: now,
    };
  }

  // add30
  if (room.timerPausedRemainingSec !== null) {
    return {
      ...room,
      version: room.version + 1,
      timerPausedRemainingSec: room.timerPausedRemainingSec + 30,
      updatedAt: now,
    };
  }

  const base = room.timerEndsAt && room.timerEndsAt > now ? room.timerEndsAt : now;
  return {
    ...room,
    version: room.version + 1,
    timerEndsAt: base + 30_000,
    updatedAt: now,
  };
}

export function startOnlineVoting(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'discussion' || !room.round) return room;
  return {
    ...room,
    version: room.version + 1,
    phase: 'voting',
    votes: {},
    voteOutcome: null,
    updatedAt: now,
  };
}

export function backToOnlineDiscussion(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'voting' || !room.round) return room;
  return {
    ...room,
    version: room.version + 1,
    phase: 'discussion',
    votes: {},
    voteOutcome: null,
    updatedAt: now,
  };
}

export function resolveOnlineVotes(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (!room.round) return room;

  const aliveIds = getAlivePlayerIds(room);
  const aliveSet = new Set(aliveIds);
  const tallies: Record<string, number> = {};

  for (const [voterId, targetId] of Object.entries(room.votes)) {
    if (!aliveSet.has(voterId)) continue;
    if (targetId !== ZERO_IMPOSTORS_VOTE && !aliveSet.has(targetId)) continue;
    tallies[targetId] = (tallies[targetId] ?? 0) + 1;
  }

  const entries = Object.entries(tallies).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const outcome: VoteOutcome = {
      tallies,
      eliminatedPlayerId: null,
      isTie: true,
      calledZeroImpostors: false,
      zeroCallMajority: false,
      revealedAt: now,
    };
    return {
      ...room,
      version: room.version + 1,
      phase: 'vote_results',
      voteOutcome: outcome,
      updatedAt: now,
    };
  }

  const topCount = entries[0][1];
  const topCandidates = entries.filter(([, count]) => count === topCount).map(([id]) => id);

  // Tie -> nobody eliminated
  if (topCandidates.length > 1) {
    const outcome: VoteOutcome = {
      tallies,
      eliminatedPlayerId: null,
      isTie: true,
      calledZeroImpostors: false,
      zeroCallMajority: false,
      revealedAt: now,
    };
    return {
      ...room,
      version: room.version + 1,
      phase: 'vote_results',
      voteOutcome: outcome,
      updatedAt: now,
    };
  }

  const winnerChoice = topCandidates[0];

  if (winnerChoice === ZERO_IMPOSTORS_VOTE) {
    const resolvedRound = callZeroImpostors(room.round);
    let nextScores = room.scores;
    let nextDeltas = room.roundScoreDeltas;

    if (resolvedRound.winner && room.settings.scoreboardEnabled) {
      nextDeltas = calculateRoundScoreDeltas(resolvedRound);
      nextScores = { ...room.scores };
      for (const [pid, pts] of Object.entries(nextDeltas)) {
        nextScores[pid] = (nextScores[pid] ?? 0) + pts;
      }
    }

    const outcome: VoteOutcome = {
      tallies,
      eliminatedPlayerId: null,
      isTie: false,
      calledZeroImpostors: true,
      zeroCallMajority: true,
      revealedAt: now,
    };

    return {
      ...room,
      version: room.version + 1,
      phase: 'vote_results',
      round: resolvedRound,
      scores: nextScores,
      roundScoreDeltas: nextDeltas,
      voteOutcome: outcome,
      updatedAt: now,
    };
  }

  const nextRound = eliminatePlayer(room.round, winnerChoice, room.settings.survivalMode);
  let nextScores = room.scores;
  let nextDeltas = room.roundScoreDeltas;

  if (nextRound.winner && room.settings.scoreboardEnabled) {
    nextDeltas = calculateRoundScoreDeltas(nextRound);
    nextScores = { ...room.scores };
    for (const [pid, pts] of Object.entries(nextDeltas)) {
      nextScores[pid] = (nextScores[pid] ?? 0) + pts;
    }
  }

  const outcome: VoteOutcome = {
    tallies,
    eliminatedPlayerId: winnerChoice,
    isTie: false,
    calledZeroImpostors: false,
    zeroCallMajority: false,
    revealedAt: now,
  };

  return {
    ...room,
    version: room.version + 1,
    phase: 'vote_results',
    round: nextRound,
    scores: nextScores,
    roundScoreDeltas: nextDeltas,
    voteOutcome: outcome,
    updatedAt: now,
  };
}

export function castOnlineVote(
  room: OnlineRoomState,
  voterId: string,
  targetId: string,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'voting' || !room.round) return room;

  const aliveIds = getAlivePlayerIds(room);
  if (!aliveIds.includes(voterId)) return room;

  if (targetId !== ZERO_IMPOSTORS_VOTE && !aliveIds.includes(targetId)) {
    return room;
  }

  if (targetId === ZERO_IMPOSTORS_VOTE && !room.round.hideImpostorCount) {
    return room;
  }

  const nextVotes = {
    ...room.votes,
    [voterId]: targetId,
  };

  const withVote: OnlineRoomState = {
    ...room,
    version: room.version + 1,
    votes: nextVotes,
    updatedAt: now,
  };

  const allVoted = aliveIds.every((id) => typeof nextVotes[id] === 'string');
  if (allVoted) {
    return resolveOnlineVotes(withVote, now);
  }

  return withVote;
}

export function advanceAfterVoteResults(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (room.phase !== 'vote_results' || !room.round) return room;

  if (room.round.winner !== null) {
    return {
      ...room,
      version: room.version + 1,
      phase: 'round_summary',
      updatedAt: now,
    };
  }

  const timer = buildInitialDiscussionTimer(room.settings, now);
  return {
    ...room,
    version: room.version + 1,
    phase: 'discussion',
    votes: {},
    voteOutcome: null,
    ...timer,
    updatedAt: now,
  };
}

export function revealAllRolesOnline(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  if (!room.round) return room;
  return {
    ...room,
    version: room.version + 1,
    phase: 'round_summary',
    round: {
      ...room.round,
      winner: 'chaos_draw',
      winReason: 'The group revealed all roles to end the round.',
    },
    roundScoreDeltas: {},
    updatedAt: now,
  };
}

export function resetOnlineScores(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  return {
    ...room,
    version: room.version + 1,
    scores: {},
    roundScoreDeltas: {},
    updatedAt: now,
  };
}

export function returnRoomToLobby(
  room: OnlineRoomState,
  now: number = Date.now()
): OnlineRoomState {
  return {
    ...room,
    version: room.version + 1,
    phase: 'lobby',
    round: null,
    readyPlayerIds: [],
    timerEndsAt: null,
    timerPausedRemainingSec: null,
    votes: {},
    voteOutcome: null,
    roundScoreDeltas: {},
    updatedAt: now,
  };
}
