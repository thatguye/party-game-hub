import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZERO_IMPOSTORS_VOTE,
  addOrRejoinRoomPlayer,
  advanceAfterVoteResults,
  castOnlineVote,
  createInitialRoomState,
  generateRoomCode,
  markPlayerReadyWordMode,
  normalizeRoomCode,
  returnRoomToLobby,
  startOnlineRound,
  startOnlineVoting,
  submitOnlineQuestionAnswer,
} from './online';
import { BUILT_IN_CATEGORIES } from '../data/gameData';
import { DEFAULT_SETTINGS } from '../utils/storage';
import { GameSettings } from '../types/game';

function buildLobbyWith4Players(settingsPatch: Partial<GameSettings> = {}) {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...settingsPatch };
  let room = createInitialRoomState({
    code: 'k9xp',
    host: { id: 'p-1', name: 'Alex', emoji: '🦊', color: '#22D3EE' },
    settings,
    selectedDeckIds: [BUILT_IN_CATEGORIES[0].id],
    customDecks: [],
    now: 1000,
  });

  room = addOrRejoinRoomPlayer(room, { id: 'p-2', name: 'Maya', emoji: '🐙', color: '#F43F5E' }, 1001);
  room = addOrRejoinRoomPlayer(room, { id: 'p-3', name: 'Jordan', emoji: '🦁', color: '#A78BFA' }, 1002);
  room = addOrRejoinRoomPlayer(room, { id: 'p-4', name: 'Sam', emoji: '🐼', color: '#34D399' }, 1003);
  return room;
}

test('generateRoomCode produces 4 uppercase alphanumeric characters and normalizeRoomCode cleans input', () => {
  const code = generateRoomCode(() => 0.42);
  assert.match(code, /^[A-Z0-9]{4}$/);
  assert.equal(normalizeRoomCode(' k9-xp! '), 'K9XP');
  assert.equal(normalizeRoomCode('ab1234'), 'AB12');
});

test('addOrRejoinRoomPlayer supports live lobby joins and seamless refresh rejoin mid-round', () => {
  let room = buildLobbyWith4Players();
  assert.equal(room.code, 'K9XP');
  assert.equal(room.players.length, 4);

  room = startOnlineRound(room, BUILT_IN_CATEGORIES, () => 0.3, 2000);
  assert.equal(room.phase, 'role_reveal');

  // Rejoining existing player updates timestamp without duplicating or kicking
  const rejoined = addOrRejoinRoomPlayer(
    room,
    { id: 'p-2', name: 'Maya', emoji: '🐙', color: '#F43F5E' },
    2500
  );
  assert.equal(rejoined.players.length, 4);
  assert.equal(rejoined.players.find((p) => p.id === 'p-2')?.lastSeenAt, 2500);

  // Unknown stranger cannot crash or enter mid-round
  const blocked = addOrRejoinRoomPlayer(
    rejoined,
    { id: 'p-stranger', name: 'Intruder', emoji: '👻', color: '#22D3EE' },
    2600
  );
  assert.equal(blocked.players.length, 4);
});

test('word mode marks players ready individually and starts synced timer once all are ready', () => {
  let room = buildLobbyWith4Players({ mode: 'word', discussionTimer: 120 });
  room = startOnlineRound(room, BUILT_IN_CATEGORIES, () => 0.25, 2000);
  assert.equal(room.phase, 'role_reveal');

  room = markPlayerReadyWordMode(room, 'p-1', 2100);
  room = markPlayerReadyWordMode(room, 'p-2', 2200);
  room = markPlayerReadyWordMode(room, 'p-3', 2300);
  assert.equal(room.phase, 'role_reveal');
  assert.equal(room.timerEndsAt, null);

  room = markPlayerReadyWordMode(room, 'p-4', 2400);
  assert.equal(room.phase, 'discussion');
  assert.equal(room.timerEndsAt, 2400 + 120_000);
});

