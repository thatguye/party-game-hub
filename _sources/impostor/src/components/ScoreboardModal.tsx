import React from 'react';
import { RotateCcw, Trophy, X } from 'lucide-react';
import { Player } from '../types/game';
import { playTapSound } from '../utils/audio';

interface ScoreboardModalProps {
  isOpen: boolean;
  players: Player[];
  scores: Record<string, number>;
  onResetScores: () => void;
  onClose: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  players,
  scores,
  onResetScores,
  onClose,
}) => {
  if (!isOpen) return null;

  const ranked = [...players]
    .map((p) => ({ player: p, points: scores[p.id] ?? 0 }))
    .sort((a, b) => b.points - a.points);

  const hasAnyPoints = ranked.some((r) => r.points > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoreboard-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl bg-[#14141F] border border-white/10 shadow-2xl overflow-hidden">
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h2 id="scoreboard-title" className="font-display text-xl font-bold text-[#F4F4F8]">
              Scoreboard
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            aria-label="Close Scoreboard"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs text-[#9898B0] mb-4">
            Civilians earn +1 pt for catching all Impostors · Surviving Impostors earn +2 pts.
          </p>

          <ul className="divide-y divide-white/[0.06]">
            {ranked.map(({ player, points }, idx) => (
              <li key={player.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-mono text-xs font-bold text-[#9898B0] tabular-nums">
                    {idx + 1}
                  </span>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ backgroundColor: `${player.color}22`, border: `1px solid ${player.color}55` }}
                  >
                    {player.emoji}
                  </span>
                  <span className="truncate text-sm font-semibold text-[#F4F4F8]">
                    {player.name}
                  </span>
                </div>
                <span className="font-mono text-base font-bold text-cyan-300 tabular-nums shrink-0">
                  {points} {points === 1 ? 'pt' : 'pts'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-white/[0.08] pb-safe">
          <button
            type="button"
            disabled={!hasAnyPoints}
            onClick={() => {
              playTapSound();
              onResetScores();
            }}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-semibold text-rose-300 hover:bg-rose-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Scores</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="min-h-[48px] flex-1 rounded-2xl bg-cyan-400 font-display text-sm font-bold text-[#061318] hover:bg-cyan-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
