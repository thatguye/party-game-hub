import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserX,
} from 'lucide-react';
import { Player, RoundState } from '../types/game';
import { playTapSound } from '../utils/audio';

interface VotingScreenProps {
  round: RoundState;
  players: Player[];
  showEliminationReveal: boolean;
  onEliminatePlayer: (playerId: string) => void;
  onCallZeroImpostors: () => void;
  onBackToDiscussion: () => void;
  onContinueSurvival: () => void;
  onGoToSummary: () => void;
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  round,
  players,
  showEliminationReveal,
  onEliminatePlayer,
  onCallZeroImpostors,
  onBackToDiscussion,
  onContinueSurvival,
  onGoToSummary,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const activePlayers = round.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p && !round.assignments[p.id]?.eliminated);

  // Dramatic Elimination Reveal Step
  if (showEliminationReveal && round.lastEliminatedId) {
    const eliminatedPlayer = playerMap.get(round.lastEliminatedId);
    const eliminatedAssignment = round.assignments[round.lastEliminatedId];
    const wasImpostor = !!eliminatedAssignment?.isImpostor;

    return (
      <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-lg flex-col items-center justify-center px-5 py-8 pb-safe">
        <div
          className={`w-full rounded-3xl border-2 p-7 sm:p-8 text-center space-y-6 shadow-2xl ${
            wasImpostor
              ? 'bg-[#210D16] border-rose-500/70'
              : 'bg-[#0E1C26] border-cyan-400/60'
          }`}
        >
          <div className="flex justify-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-3xl text-5xl"
              style={{
                backgroundColor: eliminatedPlayer ? `${eliminatedPlayer.color}22` : '#14141F',
                border: `2px solid ${wasImpostor ? '#F43F5E' : '#22D3EE'}`,
              }}
            >
              {eliminatedPlayer?.emoji}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#D6D6E6]">
              {eliminatedPlayer?.name} was voted out...
            </p>
            <div className="flex items-center justify-center gap-2">
              {wasImpostor ? (
                <ShieldAlert className="h-7 w-7 text-rose-400 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-7 w-7 text-cyan-400 shrink-0" aria-hidden="true" />
              )}
              <h1
                className={`font-display text-3xl font-extrabold tracking-tight ${
                  wasImpostor ? 'text-rose-400' : 'text-cyan-300'
                }`}
              >
                {wasImpostor ? 'IMPOSTOR!' : 'INNOCENT CIVILIAN'}
              </h1>
            </div>

            {round.winner ? (
              <p className="pt-2 text-sm text-[#D6D6E6] leading-relaxed">
                {round.winReason}
              </p>
            ) : (
              <p className="pt-2 text-sm text-[#B8B8CE] leading-relaxed">
                The round is not over yet—Impostors are still hiding among the{' '}
                <strong className="text-white">{activePlayers.length}</strong> remaining players!
              </p>
            )}
          </div>

          {round.winner ? (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onGoToSummary();
              }}
              className="w-full min-h-[56px] rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
            >
              See Round Summary
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedId(null);
                  onContinueSurvival();
                }}
                className="w-full min-h-[54px] rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
              >
                Continue Discussion
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  const selectedPlayer = selectedId ? playerMap.get(selectedId) : null;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-2xl flex-col justify-between px-5 py-6 pb-safe gap-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onBackToDiscussion();
            }}
            className="flex min-h-[42px] items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-[#9898B0] hover:bg-white/[0.06] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Discussion</span>
          </button>
          <span className="text-xs font-mono text-[#9898B0] tabular-nums">
            {activePlayers.length} remaining
          </span>
        </div>

        <div className="text-center space-y-1.5">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F4F4F8] tracking-tight">
            Vote Out a Suspect
          </h1>
          <p className="text-sm text-[#9898B0]">
            Agree as a group, then tap the accused player to eliminate them.
          </p>
        </div>

        {/* Accusation Player Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activePlayers.map((player) => {
            const isSelected = selectedId === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedId(isSelected ? null : player.id);
                }}
                aria-pressed={isSelected}
                className={`flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.99] cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/10'
                    : 'bg-[#14141F] border-white/[0.08] hover:border-white/[0.2]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      backgroundColor: `${player.color}22`,
                      border: `1px solid ${player.color}55`,
                    }}
                  >
                    {player.emoji}
                  </span>
                  <span className="font-display text-base font-bold text-[#F4F4F8] truncate">
                    {player.name}
                  </span>
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-white/25'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Elimination & Optional Chaos 0-Impostor Call */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          disabled={!selectedPlayer}
          onClick={() => {
            if (!selectedPlayer) return;
            onEliminatePlayer(selectedPlayer.id);
          }}
          className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-rose-500 font-display text-base font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 disabled:bg-white/[0.08] disabled:text-[#666680] disabled:shadow-none active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <UserX className="h-5 w-5" aria-hidden="true" />
          <span>
            {selectedPlayer
              ? `Eliminate ${selectedPlayer.name}`
              : 'Select a Player to Eliminate'}
          </span>
        </button>

        {round.hideImpostorCount && (
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onCallZeroImpostors();
            }}
            className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Chaos Call: Nobody is an Impostor!</span>
          </button>
        )}
      </div>
    </main>
  );
};
