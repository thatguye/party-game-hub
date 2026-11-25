import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import type { OobStatus, TeamRole } from '../types/game';
import { SlideToConfirm } from './SlideToConfirm';

interface PocketModeOverlayProps {
  countdownLabel: string;
  phaseLabel: string;
  role: TeamRole;
  oobStatus: OobStatus;
  oobSecondsLeft: number;
  onUnlock: () => void;
}

export const PocketModeOverlay: React.FC<PocketModeOverlayProps> = ({
  countdownLabel,
  phaseLabel,
  role,
  oobStatus,
  oobSecondsLeft,
  onUnlock,
}) => {
  const roleColor =
    role === 'hunter'
      ? 'text-red-400'
      : role === 'runner'
      ? 'text-emerald-400'
      : 'text-slate-400';

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#000000] text-white flex flex-col justify-between px-6 pt-safe pb-safe select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Pocket Battery-Saver Mode"
      data-testid="pocket-mode-overlay"
    >
      <div className="pt-8 flex items-center justify-between text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5" />
          Pocket Battery Saver
        </span>
        <span className={`font-bold uppercase tracking-wider ${roleColor}`}>{role}</span>
      </div>

      <div className="flex flex-col items-center text-center my-auto">
        <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          {phaseLabel}
        </div>
        <div className="mt-2 font-display text-7xl font-extrabold tracking-tight tabular-nums text-neutral-200">
          {countdownLabel}
        </div>

        {oobStatus !== 'inside' && (
          <div className="mt-8 w-full max-w-xs rounded-2xl bg-red-950/70 border border-red-500/60 p-4 text-center">
            <div className="inline-flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>OUT OF BOUNDS — RETURN NOW</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
              Out in {oobSecondsLeft}s
            </p>
          </div>
        )}
      </div>

      <div className="pb-6 w-full max-w-sm mx-auto">
        <SlideToConfirm
          label="Slide to Unlock Map"
          confirmedLabel="Unlocked"
          accent="slate"
          onConfirm={onUnlock}
          ariaLabel="Slide to Unlock Pocket Mode"
        />
      </div>
    </div>
  );
};
