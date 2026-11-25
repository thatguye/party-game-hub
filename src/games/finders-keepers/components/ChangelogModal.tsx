import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ScrollText, X } from 'lucide-react';
import { formatRealDateTime, resolveReleaseTimestamps } from '../game/rules';

interface ChangelogModalProps {
  onClose: () => void;
}

interface ReleaseDefinition {
  version: string;
  offsetMinutesAgo: number;
  title: string;
  highlights: string[];
}

const STORAGE_KEY = 'fk_changelog_timestamps_v3';

const RELEASES: ReleaseDefinition[] = [
  {
    version: '1.6',
    offsetMinutesAgo: 0,
    title: 'Instant Out-of-Bounds, Mandatory GPS & Dark-Emerald UI',
    highlights: [
      'Out-of-Bounds now automatically eliminates Runners as soon as the 30-second countdown ends—no grace period.',
      'Location access is now required at launch so every player joins at their real GPS position.',
      'Unified every screen into the dark obsidian and emerald tactical theme with zero HUD overlap on mobile.',
    ],
  },
  {
    version: '1.5',
    offsetMinutesAgo: 22,
    title: 'Role Reveal, Radio & Tactical Redesign',
    highlights: [
      'Added a full-screen tap-to-reveal role screen when starting a match on Random.',
      'Rebuilt live game navigation around the Map and Team/Global Radio experience.',
      'Refreshed the in-game HUD and controls sheet for cleaner outdoor legibility.',
    ],
  },
  {
    version: '1.4',
    offsetMinutesAgo: 28,
    title: 'Visual Overhaul & Field Upgrades',
    highlights: [
      'Streamlined every screen with a cleaner layout, smoother transitions, and refined mobile spacing.',
      'Upgraded map styles so every theme switches cleanly with crisp contrast.',
      'Updated default measurements to US miles and feet and refined callsign map icons.',
    ],
  },
  {
    version: '1.3',
    offsetMinutesAgo: 72,
    title: 'Field Polish & Clarity',
    highlights: [
      'Refined live map markers and touch gestures for cleaner readability on smaller screens.',
      'Improved battery-saving pocket screen handling and alert feedback.',
      'General performance and stability improvements across solo and multiplayer rounds.',
    ],
  },
  {
    version: '1.2',
    offsetMinutesAgo: 135,
    title: 'Custom Arenas & Recaps',
    highlights: [
      'Added more flexible play-area tools and reusable match setups.',
      'Expanded post-round summaries with shareable visuals and career milestones.',
      'Improved reliability when moving through areas with weak reception.',
    ],
  },
  {
    version: '1.1',
    offsetMinutesAgo: 210,
    title: 'New Modes & Field Gear',
    highlights: [
      'Introduced additional game modes and upgraded team communication.',
      'Added extra map looks and quick-access safety tools for outdoor sessions.',
      'Smoothed out lobby invites and automatic team balancing.',
    ],
  },
  {
    version: '1.0',
    offsetMinutesAgo: 300,
    title: 'Initial Launch',
    highlights: [
      'First release of Finders Keepers with real-world GPS manhunt rounds, team fog-of-war, and solo practice.',
    ],
  },
];

function loadAndPersistTimestamps(): Record<string, number> {
  const now = Date.now();
  let stored: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Record<string, number>;
  } catch {
    stored = {};
  }
  const resolved = resolveReleaseTimestamps(RELEASES, now, stored);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
  } catch {
    // ignore storage errors
  }
  return resolved;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
  const timestamps = useMemo(() => loadAndPersistTimestamps(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Changelog"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full max-w-lg max-h-[85dvh] flex flex-col rounded-3xl bg-[#0B0E17] border border-emerald-500/20 shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Changelog</h2>
              <p className="text-xs text-slate-400">Recent updates to Finders Keepers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-testid="changelog-list" className="p-5 overflow-y-auto flex-1 space-y-6">
          {RELEASES.map((release, idx) => (
            <article
              key={release.version}
              className={idx > 0 ? 'pt-5 border-t border-white/[0.07]' : ''}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-base font-bold text-white">{release.title}</h3>
                <span
                  data-testid="changelog-timestamp"
                  className="text-xs font-mono text-emerald-300/80 tabular-nums shrink-0"
                >
                  v{release.version} · {formatRealDateTime(timestamps[release.version])}
                </span>
              </div>
              <ul className="mt-2.5 space-y-2 text-sm text-slate-300 leading-relaxed">
                {release.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.08] bg-[#08090E]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-2xl bg-[#141926] hover:bg-[#1C2334] border border-emerald-500/20 text-sm font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
