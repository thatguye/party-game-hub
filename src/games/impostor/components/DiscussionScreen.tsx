import React, { useEffect, useState } from 'react';
import {
  Clock,
  Eye,
  MessageSquare,
  MessageSquareQuote,
  Pause,
  Play,
  Plus,
  Users,
  Vote,
} from 'lucide-react';
import { DiscussionTimerSeconds, Player, RoundState } from '../types/game';
import {
  playTapSound,
  playTimerExpiredSound,
  playTimerTickSound,
} from '../utils/audio';

interface DiscussionScreenProps {
  round: RoundState;
  players: Player[];
  initialTimerSeconds: DiscussionTimerSeconds;
  onStartVoting: () => void;
  onRevealAllRoles: () => void;
}

function formatClock(totalSec: number): string {
  const clamped = Math.max(0, totalSec);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const DiscussionScreen: React.FC<DiscussionScreenProps> = ({
  round,
  players,
  initialTimerSeconds,
  onStartVoting,
  onRevealAllRoles,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialTimerSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [confirmRevealAll, setConfirmRevealAll] = useState(false);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const startingPlayer = playerMap.get(round.startingPlayerId);

  const activePlayers = round.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p && !round.assignments[p.id]?.eliminated);

  const eliminatedPlayers = round.eliminatedOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p);

  const timerEnabled = initialTimerSeconds > 0;

  useEffect(() => {
    if (!timerEnabled || isPaused || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next === 0) {
          playTimerExpiredSound();
        } else if (next <= 5) {
          playTimerTickSound(true);
        } else if (next <= 10) {
          playTimerTickSound(false);
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timerEnabled, isPaused, secondsLeft]);

  const isLowTime = timerEnabled && secondsLeft > 0 && secondsLeft <= 15;
  const isTimeUp = timerEnabled && secondsLeft === 0;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-2xl flex-col justify-between px-5 py-4 pb-safe gap-4">
      <div className="space-y-3.5">
        {/* Round Metadata Header */}
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

        {/* Starting Speaker Callout (Word Mode only) */}
        {round.mode === 'word' && startingPlayer && round.eliminatedOrder.length === 0 && (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#14141F] border border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
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

        {/* Question Mode: Main Question + Everyone's Revealed Answers */}
        {round.mode === 'question' && (
          <>
            <section
              aria-label="The Real Question"
              className="rounded-3xl bg-[#14141F] border border-cyan-400/30 p-5 text-center space-y-2"
            >
              <p className="text-xs font-bold tracking-wide text-cyan-400">
                The Real Question
              </p>
              <p className="font-display text-xl sm:text-2xl font-extrabold text-white leading-snug">
                “{round.mainQuestion}”
              </p>
              <p className="text-xs text-[#9898B0]">
                Whose answer looks weirdly off? Debate and expose the Impostor!
              </p>
            </section>

            <section
              aria-label="Everyone's Answers"
              data-testid="revealed-answers-list"
              className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs text-[#9898B0] px-1">
                <span className="flex items-center gap-1.5 font-semibold text-[#D6D6E6]">
                  <MessageSquareQuote className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Everyone’s Answers ({activePlayers.length})</span>
                </span>
                {eliminatedPlayers.length > 0 && (
                  <span className="text-rose-300 font-medium">
                    {eliminatedPlayers.length} eliminated
                  </span>
                )}
              </div>

              <ul className="space-y-2">
                {activePlayers.map((p) => {
                  const ans = round.submittedAnswers[p.id];
                  return (
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
                          aria-hidden="true"
                        >
                          {p.emoji}
                        </span>
                        <span className="text-sm font-bold text-[#D6D6E6] truncate max-w-[115px] sm:max-w-[160px]">
                          {p.name}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-white text-right break-words min-w-0">
                        “{ans || '—'}”
                      </p>
                    </li>
                  );
                })}

                {eliminatedPlayers.map((p) => {
                  const ans = round.submittedAnswers[p.id];
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-2 opacity-60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                        <span className="text-base" aria-hidden="true">
                          {p.emoji}
                        </span>
                        <span className="text-xs font-medium text-[#7C7C96] line-through truncate max-w-[115px]">
                          {p.name}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#7C7C96] line-through text-right break-words min-w-0">
                        “{ans || '—'}”
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        {/* Discussion Timer Card */}
        {timerEnabled && (
          <section
            aria-label="Discussion Timer"
            className={`rounded-3xl border px-5 py-4 text-center space-y-3 transition-colors ${
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
                  : 'Discussion Timer'}
              </span>
            </div>

            <div
              data-testid="discussion-timer-display"
              className={`font-mono text-4xl sm:text-5xl font-bold tracking-tight tabular-nums ${
                isTimeUp || isLowTime ? 'text-rose-400' : 'text-[#F4F4F8]'
              }`}
            >
              {formatClock(secondsLeft)}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isTimeUp}
                onClick={() => {
                  playTapSound();
                  setIsPaused((p) => !p);
                }}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-5 text-xs font-bold text-[#F4F4F8] hover:bg-white/[0.14] disabled:opacity-40 transition-colors cursor-pointer"
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
                  setSecondsLeft((prev) => prev + 30);
                }}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] px-4 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-400/15 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>30s</span>
              </button>
            </div>
          </section>
        )}

        {/* Active Roster Strip (Word Mode only — Question Mode shows everyone in Everyone's Answers) */}
        {round.mode === 'word' && (
          <section className="rounded-2xl bg-[#14141F] border border-white/[0.08] px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9898B0]">
              <span className="flex items-center gap-1.5 font-semibold text-[#D6D6E6]">
                <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>In the Round ({activePlayers.length})</span>
              </span>
              {eliminatedPlayers.length > 0 && (
                <span className="text-rose-300 font-medium">
                  {eliminatedPlayers.length} eliminated
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activePlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-[#09090E] border border-white/[0.07] px-2.5 py-1 text-xs font-semibold text-[#F4F4F8]"
                >
                  <span aria-hidden="true">{p.emoji}</span>
                  <span>{p.name}</span>
                </div>
              ))}
              {eliminatedPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 text-xs font-medium text-[#666680] line-through"
                >
                  <span aria-hidden="true">{p.emoji}</span>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            onStartVoting();
          }}
          className="flex w-full min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Vote className="h-5 w-5" aria-hidden="true" />
          <span>Start Voting</span>
        </button>

        {!confirmRevealAll ? (
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setConfirmRevealAll(true);
            }}
            className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-sm font-semibold text-[#9898B0] hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Reveal All Roles</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmRevealAll(false)}
              className="min-h-[46px] flex-1 rounded-2xl bg-white/[0.06] text-xs font-semibold text-[#D6D6E6] hover:bg-white/[0.12] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onRevealAllRoles();
              }}
              className="min-h-[46px] flex-1 rounded-2xl bg-rose-500 text-xs font-bold text-white hover:bg-rose-400 cursor-pointer"
            >
              Confirm Reveal All
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
