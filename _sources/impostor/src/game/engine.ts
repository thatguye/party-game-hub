import {
  CategoryDeck,
  GameMode,
  GameSettings,
  Player,
  PlayerRoleAssignment,
  QuestionPair,
  RoundState,
  UsedHistory,
  WordEntry,
} from '../types/game';

export type RandomFn = () => number;

export function calculateBalancedImpostorCount(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 9) return 2;
  if (playerCount <= 14) return 3;
  return Math.max(4, Math.floor(playerCount / 4));
}

export function resolveImpostorCount(
  playerCount: number,
  settings: Pick<GameSettings, 'impostorCountMode' | 'impostorCount'>,
  rng: RandomFn = Math.random
): number {
  const maxStandard = Math.max(1, playerCount - 1);

  if (settings.impostorCountMode === 'standard') {
    return Math.min(maxStandard, Math.max(1, Math.floor(settings.impostorCount)));
  }

  if (settings.impostorCountMode === 'balanced') {
    return Math.min(maxStandard, calculateBalancedImpostorCount(playerCount));
  }

  // Chaos Mode: 0 impostors (all civilians), 1..n-1, or ALL impostors!
  // Weighted so extreme chaos (0 or everyone) happens regularly (~25%) while 1..balanced+1 covers the rest
  const roll = rng();
  if (roll < 0.14) return 0;
  if (roll < 0.25) return playerCount;
  const maxMid = Math.max(1, playerCount - 1);
  return 1 + Math.floor(rng() * maxMid);
}

