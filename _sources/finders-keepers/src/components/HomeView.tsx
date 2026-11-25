import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Eye,
  Play,
  Plus,
  ScrollText,
  ShieldAlert,
  Siren,
  Skull,
  Timer,
  Trophy,
} from 'lucide-react';
import type { CareerProfile, GameMode } from '../types/game';
import { BrandIcon, PWAInstallButton } from './BrandIcon';

interface HomeViewProps {
  profile: CareerProfile;
  initialRoomCode?: string;
  onUpdateName: (name: string) => void;
  onHostGame: (mode: GameMode) => void;
  onJoinGame: (code: string) => Promise<string | null>;
  onStartSoloDemo: (role: 'hunter' | 'runner' | 'random', mode: GameMode) => void;
  onOpenProfile: () => void;
  onOpenChangelog: () => void;
  onOpenHowToPlay: () => void;
  onOpenGetHelp: () => void;
}

type ActionTab = 'host' | 'join' | 'solo';

const MODE_CARDS: {
  id: GameMode;
  name: string;
  tagline: string;
  detail: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Elimination',
    detail: 'Tagged Runners become Spectators. Survive to 00:00 or clear the board.',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/60',
    accentBg: 'bg-emerald-500/10',
    Icon: Eye,
  },
  {
    id: 'infection',
    name: 'Infection',
    tagline: 'Growing Pack',
    detail: 'Tagged Runners immediately switch to Hunters and join the pursuit.',
    accentText: 'text-red-400',
    accentBorder: 'border-red-500/60',
    accentBg: 'bg-red-500/10',
    Icon: Skull,
  },
  {
    id: 'curfew',
    name: 'Curfew',
    tagline: 'Shifting Zones',
    detail: 'The safe zone periodically teleports to a smaller area, forcing relocation.',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/60',
    accentBg: 'bg-amber-500/10',
    Icon: Timer,
  },
  {
    id: 'imposter',
    name: 'Imposter',
    tagline: 'Hidden Roles',
    detail: 'Secret Imposters hide among Runners. Call Emergency Meetings to vote them out.',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/60',
    accentBg: 'bg-cyan-500/10',
    Icon: Siren,
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  initialRoomCode = '',
  onUpdateName,
  onHostGame,
  onJoinGame,
  onStartSoloDemo,
  onOpenProfile,
  onOpenChangelog,
  onOpenHowToPlay,
  onOpenGetHelp,
}) => {
  const [actionTab, setActionTab] = useState<ActionTab>(initialRoomCode ? 'join' : 'host');
  const [callsign, setCallsign] = useState(profile.name || '');
  const [joinCode, setJoinCode] = useState(initialRoomCode.toUpperCase());
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [demoRole, setDemoRole] = useState<'hunter' | 'runner' | 'random'>('random');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode.toUpperCase());
      setActionTab('join');
    }
  }, [initialRoomCode]);

  const commitName = (val: string) => {
    setCallsign(val);
    onUpdateName(val);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setJoinError('Enter a valid 6-character room code (e.g., FK84XP).');
      return;
    }
    setJoinError(null);
    setJoining(true);
    const err = await onJoinGame(cleaned);
    setJoining(false);
    if (err) setJoinError(err);
  };

  const activeModeMeta = MODE_CARDS.find((m) => m.id === selectedMode) ?? MODE_CARDS[0];

  return (
    <div className="relative min-h-dvh bg-[#08090E] text-[#F4F5F9] flex flex-col overflow-x-clip">
      {/* Static Ambient Tactical Radar Backdrop (anchored in place, does not follow scroll) */}
      <div
        aria-hidden="true"
        data-testid="home-radar-backdrop"
        className="pointer-events-none absolute inset-0 overflow-hidden z-0"
      >
        <div className="absolute top-44 sm:top-28 right-[-80px] sm:right-[3%] w-[440px] h-[440px] sm:w-[620px] sm:h-[620px] rounded-full border border-emerald-500/[0.22] flex items-center justify-center">
          <div className="w-[72%] h-[72%] rounded-full border border-emerald-500/[0.18] flex items-center justify-center">
            <div className="w-[46%] h-[46%] rounded-full border border-emerald-500/[0.2] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-400/45 shadow-[0_0_16px_rgba(16,185,129,0.5)]" />
            </div>
          </div>
          <div className="fk-radar-sweep absolute inset-0 rounded-full opacity-95" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Sleek Responsive Top Bar — buttons stay tightly grouped whether Install is visible or hidden */}
      <header className="relative z-20 w-full border-b border-white/[0.07] bg-[#0A0B12]/85 backdrop-blur-md pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <BrandIcon className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-extrabold tracking-wide leading-none text-white whitespace-nowrap">
                  FINDERS KEEPERS
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Real-World GPS Manhunt
                </p>
              </div>
            </div>

            {/* Emergency SOS button stays pinned right on mobile row 1 so bottom utility dock stays balanced */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onOpenGetHelp}
              aria-label="Open Get Help Emergency Screen"
              className="sm:hidden min-h-[42px] min-w-[42px] rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 flex items-center justify-center text-red-300 transition-colors shrink-0"
            >
              <ShieldAlert className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Utility Cluster: uses flex-1 on mobile so 2 or 3 buttons always stay seamlessly connected with zero awkward gaps */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <PWAInstallButton className="flex-1 sm:flex-none" />
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onOpenProfile}
              aria-label="Open Career Profile and Badges"
              className="flex-1 sm:flex-none min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>Career</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                {profile.totalPoints}
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onOpenChangelog}
              aria-label="Open Changelog"
              className="flex-1 sm:flex-none min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
              <span>Changelog</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onOpenGetHelp}
              aria-label="Open Get Help Emergency Screen"
              className="hidden sm:flex min-h-[44px] min-w-[44px] rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 items-center justify-center text-red-300 transition-colors shrink-0"
            >
              <ShieldAlert className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Uncluttered Content */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-safe flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
          {/* Left Focal Column: Hero + Single Unified Play Deck */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="space-y-3">
              <h2 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[0.98] [text-wrap:balance]">
                Outrun the Radar. Own the Map.
              </h2>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
                  A real-world hide-and-seek manhunt game built for friend groups of any size.
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={onOpenHowToPlay}
                  className="min-h-[42px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-cyan-300 inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>How to Play</span>
                </motion.button>
              </div>
            </div>

            {/* Unified Action Panel (Host / Join / Solo Practice) */}
            <div className="rounded-3xl bg-[#10121C]/95 border border-white/[0.09] p-5 sm:p-6 shadow-2xl space-y-5">
              {/* Animated 3-Way Segmented Switch */}
              <div
                role="tablist"
                aria-label="Play options"
                className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#090A10] border border-white/[0.06]"
              >
                {(
                  [
                    { id: 'host', label: 'Host Game' },
                    { id: 'join', label: 'Join Code' },
                    { id: 'solo', label: 'Solo Demo' },
                  ] as { id: ActionTab; label: string }[]
                ).map((t) => {
                  const active = actionTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActionTab(t.id)}
                      className={`relative min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                        active ? 'text-[#08090E]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="home-action-tab"
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-emerald-400"
                        />
                      )}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Persistent Callsign Input */}
              <div>
                <label htmlFor="fk-callsign" className="block text-xs font-semibold text-slate-300 mb-2">
                  Your Callsign
                </label>
                <input
                  id="fk-callsign"
                  type="text"
                  maxLength={20}
                  value={callsign}
                  onChange={(e) => commitName(e.target.value)}
                  placeholder="Enter your name (e.g. GhostRunner)"
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#08090E] border border-white/10 text-base font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Animated Tab Content */}
              <AnimatePresence mode="wait">
                {actionTab === 'host' && (
                  <motion.div
                    key="host"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-3"
                  >
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      onClick={() => onHostGame(selectedMode)}
                      className="w-full min-h-[54px] px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#08090E] font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Host {activeModeMeta.name} Game</span>
                    </motion.button>
                    <p className="text-xs text-slate-400 text-center">
                      Creates a private 6-character room code &amp; QR link with full custom zone tools.
                    </p>
                  </motion.div>
                )}

                {actionTab === 'join' && (
                  <motion.form
                    key="join"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    onSubmit={handleJoinSubmit}
                    className="space-y-3"
                  >
                    <label htmlFor="fk-room-code" className="block text-xs font-semibold text-slate-300">
                      6-Character Room Code
                    </label>
                    <div className="flex gap-2.5">
                      <input
                        id="fk-room-code"
                        type="text"
                        maxLength={6}
                        value={joinCode}
                        onChange={(e) => {
                          setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                          setJoinError(null);
                        }}
                        placeholder="FK84XP"
                        className="flex-1 min-w-0 min-h-[52px] px-4 rounded-xl bg-[#08090E] border border-white/10 font-mono text-lg font-bold tracking-[0.22em] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 uppercase"
                      />
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        disabled={joining}
                        className="min-h-[52px] px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#08090E] font-extrabold text-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                      >
                        <span>{joining ? 'Joining...' : 'Join'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                    {joinError && (
                      <p role="alert" className="text-xs font-medium text-red-400">
                        {joinError}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      You can also open a friend&apos;s invite link or scan their lobby QR code.
                    </p>
                  </motion.form>
                )}

                {actionTab === 'solo' && (
                  <motion.div
                    key="solo"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Practice Role</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Spawn AI bots around you to test radar pings &amp; zone shrinks.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#08090E] border border-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDemoRole('hunter')}
                          className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            demoRole === 'hunter'
                              ? 'bg-red-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Hunter
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemoRole('runner')}
                          className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            demoRole === 'runner'
                              ? 'bg-emerald-500 text-[#08090E]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Runner
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemoRole('random')}
                          className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            demoRole === 'random'
                              ? 'bg-emerald-400 text-[#08090E]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Random
                        </button>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      data-start="true"
                      onClick={() => onStartSoloDemo(demoRole, selectedMode)}
                      className="w-full min-h-[54px] px-5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-[#08090E] font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Solo {activeModeMeta.name}</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Right Column: Clean 2x2 Game Mode Selector */}
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-4"
          >
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-sm font-bold text-white">Game Mode</h3>
              <span className="text-xs text-slate-400">All 4 modes unlocked</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MODE_CARDS.map((m) => {
                const active = selectedMode === m.id;
                const Icon = m.Icon;
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => setSelectedMode(m.id)}
                    className={`relative text-left p-4 rounded-2xl border transition-colors ${
                      active
                        ? `${m.accentBg} ${m.accentBorder}`
                        : 'bg-[#10121C]/90 border-white/[0.08] hover:bg-[#151826]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon className={`w-5 h-5 ${active ? m.accentText : 'text-slate-400'}`} />
                      <span
                        className={`text-[11px] font-medium ${
                          active ? m.accentText : 'text-slate-500'
                        }`}
                      >
                        {m.tagline}
                      </span>
                    </div>
                    <div className="mt-3 text-base font-bold text-white">{m.name}</div>
                  </motion.button>
                );
              })}
            </div>

            {/* Active Mode Concise Breakdown */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModeMeta.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="rounded-2xl bg-[#10121C]/80 border border-white/[0.07] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${activeModeMeta.accentText}`}>
                    {activeModeMeta.name} Rules
                  </span>
                  <span className="text-xs text-slate-400">{activeModeMeta.tagline}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                  {activeModeMeta.detail}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.aside>
        </div>
      </main>
    </div>
  );
};
