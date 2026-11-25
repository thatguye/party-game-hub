import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Home,
  Link2,
  LogOut,
  MessageCircleQuestion,
  MessageSquare,
  MessageSquareQuote,
  MessageSquareText,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Type,
  Users,
  Vote,
  Wifi,
} from 'lucide-react';
import { CategoryDeck, GameMode, GameSettings, OnlineRoomState } from '../types/game';
import {
  ZERO_IMPOSTORS_VOTE,
  getAlivePlayerIds,
} from '../game/online';
import { SettingsDrawer } from './SettingsDrawer';
import { CategoryBrowser } from './CategoryBrowser';
import { playCardFlipSound, playTapSound } from '../utils/audio';

interface OnlineRoomViewProps {
  room: OnlineRoomState;
  myPlayerId: string;
  allDecks: CategoryDeck[];
  isSyncing: boolean;
  realtimeStatus: string;
  onForceSync: () => void;
  onLeaveRoom: () => void;
  onUpdateLobbyConfig: (patch: {
    settings?: GameSettings;
    selectedDeckIds?: string[];
  }) => void;
  onKickPlayer: (playerId: string) => void;
  onCreateCustomDeck: () => void;
  onEditCustomDeck: (deck: CategoryDeck) => void;
  onResetHistory: () => void;
  onStartRound: () => void;
  onWordReady: () => void;
  onForceDiscussion: () => void;
  onSubmitAnswer: (answer: string) => void;
  onTimerAction: (action: 'pause' | 'resume' | 'add30') => void;
  onStartVoting: () => void;
  onBackToDiscussion: () => void;
  onCastVote: (targetId: string) => void;
  onForceRevealVotes: () => void;
  onAdvanceAfterVote: () => void;
  onRevealAllRoles: () => void;
  onResetScores: () => void;
  onReturnToLobby: () => void;
}

