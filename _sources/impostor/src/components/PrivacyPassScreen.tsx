import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  MessageSquareText,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Player, RoundState } from '../types/game';
import { playCardFlipSound, playTapSound } from '../utils/audio';

interface PrivacyPassScreenProps {
  round: RoundState;
  players: Player[];
  onSubmitAnswer: (playerId: string, answer: string) => void;
  onCompletePassLoop: () => void;
}

export const PrivacyPassScreen: React.FC<PrivacyPassScreenProps> = ({
  round,
  players,
  onSubmitAnswer,
  onCompletePassLoop,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Word Mode state (press-and-hold)
  const [isHolding, setIsHolding] = useState(false);
  const [hasPeeked, setHasPeeked] = useState(false);
  const holdingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const holdButtonRef = useRef<HTMLButtonElement | null>(null);

  // Question Mode state (tap-to-reveal + typed private answer)
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [hasOpenedQuestion, setHasOpenedQuestion] = useState(false);
  const [answerDraft, setAnswerDraft] = useState('');
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const roundPlayers = round.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p);

  const completedSet = new Set(completedIds);
  const completedCount = completedIds.length;
  const totalCount = round.playerOrder.length;
  const remainingCount = totalCount - completedCount;
  const isFinalRemainingPlayer = remainingCount === 1;
  const isQuestionMode = round.mode === 'question';

  const currentPlayer = selectedPlayerId ? playerMap.get(selectedPlayerId) : undefined;
  const assignment = selectedPlayerId ? round.assignments[selectedPlayerId] : undefined;

  // Reset all state if a brand-new round starts
  useEffect(() => {
    setSelectedPlayerId(null);
    setCompletedIds([]);
    holdingRef.current = false;
    activePointerIdRef.current = null;
    setIsHolding(false);
    setHasPeeked(false);
    setIsQuestionOpen(false);
    setHasOpenedQuestion(false);
    setAnswerDraft('');
  }, [round.id]);

  // Reset per-player card state whenever switching selected player
  useEffect(() => {
    holdingRef.current = false;
    activePointerIdRef.current = null;
    setIsHolding(false);
    setHasPeeked(false);
    setIsQuestionOpen(false);
    setHasOpenedQuestion(false);
    setAnswerDraft('');
  }, [selectedPlayerId]);

  // Auto-focus answer input shortly after flipping open in Question Mode
  useEffect(() => {
    if (!isQuestionMode || !isQuestionOpen) return;
    const timer = window.setTimeout(() => {
      answerInputRef.current?.focus();
    }, 240);
    return () => window.clearTimeout(timer);
  }, [isQuestionMode, isQuestionOpen]);

  // Prevent iOS Safari rubber-band touch scrolling while viewing a player's card
  useEffect(() => {
    if (!selectedPlayerId) return;
    const preventTouchScroll = (e: TouchEvent) => {
      // Allow typing/selecting inside the Question Mode text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [selectedPlayerId]);

  // Safety release for Word Mode hold if pointer goes up anywhere on window
  useEffect(() => {
    if (isQuestionMode) return;
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
        setIsHolding(false);
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
  }, [isQuestionMode]);

  const startHold = () => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    setIsHolding(true);
    setHasPeeked(true);
    playCardFlipSound(true);
  };

  const endHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    activePointerIdRef.current = null;
    setIsHolding(false);
    playCardFlipSound(false);
  };

  const finishCurrentPlayer = (playerId: string) => {
    const nextCompleted = completedSet.has(playerId)
      ? completedIds
      : [...completedIds, playerId];
    setCompletedIds(nextCompleted);
    setSelectedPlayerId(null);

    if (nextCompleted.length >= totalCount) {
      onCompletePassLoop();
    }
  };

  const handleWordDone = () => {
    if (!selectedPlayerId) return;
    playTapSound();
    finishCurrentPlayer(selectedPlayerId);
  };

  const handleOpenQuestionCard = () => {
    setIsQuestionOpen(true);
    setHasOpenedQuestion(true);
    playCardFlipSound(true);
  };

  const handleHideQuestionCard = () => {
    setIsQuestionOpen(false);
    playCardFlipSound(false);
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    const trimmed = answerDraft.trim();
    if (!trimmed) return;
    playCardFlipSound(false);
    onSubmitAnswer(selectedPlayerId, trimmed);
    setIsQuestionOpen(false);
    setAnswerDraft('');
    finishCurrentPlayer(selectedPlayerId);
  };

  const showImpostorAlert = round.mode === 'word' && !!assignment?.isImpostor;
  const canSubmitAnswer = answerDraft.trim().length > 0;
  const canBackOutSafely = isQuestionMode ? !hasOpenedQuestion : !hasPeeked;

  return (
    <main
      className={`mx-auto flex flex-1 min-h-0 w-full max-w-lg flex-col items-center justify-between overflow-hidden overscroll-none px-5 py-4 pb-safe ${
        selectedPlayerId ? 'touch-none' : ''
      }`}
    >
      {/* Top Progress */}
      <div className="w-full shrink-0 space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#9898B0]">
          <span>
            {round.categoryEmoji} {round.categoryName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {completedCount} of {totalCount} {isQuestionMode ? 'Answered' : 'Ready'}
          </span>
        </div>

        {/* Segmented Progress Bar */}
        <div className="flex gap-1.5" aria-hidden="true">
          {round.playerOrder.map((pid, idx) => (
            <div
              key={pid}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx < completedCount
                  ? 'bg-cyan-400'
                  : idx === completedCount && selectedPlayerId
                  ? 'bg-white'
                  : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Center Stage */}
      <div className="my-3 flex w-full flex-1 min-h-0 flex-col items-center justify-center overflow-hidden">
        {!selectedPlayerId || !currentPlayer || !assignment ? (
          /* PLAYER PICKER GRID: Tap Whoever You Are */
          <section
            aria-label="Select Your Name"
            className="flex w-full max-h-full flex-col space-y-4 overflow-hidden"
          >
            <div className="shrink-0 text-center space-y-1">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4F4F8] tracking-tight">
                Tap Your Name
              </h1>
              <p className="text-sm text-[#9898B0]">
                {isQuestionMode
                  ? 'Pick yourself to reveal your secret question and type your answer.'
                  : 'Pick yourself to privately view your secret role card.'}
              </p>
            </div>

            <div
              data-testid="player-picker-grid"
              className={`grid gap-2.5 overflow-y-auto overscroll-contain pr-0.5 ${
                roundPlayers.length >= 7 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
              }`}
            >
              {roundPlayers.map((player) => {
                const isDone = completedSet.has(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isDone}
                    data-testid={`pick-player-${player.id}`}
                    aria-label={isDone ? `${player.name} (Done)` : `Select ${player.name}`}
                    onClick={() => {
                      playTapSound();
                      setSelectedPlayerId(player.id);
                    }}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-3xl border p-4 text-center transition-all min-h-[110px] ${
                      isDone
                        ? 'bg-[#10161D] border-emerald-400/25 opacity-60 cursor-default'
                        : 'bg-[#14141F] border-white/[0.1] hover:border-cyan-400/50 hover:bg-[#1A1A29] active:scale-[0.97] shadow-lg cursor-pointer'
                    }`}
                  >
                    {isDone && (
                      <span
                        aria-hidden="true"
                        className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    )}

                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-sm"
                      style={{
                        backgroundColor: `${player.color}22`,
                        border: `1.5px solid ${player.color}66`,
                      }}
                      aria-hidden="true"
                    >
                      {player.emoji}
                    </div>

                    <div className="w-full space-y-0.5">
                      <p className="font-display text-base font-bold text-[#F4F4F8] truncate">
                        {player.name}
                      </p>
                      <p
                        className={`text-[11px] font-semibold ${
                          isDone ? 'text-emerald-300' : 'text-[#8C8CA6]'
                        }`}
                      >
                        {isDone
                          ? isQuestionMode
                            ? 'Answered'
                            : 'Viewed'
                          : 'Tap to go'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : isQuestionMode ? (
          /* QUESTION MODE: Tap-to-Reveal Card + Private Answer Input */
          <div className="w-full space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#F4F4F8]">
                {currentPlayer.emoji} {currentPlayer.name}’s Turn
              </p>
              <p className="text-xs text-[#9898B0]">
                {isQuestionOpen
                  ? 'Type your private answer below, then submit to hide it.'
                  : 'Tap the card below to reveal your question and enter your answer.'}
              </p>
            </div>

            <div className="perspective-1200 w-full">
              <div
                className={`card-flip-inner preserve-3d relative w-full h-[min(390px,56dvh)] sm:h-[min(420px,58dvh)] ${
                  isQuestionOpen ? 'rotate-y-180' : ''
                }`}
              >
                {/* FRONT FACE (Hidden / Tap to Flip) */}
                <div
                  aria-hidden={isQuestionOpen}
                  className={`backface-hidden absolute inset-0 ${
                    isQuestionOpen ? 'pointer-events-none' : ''
                  }`}
                >
                  <button
                    type="button"
                    data-testid="tap-reveal-card"
                    tabIndex={isQuestionOpen ? -1 : 0}
                    onClick={handleOpenQuestionCard}
                    className="flex h-full w-full flex-col items-center justify-center rounded-3xl bg-[#14141F] border-2 border-white/[0.1] p-7 text-center shadow-2xl hover:border-cyan-400/40 active:scale-[0.99] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 mb-5">
                      <MessageSquareText className="h-10 w-10" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-[#F4F4F8]">
                      Tap to Reveal Question
                    </h2>
                    <p className="mt-2 max-w-xs text-sm text-[#9898B0]">
                      Click once to open your secret prompt and type your answer privately.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#75758E]">
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {answerDraft.trim().length > 0
                          ? 'Draft saved · Tap to resume typing'
                          : 'Question is hidden'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* BACK FACE (Revealed Question + Answer Form) */}
                <div
                  aria-hidden={!isQuestionOpen}
                  className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl bg-[#0E1B24] border-2 border-cyan-400/70 p-6 shadow-2xl ${
                    !isQuestionOpen ? 'pointer-events-none' : ''
                  }`}
                >
                  {/* Card Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#9898B0] min-w-0">
                      <Eye className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {round.categoryEmoji} {round.categoryName}
                      </span>
                    </div>

                    <button
                      type="button"
                      tabIndex={isQuestionOpen ? 0 : -1}
                      onClick={handleHideQuestionCard}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 text-xs font-semibold text-[#D6D6E6] hover:bg-white/[0.15] transition-colors cursor-pointer shrink-0"
                    >
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hide</span>
                    </button>
                  </div>

                  {/* Secret Prompt */}
                  <div className="my-auto space-y-2.5 text-center py-2">
                    <p className="text-xs font-bold tracking-wide text-cyan-300">
                      Your Secret Question
                    </p>
                    <h2
                      data-testid="secret-question-text"
                      className="font-display text-xl sm:text-2xl font-bold text-white leading-snug"
                    >
                      “{assignment.promptQuestion}”
                    </h2>
                  </div>

                  {/* Answer Form */}
                  <form onSubmit={handleQuestionSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="player-answer-input" className="sr-only">
                        Your answer
                      </label>
                      <input
                        id="player-answer-input"
                        ref={answerInputRef}
                        type="text"
                        tabIndex={isQuestionOpen ? 0 : -1}
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value)}
                        placeholder="Type your answer..."
                        maxLength={80}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full min-h-[50px] rounded-2xl bg-[#09090E] border border-white/[0.14] px-4 text-base font-medium text-[#F4F4F8] placeholder:text-[#75758E] focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      tabIndex={isQuestionOpen ? 0 : -1}
                      disabled={!canSubmitAnswer}
                      className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-sm sm:text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:bg-white/[0.08] disabled:text-[#666680] disabled:shadow-none active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {isFinalRemainingPlayer
                          ? 'Submit & Reveal All Answers'
                          : 'Submit & Back to Players'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* WORD MODE: 3D Press-and-Hold Secret Card */
          <div className="w-full space-y-4 touch-none">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#F4F4F8]">
                {currentPlayer.emoji} {currentPlayer.name}’s Secret Card
              </p>
              <p className="text-xs text-[#9898B0]">
                {isHolding
                  ? 'Release immediately to hide your role.'
                  : 'Press and hold the card below to peek privately.'}
              </p>
            </div>

            <div className="perspective-1200 w-full touch-none">
              <button
                ref={holdButtonRef}
                type="button"
                data-testid="hold-reveal-card"
                aria-label="Press and Hold to Reveal Role"
                aria-pressed={isHolding}
                onPointerDown={(e) => {
                  e.preventDefault();
                  activePointerIdRef.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore capture errors on synthetic events
                  }
                  startHold();
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
                    // Ignore release errors on synthetic events
                  }
                  endHold();
                }}
                onPointerCancel={(e) => {
                  if (
                    activePointerIdRef.current !== null &&
                    e.pointerId !== activePointerIdRef.current
                  ) {
                    return;
                  }
                  endHold();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    startHold();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    endHold();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="no-select-touch touch-none relative block w-full h-[min(360px,52dvh)] sm:h-[min(380px,54dvh)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-3xl cursor-pointer"
              >
                <div
                  className={`card-flip-inner preserve-3d relative h-full w-full ${
                    isHolding ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT FACE (Hidden / Face-Down) */}
                  <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-[#14141F] border-2 border-white/[0.1] p-7 text-center shadow-2xl">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 mb-5">
                      <Fingerprint className="h-10 w-10" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-[#F4F4F8]">
                      Press & Hold to Reveal
                    </h2>
                    <p className="mt-2 max-w-xs text-sm text-[#9898B0]">
                      Hold your thumb down to flip. Letting go hides it instantly.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#75758E]">
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      <span>{hasPeeked ? 'Role viewed · Safe to continue' : 'Card is hidden'}</span>
                    </div>
                  </div>

                  {/* BACK FACE (Revealed Secret Role) */}
                  <div
                    className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-between rounded-3xl border-2 p-7 text-center shadow-2xl ${
                      showImpostorAlert
                        ? 'bg-[#200D16] border-rose-500/70'
                        : 'bg-[#0E1B24] border-cyan-400/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#9898B0]">
                      <Eye
                        className={`h-4 w-4 ${showImpostorAlert ? 'text-rose-400' : 'text-cyan-400'}`}
                        aria-hidden="true"
                      />
                      <span>
                        {round.categoryEmoji} {round.categoryName}
                      </span>
                    </div>

                    {assignment.isImpostor ? (
                      <div className="space-y-4 my-auto w-full">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
                          YOU ARE THE IMPOSTOR
                        </h2>

                        {assignment.hintWord && (
                          <div className="rounded-2xl bg-black/35 border border-rose-400/30 px-4 py-3">
                            <p className="text-xs font-semibold text-rose-200/80">Subtle Hint</p>
                            <p className="mt-0.5 font-display text-xl font-bold text-white">
                              {assignment.hintWord}
                            </p>
                          </div>
                        )}

                        {assignment.fellowImpostorNames.length > 0 && (
                          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-200">
                            <Users className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
                            <span>
                              Partner{assignment.fellowImpostorNames.length > 1 ? 's' : ''}:{' '}
                              <strong className="text-white">
                                {assignment.fellowImpostorNames.join(', ')}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 my-auto w-full">
                        <p className="text-xs font-bold tracking-wide text-cyan-300">
                          Civilian · Secret Word
                        </p>
                        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">
                          {assignment.secretWord}
                        </h2>
                        {assignment.wordDescription ? (
                          <div
                            data-testid="civilian-word-description"
                            className="mx-auto max-w-xs rounded-2xl bg-black/30 border border-cyan-400/20 px-4 py-2.5"
                          >
                            <p className="text-xs text-cyan-50/90 leading-relaxed">
                              {assignment.wordDescription}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-cyan-100/70 max-w-xs mx-auto pt-1">
                            Give a clever clue that proves you know it without handing it to the Impostor.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] font-medium text-[#9898B0]">
                      Release finger to flip card back down
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="w-full shrink-0 space-y-2 pt-1">
        {!selectedPlayerId ? (
          <p className="text-center text-xs text-[#666680]">
            Tap your own name when it’s your turn
          </p>
        ) : !isQuestionMode ? (
          <>
            <button
              type="button"
              disabled={!hasPeeked || isHolding}
              onClick={handleWordDone}
              className="w-full min-h-[54px] rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:bg-white/[0.08] disabled:text-[#666680] disabled:shadow-none active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isFinalRemainingPlayer
                ? 'Hide & Start Discussion'
                : 'Hide & Back to Players'}
            </button>

            {canBackOutSafely && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedPlayerId(null);
                }}
                className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-2xl text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Wrong person? Back to players</span>
              </button>
            )}
          </>
        ) : canBackOutSafely ? (
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setSelectedPlayerId(null);
            }}
            className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-2xl text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Wrong person? Back to players</span>
          </button>
        ) : (
          <p className="text-center text-xs text-[#666680]">
            Answers stay completely secret until everyone submits
          </p>
        )}
      </div>
    </main>
  );
};
