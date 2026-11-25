import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Check,
  Download,
  Home,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Trophy,
} from 'lucide-react';
import type { BadgeId, RoomState, ScoreBreakdown } from '../types/game';
import { formatDistance } from '../game/geo';
import { BADGE_DEFINITIONS } from '../game/rules';
import { renderStoryPoster, shareOrDownloadPoster } from '../services/poster';
import { TacticalMap } from './TacticalMap';

interface PostRoundViewProps {
  room: RoomState;
  scores: ScoreBreakdown[];
  newlyUnlockedBadges: BadgeId[];
  allProfileBadges: BadgeId[];
  onPlayAgain: () => void;
  onReturnHome: () => void;
  onOpenMoreMenu: () => void;
}

export const PostRoundView: React.FC<PostRoundViewProps> = ({
  room,
  scores,
  newlyUnlockedBadges,
  allProfileBadges,
  onPlayAgain,
  onReturnHome,
  onOpenMoreMenu,
}) => {
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [posterStatus, setPosterStatus] = useState<'idle' | 'shared' | 'downloaded'>('idle');

  useEffect(() => {
    if (!posterCanvasRef.current) return;
    renderStoryPoster(
      posterCanvasRef.current,
      room,
      scores,
      newlyUnlockedBadges.length > 0 ? newlyUnlockedBadges : allProfileBadges
    );
  }, [room, scores, newlyUnlockedBadges, allProfileBadges]);

  const handleSharePoster = async () => {
    if (!posterCanvasRef.current) return;
    const outcome = await shareOrDownloadPoster(posterCanvasRef.current, room.code);
    setPosterStatus(outcome);
    window.setTimeout(() => setPosterStatus('idle'), 2400);
  };

  const winnerAccent =
    room.winner === 'runners'
      ? 'text-emerald-400'
      : room.winner === 'hunters'
      ? 'text-red-400'
      : 'text-amber-400';

  const winnerTitle =
    room.winner === 'runners'
      ? 'Runners Win'
      : room.winner === 'hunters'
      ? 'Hunters Win'
      : room.winner === 'imposters'
      ? 'Imposters Win'
      : 'Round Complete';

  return (
    <div className="min-h-dvh bg-[#09090E] text-[#F4F5F9] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1E2232] bg-[#0B0C14]/95 backdrop-blur-md pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400">
              {room.settings.mode.toUpperCase()} · {room.code}
            </div>
            <h1 className={`font-display text-2xl sm:text-3xl font-extrabold leading-none ${winnerAccent}`}>
              {winnerTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReturnHome}
              aria-label="Return Home"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#161926] hover:bg-[#1F2436] border border-[#282D42] text-xs font-semibold text-white inline-flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              type="button"
              onClick={onOpenMoreMenu}
              aria-label="More options and Get Help"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#161926] hover:bg-[#1F2436] border border-[#282D42] flex items-center justify-center text-white"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6"
      >
        {room.winReason && (
          <p className="text-sm sm:text-base text-slate-300">{room.winReason}</p>
        )}

        {/* Newly Unlocked Badges Callout */}
        {newlyUnlockedBadges.length > 0 && (
          <div className="rounded-2xl fk-prestige-badge border border-amber-400/50 p-4 flex flex-wrap items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-sm font-bold text-white">New Badges Unlocked:</div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-amber-200">
              {newlyUnlockedBadges.map((id) => {
                const def = BADGE_DEFINITIONS.find((b) => b.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    {def?.name ?? id}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Full Color-Coded GPS Breadcrumb Trails Map & Tag Timeline */}
          <section className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl bg-[#11131D] border border-[#232738] overflow-hidden">
              <div className="p-4 border-b border-[#202436] flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">GPS Trails</h2>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {room.tags.length} tags · {room.pings.length} pings
                </span>
              </div>
              <div className="h-[360px] sm:h-[420px] relative">
                <TacticalMap
                  center={room.currentZone.center}
                  mapTheme={room.settings.mapTheme}
                  activeZone={room.currentZone}
                  showTrailsForPlayers={room.players}
                />
              </div>
              <div className="p-3.5 border-t border-[#202436] flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {room.players.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 text-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Scoreboard & Distance Breakdown */}
            <div className="rounded-2xl bg-[#11131D] border border-[#232738] p-4 sm:p-5">
              <h2 className="text-sm font-bold text-white mb-3">Score &amp; Distance Recap</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#23273A] text-slate-400">
                      <th className="py-2 pr-3 font-semibold">Player</th>
                      <th className="py-2 px-2 font-semibold">Role</th>
                      <th className="py-2 px-2 font-semibold text-right">Distance</th>
                      <th className="py-2 px-2 font-semibold text-right">Survived</th>
                      <th className="py-2 px-2 font-semibold text-right">Tags</th>
                      <th className="py-2 pl-2 font-semibold text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2030]">
                    {scores.map((row) => (
                      <tr key={row.playerId}>
                        <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            {row.playerName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 capitalize text-slate-300">
                          {row.initialRole}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-200 tabular-nums">
                          {formatDistance(row.distanceMeters, room.settings.units)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.survivalMinutes}m
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.tagsCount}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono font-bold text-emerald-400 tabular-nums">
                          +{row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Scoring: Runners +1 pt per 3 min survived +10 unbeaten · Hunters +3 pts per tag +10
                clean sweep.
              </p>
            </div>

            {/* Tag Timeline */}
            {room.tags.length > 0 && (
              <div className="rounded-2xl bg-[#11131D] border border-[#232738] p-4 sm:p-5">
                <h2 className="text-sm font-bold text-white mb-3">Tag Timeline</h2>
                <div className="space-y-2 text-xs">
                  {room.tags.map((t) => {
                    const offsetSec = room.roundStartedAt
                      ? Math.max(0, Math.round((t.ts - room.roundStartedAt) / 1000))
                      : 0;
                    const mm = Math.floor(offsetSec / 60);
                    const ss = String(offsetSec % 60).padStart(2, '0');
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 py-2 border-b border-[#1D2132] last:border-0"
                      >
                        <span className="text-slate-200">
                          <strong className="text-white">{t.taggedName}</strong>{' '}
                          {t.reason === 'oob_timeout'
                            ? 'eliminated (2m out of bounds)'
                            : t.reason === 'voted_out'
                            ? 'voted out in Emergency Meeting'
                            : t.taggerName
                            ? `tagged by ${t.taggerName}`
                            : 'tagged'}
                          {t.resultingRole === 'hunter' ? ' → Joined Hunters' : ''}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums shrink-0">
                          {mm}:{ss}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Right: 9:16 Story Poster Generator */}
          <aside className="lg:col-span-5 rounded-2xl bg-[#11131D] border border-[#232738] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">Story Poster</h2>

            <div className="flex justify-center">
              <canvas
                ref={posterCanvasRef}
                data-testid="story-poster-canvas"
                className="w-full max-w-[300px] aspect-[9/16] rounded-2xl border border-[#2A3046] shadow-2xl bg-[#09090E]"
              />
            </div>

            <button
              type="button"
              onClick={handleSharePoster}
              className="w-full min-h-[50px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#09090E] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {posterStatus === 'shared' || posterStatus === 'downloaded' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {posterStatus === 'shared' ? 'Shared Poster!' : 'Poster PNG Downloaded!'}
                  </span>
                </>
              ) : typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share / Download Poster</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Story Poster (PNG)</span>
                </>
              )}
            </button>
          </aside>
        </div>
      </motion.main>

      {/* Sticky Bottom Rematch Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0B0C14]/95 border-t border-[#222638] px-4 py-3 pb-safe">
        <div className="max-w-7xl mx-auto flex gap-3 justify-end">
          <button
            type="button"
            onClick={onReturnHome}
            className="min-h-[48px] px-5 rounded-xl bg-[#171A27] hover:bg-[#1F2436] border border-[#2A3046] text-sm font-bold text-white"
          >
            Home
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 sm:flex-none sm:min-w-[220px] min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#09090E] font-extrabold text-sm inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
