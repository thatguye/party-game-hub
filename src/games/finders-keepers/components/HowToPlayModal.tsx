import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BookOpen,
  Compass,
  Crosshair,
  Eye,
  Flag,
  Flashlight,
  Lock,
  Radio,
  ShieldAlert,
  Siren,
  Skull,
  Timer,
  Trophy,
  Users,
  Vibrate,
  X,
} from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

type SectionKey = 'flow' | 'modes' | 'rules';

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('flow');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLElement | null>(null);
  const modesRef = useRef<HTMLElement | null>(null);
  const rulesRef = useRef<HTMLElement | null>(null);

  const jumpTo = (section: SectionKey) => {
    setActiveSection(section);
    const target =
      section === 'flow'
        ? flowRef.current
        : section === 'modes'
        ? modesRef.current
        : rulesRef.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="How to Play Finders Keepers"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl bg-[#11131D] border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222638] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">
                How to Play Finders Keepers
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Round flow, every game mode, boundaries, scoring &amp; field gear
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sticky Quick-Jump Section Bar */}
        <div className="px-4 sm:px-5 pt-3 pb-2.5 border-b border-[#1D2132] bg-[#0D0F17]">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#090A10] border border-[#222638]">
            {(
              [
                { id: 'flow', label: 'How It Works' },
                { id: 'modes', label: 'All 4 Modes' },
                { id: 'rules', label: 'Rules & Gear' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpTo(item.id)}
                className={`min-h-[38px] px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeSection === item.id
                    ? 'bg-emerald-500 text-[#09090E]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Field Manual */}
        <div ref={scrollRef} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-7">
          {/* SECTION 1: HOW THE GAME WORKS */}
          <section ref={flowRef} className="space-y-3.5 scroll-mt-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                1. How the Game Works
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Finders Keepers turns any neighborhood, campus, park, or city block into a live GPS
              manhunt. Runners scatter and hide inside a custom boundary while Hunters track
              periodic radar pings to close in and tag them before the round clock hits 00:00.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Step 1 · Create or Join Lobby</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Host a game to generate a 6-character code &amp; QR invite link, or join a
                  friend&apos;s room. Everyone picks a team preference (<strong className="text-white">Hunter</strong>,{' '}
                  <strong className="text-white">Runner</strong>, or{' '}
                  <strong className="text-white">Random</strong>). At start, auto-balance ensures at
                  least 1 Hunter per 10 players and never more Hunters than Runners.
                </p>
              </div>

              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Step 2 · Set Arena &amp; Timers</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Host chooses a mode, sets Round Length (5–180m), Radar Ping interval (Off or
                  1–30m), and Head Start (0–30m), and defines the Play Zone as{' '}
                  <strong className="text-white">Off</strong>, a resizable{' '}
                  <strong className="text-white">Circle</strong> (650 ft – 3.7 mi), or a custom dragged{' '}
                  <strong className="text-white">Polygon</strong>.
                </p>
              </div>

              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Timer className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Step 3 · Head Start (Scatter)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When the Host taps <strong className="text-white">Let&apos;s Go</strong>, Runners
                  sprint into the zone to find hiding spots. During Head Start, Hunters are locked
                  behind a countdown screen so nobody peaks or chases early.
                </p>
              </div>

              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Radio className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Step 4 · The Hunt, Fog &amp; Tags</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-emerald-300">Runners</strong> see fellow Runners live,{' '}
                  <em>never</em> Hunters. <strong className="text-red-300">Hunters</strong> see
                  fellow Hunters live and receive <strong className="text-white">Radar Ping</strong>{' '}
                  snapshots of Runner locations on schedule. When tagged in person, the Runner slides{' '}
                  <strong className="text-white">&ldquo;I Got Tagged&rdquo;</strong> to confirm.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: ALL 4 GAME MODES */}
          <section ref={modesRef} className="pt-5 border-t border-[#1F2334] space-y-3.5 scroll-mt-4">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">
                2. All 4 Game Modes Explained
              </h3>
            </div>

            <div className="space-y-3">
              {/* Classic */}
              <div className="rounded-xl bg-[#141824] border border-emerald-500/35 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="text-sm font-bold text-white">Classic</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Elimination · Spectator Modes
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pure high-stakes hide-and-seek manhunt. Once tagged, a Runner is eliminated from
                  play and becomes a <strong className="text-white">Spectator</strong>.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Spectator Map Access:</strong> Host chooses{' '}
                    <em>Live All</em>, <em>1-Min Delay</em> (anti-screen-peeking), or{' '}
                    <em>Disabled</em>.
                  </li>
                  <li>
                    <strong className="text-white">Zone Shrink:</strong> If enabled, the circle or
                    polygon smoothly shrinks toward the Final Shrink Size to force end-game tension.
                  </li>
                  <li>
                    <strong className="text-white">How to Win:</strong> Hunters win by tagging every
                    Runner before 00:00. Runners win if at least one active Runner survives until
                    00:00.
                  </li>
                </ul>
              </div>

              {/* Infection */}
              <div className="rounded-xl bg-[#141824] border border-red-500/35 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-400 shrink-0" />
                    <h4 className="text-sm font-bold text-white">Infection</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-red-400">
                    Growing Hunter Pack
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nobody sits out on the sidelines. Every tag flips the odds as the Hunter squad
                  snowballs across the map.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Team Flip on Tag:</strong> When a Runner confirms
                    being tagged (or times out of bounds), they immediately convert into a{' '}
                    <strong className="text-red-300">Hunter</strong>, gain Hunter radar &amp; Hunters
                    Team Chat access, and join the chase.
                  </li>
                  <li>
                    <strong className="text-white">Scoring Bonus:</strong> Converted players still
                    earn their Runner survival minutes plus +3 points for every tag they score
                    afterwards.
                  </li>
                  <li>
                    <strong className="text-white">How to Win:</strong> Hunters win once every
                    Runner is infected; remaining Runners win if anyone stays un-infected until
                    00:00.
                  </li>
                </ul>
              </div>

              {/* Curfew */}
              <div className="rounded-xl bg-[#141824] border border-amber-500/35 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400 shrink-0" />
                    <h4 className="text-sm font-bold text-white">Curfew</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400">
                    Teleporting Sub-Zones
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No camping in one corner all match. Instead of shrinking around the same center,
                  the safe area periodically jumps to a new spot.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Teleporting Boundary:</strong> At each shrink
                    step, the Play Zone teleports to a smaller sub-zone anchored somewhere inside
                    the previous boundary.
                  </li>
                  <li>
                    <strong className="text-white">Next Zone Preview:</strong> The dashed preview
                    ring shows where the safe zone is jumping next so Runners can plan their sprint
                    before the cutoff triggers Out-of-Bounds penalties.
                  </li>
                  <li>
                    <strong className="text-white">How to Win:</strong> Same as Classic—Hunters must
                    clear all Runners before 00:00, while Runners survive the shifting curfews.
                  </li>
                </ul>
              </div>

              {/* Imposter */}
              <div className="rounded-xl bg-[#141824] border border-cyan-500/35 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Siren className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h4 className="text-sm font-bold text-white">Imposter</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-cyan-400">
                    Hidden Roles · Live Votes
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Social deduction meets real-world pursuit. Secret traitors hide inside the Runner
                  team while everyone avoids the Hunters.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Secret Role Peek:</strong> With 3+ players, ~25%
                    of Runners are secretly assigned <strong className="text-amber-300">Imposter</strong>.
                    Tap the eye icon beside your role on the HUD to check discreetly.
                  </li>
                  <li>
                    <strong className="text-white">Emergency Meetings:</strong> Any active player
                    can tap the <strong className="text-amber-300">Siren</strong> button during the
                    Hunt to pause movement for a 60-second live vote to eject a suspect or skip.
                  </li>
                  <li>
                    <strong className="text-white">How to Win:</strong> Loyal Runners win if all
                    Imposters are voted out (or if loyal Runners survive to 00:00). Imposters win
                    with Hunters if all loyal Runners are eliminated.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 3: BOUNDARIES, SCORING & FIELD GEAR */}
          <section ref={rulesRef} className="pt-5 border-t border-[#1F2334] space-y-3.5 scroll-mt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
                3. Boundaries, Scoring &amp; Field Gear
              </h3>
            </div>

            {/* OOB Rule */}
            <div className="rounded-xl bg-red-950/30 border border-red-500/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Out-of-Bounds Countdown (Runners)</span>
              </div>
              <p className="text-xs text-red-100/85 leading-relaxed">
                Step outside the active Play Zone during the Hunt and a{' '}
                <strong className="text-white">30-second countdown</strong> starts immediately.
                Return inside the boundary before it hits{' '}
                <strong className="text-white">0s</strong>—otherwise you are automatically out
                (eliminated in Classic, or converted to a Hunter in Infection) with no grace
                period.
              </p>
            </div>

            {/* Scoring */}
            <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-4 space-y-2">
              <div className="text-xs font-bold text-white">Round Scoring &amp; Story Poster</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div className="rounded-lg bg-[#0D0F17] border border-[#222739] p-3">
                  <div className="font-bold text-emerald-400 mb-1">Runners</div>
                  <p>+1 pt per 3 minutes survived + +10 pts if you finish the round uncaught.</p>
                </div>
                <div className="rounded-lg bg-[#0D0F17] border border-[#222739] p-3">
                  <div className="font-bold text-red-400 mb-1">Hunters</div>
                  <p>+3 pts per tag + +10 pts Clean Sweep bonus if all Runners are caught.</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Every finished match saves your GPS movement trails, awards milestone badges, and
                generates a 9:16 Story Poster recap you can save or share.
              </p>
            </div>

            {/* Field Hardware */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Team &amp; Global Radio</div>
                  <p className="text-slate-300 mt-0.5">
                    Message your teammates privately or broadcast globally with one-tap tactical
                    quick replies.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-200 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Pocket Mode (OLED Lock)</div>
                  <p className="text-slate-300 mt-0.5">
                    Covers the map in pure black with slide-to-unlock so GPS keeps running in your
                    pocket.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3 flex items-start gap-2.5">
                <Vibrate className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Stealth Haptics &amp; Torch</div>
                  <p className="text-slate-300 mt-0.5">
                    Swap audio alerts for vibration + edge flashes while hiding, or toggle the map
                    flashlight (<Flashlight className="inline w-3 h-3" />) at night.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[#161926] border border-[#252A3D] p-3 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Get Help (Safety Pause)</div>
                  <p className="text-slate-300 mt-0.5">
                    Opens 911 dial + your exact street address, or hold 2s to pause the whole
                    game and broadcast your emergency GPS pin.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222638] bg-[#0D0F17]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#09090E] text-sm font-bold transition-colors"
          >
            Got It — Ready to Play
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
