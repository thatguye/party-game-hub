import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  Download,
  Share,
  Sparkles,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import chooserIcon from '@/assets/game-icons/chooser-icon.svg';
import impostorIcon from '@/assets/game-icons/impostor-icon.png';
import findersKeepersIcon from '@/assets/game-icons/finders-keepers-icon.svg';
import {
  HUB_AVATAR_COLORS,
  getProfileInitial,
  useHubProfile,
} from '@/lib/profile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface GameCardConfig {
  id: 'chooser' | 'impostor' | 'finders-keepers';
  title: string;
  route: string;
  icon: string;
  iconAlt: string;
  playersBadge: string;
  modeTag: string;
  description: string;
  accentGradient: string;
  accentBorder: string;
  modePillStyle: string;
  ctaLabel: string;
  offlineBehavior: 'full' | 'partial' | 'online_primary';
}

const GAME_CARDS: GameCardConfig[] = [
  {
    id: 'chooser',
    title: 'Chooser',
    route: '/chooser',
    icon: chooserIcon,
    iconAlt: 'Chooser glowing multi-touch rings icon',
    playersBadge: '2–10 Players',
    modeTag: '100% Offline',
    description:
      'Everyone puts a finger on the glass. Five-second neon countdown picks the chosen one with audio & haptics.',
    accentGradient: 'from-cyan-500/18 via-fuchsia-500/8 to-transparent',
    accentBorder: 'hover:border-cyan-400/55 border-cyan-400/20',
    modePillStyle: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/35',
    ctaLabel: 'Launch Chooser',
    offlineBehavior: 'full',
  },
  {
    id: 'impostor',
    title: 'Impostor',
    route: '/impostor',
    icon: impostorIcon,
    iconAlt: 'Impostor hooded figure icon',
    playersBadge: '3–15 Players',
    modeTag: 'Offline + Online',
    description:
      'Pass-and-play or live Supabase rooms with Word Mode, Find the Liar Question Mode, 22+ decks & custom studio.',
    accentGradient: 'from-rose-500/18 via-violet-500/10 to-transparent',
    accentBorder: 'hover:border-rose-400/55 border-rose-400/20',
    modePillStyle: 'bg-rose-400/15 text-rose-200 border-rose-400/35',
    ctaLabel: 'Launch Impostor',
    offlineBehavior: 'partial',
  },
  {
    id: 'finders-keepers',
    title: 'Finders Keepers',
    route: '/finders-keepers',
    icon: findersKeepersIcon,
    iconAlt: 'Finders Keepers runner and chaser radar icon',
    playersBadge: '2–20+ Players',
    modeTag: 'Online Manhunt',
    description:
      'Real-world GPS manhunt & tag with Runners vs. Chasers, radar pings, shrinking zones, and low-signal resilience.',
    accentGradient: 'from-emerald-500/18 via-red-500/10 to-transparent',
    accentBorder: 'hover:border-emerald-400/55 border-emerald-400/20',
    modePillStyle: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/35',
    ctaLabel: 'Launch Manhunt',
    offlineBehavior: 'online_primary',
  },
];