test('question mode waits until all players submit private answers before revealing discussion simultaneously', () => {
  let room = buildLobbyWith4Players({ mode: 'question', discussionTimer: 60 });
  room = startOnlineRound(room, BUILT_IN_CATEGORIES, () => 0.2, 3000);
  assert.equal(room.phase, 'role_reveal');

  room = submitOnlineQuestionAnswer(room, 'p-1', 'Tacos', 3100);
  room = submitOnlineQuestionAnswer(room, 'p-2', 'Pizza', 3200);
  room = submitOnlineQuestionAnswer(room, 'p-3', 'Burgers', 3300);
  assert.equal(room.phase, 'role_reveal');

  room = submitOnlineQuestionAnswer(room, 'p-4', 'Sushi', 3400);
  assert.equal(room.phase, 'discussion');
  assert.equal(room.round?.submittedAnswers['p-4'], 'Sushi');
  assert.equal(room.timerEndsAt, 3400 + 60_000);
});

test('secret votes stay concealed until final alive player votes, then reveal outcome and scores simultaneously', () => {
  let room = buildLobbyWith4Players({ mode: 'word', scoreboardEnabled: true });
  room = startOnlineRound(room, BUILT_IN_CATEGORIES, () => 0.2, 4000);
  for (const p of room.players) {
    room = markPlayerReadyWordMode(room, p.id, 4100);
  }
  assert.equal(room.phase, 'discussion');

  room = startOnlineVoting(room, 4200);
  assert.equal(room.phase, 'voting');

  const impostorId = Object.values(room.round!.assignments).find((a) => a.isImpostor)!.playerId;
  const civilianIds = Object.values(room.round!.assignments)
    .filter((a) => !a.isImpostor)
    .map((a) => a.playerId);

  // First 3 votes keep phase in 'voting'
  room = castOnlineVote(room, civilianIds[0], impostorId, 4300);
  room = castOnlineVote(room, civilianIds[1], impostorId, 4400);
  room = castOnlineVote(room, civilianIds[2], impostorId, 4500);
  assert.equal(room.phase, 'voting');
  assert.equal(room.voteOutcome, null);

  // 4th vote triggers simultaneous reveal
  room = castOnlineVote(room, impostorId, civilianIds[0], 4600);
  assert.equal(room.phase, 'vote_results');
  assert.equal(room.voteOutcome?.eliminatedPlayerId, impostorId);
  assert.equal(room.voteOutcome?.isTie, false);
  assert.equal(room.round?.winner, 'civilians');
  assert.equal(room.scores[civilianIds[0]], 1);

  room = advanceAfterVoteResults(room, 4700);
  assert.equal(room.phase, 'round_summary');

  room = returnRoomToLobby(room, 4800);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.round, null);
  assert.equal(room.scores[civilianIds[0]], 1);
});

test('tie vote sends game back to discussion without eliminating anyone, and Chaos zero-impostor majority resolves accurately', () => {
  let room = buildLobbyWith4Players({
    mode: 'word',
    impostorCountMode: 'chaos',
    hideImpostorCountInChaos: true,
  });
  // rng 0.01 in Chaos mode yields 0 impostors
  room = startOnlineRound(room, BUILT_IN_CATEGORIES, () => 0.01, 5000);
  assert.equal(room.round?.impostorCount, 0);
  for (const p of room.players) {
    room = markPlayerReadyWordMode(room, p.id, 5100);
  }
  room = startOnlineVoting(room, 5200);

  // 2-2 tie
  room = castOnlineVote(room, 'p-1', 'p-2', 5300);
  room = castOnlineVote(room, 'p-2', 'p-1', 5310);
  room = castOnlineVote(room, 'p-3', 'p-2', 5320);
  room = castOnlineVote(room, 'p-4', 'p-1', 5330);
  assert.equal(room.phase, 'vote_results');
  assert.equal(room.voteOutcome?.isTie, true);
  assert.equal(room.voteOutcome?.eliminatedPlayerId, null);
  assert.equal(room.round?.winner, null);

  // Advance returns to discussion
  room = advanceAfterVoteResults(room, 5400);
  assert.equal(room.phase, 'discussion');

  // Now vote majority ZERO_IMPOSTORS
  room = startOnlineVoting(room, 5500);
  room = castOnlineVote(room, 'p-1', ZERO_IMPOSTORS_VOTE, 5600);
  room = castOnlineVote(room, 'p-2', ZERO_IMPOSTORS_VOTE, 5610);
  room = castOnlineVote(room, 'p-3', ZERO_IMPOSTORS_VOTE, 5620);
  room = castOnlineVote(room, 'p-4', 'p-1', 5630);
  assert.equal(room.phase, 'vote_results');
  assert.equal(room.voteOutcome?.calledZeroImpostors, true);
  assert.equal(room.round?.winner, 'civilians');
});