function formatClock(totalSec: number): string {
  const clamped = Math.max(0, totalSec);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const OnlineRoomView: React.FC<OnlineRoomViewProps> = ({
  room,
  myPlayerId,
  allDecks,
  isSyncing,
  realtimeStatus,
  onForceSync,
  onLeaveRoom,
  onUpdateLobbyConfig,
  onKickPlayer,
  onCreateCustomDeck,
  onEditCustomDeck,
  onResetHistory,
  onStartRound,
  onWordReady,
  onForceDiscussion,
  onSubmitAnswer,
  onTimerAction,
  onStartVoting,
  onBackToDiscussion,
  onCastVote,
  onForceRevealVotes,
  onAdvanceAfterVote,
  onRevealAllRoles,
  onResetScores,
  onReturnToLobby,
}) => {
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  // Word Mode hold state (mobile scroll-safe pointer capture)
  const [isHoldingWord, setIsHoldingWord] = useState(false);
  const [hasPeekedWord, setHasPeekedWord] = useState(false);
  const holdingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Question Mode reveal + answer draft
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [answerDraft, setAnswerDraft] = useState('');
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  // Secret voting draft
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);

  // Synced live countdown derived from room.timerEndsAt
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Reset per-round local card state cleanly whenever round ID or phase shifts
  useEffect(() => {
    holdingRef.current = false;
    activePointerIdRef.current = null;
    setIsHoldingWord(false);
    setHasPeekedWord(false);
    setIsQuestionOpen(false);
    setAnswerDraft('');
    setSelectedVoteTarget(null);
  }, [room.round?.id]);

  useEffect(() => {
    setSelectedVoteTarget(null);
  }, [room.phase, room.voteOutcome?.revealedAt]);

  // Prevent accidental touchmove scrolling while holding Word Card or viewing private card
  useEffect(() => {
    if (room.phase !== 'role_reveal') return;
    const preventTouchScroll = (e: TouchEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [room.phase]);

  // Global safety release for hold-to-reveal
  useEffect(() => {
    if (room.phase !== 'role_reveal') return;
    const handleGlobalRelease = (e?: PointerEvent) => {
      if (
        e &&
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      if (holdingRef.current) {
        holdingRef.current = false;
        activePointerIdRef.current = null;
        setIsHoldingWord(false);
        playCardFlipSound(false);
      }
    };
    const handleBlur = () => handleGlobalRelease();
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleBlur);
    };
  }, [room.phase]);

  // Auto-focus question input
  useEffect(() => {
    if (room.phase === 'role_reveal' && room.round?.mode === 'question' && isQuestionOpen) {
      const t = window.setTimeout(() => answerInputRef.current?.focus(), 220);
      return () => window.clearTimeout(t);
    }
  }, [room.phase, room.round?.mode, isQuestionOpen]);

  // Compute remaining seconds from authoritative epoch timerEndsAt so backgrounding never drifts
  useEffect(() => {
    if (room.phase !== 'discussion' || room.settings.discussionTimer <= 0) {
      setSecondsLeft(0);
      return;
    }

    const compute = () => {
      if (room.timerPausedRemainingSec !== null) {
        setSecondsLeft(room.timerPausedRemainingSec);
      } else if (room.timerEndsAt) {
        setSecondsLeft(Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)));
      } else {
        setSecondsLeft(room.settings.discussionTimer);
      }
    };

    compute();
    const interval = window.setInterval(compute, 250);
    return () => window.clearInterval(interval);
  }, [
    room.phase,
    room.settings.discussionTimer,
    room.timerEndsAt,
    room.timerPausedRemainingSec,
  ]);

  const me = room.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost || room.hostId === myPlayerId;
  const playerMap = new Map(room.players.map((p) => [p.id, p]));

  // Merge custom decks synced from room
  const mergedDecksMap = new Map<string, CategoryDeck>();
  for (const d of allDecks) mergedDecksMap.set(d.id, d);
  for (const d of room.customDecks) mergedDecksMap.set(d.id, d);
  const effectiveDecks = Array.from(mergedDecksMap.values());

  const handleCopy = async (kind: 'code' | 'link') => {
    playTapSound();
    try {
      const text =
        kind === 'code'
          ? room.code
          : `${window.location.origin}/?room=${room.code}`;
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  // Top Room Status Strip (always shown inside active online room)
  const roomStatusStrip = (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#14141F] border border-white/[0.08] px-3.5 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400/15 border border-cyan-400/35 px-2.5 py-1 font-mono text-xs font-extrabold tracking-widest text-cyan-300"
            data-testid="online-room-code"
          >
            {room.code}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#9898B0]">
            <Wifi
              className={`h-3.5 w-3.5 ${
                realtimeStatus === 'SUBSCRIBED' ? 'text-emerald-400' : 'text-amber-300'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">
              {realtimeStatus === 'SUBSCRIBED' ? 'Live Sync' : 'Reconnecting'}
              {me ? ` · ${me.name}` : ''}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onForceSync();
            }}
            aria-label="Sync Room State"
            className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 text-xs font-semibold text-[#D6D6E6] hover:bg-white/[0.12] cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onLeaveRoom();
            }}
            aria-label="Leave Online Room"
            className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-rose-500/12 px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );

  /* ============================================================================
     PHASE 1: ONLINE ROOM LOBBY
     ============================================================================ */
  if (room.phase === 'lobby') {
    const selectedSet = new Set(room.selectedDeckIds);
    const validDecksForMode = effectiveDecks.filter(
      (d) =>
        selectedSet.has(d.id) &&
        (room.settings.mode === 'word' ? d.words.length > 0 : d.questions.length > 0)
    );
    const canStartError =
      room.players.length < 3
        ? `Need at least 3 players in the room (${room.players.length}/3).`
        : validDecksForMode.length === 0
        ? `Select at least one deck with ${room.settings.mode === 'word' ? 'words' : 'questions'}.`
        : null;

    const handleModeSwitch = (mode: GameMode) => {
      if (!isHost || room.settings.mode === mode) return;
      playTapSound();
      onUpdateLobbyConfig({ settings: { ...room.settings, mode } });
    };

    const handleToggleDeck = (deckId: string) => {
      if (!isHost) return;
      const next = selectedSet.has(deckId)
        ? room.selectedDeckIds.filter((id) => id !== deckId)
        : [...room.selectedDeckIds, deckId];
      onUpdateLobbyConfig({ selectedDeckIds: next });
    };

    const handleSelectAllDecks = () => {
      if (!isHost) return;
      const validIds = effectiveDecks
        .filter((d) => (room.settings.mode === 'word' ? d.words.length > 0 : d.questions.length > 0))
        .map((d) => d.id);
      onUpdateLobbyConfig({ selectedDeckIds: validIds });
    };

    return (
      <>
        {roomStatusStrip}
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-4 pb-12 pb-safe">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Invite Room Code, Players List, Host Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* Room Code & Start Card */}
              <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-cyan-400">Online Multiplayer Room</p>
                    <h1 className="font-display text-3xl font-extrabold tracking-widest text-white font-mono">
                      {room.code}
                    </h1>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy('code')}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 text-xs font-semibold text-[#F4F4F8] hover:bg-white/[0.14] cursor-pointer"
                    >
                      {copiedType === 'code' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      )}
                      <span>{copiedType === 'code' ? 'Copied' : 'Code'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('link')}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-cyan-400/15 border border-cyan-400/30 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/25 cursor-pointer"
                    >
                      {copiedType === 'link' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{copiedType === 'link' ? 'Copied' : 'Invite'}</span>
                    </button>
                  </div>
                </div>

                {/* Mode Switcher */}
                <div
                  role="tablist"
                  aria-label="Game Mode"
                  className="grid grid-cols-2 gap-2 rounded-2xl bg-[#09090E] p-1.5 border border-white/[0.06]"
                >
                  <button
                    type="button"
                    role="tab"
                    disabled={!isHost}
                    aria-selected={room.settings.mode === 'word'}
                    onClick={() => handleModeSwitch('word')}
                    className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all ${
                      room.settings.mode === 'word'
                        ? 'bg-[#1C1C2B] text-cyan-300 border border-cyan-400/35 shadow-sm'
                        : 'text-[#9898B0]'
                    } ${isHost ? 'cursor-pointer hover:text-[#F4F4F8]' : 'cursor-default'}`}
                  >
                    <Type className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Word Game</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    disabled={!isHost}
                    aria-selected={room.settings.mode === 'question'}
                    onClick={() => handleModeSwitch('question')}
                    className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all ${
                      room.settings.mode === 'question'
                        ? 'bg-[#1C1C2B] text-rose-300 border border-rose-400/35 shadow-sm'
                        : 'text-[#9898B0]'
                    } ${isHost ? 'cursor-pointer hover:text-[#F4F4F8]' : 'cursor-default'}`}
                  >
                    <MessageCircleQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Question Game</span>
                  </button>
                </div>

                {isHost ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={!!canStartError}
                      onClick={() => {
                        playTapSound();
                        onStartRound();
                      }}
                      className="flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                      <span>Start Round</span>
                    </button>
                    {canStartError && (
                      <p role="alert" className="text-center text-xs font-medium text-rose-400">
                        {canStartError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#09090E] border border-cyan-400/25 px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-cyan-300">
                      Waiting for {room.players.find((p) => p.isHost)?.name ?? 'Host'} to start
                      the round...
                    </p>
                  </div>
                )}
              </section>

              {/* Live Joined Players List */}
              <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    <h2 className="font-display text-base font-bold text-[#F4F4F8]">
                      Players in Room
                    </h2>
                    <span className="text-xs font-mono text-[#9898B0] tabular-nums">
                      · {room.players.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#9898B0]">Share {room.code} to join</span>
                </div>

                <ul className="divide-y divide-white/[0.06]">
                  {room.players.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-[#F4F4F8]"
                          style={{
                            backgroundColor: `${p.color}22`,
                            border: `1px solid ${p.color}55`,
                          }}
                        >
                          {p.emoji}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#F4F4F8] truncate">
                              {p.name}
                            </span>
                            {p.id === myPlayerId && (
                              <span className="text-[11px] font-semibold text-cyan-400">
                                (You)
                              </span>
                            )}
                          </div>
                          {p.isHost && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                              <Crown className="h-3 w-3" aria-hidden="true" />
                              <span>Host</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {isHost && p.id !== myPlayerId && (
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            onKickPlayer(p.id);
                          }}
                          aria-label={`Remove ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C7C96] hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Settings (Editable by Host, Read-Only Summary for Guests) */}
              {isHost ? (
                <SettingsDrawer
                  settings={room.settings}
                  playerCount={Math.max(3, room.players.length)}
                  onUpdateSettings={(patch) =>
                    onUpdateLobbyConfig({ settings: { ...room.settings, ...patch } })
                  }
                />
              ) : (
                <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-2">
                  <h2 className="font-display text-sm font-bold text-[#F4F4F8]">Room Rules</h2>
                  <p className="text-xs text-[#9898B0] leading-relaxed">
                    Mode:{' '}
                    <strong className="text-[#F4F4F8]">
                      {room.settings.mode === 'word' ? 'Word Game' : 'Question Game'}
                    </strong>{' '}
                    · Impostors:{' '}
                    <strong className="text-[#F4F4F8]">
                      {room.settings.impostorCountMode === 'chaos'
                        ? 'Chaos Mystery'
                        : room.settings.impostorCountMode === 'balanced'
                        ? 'Balanced'
                        : room.settings.impostorCount}
                    </strong>{' '}
                    · Timer:{' '}
                    <strong className="text-[#F4F4F8]">
                      {room.settings.discussionTimer === 0
                        ? 'Off'
                        : `${room.settings.discussionTimer / 60}m`}
                    </strong>
                    {room.settings.survivalMode ? ' · Survival On' : ''}
                  </p>
                </section>
              )}
            </div>

            {/* Right Column: Category Decks */}
            <div className="lg:col-span-7">
              {isHost ? (
                <CategoryBrowser
                  decks={effectiveDecks}
                  selectedDeckIds={room.selectedDeckIds}
                  mode={room.settings.mode}
                  usedHistory={room.usedHistory}
                  onToggleDeck={handleToggleDeck}
                  onSelectAll={handleSelectAllDecks}
                  onDeselectAll={() => onUpdateLobbyConfig({ selectedDeckIds: [] })}
                  onResetHistory={onResetHistory}
                  onCreateCustomDeck={onCreateCustomDeck}
                  onEditCustomDeck={onEditCustomDeck}
                />
              ) : (
                <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-[#F4F4F8]">
                    Selected Category Decks ({validDecksForMode.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {validDecksForMode.map((deck) => (
                      <div
                        key={deck.id}
                        className="flex items-center gap-3 rounded-2xl bg-[#09090E] border border-cyan-400/25 px-3.5 py-2.5"
                      >
                        <span className="text-xl" aria-hidden="true">
                          {deck.emoji}
                        </span>
                        <span className="text-xs font-bold text-[#F4F4F8] truncate">
                          {deck.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  const round = room.round;
  if (!round) return null;

  /* ============================================================================
     PHASE 2: PRIVATE PER-DEVICE ROLE / QUESTION REVEAL
     ============================================================================ */
  if (room.phase === 'role_reveal') {
    const myAssignment = round.assignments[myPlayerId];
    const isWordMode = round.mode === 'word';
    const readySet = new Set(room.readyPlayerIds);
    const isMeReady = readySet.has(myPlayerId);
    const hasMyAnswer = (round.submittedAnswers[myPlayerId] ?? '').trim().length > 0;
    const totalPlayers = round.playerOrder.length;
    const readyCount = isWordMode
      ? room.readyPlayerIds.length
      : round.playerOrder.filter((id) => (round.submittedAnswers[id] ?? '').trim().length > 0)
          .length;

    const startWordHold = () => {
      if (holdingRef.current) return;
      holdingRef.current = true;
      setIsHoldingWord(true);
      setHasPeekedWord(true);
      playCardFlipSound(true);
    };

    const endWordHold = () => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      activePointerIdRef.current = null;
      setIsHoldingWord(false);
      playCardFlipSound(false);
    };

    const showImpostorAlert = isWordMode && !!myAssignment?.isImpostor;

    return (
      <>
        {roomStatusStrip}
        <main className="mx-auto flex flex-1 min-h-0 w-full max-w-lg flex-col items-center justify-between overflow-hidden overscroll-none px-5 py-3 pb-safe touch-none">
          {/* Top Progress */}
          <div className="w-full shrink-0 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#9898B0]">
              <span>
                {round.categoryEmoji} {round.categoryName}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {readyCount} of {totalPlayers} {isWordMode ? 'Ready' : 'Answered'}
              </span>
            </div>

            <div className="flex gap-1.5" aria-hidden="true">
              {round.playerOrder.map((pid) => {
                const done = isWordMode
                  ? readySet.has(pid)
                  : (round.submittedAnswers[pid] ?? '').trim().length > 0;
                return (
                  <div
                    key={pid}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      done ? 'bg-cyan-400' : 'bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Center Private Card */}
          <div className="my-2 flex w-full flex-1 min-h-0 flex-col items-center justify-center overflow-hidden">
            {!myAssignment ? (
              <div className="rounded-3xl bg-[#14141F] border border-white/10 p-6 text-center space-y-2">
                <p className="text-sm font-bold text-[#F4F4F8]">Spectating This Round</p>
                <p className="text-xs text-[#9898B0]">
                  Waiting for players to finish viewing their roles...
                </p>
              </div>
            ) : isWordMode ? (
              <div className="w-full space-y-3 touch-none">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-[#F4F4F8]">
                    {me?.emoji} Your Secret Card
                  </p>
                  <p className="text-xs text-[#9898B0]">
                    {isHoldingWord
                      ? 'Release immediately to hide your role.'
                      : 'Press and hold on your screen to peek privately.'}
                  </p>
                </div>

                <div className="perspective-1200 w-full touch-none">
                  <button
                    type="button"
                    data-testid="online-hold-reveal-card"
                    aria-label="Press and Hold to Reveal Role"
                    aria-pressed={isHoldingWord}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      activePointerIdRef.current = e.pointerId;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // Ignore capture errors
                      }
                      startWordHold();
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      if (
                        activePointerIdRef.current !== null &&
                        e.pointerId !== activePointerIdRef.current
                      ) {
                        return;
                      }
                      try {
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                      } catch {
                        // Ignore release errors
                      }
                      endWordHold();
                    }}
                    onPointerCancel={(e) => {
                      if (
                        activePointerIdRef.current !== null &&
                        e.pointerId !== activePointerIdRef.current
                      ) {
                        return;
                      }
                      endWordHold();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        startWordHold();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        endWordHold();
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="no-select-touch touch-none relative block w-full h-[min(340px,48dvh)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-3xl cursor-pointer"
                  >
                    <div
                      className={`card-flip-inner preserve-3d relative h-full w-full ${
                        isHoldingWord ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* FRONT */}
                      <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-[#14141F] border-2 border-white/[0.1] p-6 text-center shadow-2xl">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 mb-4">
                          <Fingerprint className="h-9 w-9" aria-hidden="true" />
                        </div>
                        <h2 className="font-display text-2xl font-extrabold text-[#F4F4F8]">
                          Press & Hold to Reveal
                        </h2>
                        <p className="mt-1.5 max-w-xs text-xs text-[#9898B0]">
                          Only visible on your device while holding.
                        </p>
                        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#75758E]">
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                          <span>{hasPeekedWord ? 'Role viewed' : 'Card is hidden'}</span>
                        </div>
                      </div>

                      {/* BACK */}
                      <div
                        className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-between rounded-3xl border-2 p-6 text-center shadow-2xl ${
                          showImpostorAlert
                            ? 'bg-[#200D16] border-rose-500/70'
                            : 'bg-[#0E1B24] border-cyan-400/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-[#9898B0]">
                          <Eye
                            className={`h-4 w-4 ${showImpostorAlert ? 'text-rose-400' : 'text-cyan-400'}`}
                            aria-hidden="true"
                          />
                          <span>
                            {round.categoryEmoji} {round.categoryName}
                          </span>
                        </div>

                        {myAssignment.isImpostor ? (
                          <div className="space-y-3 my-auto w-full">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
                              YOU ARE THE IMPOSTOR
                            </h2>
                            {myAssignment.hintWord && (
                              <div className="rounded-2xl bg-black/35 border border-rose-400/30 px-4 py-2.5">
                                <p className="text-[11px] font-semibold text-rose-200/80">
                                  Subtle Hint
                                </p>
                                <p className="mt-0.5 font-display text-lg font-bold text-white">
                                  {myAssignment.hintWord}
                                </p>
                              </div>
                            )}
                            {myAssignment.fellowImpostorNames.length > 0 && (
                              <p className="text-xs font-semibold text-rose-200">
                                Partner(s):{' '}
                                <strong className="text-white">
                                  {myAssignment.fellowImpostorNames.join(', ')}
                                </strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5 my-auto w-full">
                            <p className="text-xs font-bold text-cyan-300">
                              Civilian · Secret Word
                            </p>
                            <h2 className="font-display text-3xl font-extrabold text-white tracking-tight break-words">
                              {myAssignment.secretWord}
                            </h2>
                            {myAssignment.wordDescription && (
                              <div className="mx-auto max-w-xs rounded-2xl bg-black/30 border border-cyan-400/20 px-3.5 py-2">
                                <p className="text-xs text-cyan-50/90 leading-relaxed">
                                  {myAssignment.wordDescription}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[11px] font-medium text-[#9898B0]">
                          Release finger to hide
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* QUESTION MODE ON OWN DEVICE */
              <div className="w-full space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-[#F4F4F8]">
                    {me?.emoji} Your Secret Question
                  </p>
                  <p className="text-xs text-[#9898B0]">
                    {hasMyAnswer
                      ? 'Answer locked in! Waiting for everyone else...'
                      : isQuestionOpen
                      ? 'Type your answer privately below.'
                      : 'Tap the card below to reveal your prompt and submit your answer.'}
                  </p>
                </div>

                {hasMyAnswer ? (
                  <div className="rounded-3xl bg-[#101C22] border border-cyan-400/35 p-7 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                      <Check className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-xl font-bold text-white">
                      Answer Submitted!
                    </h2>
                    <p className="text-xs text-[#9898B0]">
                      All answers reveal simultaneously once everyone submits ({readyCount}/
                      {totalPlayers}).
                    </p>
                  </div>
                ) : (
                  <div className="perspective-1200 w-full">
                    <div
                      className={`card-flip-inner preserve-3d relative w-full h-[min(380px,52dvh)] ${
                        isQuestionOpen ? 'rotate-y-180' : ''
                      }`}
                    >
                      <div
                        aria-hidden={isQuestionOpen}
                        className={`backface-hidden absolute inset-0 ${
                          isQuestionOpen ? 'pointer-events-none' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playCardFlipSound(true);
                            setIsQuestionOpen(true);
                          }}
                          className="flex h-full w-full flex-col items-center justify-center rounded-3xl bg-[#14141F] border-2 border-white/[0.1] p-6 text-center shadow-2xl hover:border-cyan-400/40 cursor-pointer"
                        >
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 mb-4">
                            <MessageSquareText className="h-9 w-9" aria-hidden="true" />
                          </div>
                          <h2 className="font-display text-2xl font-extrabold text-[#F4F4F8]">
                            Tap to Reveal Question
                          </h2>
                          <p className="mt-2 max-w-xs text-xs text-[#9898B0]">
                            Your prompt & answer stay private on your screen.
                          </p>
                        </button>
                      </div>

                      <div
                        aria-hidden={!isQuestionOpen}
                        className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl bg-[#0E1B24] border-2 border-cyan-400/70 p-5 shadow-2xl ${
                          !isQuestionOpen ? 'pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#9898B0] truncate">
                            {round.categoryEmoji} {round.categoryName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playCardFlipSound(false);
                              setIsQuestionOpen(false);
                            }}
                            className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 text-xs font-semibold text-[#D6D6E6] cursor-pointer"
                          >
                            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Hide</span>
                          </button>
                        </div>

                        <div className="my-auto space-y-2 text-center py-2">
                          <p className="text-xs font-bold text-cyan-300">Your Secret Question</p>
                          <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-snug">
                            “{myAssignment.promptQuestion}”
                          </h2>
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const trimmed = answerDraft.trim();
                            if (!trimmed) return;
                            playCardFlipSound(false);
                            onSubmitAnswer(trimmed);
                            setIsQuestionOpen(false);
                            setAnswerDraft('');
                          }}
                          className="space-y-2.5"
                        >
                          <input
                            ref={answerInputRef}
                            type="text"
                            value={answerDraft}
                            onChange={(e) => setAnswerDraft(e.target.value)}
                            placeholder="Type your answer..."
                            maxLength={80}
                            autoComplete="off"
                            className="w-full min-h-[48px] rounded-2xl bg-[#09090E] border border-white/[0.14] px-4 text-base text-[#F4F4F8] placeholder:text-[#75758E] focus:border-cyan-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!answerDraft.trim()}
                            className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-sm font-extrabold text-[#061318] hover:bg-cyan-300 disabled:bg-white/[0.08] disabled:text-[#666680] cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Send className="h-4 w-4" aria-hidden="true" />
                            <span>Lock In Secret Answer</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Ready & Waiting Status */}
          <div className="w-full shrink-0 space-y-2 pt-1">
            {isWordMode && myAssignment && (
              <button
                type="button"
                disabled={!hasPeekedWord || isHoldingWord || isMeReady}
                onClick={() => {
                  playTapSound();
                  onWordReady();
                }}
                className={`w-full min-h-[52px] rounded-2xl font-display text-sm font-extrabold transition-all cursor-pointer disabled:cursor-not-allowed ${
                  isMeReady
                    ? 'bg-emerald-400/20 border border-emerald-400/40 text-emerald-300'
                    : 'bg-cyan-400 text-[#061318] hover:bg-cyan-300 disabled:bg-white/[0.08] disabled:text-[#666680]'
                }`}
              >
                {isMeReady
                  ? `Ready ✓ (${readyCount}/${totalPlayers})`
                  : 'I’m Ready for Discussion'}
              </button>
            )}

            {isHost && readyCount < totalPlayers && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onForceDiscussion();
                }}
                className="w-full min-h-[38px] rounded-xl text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white cursor-pointer"
              >
                Host: Skip Wait & Start Discussion ({readyCount}/{totalPlayers})
              </button>
            )}
          </div>
        </main>
      </>
    );
  }

  /* ============================================================================
     PHASE 3: SYNCED DISCUSSION
     ============================================================================ */
  if (room.phase === 'discussion') {
    const startingPlayer = playerMap.get(round.startingPlayerId);
    const activePlayers = round.playerOrder
      .map((id) => playerMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p && !round.assignments[p.id]?.eliminated);
    const eliminatedPlayers = round.eliminatedOrder
      .map((id) => playerMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    const timerEnabled = room.settings.discussionTimer > 0;
    const isPaused = room.timerPausedRemainingSec !== null;
    const isTimeUp = timerEnabled && secondsLeft === 0;
    const isLowTime = timerEnabled && secondsLeft > 0 && secondsLeft <= 15;

    return (
      <>
        {roomStatusStrip}
        <main className="mx-auto flex w-full max-w-2xl flex-col justify-between px-5 py-4 pb-10 pb-safe gap-4">
          <div className="space-y-3.5">
            <div className="text-center space-y-1">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#9898B0]">
                <span>Round {round.roundNumber}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {round.categoryEmoji} {round.categoryName}
                </span>
                <span aria-hidden="true">·</span>
                <span className={round.hideImpostorCount ? 'text-rose-300 font-semibold' : ''}>
                  {round.hideImpostorCount
                    ? 'Chaos Mystery Impostors'
                    : `${round.impostorCount} ${round.impostorCount === 1 ? 'Impostor' : 'Impostors'}`}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4F4F8] tracking-tight">
                {round.mode === 'question' ? 'Answers Revealed' : 'Discuss & Find the Liar'}
              </h1>
            </div>

            {round.mode === 'word' && startingPlayer && round.eliminatedOrder.length === 0 && (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#14141F] border border-white/[0.08] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-xl font-bold"
                    style={{
                      backgroundColor: `${startingPlayer.color}22`,
                      border: `1px solid ${startingPlayer.color}66`,
                    }}
                  >
                    {startingPlayer.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-cyan-400">Starts the round</p>
                    <p className="font-display text-base font-bold text-[#F4F4F8] truncate">
                      {startingPlayer.name} speaks first
                    </p>
                  </div>
                </div>
                <MessageSquare className="h-4 w-4 text-[#75758E] shrink-0" aria-hidden="true" />
              </div>
            )}

            {round.mode === 'question' && (
              <>
                <section className="rounded-3xl bg-[#14141F] border border-cyan-400/30 p-5 text-center space-y-2">
                  <p className="text-xs font-bold tracking-wide text-cyan-400">
                    The Real Question
                  </p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-white leading-snug">
                    “{round.mainQuestion}”
                  </p>
                </section>

                <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#9898B0] px-1">
                    <span className="flex items-center gap-1.5 font-semibold text-[#D6D6E6]">
                      <MessageSquareQuote className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      <span>Everyone’s Answers ({activePlayers.length})</span>
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {activePlayers.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#09090E] border border-white/[0.07] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-base shrink-0"
                            style={{
                              backgroundColor: `${p.color}22`,
                              border: `1px solid ${p.color}55`,
                            }}
                          >
                            {p.emoji}
                          </span>
                          <span className="text-sm font-bold text-[#D6D6E6] truncate max-w-[120px]">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white text-right break-words min-w-0">
                          “{round.submittedAnswers[p.id] || '—'}”
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            {timerEnabled && (
              <section
                className={`rounded-3xl border px-5 py-4 text-center space-y-3 ${
                  isTimeUp
                    ? 'bg-rose-500/15 border-rose-500/50'
                    : isLowTime
                    ? 'bg-[#1F1219] border-rose-500/40'
                    : 'bg-[#14141F] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#9898B0]">
                  <Clock className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {isTimeUp
                      ? 'Time is up — Ready to vote!'
                      : isPaused
                      ? 'Timer Paused'
                      : 'Synced Discussion Timer'}
                  </span>
                </div>
                <div
                  className={`font-mono text-4xl sm:text-5xl font-bold tracking-tight tabular-nums ${
                    isTimeUp || isLowTime ? 'text-rose-400' : 'text-[#F4F4F8]'
                  }`}
                >
                  {formatClock(secondsLeft)}
                </div>
                {isHost && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={isTimeUp}
                      onClick={() => {
                        playTapSound();
                        onTimerAction(isPaused ? 'resume' : 'pause');
                      }}
                      className="flex min-h-[42px] items-center gap-2 rounded-xl bg-white/[0.08] px-4 text-xs font-bold text-[#F4F4F8] hover:bg-white/[0.14] disabled:opacity-40 cursor-pointer"
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        onTimerAction('add30');
                      }}
                      className="flex min-h-[42px] items-center gap-1 rounded-xl bg-white/[0.08] px-4 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-400/15 cursor-pointer"
                    >
                      <span>+30s</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            {round.mode === 'word' && (
              <section className="rounded-2xl bg-[#14141F] border border-white/[0.08] px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-[#D6D6E6]">
                  In the Round ({activePlayers.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activePlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-lg bg-[#09090E] border border-white/[0.07] px-2.5 py-1 text-xs font-semibold text-[#F4F4F8]"
                    >
                      <span>{p.emoji}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                  {eliminatedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 text-xs text-[#666680] line-through"
                    >
                      <span>{p.emoji}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Host Controls */}
          <div className="space-y-2.5 pt-2">
            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onStartVoting();
                  }}
                  className="flex w-full min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 cursor-pointer"
                >
                  <Vote className="h-5 w-5" aria-hidden="true" />
                  <span>Open Secret Voting</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onRevealAllRoles();
                  }}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-[#9898B0] hover:bg-white/[0.1] hover:text-white cursor-pointer"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Reveal All Roles</span>
                </button>
              </>
            ) : (
              <div className="rounded-2xl bg-[#14141F] border border-white/[0.08] px-4 py-3 text-center">
                <p className="text-xs font-semibold text-[#9898B0]">
                  Waiting for Host to open voting...
                </p>
              </div>
            )}
          </div>
        </main>
      </>
    );
  }

  /* ============================================================================
     PHASE 4: SYNCED SECRET VOTING
     ============================================================================ */
  if (room.phase === 'voting') {
    const aliveIds = getAlivePlayerIds(room);
    const alivePlayers = aliveIds
      .map((id) => playerMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    const amAlive = aliveIds.includes(myPlayerId);
    const myCastVote = room.votes[myPlayerId];
    const hasVoted = typeof myCastVote === 'string';
    const votesCastCount = aliveIds.filter((id) => typeof room.votes[id] === 'string').length;

    return (
      <>
        {roomStatusStrip}
        <main className="mx-auto flex w-full max-w-2xl flex-col justify-between px-5 py-5 pb-10 pb-safe gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onBackToDiscussion();
                  }}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Back to Discussion</span>
                </button>
              ) : (
                <span />
              )}
              <span className="font-mono text-xs text-cyan-300 font-bold tabular-nums">
                {votesCastCount} / {alivePlayers.length} voted
              </span>
            </div>

            <div className="text-center space-y-1">
              <h1 className="font-display text-3xl font-extrabold text-[#F4F4F8] tracking-tight">
                Secret Vote
              </h1>
              <p className="text-sm text-[#9898B0]">
                {!amAlive
                  ? 'You were eliminated—waiting for remaining players to finish voting.'
                  : hasVoted
                  ? 'Your vote is locked in secretly. Results reveal once everyone votes!'
                  : 'Pick your suspect on your own screen. Nobody sees votes until everyone locks in.'}
              </p>
            </div>

            {/* Ballot Progress Chips (only shows who voted, NEVER who they picked) */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {alivePlayers.map((p) => {
                const locked = typeof room.votes[p.id] === 'string';
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold border ${
                      locked
                        ? 'bg-emerald-400/15 border-emerald-400/35 text-emerald-300'
                        : 'bg-[#14141F] border-white/[0.08] text-[#9898B0]'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    {locked && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                );
              })}
            </div>

            {amAlive && !hasVoted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {alivePlayers.map((player) => {
                  const isSelected = selectedVoteTarget === player.id;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setSelectedVoteTarget(isSelected ? null : player.id);
                      }}
                      className={`flex min-h-[70px] items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/10'
                          : 'bg-[#14141F] border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold"
                          style={{
                            backgroundColor: `${player.color}22`,
                            border: `1px solid ${player.color}55`,
                          }}
                        >
                          {player.emoji}
                        </span>
                        <span className="font-display text-base font-bold text-[#F4F4F8] truncate">
                          {player.name}
                          {player.id === myPlayerId ? ' (You)' : ''}
                        </span>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-white/25'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            {amAlive && !hasVoted && (
              <>
                <button
                  type="button"
                  disabled={!selectedVoteTarget}
                  onClick={() => {
                    if (!selectedVoteTarget) return;
                    playTapSound();
                    onCastVote(selectedVoteTarget);
                  }}
                  className="flex w-full min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-rose-500 font-display text-base font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 disabled:bg-white/[0.08] disabled:text-[#666680] cursor-pointer disabled:cursor-not-allowed"
                >
                  <Vote className="h-5 w-5" aria-hidden="true" />
                  <span>
                    {selectedVoteTarget
                      ? `Cast Secret Vote for ${playerMap.get(selectedVoteTarget)?.name ?? 'Player'}`
                      : 'Select a Suspect'}
                  </span>
                </button>

                {round.hideImpostorCount && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onCastVote(ZERO_IMPOSTORS_VOTE);
                    }}
                    className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-amber-400/12 border border-amber-400/35 text-xs font-bold text-amber-300 hover:bg-amber-400/20 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Vote: Nobody is an Impostor!</span>
                  </button>
                )}
              </>
            )}

            {isHost && votesCastCount > 0 && votesCastCount < alivePlayers.length && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onForceRevealVotes();
                }}
                className="w-full min-h-[40px] rounded-xl text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white cursor-pointer"
              >
                Host: Reveal Votes Now ({votesCastCount}/{alivePlayers.length})
              </button>
            )}
          </div>
        </main>
      </>
    );
  }

  /* ============================================================================
     PHASE 5: SIMULTANEOUS VOTE RESULTS REVEAL
     ============================================================================ */
  if (room.phase === 'vote_results' && room.voteOutcome) {
    const outcome = room.voteOutcome;
    const eliminatedPlayer = outcome.eliminatedPlayerId
      ? playerMap.get(outcome.eliminatedPlayerId)
      : null;
    const eliminatedAssignment = outcome.eliminatedPlayerId
      ? round.assignments[outcome.eliminatedPlayerId]
      : null;
    const wasImpostor = !!eliminatedAssignment?.isImpostor;

    return (
      <>
        {roomStatusStrip}
        <main className="mx-auto flex w-full max-w-lg flex-col items-center justify-center px-5 py-6 pb-12 pb-safe space-y-5">
          <div
            className={`w-full rounded-3xl border-2 p-6 sm:p-7 text-center space-y-5 shadow-2xl ${
              outcome.isTie
                ? 'bg-[#191826] border-amber-400/60'
                : outcome.calledZeroImpostors
                ? round.winner === 'civilians'
                  ? 'bg-[#0E1C26] border-cyan-400/60'
                  : 'bg-[#210D16] border-rose-500/70'
                : wasImpostor
                ? 'bg-[#210D16] border-rose-500/70'
                : 'bg-[#0E1C26] border-cyan-400/60'
            }`}
          >
            {outcome.isTie ? (
              <>
                <h1 className="font-display text-3xl font-extrabold text-amber-300">
                  Tie Vote!
                </h1>
                <p className="text-sm text-[#D6D6E6]">
                  Nobody received a clear majority—everyone stays in the game!
                </p>
              </>
            ) : outcome.calledZeroImpostors ? (
              <>
                <h1
                  className={`font-display text-3xl font-extrabold ${
                    round.winner === 'civilians' ? 'text-cyan-300' : 'text-rose-400'
                  }`}
                >
                  {round.winner === 'civilians' ? 'Zero Impostors Confirmed!' : 'False Alarm!'}
                </h1>
                <p className="text-sm text-[#D6D6E6]">{round.winReason}</p>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-3xl font-display text-4xl font-bold"
                    style={{
                      backgroundColor: eliminatedPlayer ? `${eliminatedPlayer.color}22` : '#14141F',
                      border: `2px solid ${wasImpostor ? '#F43F5E' : '#22D3EE'}`,
                    }}
                  >
                    {eliminatedPlayer?.emoji}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-[#D6D6E6]">
                    {eliminatedPlayer?.name} was voted out...
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {wasImpostor ? (
                      <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="h-6 w-6 text-cyan-400 shrink-0" aria-hidden="true" />
                    )}
                    <h1
                      className={`font-display text-3xl font-extrabold tracking-tight ${
                        wasImpostor ? 'text-rose-400' : 'text-cyan-300'
                      }`}
                    >
                      {wasImpostor ? 'IMPOSTOR!' : 'INNOCENT CIVILIAN'}
                    </h1>
                  </div>
                  {round.winReason && (
                    <p className="pt-1 text-sm text-[#D6D6E6] leading-relaxed">
                      {round.winReason}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Simultaneous Secret Ballot Reveal */}
            <div className="rounded-2xl bg-black/30 border border-white/[0.08] p-4 text-left space-y-2">
              <p className="text-xs font-bold text-[#9898B0]">How Everyone Voted</p>
              <ul className="space-y-1.5">
                {Object.entries(room.votes).map(([voterId, targetId]) => {
                  const voter = playerMap.get(voterId);
                  const target =
                    targetId === ZERO_IMPOSTORS_VOTE ? null : playerMap.get(targetId);
                  if (!voter) return null;
                  return (
                    <li
                      key={voterId}
                      className="flex items-center justify-between text-xs text-[#E4E4F0]"
                    >
                      <span className="font-semibold">
                        {voter.emoji} {voter.name}
                      </span>
                      <span className="text-[#9898B0]">
                        →{' '}
                        <strong className="text-white">
                          {target
                            ? `${target.emoji} ${target.name}`
                            : 'Nobody is an Impostor'}
                        </strong>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onAdvanceAfterVote();
                }}
                className="w-full min-h-[54px] rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] hover:bg-cyan-300 cursor-pointer"
              >
                {round.winner ? 'See Round Summary' : 'Continue Discussion'}
              </button>
            ) : (
              <p className="text-xs font-semibold text-[#9898B0]">
                Waiting for Host to continue...
              </p>
            )}
          </div>
        </main>
      </>
    );
  }

  /* ============================================================================
     PHASE 6: SYNCED ROUND SUMMARY
     ============================================================================ */
  const impostors = round.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && !!round.assignments[p.id]?.isImpostor);

  const civiliansWon = round.winner === 'civilians';
  const impostorsWon = round.winner === 'impostors';

  const rankedScores = [...room.players]
    .map((p) => ({
      player: p,
      total: room.scores[p.id] ?? 0,
      delta: room.roundScoreDeltas[p.id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      {roomStatusStrip}
      <main className="mx-auto w-full max-w-2xl px-5 py-5 pb-12 pb-safe space-y-5">
        <section
          className={`rounded-3xl border-2 p-6 text-center space-y-2.5 ${
            civiliansWon
              ? 'bg-[#0D1E26] border-cyan-400/60'
              : impostorsWon
              ? 'bg-[#220D16] border-rose-500/60'
              : 'bg-[#1B1726] border-amber-400/50'
          }`}
        >
          <div className="flex justify-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                civiliansWon
                  ? 'bg-cyan-400/20 text-cyan-300'
                  : impostorsWon
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-400/20 text-amber-300'
              }`}
            >
              {civiliansWon ? (
                <Trophy className="h-7 w-7" aria-hidden="true" />
              ) : impostorsWon ? (
                <Flame className="h-7 w-7" aria-hidden="true" />
              ) : (
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              )}
            </div>
          </div>
          <h1
            className={`font-display text-3xl font-extrabold tracking-tight ${
              civiliansWon
                ? 'text-cyan-300'
                : impostorsWon
                ? 'text-rose-400'
                : 'text-amber-300'
            }`}
          >
            {civiliansWon
              ? 'Civilians Win!'
              : impostorsWon
              ? 'Impostors Win!'
              : 'Round Revealed'}
          </h1>
          {round.winReason && (
            <p className="text-sm text-[#D6D6E6] max-w-md mx-auto">{round.winReason}</p>
          )}
        </section>

        {/* Secret Word / Questions */}
        <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
          {round.mode === 'word' ? (
            <div className="rounded-2xl bg-[#09090E] border border-cyan-400/25 p-4 text-center space-y-1.5">
              <p className="text-xs font-semibold text-cyan-400">Secret Word</p>
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {round.secretWord}
              </p>
              {round.secretWordDescription && (
                <p className="text-xs text-[#B8B8CE] max-w-md mx-auto">
                  {round.secretWordDescription}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#09090E] border border-cyan-400/25 p-4 space-y-1">
                <p className="text-xs font-bold text-cyan-400">Main Question</p>
                <p className="text-sm font-semibold text-white">“{round.mainQuestion}”</p>
              </div>
              <div className="rounded-2xl bg-[#09090E] border border-rose-500/30 p-4 space-y-1">
                <p className="text-xs font-bold text-rose-400">Decoy Question</p>
                <p className="text-sm font-semibold text-white">“{round.decoyQuestion}”</p>
              </div>
            </div>
          )}
        </section>

        {/* Impostors */}
        <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
          <h2 className="font-display text-base font-bold text-[#F4F4F8]">
            {impostors.length === 0
              ? 'Zero Impostors'
              : impostors.length === 1
              ? 'The Impostor Was'
              : 'The Impostors Were'}
          </h2>
          {impostors.length === 0 ? (
            <p className="text-sm text-[#9898B0]">Every player was a Civilian!</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {impostors.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-2 rounded-2xl bg-rose-500/12 border border-rose-500/35 px-3.5 py-2"
                >
                  <span className="text-lg">{imp.emoji}</span>
                  <span className="text-sm font-bold text-white">{imp.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Synced Room Scoreboard */}
        {room.settings.scoreboardEnabled && (
          <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-[#F4F4F8]">Room Scores</h2>
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onResetScores();
                  }}
                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {rankedScores.map(({ player, total, delta }, i) => (
                <li key={player.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-mono text-xs text-[#9898B0]">
                      {i + 1}
                    </span>
                    <span>{player.emoji}</span>
                    <span className="text-sm font-semibold text-[#F4F4F8] truncate">
                      {player.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    {delta > 0 && (
                      <span className="text-xs font-bold text-emerald-400">+{delta}</span>
                    )}
                    <span className="text-sm font-bold text-cyan-300">{total} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Next Actions */}
        {isHost ? (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onStartRound();
              }}
              className="flex w-full min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] hover:bg-cyan-300 cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              <span>Play Again (Same Settings)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onReturnToLobby();
              }}
              className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] font-display text-sm font-semibold text-[#D6D6E6] hover:bg-white/[0.12] cursor-pointer"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>Back to Room Lobby</span>
            </button>
          </div>
        ) : (
          <p className="text-center text-xs font-semibold text-[#9898B0]">
            Waiting for Host to start the next round or return to lobby...
          </p>
        )}
      </main>
    </>
  );
};
