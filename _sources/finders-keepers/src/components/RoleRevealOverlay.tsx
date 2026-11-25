import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { RoomState } from '../types/game';
import { triggerTacticalAlert } from '../services/hardware';

interface RoleRevealOverlayProps {
  room: RoomState;
  viewerId: string;
  roundNumber: number;
  stealthHaptic: boolean;
  onComplete: () => void;
}

export const RoleRevealOverlay: React.FC<RoleRevealOverlayProps> = ({
  room,
  viewerId,
  roundNumber,
  stealthHaptic,
  onComplete,
}) => {
  const [stage, setStage] = useState<'mystery' | 'revealed'>('mystery');

  const viewer = room.players.find((p) => p.id === viewerId);
  const role = viewer?.role ?? 'runner';
  const isImposter = room.settings.mode === 'imposter' && !!viewer?.isImposter;

  const runnerCount = room.players.filter((p) => p.role === 'runner' && !p.eliminated).length;
  const hunterCount = room.players.filter((p) => p.role === 'hunter').length;

  const teammates = room.players
    .filter((p) => p.id !== viewerId && p.role === role)
    .map((p) => p.name.replace(' (AI)', ''));

  const headStartText =
    room.settings.headStartMin >= 1
      ? `${Math.round(room.settings.headStartMin)} min`
      : room.settings.headStartMin > 0
      ? `${Math.round(room.settings.headStartMin * 60)} sec`
      : null;

  const handleRevealTap = () => {
    if (stage !== 'mystery') return;
    triggerTacticalAlert('radar_ping', stealthHaptic);
    setStage('revealed');
  };

  // Cohesive dark-and-emerald tactical palette across all roles
  const revealGradientClass = isImposter
    ? 'from-[#181308] via-[#0E0E12] to-[#08090E]'
    : role === 'hunter'
    ? 'from-[#161015] via-[#0C1414] to-[#08090E]'
    : role === 'runner'
    ? 'from-[#063223] via-[#07211A] to-[#08090E]'
    : 'from-[#0B1C24] via-[#0A111A] to-[#08090E]';

  const revealAccentGlow = isImposter
    ? 'bg-amber-400/18'
    : role === 'hunter'
    ? 'bg-emerald-500/18'
    : role === 'runner'
    ? 'bg-emerald-400/24'
    : 'bg-cyan-400/18';

  const badgeClass = isImposter
    ? 'bg-amber-400/15 border border-amber-400/45 text-amber-200'
    : role === 'hunter'
    ? 'bg-red-500/18 border border-red-400/50 text-red-200'
    : role === 'runner'
    ? 'bg-emerald-400 text-[#08090E] border border-emerald-300'
    : 'bg-cyan-400/15 border border-cyan-400/45 text-cyan-200';

  const headlineAccentClass = isImposter
    ? 'text-amber-300'
    : role === 'hunter'
    ? 'text-emerald-400'
    : role === 'runner'
    ? 'text-emerald-400'
    : 'text-cyan-300';

  const roleTitle = isImposter
    ? 'Imposter'
    : role === 'hunter'
    ? 'Hunter'
    : role === 'runner'
    ? 'Runner'
    : 'Spectator';

  const headlineLines: [string, string] = isImposter
    ? ["You're", 'the imposter.']
    : role === 'hunter'
    ? ["You're", 'it.']
    : role === 'runner'
    ? ['Run &', 'hide.']
    : ['Watch', 'live.'];

  const missionSummary = isImposter
    ? `Blend in with ${runnerCount} runner${runnerCount === 1 ? '' : 's'} for ${room.settings.roundLengthMin} min. Avoid getting voted out.`
    : role === 'hunter'
    ? `Find and tag all ${runnerCount} runner${runnerCount === 1 ? '' : 's'} in ${room.settings.roundLengthMin} min.${
        headStartText ? ` They get a ${headStartText} head start.` : ''
      }`
    : role === 'runner'
    ? `Outrun ${hunterCount} hunter${hunterCount === 1 ? '' : 's'} for ${room.settings.roundLengthMin} min.${
        headStartText ? ` You get a ${headStartText} head start.` : ''
      }`
    : 'Follow every move and radar ping across the zone.';

  const teamLine =
    teammates.length > 0
      ? `${role === 'hunter' ? 'Hunting' : 'Running'} with ${teammates.slice(0, 3).join(', ')}${
          teammates.length > 3 ? ` +${teammates.length - 3}` : ''
        }`
      : null;

  return (
    <div
      data-testid="role-reveal-overlay"
      className="fixed inset-0 z-[80] overflow-hidden select-none bg-[#08090E]"
      role="dialog"
      aria-modal="true"
      aria-label={
        stage === 'mystery' ? 'Tap anywhere to reveal your role' : `Your role is ${roleTitle}`
      }
    >
      <AnimatePresence mode="wait">
        {stage === 'mystery' ? (
          <motion.button
            key="mystery"
            type="button"
            data-testid="role-reveal-mystery-btn"
            onClick={handleRevealTap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.22 }}
            className="relative w-full h-full bg-[#08090E] text-white flex flex-col justify-between px-5 sm:px-6 pt-safe pb-safe text-left cursor-pointer focus:outline-none overflow-hidden"
          >
            {/* Subtle Ambient Emerald Radar Backdrop */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full bg-emerald-500/12 blur-[110px]" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-emerald-500/15" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full border border-emerald-400/15" />
            </div>

            {/* Top Brand + Room Code Row */}
            <div className="relative z-10 w-full max-w-md mx-auto pt-2 flex items-center justify-between gap-2">
              <span className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white uppercase truncate">
                FINDERS KEEPERS
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/30 text-xs font-semibold text-emerald-300 tabular-nums whitespace-nowrap shrink-0">
                {room.code} · Round {roundNumber}
              </span>
            </div>

            {/* Giant Emerald Tactical Question Mark */}
            <div className="relative z-10 flex-1 flex items-center justify-center py-4 min-h-0">
              <motion.div
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                transition={{
                  opacity: { duration: 0.28 },
                  scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                }}
                aria-hidden="true"
                className="w-[170px] sm:w-[220px] h-[230px] sm:h-[300px] flex items-center justify-center bg-transparent"
              >
                <svg
                  data-testid="role-reveal-question-svg"
                  viewBox="0 0 220 300"
                  className="w-full h-full overflow-visible bg-transparent"
                >
                  <path
                    d="M34 114 C34 48 80 18 119 18 C165 18 197 48 197 92 C197 127 177 148 152 166 C135 178 131 187 131 206 L86 206 C86 171 96 154 118 137 C135 124 146 113 146 95 C146 77 133 66 115 66 C94 66 82 81 82 114 Z"
                    fill="#10B981"
                  />
                  <rect x="85" y="232" width="49" height="50" rx="6" fill="#34D399" />
                </svg>
              </motion.div>
            </div>

            {/* Bottom Prompt */}
            <div className="relative z-10 w-full max-w-md mx-auto pb-6 sm:pb-8">
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                No peeking at your friends&apos; phones
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Tap anywhere to find out
              </p>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="revealed"
            data-testid="role-reveal-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`relative w-full h-full bg-gradient-to-b ${revealGradientClass} text-white flex flex-col justify-between px-5 sm:px-6 pt-safe pb-safe overflow-y-auto`}
          >
            {/* Subtle Tactical Radar Glow Backdrop */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className={`absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full ${revealAccentGlow} blur-[110px]`}
              />
              <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-emerald-400/12" />
              <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full border border-emerald-400/12" />
            </div>

            {/* Top Brand + Room Pill + Role Badge */}
            <div className="relative z-10 w-full max-w-md mx-auto pt-2 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white uppercase truncate">
                  FINDERS KEEPERS
                </span>
                <span className="px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-200 tabular-nums whitespace-nowrap shrink-0">
                  {room.code} · Round {roundNumber}
                </span>
              </div>

              <div>
                <span
                  className={`inline-flex items-center px-3.5 py-1.5 rounded-full ${badgeClass} text-xs sm:text-sm font-extrabold tracking-tight shadow-sm`}
                >
                  Your role · {roleTitle}
                </span>
              </div>
            </div>

            {/* Center Massive Display Headline (responsive for 9:16 & compact phones) */}
            <div className="relative z-10 w-full max-w-md mx-auto my-auto py-4">
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-[clamp(3.8rem,18vw,6.8rem)] font-extrabold tracking-tight leading-[0.88] text-white"
              >
                <span className="block">{headlineLines[0]}</span>
                <span className={`block ${headlineAccentClass}`}>{headlineLines[1]}</span>
              </motion.h1>
            </div>

            {/* Bottom Mission Copy + Let's Go CTA */}
            <div className="relative z-10 w-full max-w-md mx-auto pb-4 space-y-3">
              <p className="text-lg sm:text-2xl font-extrabold leading-snug text-white">
                {missionSummary}
              </p>

              {teamLine && (
                <p className="text-sm sm:text-base font-semibold text-emerald-300">{teamLine}</p>
              )}

              <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                Alerts reach you with your phone locked. Just don&apos;t swipe Finders Keepers
                closed.
              </p>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                data-testid="role-reveal-continue-btn"
                onClick={onComplete}
                className="mt-1 w-full min-h-[54px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#08090E] text-base sm:text-lg font-extrabold shadow-xl shadow-emerald-500/20 transition-colors"
              >
                Let&apos;s go
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
