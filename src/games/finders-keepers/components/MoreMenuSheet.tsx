import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, LifeBuoy, UserMinus, X } from 'lucide-react';
import type { MapTheme, PlayerState } from '../types/game';

interface MoreMenuSheetProps {
  title?: string;
  subtitle?: string;
  isSoloDemo?: boolean;
  isActiveGame?: boolean;
  isHost: boolean;
  players: PlayerState[];
  viewerId: string;
  mapTheme: MapTheme;
  stealthHaptic: boolean;
  canEndRound?: boolean;
  soloSpeed?: 1 | 5 | 20;
  nearestBotName?: string;
  onChangeSoloSpeed?: (speed: 1 | 5 | 20) => void;
  onSoloPingNow?: () => void;
  onSoloTagNearest?: () => void;
  onSoloSkipMinute?: () => void;
  onEnablePocketMode?: () => void;
  onOpenGetHelp: () => void;
  onOpenHowToPlay?: () => void;
  onChangeMapTheme: (theme: MapTheme) => void;
  onToggleStealthHaptic: () => void;
  onRemovePlayer?: (playerId: string) => void;
  onEndRound?: () => void;
  onLeaveGame: () => void;
  onReturnToHub?: () => void;
  onClose: () => void;
}

const THEMES: { id: MapTheme; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'night', label: 'Night' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'snow', label: 'Snow' },
];

const SPEEDS: (1 | 5 | 20)[] = [1, 5, 20];

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  title = 'Field controls',
  subtitle,
  isSoloDemo = false,
  isActiveGame = false,
  isHost,
  players,
  viewerId,
  mapTheme,
  stealthHaptic,
  canEndRound = false,
  soloSpeed = 1,
  nearestBotName,
  onChangeSoloSpeed,
  onSoloPingNow,
  onSoloTagNearest,
  onSoloSkipMinute,
  onEnablePocketMode,
  onOpenGetHelp,
  onOpenHowToPlay,
  onChangeMapTheme,
  onToggleStealthHaptic,
  onRemovePlayer,
  onEndRound,
  onLeaveGame,
  onReturnToHub,
  onClose,
}) => {
  const [view, setView] = useState<'main' | 'players'>('main');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        data-testid="controls-sheet"
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl bg-[#0D1019] border-t sm:border border-emerald-500/20 px-4 sm:px-5 pt-3 pb-safe shadow-2xl max-h-[86dvh] overflow-y-auto"
      >
        {/* Top Grab Handle */}
        <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-4" />

        {/* Sheet Heading */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {view === 'players' && (
              <button
                type="button"
                onClick={() => setView('main')}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 mb-1"
              >
                ← Back
              </button>
            )}
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-white leading-none">
              {view === 'players' ? `Players (${players.length})` : title}
            </h3>
            {subtitle && view === 'main' && (
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close controls"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/[0.07]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {view === 'main' ? (
          <div className="space-y-3 pb-2">
            {/* Prominent Get Help Row */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGetHelp();
              }}
              className="w-full min-h-[54px] px-4 rounded-2xl bg-[#141826] hover:bg-[#1B2133] border border-red-500/25 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-[15px] font-bold text-red-300">Get help</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Grouped Settings Card: Alerts & Map Style */}
            <div className="rounded-2xl bg-[#141826] border border-white/[0.07] divide-y divide-white/[0.07] overflow-hidden">
              {/* Alerts Segmented Toggle */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[15px] font-medium text-white">Alerts</span>
                <div className="inline-flex items-center p-1 rounded-xl bg-[#080A11] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      if (stealthHaptic) onToggleStealthHaptic();
                    }}
                    className={`min-h-[34px] px-3.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      !stealthHaptic
                        ? 'bg-emerald-500 text-[#08090E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sound
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!stealthHaptic) onToggleStealthHaptic();
                    }}
                    className={`min-h-[34px] px-3.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      stealthHaptic
                        ? 'bg-emerald-500 text-[#08090E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Stealth
                  </button>
                </div>
              </div>

              {/* Map Theme Segmented Control */}
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-white">Map</span>
                </div>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#080A11] border border-white/[0.06]">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onChangeMapTheme(t.id)}
                      className={`min-h-[36px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        mapTheme === t.id
                          ? 'bg-emerald-500 text-[#08090E]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grouped Action List */}
            <div className="rounded-2xl bg-[#141826] border border-white/[0.07] divide-y divide-white/[0.07] overflow-hidden">
              {isSoloDemo && onSoloPingNow && (
                <button
                  type="button"
                  onClick={() => {
                    onSoloPingNow();
                    onClose();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors"
                >
                  Ping now
                </button>
              )}

              {isSoloDemo && onSoloTagNearest && (
                <button
                  type="button"
                  onClick={() => {
                    onSoloTagNearest();
                    onClose();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-2"
                >
                  <span>Tag the nearest runner</span>
                  {nearestBotName && (
                    <span className="text-xs text-emerald-400 font-semibold truncate">
                      {nearestBotName}
                    </span>
                  )}
                </button>
              )}

              {isSoloDemo && onSoloSkipMinute && (
                <button
                  type="button"
                  onClick={() => {
                    onSoloSkipMinute();
                    onClose();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors"
                >
                  Skip 1 minute
                </button>
              )}

              {isSoloDemo && onChangeSoloSpeed && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium text-white">Speed</span>
                  <div className="inline-flex items-center p-1 rounded-xl bg-[#080A11] border border-white/[0.06]">
                    {SPEEDS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onChangeSoloSpeed(spd)}
                        className={`min-h-[34px] px-3.5 rounded-lg text-xs font-bold font-mono tabular-nums transition-colors ${
                          soloSpeed === spd
                            ? 'bg-emerald-500 text-[#08090E]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isActiveGame && onEnablePocketMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnablePocketMode();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors flex items-center justify-between"
                >
                  <span>Pocket battery-saver mode</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setView('players')}
                className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors flex items-center justify-between"
              >
                <span>Players ({players.length})</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {onOpenHowToPlay && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHowToPlay();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors flex items-center justify-between"
                >
                  <span>How to play</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {canEndRound && (isHost || isSoloDemo) && onEndRound && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEndRound();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors"
                >
                  End the round
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLeaveGame();
                }}
                className="w-full min-h-[50px] px-4 text-left text-[15px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Leave game
              </button>

              {onReturnToHub && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReturnToHub();
                  }}
                  className="w-full min-h-[50px] px-4 text-left text-[15px] font-semibold text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors"
                >
                  Back to Party Game Hub
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#141826] border border-white/[0.07]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                    {p.isHost && (
                      <span className="text-[11px] font-semibold text-emerald-400">Host</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                    {p.eliminated ? ' · Eliminated' : ''}
                    {p.tagsCount > 0 ? ` · ${p.tagsCount} tags` : ''}
                  </div>
                </div>

                {isHost && p.id !== viewerId && onRemovePlayer && (
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(p.id)}
                    aria-label={`Remove ${p.name} from game`}
                    className="min-h-[40px] px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-xs font-semibold text-red-300 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
