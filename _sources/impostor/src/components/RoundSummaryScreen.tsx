import React from 'react';
import {
  Flame,
  Home,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Player, RoundState } from '../types/game';
import { playTapSound } from '../utils/audio';

interface RoundSummaryScreenProps {
  round: RoundState;
  players: Player[];
  scores: Record<string, number>;
  roundScoreDeltas: Record<string, number>;
  scoreboardEnabled: boolean;
  onResetScores: () => void;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const RoundSummaryScreen: React.FC<RoundSummaryScreenProps> = ({
  round,
  players,
  scores,
  roundScoreDeltas,
  scoreboardEnabled,
  onResetScores,
  onPlayAgain,
  onBackToLobby,
}) => {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const impostors = round.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p && !!round.assignments[p.id]?.isImpostor);

  const civiliansWon = round.winner === 'civilians';
  const impostorsWon = round.winner === 'impostors';

  const rankedScores = [...players]
    .map((p) => ({
      player: p,
      total: scores[p.id] ?? 0,
      delta: roundScoreDeltas[p.id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-6 pb-12 pb-safe space-y-5">
      {/* Winner Banner */}
      <section
        className={`rounded-3xl border-2 p-6 sm:p-7 text-center space-y-3 ${
          civiliansWon
            ? 'bg-[#0D1E26] border-cyan-400/60'
            : impostorsWon
            ? 'bg-[#220D16] border-rose-500/60'
            : 'bg-[#1B1726] border-amber-400/50'
        }`}
      >
        <div className="flex justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              civiliansWon
                ? 'bg-cyan-400/20 text-cyan-300'
                : impostorsWon
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-amber-400/20 text-amber-300'
            }`}
          >
            {civiliansWon ? (
              <Trophy className="h-8 w-8" aria-hidden="true" />
            ) : impostorsWon ? (
              <Flame className="h-8 w-8" aria-hidden="true" />
            ) : (
              <Sparkles className="h-8 w-8" aria-hidden="true" />
            )}
          </div>
        </div>

        <h1
          className={`font-display text-3xl sm:text-4xl font-extrabold tracking-tight ${
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
          <p className="text-sm text-[#D6D6E6] max-w-md mx-auto leading-relaxed">
            {round.winReason}
          </p>
        )}
      </section>

      {/* Secret Word / Questions Reveal */}
      <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-[#9898B0]">
          <span>
            {round.categoryEmoji} {round.categoryName}
          </span>
          <span>{round.mode === 'word' ? 'Word Game' : 'Question Game'}</span>
        </div>

        {round.mode === 'word' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#09090E] border border-cyan-400/25 p-4 text-center space-y-1.5">
              <p className="text-xs font-semibold text-cyan-400">Secret Word</p>
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {round.secretWord}
              </p>
              {round.secretWordDescription && (
                <p className="text-xs text-[#B8B8CE] max-w-md mx-auto leading-relaxed">
                  {round.secretWordDescription}
                </p>
              )}
            </div>
            {round.allHints.length > 0 && (
              <p className="text-center text-xs text-[#9898B0]">
                Impostor Hints:{' '}
                <span className="font-semibold text-[#D6D6E6]">
                  {round.allHints.join(' · ')}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#09090E] border border-cyan-400/25 p-4 space-y-1.5">
                <p className="text-xs font-bold text-cyan-400">Main Question (Civilians)</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  “{round.mainQuestion}”
                </p>
              </div>
              <div className="rounded-2xl bg-[#09090E] border border-rose-500/30 p-4 space-y-1.5">
                <p className="text-xs font-bold text-rose-400">Decoy Question (Impostor)</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  “{round.decoyQuestion}”
                </p>
              </div>
            </div>

            {Object.keys(round.submittedAnswers).length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-[#9898B0]">Submitted Answers</p>
                <ul className="space-y-1.5">
                  {round.playerOrder.map((pid) => {
                    const player = playerMap.get(pid);
                    const assigned = round.assignments[pid];
                    const answer = round.submittedAnswers[pid];
                    if (!player || !assigned) return null;
                    return (
                      <li
                        key={pid}
                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 border ${
                          assigned.isImpostor
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-[#09090E] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                          <span aria-hidden="true">{player.emoji}</span>
                          <span className="text-xs font-bold text-[#F4F4F8] truncate max-w-[110px]">
                            {player.name}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              assigned.isImpostor ? 'text-rose-400' : 'text-cyan-400'
                            }`}
                          >
                            {assigned.isImpostor ? 'Impostor' : 'Civilian'}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-white text-right break-words min-w-0">
                          “{answer || '—'}”
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Impostor(s) Reveal */}
      <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-[#F4F4F8]">
            {impostors.length === 0
              ? 'Zero Impostors'
              : impostors.length === players.length
              ? 'Everyone Was an Impostor!'
              : impostors.length === 1
              ? 'The Impostor Was'
              : 'The Impostors Were'}
          </h2>
        </div>

        {impostors.length === 0 ? (
          <p className="text-sm text-[#9898B0]">
            Chaos Mode twist — every single player was an innocent Civilian!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {impostors.map((imp) => {
              const assigned = round.assignments[imp.id];
              return (
                <div
                  key={imp.id}
                  className="flex items-center gap-2.5 rounded-2xl bg-rose-500/12 border border-rose-500/35 px-3.5 py-2.5"
                >
                  <span className="text-xl" aria-hidden="true">
                    {imp.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{imp.name}</p>
                    {assigned?.hintWord && (
                      <p className="text-[11px] text-rose-200/80">
                        Hint: {assigned.hintWord}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Scoreboard Section */}
      {scoreboardEnabled && (
        <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-[#F4F4F8]">
                Scoreboard
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onResetScores();
              }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Scores</span>
            </button>
          </div>

          <ul className="divide-y divide-white/[0.06]">
            {rankedScores.map(({ player, total, delta }, index) => (
              <li key={player.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-center font-mono text-xs text-[#9898B0] tabular-nums">
                    {index + 1}
                  </span>
                  <span aria-hidden="true">{player.emoji}</span>
                  <span className="text-sm font-semibold text-[#F4F4F8] truncate">
                    {player.name}
                  </span>
                  <span className="text-[11px] text-[#75758E]">
                    · {round.assignments[player.id]?.isImpostor ? 'Impostor' : 'Civilian'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
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

      {/* Bottom CTAs */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            onPlayAgain();
          }}
          className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          <span>Play Again (Same Settings)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            onBackToLobby();
          }}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] font-display text-sm font-semibold text-[#D6D6E6] hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Back to Lobby</span>
        </button>
      </div>
    </main>
  );
};