export const HubHome: React.FC = () => {
  const { profile, updateProfile } = useHubProfile();
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleInstallClick = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowInstallGuide(true);
    }
  };

  return (
    <div
      data-testid="hub-home"
      className="relative min-h-[100dvh] bg-[#0B0917] text-[#F5F5FA] flex flex-col overflow-x-clip"
    >
      {/* Festive Ambient Neon Glow Backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[580px] h-[380px] rounded-full bg-fuchsia-600/16 blur-[120px]" />
        <div className="absolute top-[38%] -left-32 w-[360px] h-[360px] rounded-full bg-cyan-500/12 blur-[110px]" />
        <div className="absolute bottom-[-80px] -right-24 w-[420px] h-[420px] rounded-full bg-amber-400/10 blur-[120px]" />
      </div>

      {/* Top Sticky Hub Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0917]/88 backdrop-blur-xl pt-safe">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/hub-icon.svg"
              alt="Party Game Hub icon"
              data-testid="hub-brand-icon"
              className="h-10 w-10 rounded-xl border border-white/15 shadow-lg shadow-fuchsia-500/20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none truncate">
                Party Game Hub
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                3 Party Games · One Installable App
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Network Connectivity Pill */}
            <div
              data-testid="hub-network-badge"
              role="status"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border whitespace-nowrap ${
                isOnline
                  ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300'
                  : 'bg-amber-500/18 border-amber-400/45 text-amber-200'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                aria-label="Install Party Game Hub"
                className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/14 px-3 text-xs font-bold text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 pb-12 pb-safe space-y-6">
        {/* Offline Banner when disconnected */}
        {!isOnline && (
          <div
            role="status"
            data-testid="hub-offline-banner"
            className="rounded-2xl bg-amber-500/14 border border-amber-400/40 px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-amber-100"
          >
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="text-amber-200">Offline Mode active.</strong>{' '}
              <strong>Chooser</strong> and <strong>Impostor (Pass &amp; Play)</strong> work
              completely offline. Online multiplayer lobbies are paused until signal returns.
            </p>
          </div>
        )}

        {/* Compact Shared Player Profile Bar */}
        <section
          aria-label="Shared Player Profile"
          className="rounded-3xl bg-[#151226]/92 border border-white/10 p-4 sm:p-5 shadow-xl backdrop-blur-md"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Avatar Preview + Name Input */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                aria-hidden="true"
                className="h-12 w-12 rounded-2xl flex items-center justify-center font-display text-lg font-extrabold text-[#08090E] shadow-md shrink-0 transition-colors"
                style={{
                  backgroundColor: profile.avatarColor,
                  boxShadow: `0 0 24px ${profile.avatarColor}44`,
                }}
              >
                {profile.displayName.trim() ? (
                  getProfileInitial(profile.displayName)
                ) : (
                  <UserRound className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label
                  htmlFor="hub-display-name"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                  <span>Shared Player Profile</span>
                </label>
                <input
                  id="hub-display-name"
                  data-testid="hub-display-name-input"
                  type="text"
                  maxLength={22}
                  value={profile.displayName}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  placeholder="Set your display name..."
                  className="w-full min-h-[42px] rounded-xl bg-[#0B0917] border border-white/12 px-3.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">
                Avatar Color · Pre-fills Impostor &amp; Finders Keepers
              </span>
              <div className="flex items-center flex-wrap gap-2" role="radiogroup" aria-label="Avatar Color">
                {HUB_AVATAR_COLORS.map((color) => {
                  const selected = profile.avatarColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`Select avatar color ${color}`}
                      data-testid={`hub-color-${color.slice(1)}`}
                      onClick={() => updateProfile({ avatarColor: color })}
                      className={`h-8 w-8 rounded-full transition-transform cursor-pointer ${
                        selected
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#151226]'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Game Launcher Cards Grid */}
        <section aria-label="Choose a Party Game" className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Pick a Game
            </h2>
            <span className="text-xs font-medium text-slate-400">Tap any card to play</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GAME_CARDS.map((game, idx) => {
              const isOnlineOnlyDisabled = !isOnline && game.offlineBehavior === 'online_primary';
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="flex"
                >
                  <Link
                    to={game.route}
                    data-testid={`game-card-${game.id}`}
                    className={`group relative flex flex-col w-full rounded-3xl bg-[#151226]/95 border ${game.accentBorder} p-5 shadow-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985]`}
                  >
                    {/* Subtle card corner glow */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.accentGradient} opacity-80 group-hover:opacity-100 transition-opacity`}
                    />

                    <div className="relative z-10 flex flex-col flex-1 gap-4">
                      {/* Top Row: Preserved Original Game Icon + Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <img
                          src={game.icon}
                          alt={game.iconAlt}
                          data-testid={`game-icon-${game.id}`}
                          className="h-16 w-16 rounded-2xl border border-white/15 object-cover shadow-lg shrink-0"
                        />

                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${game.modePillStyle}`}
                          >
                            {game.modeTag}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                            <Users className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            <span>{game.playersBadge}</span>
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1.5 flex-1">
                        <h3 className="font-display text-2xl font-extrabold tracking-tight text-white">
                          {game.title}
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{game.description}</p>
                      </div>

                      {/* Offline availability note when offline */}
                      {!isOnline && game.offlineBehavior !== 'full' && (
                        <div className="rounded-xl bg-amber-500/12 border border-amber-400/30 px-3 py-2 text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
                          <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                          <span>
                            {isOnlineOnlyDisabled
                              ? 'Online lobbies paused offline · Solo Demo available'
                              : 'Pass & Play ready · Online rooms paused offline'}
                          </span>
                        </div>
                      )}

                      {/* Thumb-Friendly Bottom CTA Row */}
                      <div className="pt-1 flex items-center justify-between border-t border-white/[0.08]">
                        <span className="text-sm font-bold text-white group-hover:text-fuchsia-200 transition-colors">
                          {game.ctaLabel}
                        </span>
                        <span className="h-10 w-10 rounded-xl bg-white/[0.08] group-hover:bg-white/[0.16] flex items-center justify-center text-white transition-colors">
                          <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Install PWA Instructions Modal (uses new Party Hub Icon) */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Install Party Game Hub"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-sm rounded-3xl bg-[#151226] border border-white/14 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/icons/hub-icon.svg"
                    alt="Party Game Hub icon"
                    className="h-11 w-11 rounded-xl border border-white/15 shrink-0"
                  />
                  <div>
                    <h3 className="font-display text-base font-extrabold text-white">
                      Install Party Game Hub
                    </h3>
                    <p className="text-xs text-slate-400">Play full-screen &amp; offline</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  aria-label="Close install instructions"
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isIOS ? (
                <ol className="space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-fuchsia-300">1.</span>
                    <span>
                      Tap the <Share className="inline w-4 h-4 mx-0.5 text-cyan-300" />{' '}
                      <strong className="text-white">Share</strong> button in Safari&apos;s toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-fuchsia-300">2.</span>
                    <span>
                      Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-fuchsia-300">3.</span>
                    <span>Launch Party Hub from your Home Screen anytime — even offline.</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-fuchsia-300">1.</span>
                    <span>Open your browser menu (three dots or address bar install icon).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-fuchsia-300">2.</span>
                    <span>
                      Choose <strong className="text-white">Install app</strong> or{' '}
                      <strong className="text-white">Add to Home screen</strong>.
                    </span>
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="mt-6 w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-[#0B0917] font-display font-extrabold text-sm cursor-pointer"
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
