import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, Medal, Trophy, X } from 'lucide-react';
import type { CareerProfile, UnitSystem } from '../types/game';
import { BADGE_DEFINITIONS } from '../game/rules';
import { formatDistance } from '../game/geo';

interface ProfileModalProps {
  profile: CareerProfile;
  units: UnitSystem;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  units,
  onClose,
}) => {
  const [tab, setTab] = useState<'stats' | 'badges' | 'leaderboard'>('stats');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Career Profile and Achievements"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl bg-[#11131D] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#222638] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile.name || 'Field Agent'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile.roundsPlayed} rounds · {profile.totalPoints} lifetime pts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0B0C12] border border-[#222638]">
            {(
              [
                { id: 'stats', label: 'Career' },
                { id: 'badges', label: `Badges (${profile.badges.length})` },
                { id: 'leaderboard', label: 'Leaderboard' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative min-h-[40px] rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  tab === t.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="profile-tab-bg"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-[#1D2132]"
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'stats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#171A27] border border-[#262B3E] p-4">
                  <div className="text-xs text-slate-400">Total Distance</div>
                  <div className="mt-1 font-display text-3xl font-bold text-emerald-400 tabular-nums">
                    {formatDistance(profile.totalDistanceMeters, units)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#171A27] border border-[#262B3E] p-4">
                  <div className="text-xs text-slate-400">Lifetime Wins</div>
                  <div className="mt-1 font-display text-3xl font-bold text-white tabular-nums">
                    {profile.wins}
                  </div>
                </div>
                <div className="rounded-xl bg-[#171A27] border border-[#262B3E] p-4">
                  <div className="text-xs text-slate-400">Total Tags</div>
                  <div className="mt-1 font-display text-3xl font-bold text-red-400 tabular-nums">
                    {profile.tags}
                  </div>
                </div>
                <div className="rounded-xl bg-[#171A27] border border-[#262B3E] p-4">
                  <div className="text-xs text-slate-400">Clean Sweeps</div>
                  <div className="mt-1 font-display text-3xl font-bold text-amber-400 tabular-nums">
                    {profile.cleanSweeps}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const earned = profile.badges.includes(badge.id);
                const isMilestone = badge.tier === 'milestone';
                return (
                  <div
                    key={badge.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      earned
                        ? isMilestone
                          ? 'fk-prestige-badge border-amber-400/60'
                          : 'bg-[#171C2B] border-emerald-500/40'
                        : 'bg-[#0E1018] border-[#212536] opacity-55'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isMilestone ? (
                          <Trophy
                            className={`w-4 h-4 shrink-0 ${
                              earned ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          />
                        ) : (
                          <Award
                            className={`w-4 h-4 shrink-0 ${
                              earned ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                        )}
                        <span className="text-sm font-bold text-white">{badge.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {earned ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="space-y-2">
              {profile.leaderboard.length === 0 ? (
                <div className="rounded-xl bg-[#151824] border border-[#24293B] p-6 text-center">
                  <Medal className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No rounds recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Finish a live game or Solo Practice round to populate your career leaderboard.
                  </p>
                </div>
              ) : (
                profile.leaderboard.map((entry, idx) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#161926] border border-[#252A3C]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm font-bold text-slate-400 w-6 tabular-nums">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {entry.name}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {entry.wins}W · {entry.tags} tags ·{' '}
                          {formatDistance(entry.distanceMeters, units)}
                        </div>
                      </div>
                    </div>
                    <div className="font-display text-2xl font-bold text-emerald-400 tabular-nums shrink-0">
                      {entry.totalPoints}
                      <span className="text-xs font-sans font-semibold text-slate-400 ml-1">
                        pts
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