export function shuffleArray<T>(items: T[], rng: RandomFn = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface PickedPromptResult {
  deck: CategoryDeck;
  wordEntry: WordEntry | null;
  questionPair: QuestionPair | null;
  promptId: string;
  updatedUsedIds: string[];
  deckHistoryReset: boolean;
}

export function pickUnusedPrompt(
  selectedDecks: CategoryDeck[],
  mode: GameMode,
  usedIds: string[],
  rng: RandomFn = Math.random
): PickedPromptResult | null {
  const usedSet = new Set(usedIds);

  type Candidate = {
    deck: CategoryDeck;
    id: string;
    wordEntry?: WordEntry;
    questionPair?: QuestionPair;
  };

  const allCandidates: Candidate[] = [];
  for (const deck of selectedDecks) {
    if (mode === 'word') {
      for (const wordEntry of deck.words) {
        allCandidates.push({ deck, id: wordEntry.id, wordEntry });
      }
    } else {
      for (const questionPair of deck.questions) {
        allCandidates.push({ deck, id: questionPair.id, questionPair });
      }
    }
  }

  if (allCandidates.length === 0) return null;

  let pool = allCandidates.filter((c) => !usedSet.has(c.id));
  let deckHistoryReset = false;
  let nextUsedIds = [...usedIds];

  if (pool.length === 0) {
    // Exhausted all prompts across selected decks: clear only these decks' IDs from history
    const selectedPromptIds = new Set(allCandidates.map((c) => c.id));
    nextUsedIds = usedIds.filter((id) => !selectedPromptIds.has(id));
    pool = allCandidates;
    deckHistoryReset = true;
  }

  const chosen = pool[Math.floor(rng() * pool.length)];
  nextUsedIds.push(chosen.id);

  return {
    deck: chosen.deck,
    wordEntry: chosen.wordEntry ?? null,
    questionPair: chosen.questionPair ?? null,
    promptId: chosen.id,
    updatedUsedIds: nextUsedIds,
    deckHistoryReset,
  };
}

export interface CreateRoundResult {
  round: RoundState;
  updatedHistory: UsedHistory;
  deckHistoryReset: boolean;
}

export function createRound(
  players: Player[],
  selectedDecks: CategoryDeck[],
  settings: GameSettings,
  usedHistory: UsedHistory,
  roundNumber: number,
  rng: RandomFn = Math.random
): CreateRoundResult | null {
  if (players.length < 3 || selectedDecks.length === 0) {
    return null;
  }

  const modeUsedIds = settings.mode === 'word' ? usedHistory.word : usedHistory.question;
  const picked = pickUnusedPrompt(selectedDecks, settings.mode, modeUsedIds, rng);
  if (!picked) return null;

  const impostorCount = resolveImpostorCount(players.length, settings, rng);
  const shuffledPlayers = shuffleArray(players, rng);
  const impostorIds = new Set(shuffledPlayers.slice(0, impostorCount).map((p) => p.id));

  const impostorPlayers = players.filter((p) => impostorIds.has(p.id));
  const hintsList = picked.wordEntry ? [...picked.wordEntry.hints] : [];
  const shuffledHints = shuffleArray(hintsList, rng);

  const assignments: Record<string, PlayerRoleAssignment> = {};
  let impostorHintCursor = 0;

  for (const player of players) {
    const isImpostor = impostorIds.has(player.id);
    const fellowImpostorNames =
      isImpostor && settings.impostorTeamMode && impostorPlayers.length > 1
        ? impostorPlayers.filter((p) => p.id !== player.id).map((p) => p.name)
        : [];

    if (settings.mode === 'word') {
      let hintWord: string | null = null;
      if (isImpostor && settings.impostorHints && shuffledHints.length > 0) {
        hintWord = shuffledHints[impostorHintCursor % shuffledHints.length];
        impostorHintCursor += 1;
      }
      assignments[player.id] = {
        playerId: player.id,
        isImpostor,
        eliminated: false,
        secretWord: isImpostor ? null : picked.wordEntry!.word,
        wordDescription: isImpostor ? null : (picked.wordEntry!.description ?? null),
        hintWord,
        promptQuestion: null,
        fellowImpostorNames,
      };
    } else {
      assignments[player.id] = {
        playerId: player.id,
        isImpostor,
        eliminated: false,
        secretWord: null,
        wordDescription: null,
        hintWord: null,
        promptQuestion: isImpostor
          ? picked.questionPair!.decoy
          : picked.questionPair!.main,
        fellowImpostorNames,
      };
    }
  }

  // Pick starting speaker
  const civilianPlayers = players.filter((p) => !impostorIds.has(p.id));
  const speakerPool =
    settings.preventImpostorFirst && civilianPlayers.length > 0
      ? civilianPlayers
      : players;
  const startingPlayer = speakerPool[Math.floor(rng() * speakerPool.length)];

  const updatedHistory: UsedHistory =
    settings.mode === 'word'
      ? { ...usedHistory, word: picked.updatedUsedIds }
      : { ...usedHistory, question: picked.updatedUsedIds };

  const round: RoundState = {
    id: `round-${Date.now()}-${Math.floor(rng() * 10000)}`,
    mode: settings.mode,
    categoryId: picked.deck.id,
    categoryName: picked.deck.name,
    categoryEmoji: picked.deck.emoji,
    promptId: picked.promptId,
    secretWord: picked.wordEntry ? picked.wordEntry.word : null,
    secretWordDescription: picked.wordEntry?.description ?? null,
    allHints: hintsList,
    mainQuestion: picked.questionPair ? picked.questionPair.main : null,
    decoyQuestion: picked.questionPair ? picked.questionPair.decoy : null,
    submittedAnswers: {},
    impostorCount,
    hideImpostorCount:
      settings.impostorCountMode === 'chaos' && settings.hideImpostorCountInChaos,
    startingPlayerId: startingPlayer.id,
    assignments,
    playerOrder: players.map((p) => p.id),
    eliminatedOrder: [],
    lastEliminatedId: null,
    winner: null,
    winReason: null,
    roundNumber,
  };

  return {
    round,
    updatedHistory,
    deckHistoryReset: picked.deckHistoryReset,
  };
}

/**
 * Records a player's typed private answer during Question Mode.
 * Trims whitespace and ignores empty submissions or unknown player IDs.
 */
export function submitPlayerAnswer(
  round: RoundState,
  playerId: string,
  rawAnswer: string
): RoundState {
  if (!round.assignments[playerId]) {
    return round;
  }
  const trimmed = rawAnswer.trim();
  if (!trimmed) {
    return round;
  }
  return {
    ...round,
    submittedAnswers: {
      ...round.submittedAnswers,
      [playerId]: trimmed,
    },
  };
}

/**
 * Eliminates the voted player and evaluates win conditions IMMEDIATELY.
 * Per requirements: NO "Last Chance" word-guessing mechanic after an Impostor is voted out.
 * Once all Impostors are voted out, Civilians win immediately.
 */
export function eliminatePlayer(
  round: RoundState,
  targetPlayerId: string,
  survivalMode: boolean
): RoundState {
  const target = round.assignments[targetPlayerId];
  if (!target || target.eliminated || round.winner !== null) {
    return round;
  }

  const nextAssignments: Record<string, PlayerRoleAssignment> = {
    ...round.assignments,
    [targetPlayerId]: {
      ...target,
      eliminated: true,
    },
  };

  const nextEliminatedOrder = [...round.eliminatedOrder, targetPlayerId];
  const alive = Object.values(nextAssignments).filter((a) => !a.eliminated);
  const aliveImpostors = alive.filter((a) => a.isImpostor);
  const aliveCivilians = alive.filter((a) => !a.isImpostor);

  // Special Chaos case: 0 impostors were in the game and players wrongly voted out a Civilian
  if (round.impostorCount === 0) {
    if (!survivalMode || aliveCivilians.length <= 1) {
      return {
        ...round,
        assignments: nextAssignments,
        eliminatedOrder: nextEliminatedOrder,
        lastEliminatedId: targetPlayerId,
        winner: 'chaos_draw',
        winReason: 'Chaos twist! There were zero Impostors in this round.',
      };
    }
    return {
      ...round,
      assignments: nextAssignments,
      eliminatedOrder: nextEliminatedOrder,
      lastEliminatedId: targetPlayerId,
    };
  }

  // Special Chaos case: EVERYONE was an Impostor
  if (round.impostorCount === round.playerOrder.length) {
    return {
      ...round,
      assignments: nextAssignments,
      eliminatedOrder: nextEliminatedOrder,
      lastEliminatedId: targetPlayerId,
      winner: 'chaos_draw',
      winReason: 'Total Chaos! Every single player was an Impostor.',
    };
  }

  // Standard / Balanced / Normal Chaos win evaluation
  // 1. All Impostors voted out -> Civilians win IMMEDIATELY (no Last Chance guess)
  if (aliveImpostors.length === 0) {
    return {
      ...round,
      assignments: nextAssignments,
      eliminatedOrder: nextEliminatedOrder,
      lastEliminatedId: targetPlayerId,
      winner: 'civilians',
      winReason:
        round.impostorCount === 1
          ? 'The Impostor was caught! Civilians win immediately.'
          : 'All Impostors have been caught! Civilians win immediately.',
    };
  }

  // 2. If Survival Mode is OFF and an innocent Civilian is voted out -> Impostors win immediately
  if (!survivalMode && !target.isImpostor) {
    return {
      ...round,
      assignments: nextAssignments,
      eliminatedOrder: nextEliminatedOrder,
      lastEliminatedId: targetPlayerId,
      winner: 'impostors',
      winReason: 'An innocent Civilian was voted out. Impostors escape undetected!',
    };
  }

  // 3. If Survival Mode is ON (or multiple impostors remain): check if Impostors now outnumber or equal Civilians
  if (aliveImpostors.length >= aliveCivilians.length) {
    return {
      ...round,
      assignments: nextAssignments,
      eliminatedOrder: nextEliminatedOrder,
      lastEliminatedId: targetPlayerId,
      winner: 'impostors',
      winReason: 'Impostors now control the vote and win the round!',
    };
  }

  // Otherwise, round continues!
  return {
    ...round,
    assignments: nextAssignments,
    eliminatedOrder: nextEliminatedOrder,
    lastEliminatedId: targetPlayerId,
  };
}

/**
 * Allows the group in Chaos Mode (with hidden impostor count) to declare "There are NO Impostors!"
 */
export function callZeroImpostors(round: RoundState): RoundState {
  if (round.winner !== null) return round;
  if (round.impostorCount === 0) {
    return {
      ...round,
      winner: 'civilians',
      winReason: 'Sharp read! You correctly called that there were 0 Impostors.',
    };
  }
  return {
    ...round,
    winner: 'impostors',
    winReason: `False alarm! There ${round.impostorCount === 1 ? 'was 1 Impostor' : `were ${round.impostorCount} Impostors`} hiding among you.`,
  };
}

/**
 * Calculates score deltas for a completed round.
 * Civilians win: +1 point to every Civilian.
 * Impostors win: +2 points to every surviving Impostor (or +1 to caught Impostors if teammates won).
 */
export function calculateRoundScoreDeltas(round: RoundState): Record<string, number> {
  const deltas: Record<string, number> = {};
  if (!round.winner || round.winner === 'chaos_draw') {
    return deltas;
  }

  for (const assignment of Object.values(round.assignments)) {
    if (round.winner === 'civilians' && !assignment.isImpostor) {
      deltas[assignment.playerId] = 1;
    } else if (round.winner === 'impostors' && assignment.isImpostor) {
      deltas[assignment.playerId] = assignment.eliminated ? 1 : 2;
    }
  }

  return deltas;
}

export interface BulkImportWordsResult {
  entries: WordEntry[];
  errors: string[];
}

export function parseBulkImportWords(rawText: string, prefix = 'custom-w'): BulkImportWordsResult {
  const lines = rawText.split(/\r?\n/);
  const entries: WordEntry[] = [];
  const errors: string[] = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;

    const parts = line
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: Use "Word | Hint" format.`);
      return;
    }

    const [word, hint1, hint2] = parts;
    const hints: [string] | [string, string] = hint2 ? [hint1, hint2] : [hint1];
    entries.push({
      id: `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      word,
      hints,
    });
  });

  return { entries, errors };
}

export interface BulkImportQuestionsResult {
  entries: QuestionPair[];
  errors: string[];
}

export function parseBulkImportQuestions(
  rawText: string,
  prefix = 'custom-q'
): BulkImportQuestionsResult {
  const lines = rawText.split(/\r?\n/);
  const entries: QuestionPair[] = [];
  const errors: string[] = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;

    const parts = line
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: Use "Main Question | Decoy Question" format.`);
      return;
    }

    const [main, decoy] = parts;
    entries.push({
      id: `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      main,
      decoy,
    });
  });

  return { entries, errors };
}

/**
 * Extracts a single visible grapheme (one emoji, letter, or symbol) from user input,
 * preserving compound/ZWJ emojis like 👨‍🚀 or ❤️‍🔥 while trimming whitespace.
 */
export function extractSingleIcon(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (
        locales?: string,
        options?: { granularity: 'grapheme' }
      ) => { segment: (input: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    for (const part of segmenter.segment(trimmed)) {
      return part.segment;
    }
  }

  return Array.from(trimmed)[0] ?? '';
}
