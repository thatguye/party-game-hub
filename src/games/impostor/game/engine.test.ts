import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBalancedImpostorCount,
  calculateRoundScoreDeltas,
  callZeroImpostors,
  createRound,
  eliminatePlayer,
  extractSingleIcon,
  parseBulkImportQuestions,
  parseBulkImportWords,
  pickUnusedPrompt,
  resolveImpostorCount,
  submitPlayerAnswer,
} from './engine';
import { BUILT_IN_CATEGORIES } from '../data/gameData';
import { DEFAULT_PLAYERS, DEFAULT_SETTINGS } from '../utils/storage';
import { CategoryDeck, GameSettings, Player } from '../types/game';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `Player ${i + 1}`,
    emoji: '🦊',
    color: '#22D3EE',
  }));
}

const smallDeck: CategoryDeck = {
  id: 'test-deck',
  name: 'Test Deck',
  emoji: '🎯',
  accent: '#22D3EE',
  description: 'Test',
  words: [
    { id: 'w1', word: 'Volcano', description: 'A mountain vent that erupts molten lava and ash.', hints: ['Magma', 'Island'] },
    { id: 'w2', word: 'Submarine', description: 'A vessel built to travel and operate deep underwater.', hints: ['Periscope', 'Deep'] },
  ],
  questions: [
    { id: 'q1', main: 'Favorite pizza topping?', decoy: 'Worst pizza topping?' },
    { id: 'q2', main: 'Dream vacation city?', decoy: 'Most overrated city?' },
  ],
};

test('balanced impostor count scales sensibly with player count', () => {
  assert.equal(calculateBalancedImpostorCount(3), 1);
  assert.equal(calculateBalancedImpostorCount(5), 1);
  assert.equal(calculateBalancedImpostorCount(6), 2);
  assert.equal(calculateBalancedImpostorCount(9), 2);
  assert.equal(calculateBalancedImpostorCount(10), 3);
  assert.equal(calculateBalancedImpostorCount(16), 4);
});

test('chaos mode can produce 0 impostors, normal counts, and all impostors', () => {
  assert.equal(
    resolveImpostorCount(5, { impostorCountMode: 'chaos', impostorCount: 1 }, () => 0.05),
    0
  );
  assert.equal(
    resolveImpostorCount(5, { impostorCountMode: 'chaos', impostorCount: 1 }, () => 0.2),
    5
  );
  const mid = resolveImpostorCount(5, { impostorCountMode: 'chaos', impostorCount: 1 }, () => 0.5);
  assert.ok(mid >= 1 && mid <= 4);
});

test('anti-repeat history avoids repeating prompts until deck is exhausted, then resets cleanly', () => {
  const r1 = pickUnusedPrompt([smallDeck], 'word', [], () => 0);
  assert.ok(r1);
  assert.equal(r1.promptId, 'w1');
  assert.equal(r1.deckHistoryReset, false);

  const r2 = pickUnusedPrompt([smallDeck], 'word', r1.updatedUsedIds, () => 0);
  assert.ok(r2);
  assert.equal(r2.promptId, 'w2');
  assert.equal(r2.deckHistoryReset, false);

  const r3 = pickUnusedPrompt([smallDeck], 'word', r2.updatedUsedIds, () => 0);
  assert.ok(r3);
  assert.equal(r3.deckHistoryReset, true);
  assert.equal(r3.promptId, 'w1');
});

test('word mode assigns secret word to civilians, distinct hints and teammates to multiple impostors', () => {
  const players = makePlayers(6);
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    mode: 'word',
    impostorCountMode: 'standard',
    impostorCount: 2,
    impostorHints: true,
    impostorTeamMode: true,
    preventImpostorFirst: true,
  };

  const result = createRound(players, [smallDeck], settings, { word: [], question: [] }, 1, () => 0.42);
  assert.ok(result);
  const { round } = result;

  const assignments = Object.values(round.assignments);
  const impostors = assignments.filter((a) => a.isImpostor);
  const civilians = assignments.filter((a) => !a.isImpostor);

  assert.equal(impostors.length, 2);
  assert.equal(civilians.length, 4);

  // Civilians get secret word + description, no hint
  for (const c of civilians) {
    assert.equal(c.secretWord, round.secretWord);
    assert.equal(c.wordDescription, round.secretWordDescription);
    assert.ok(c.wordDescription && c.wordDescription.length > 5);
    assert.equal(c.hintWord, null);
    assert.deepEqual(c.fellowImpostorNames, []);
  }

  // Impostors get no secret word, no description, distinct hints (deck has 2 hints), and see each other's name
  assert.equal(impostors[0].secretWord, null);
  assert.equal(impostors[1].secretWord, null);
  assert.equal(impostors[0].wordDescription, null);
  assert.equal(impostors[1].wordDescription, null);
  assert.ok(impostors[0].hintWord);
  assert.ok(impostors[1].hintWord);
  assert.notEqual(impostors[0].hintWord, impostors[1].hintWord);
  assert.equal(impostors[0].fellowImpostorNames.length, 1);
  assert.equal(impostors[1].fellowImpostorNames.length, 1);

  // Prevent Impostor Going First guaranteed a civilian starts
  assert.equal(round.assignments[round.startingPlayerId].isImpostor, false);
});

test('voting out the last impostor grants immediate Civilian victory with NO Last Chance phase', () => {
  const players = DEFAULT_PLAYERS;
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    mode: 'word',
    impostorCountMode: 'standard',
    impostorCount: 1,
    survivalMode: false,
  };

  const created = createRound(players, [BUILT_IN_CATEGORIES[0]], settings, { word: [], question: [] }, 1, () => 0.1);
  assert.ok(created);
  const impostorId = Object.values(created.round.assignments).find((a) => a.isImpostor)!.playerId;

  const afterVote = eliminatePlayer(created.round, impostorId, false);
  assert.equal(afterVote.winner, 'civilians');
  assert.ok(afterVote.winReason?.includes('Civilians win immediately'));

  const deltas = calculateRoundScoreDeltas(afterVote);
  assert.equal(deltas[impostorId], undefined);
  for (const p of players) {
    if (p.id !== impostorId) {
      assert.equal(deltas[p.id], 1);
    }
  }
});

test('survival mode continues round when innocent civilian is voted out, standard mode ends immediately', () => {
  const players = makePlayers(5);
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    mode: 'question',
    impostorCountMode: 'standard',
    impostorCount: 1,
    survivalMode: true,
  };

  const created = createRound(players, [smallDeck], settings, { word: [], question: [] }, 1, () => 0.3);
  assert.ok(created);
  const civilians = Object.values(created.round.assignments).filter((a) => !a.isImpostor);
  const impostor = Object.values(created.round.assignments).find((a) => a.isImpostor)!;

  // Verify question mode gave civilians main and impostor decoy
  assert.equal(civilians[0].promptQuestion, created.round.mainQuestion);
  assert.equal(impostor.promptQuestion, created.round.decoyQuestion);

  // Standard mode (survivalMode=false) ends immediately on civilian vote-out
  const standardEnd = eliminatePlayer(created.round, civilians[0].playerId, false);
  assert.equal(standardEnd.winner, 'impostors');

  // Survival mode keeps going with 3 civilians vs 1 impostor
  const surv1 = eliminatePlayer(created.round, civilians[0].playerId, true);
  assert.equal(surv1.winner, null);
  assert.equal(surv1.assignments[civilians[0].playerId].eliminated, true);

  // Eliminate 2nd civilian -> 2 civilians vs 1 impostor, still continues
  const surv2 = eliminatePlayer(surv1, civilians[1].playerId, true);
  assert.equal(surv2.winner, null);

  // Eliminate 3rd civilian -> 1 civilian vs 1 impostor -> impostors control vote and win
  const surv3 = eliminatePlayer(surv2, civilians[2].playerId, true);
  assert.equal(surv3.winner, 'impostors');
  assert.equal(calculateRoundScoreDeltas(surv3)[impostor.playerId], 2);
});

test('chaos mode zero-impostor call resolves accurately', () => {
  const players = makePlayers(4);
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    impostorCountMode: 'chaos',
    hideImpostorCountInChaos: true,
  };
  const created = createRound(players, [smallDeck], settings, { word: [], question: [] }, 1, () => 0.01);
  assert.ok(created);
  assert.equal(created.round.impostorCount, 0);

  const called = callZeroImpostors(created.round);
  assert.equal(called.winner, 'civilians');
});

test('bulk import parsers handle valid lines and report invalid lines', () => {
  const words = parseBulkImportWords('Espresso | Morning fuel | Crema\nInvalidLineOnly\nMatcha | Green tea');
  assert.equal(words.entries.length, 2);
  assert.deepEqual(words.entries[0].hints, ['Morning fuel', 'Crema']);
  assert.deepEqual(words.entries[1].hints, ['Green tea']);
  assert.equal(words.errors.length, 1);

  const questions = parseBulkImportQuestions(
    'Best pizza topping? | Worst pizza topping?\nBadLineWithoutPipe\nFavorite season? | Worst season?'
  );
  assert.equal(questions.entries.length, 2);
  assert.equal(questions.entries[0].main, 'Best pizza topping?');
  assert.equal(questions.entries[0].decoy, 'Worst pizza topping?');
  assert.equal(questions.errors.length, 1);
});

test('submitPlayerAnswer stores trimmed answers immutably and rejects empty or unknown players', () => {
  const players = makePlayers(4);
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    mode: 'question',
  };
  const created = createRound(players, [smallDeck], settings, { word: [], question: [] }, 1, () => 0.25);
  assert.ok(created);
  assert.deepEqual(created.round.submittedAnswers, {});

  const after1 = submitPlayerAnswer(created.round, 'p-1', '  Pepperoni  ');
  assert.equal(after1.submittedAnswers['p-1'], 'Pepperoni');
  assert.deepEqual(created.round.submittedAnswers, {}); // immutable

  // Blank answer ignored
  const afterBlank = submitPlayerAnswer(after1, 'p-2', '   ');
  assert.equal(afterBlank, after1);

  // Unknown player ignored
  const afterUnknown = submitPlayerAnswer(after1, 'not-a-player', 'Olives');
  assert.equal(afterUnknown, after1);

  const after2 = submitPlayerAnswer(after1, 'p-2', 'Pineapple');
  assert.equal(after2.submittedAnswers['p-1'], 'Pepperoni');
  assert.equal(after2.submittedAnswers['p-2'], 'Pineapple');
});

test('extractSingleIcon preserves single letters, symbols, and compound emojis', () => {
  assert.equal(extractSingleIcon('  A  '), 'A');
  assert.equal(extractSingleIcon('Alex'), 'A');
  assert.equal(extractSingleIcon('★'), '★');
  assert.equal(extractSingleIcon('♠️'), '♠️');
  assert.equal(extractSingleIcon('🥷'), '🥷');
  assert.equal(extractSingleIcon('🧑‍🚀✨'), '🧑‍🚀');
  assert.equal(extractSingleIcon('   '), '');
});
