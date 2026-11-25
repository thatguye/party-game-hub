import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  EyeOff,
  Flashlight,
  Map as MapIcon,
  MoreHorizontal,
  Radio,
  ShieldAlert,
  Siren,
  Vibrate,
  Volume2,
  WifiOff,
} from 'lucide-react';
import type { ChatMessage, ChatScope, LatLng, RoomState } from '../types/game';
import { evaluateOobState, filterVisiblePlayers } from '../game/rules';
import { formatCountdown, formatZoneSize } from '../game/geo';
import {
  disableFlashlightTorch,
  enableFlashlightTorch,
  type FlashColor,
} from '../services/hardware';
import { TacticalMap } from './TacticalMap';
import { SlideToConfirm } from './SlideToConfirm';
import { PocketModeOverlay } from './PocketModeOverlay';
import { ImposterMeetingModal } from './ImposterMeetingModal';
import { RadioView } from './RadioView';

interface ActiveGameViewProps {
  room: RoomState;
  viewerId: string;
  userPos: LatLng;
  nowMs: number;
  isOnline: boolean;
  offlineQueueCount: number;
  stealthHaptic: boolean;
  flashColor: FlashColor | null;
  unreadChatCount: number;
  latestChatMsg: ChatMessage | null;
  pocketModeOpen: boolean;
  onSetPocketMode: (open: boolean) => void;
  onRadioVisibilityChange: (isOpen: boolean) => void;
  onToggleStealthHaptic: () => void;
  onSendText: (scope: ChatScope, text: string) => void;
  onOpenMoreMenu: () => void;
  onRunnerGotTagged: () => void;
  onResolveEmergency: () => void;
  onCallImposterMeeting: () => void;
  onCastMeetingVote: (targetId: string) => void;
  onResolveMeeting: () => void;
}

export const ActiveGameView: React.FC<ActiveGameViewProps> = ({
  room,
  viewerId,
  userPos,
  nowMs,
  isOnline,
  offlineQueueCount,
  stealthHaptic,
  flashColor,
  unreadChatCount,
  latestChatMsg,
  pocketModeOpen,
  onSetPocketMode,
  onRadioVisibilityChange,
  onToggleStealthHaptic,
  onSendText,
  onOpenMoreMenu,
  onRunnerGotTagged,
  onResolveEmergency,
  onCallImposterMeeting,
  onCastMeetingVote,
  onResolveMeeting,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'radio'>('map');
  const [flashlightMode, setFlashlightMode] = useState<'off' | 'hardware' | 'screen'>('off');
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [revealSecretRole, setRevealSecretRole] = useState(false);

  const prevTabRef = useRef<'map' | 'radio'>('map');

  const viewer = room.players.find((p) => p.id === viewerId);
  const role = viewer?.role ?? 'spectator';
  const isHost = room.hostId === viewerId;

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      onRadioVisibilityChange(activeTab === 'radio');
    }
  }, [activeTab, onRadioVisibilityChange]);

  useEffect(() => {
    return () => {
      disableFlashlightTorch();
      onRadioVisibilityChange(false);
    };
  }, [onRadioVisibilityChange]);

  const handleToggleFlashlight = async () => {
    if (flashlightMode !== 'off') {
      disableFlashlightTorch();
      setFlashlightMode('off');
      return;
    }
    const result = await enableFlashlightTorch();
    setFlashlightMode(result);
  };

  // Phase & Countdown telemetry
  const isHeadStart = room.phase === 'head_start';
  const activeCountdownMs = isHeadStart
    ? Math.max(0, (room.headStartEndsAt ?? nowMs) - nowMs)
    : Math.max(0, (room.roundEndsAt ?? nowMs) - nowMs);

  const pingIntervalMs = Math.max(1, room.settings.pingIntervalMin * 60_000);
  const nextPingMs = isHeadStart
    ? activeCountdownMs
    : room.nextPingAt
    ? Math.max(0, room.nextPingAt - nowMs)
    : null;

  const pingProgress =
    nextPingMs !== null
      ? Math.max(
          0,
          Math.min(
            1,
            1 -
              nextPingMs /
                (isHeadStart ? Math.max(1, room.settings.headStartMin * 60_000) : pingIntervalMs)
          )
        )
      : 0;

  const shrinkMs =
    room.settings.zoneShrinkEnabled && room.nextZoneTransitionAt
      ? Math.max(0, room.nextZoneTransitionAt - nowMs)
      : null;

  const zoneSubtext =
    room.currentZone.shape === 'circle'
      ? `${formatZoneSize(room.currentZone.diameterMeters, room.settings.units)} across${
          shrinkMs !== null ? ` · shrinks in ${formatCountdown(shrinkMs)}` : ''
        }`
      : room.currentZone.shape === 'polygon'
      ? `Custom polygon${shrinkMs !== null ? ` · shrinks in ${formatCountdown(shrinkMs)}` : ''}`
      : 'Open world · no boundary';

  const leftMetricLabel =
    room.phase === 'head_start'
      ? 'Head start'
      : room.phase === 'emergency_pause'
      ? 'Paused'
      : room.phase === 'meeting'
      ? 'Meeting'
      : room.settings.mode === 'curfew'
      ? 'Curfew'
      : 'Time left';

  // Runners remaining bar
  const totalRunners = Math.max(
    1,
    room.players.filter((p) => (p.initialRole ?? p.role) === 'runner').length
  );
  const activeRunnersCount = room.players.filter(
    (p) => p.role === 'runner' && !p.eliminated
  ).length;
  const runnersProgressPct = Math.max(0, Math.min(100, (activeRunnersCount / totalRunners) * 100));

  // OOB evaluation for viewer
  const oobEval = evaluateOobState(
    viewer?.oobStatus !== 'inside' && !!viewer?.oobStartedAt,
    viewer?.oobStartedAt,
    nowMs
  );

  // Strict asymmetrical fog-of-war markers
  const visibleMarkers = filterVisiblePlayers(viewer, room, nowMs);

  // Only Hunters & authorized Spectators see Runner Radar Pings (and never during Head Start)
  const visiblePings =
    room.phase === 'hunt' &&
    (role === 'hunter' ||
      (role === 'spectator' && room.settings.spectatorAccess !== 'disabled'))
      ? room.pings
      : [];

  const flashRingClass =
    flashColor === 'crimson'
      ? 'ring-red-500/90'
      : flashColor === 'amber'
      ? 'ring-amber-400/90'
      : flashColor === 'cyan'
      ? 'ring-cyan-400/90'
      : 'ring-emerald-400/90';

  const previewSender = latestChatMsg
    ? latestChatMsg.senderId === viewerId
      ? 'You'
      : latestChatMsg.senderName.replace(' (AI)', '')
    : null;

  const previewBody = latestChatMsg
    ? latestChatMsg.text ?? 'Radio transmission'
    : 'Tap to open Team & Global Radio';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#08090E] select-none">
      {/* Full-Bleed Tactical Map */}
      <TacticalMap
        center={viewer?.lastPos ?? userPos}
        mapTheme={room.settings.mapTheme}
        activeZone={room.currentZone}
        nextZonePreview={room.settings.zoneShrinkEnabled ? room.nextZonePreview : null}
        visibleMarkers={visibleMarkers}
        pings={visiblePings}
        viewerId={viewerId}
        nowMs={nowMs}
        recenterSignal={recenterSignal}
        className="w-full h-full"
      />

      {/* Stealth Mode Visual Screen-Edge Flash Overlay */}
      {flashColor && (
        <div
          aria-hidden="true"
          className={`fk-edge-flash pointer-events-none fixed inset-0 z-50 ring-[10px] ring-inset ${flashRingClass}`}
        />
      )}

      {/* Top Unified 2-Column Dark Emerald Glass HUD Card (visible on Map tab) */}
      {activeTab === 'map' && (
        <div className="pointer-events-none fixed top-0 inset-x-0 z-30 pt-safe px-3 sm:px-4">
          <div className="max-w-lg mx-auto space-y-2">
            <div
              data-testid="hud-top-card"
              className="pointer-events-auto rounded-[22px] bg-[#0B0E17]/92 backdrop-blur-xl border border-emerald-500/20 shadow-2xl overflow-hidden"
            >
              {/* Top 2-Column Split */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                <div className="px-3.5 sm:px-4 py-2.5 sm:py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] sm:text-xs font-semibold text-emerald-300/80">
                      {leftMetricLabel}
                    </span>
                    {room.settings.mode === 'imposter' && viewer && (
                      <button
                        type="button"
                        onClick={() => setRevealSecretRole((v) => !v)}
                        aria-label="Toggle secret imposter role visibility"
                        className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        {revealSecretRole ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>{viewer.isImposter ? 'IMPOSTER' : 'LOYAL'}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Role</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div
                    data-testid="hud-countdown"
                    className="mt-1 font-display text-[2.2rem] sm:text-[2.6rem] font-extrabold text-white leading-none tabular-nums tracking-tight"
                  >
                    {formatCountdown(activeCountdownMs)}
                  </div>
                </div>

                <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] sm:text-xs font-medium text-slate-400">
                      Next ping
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300 tabular-nums">
                      {nextPingMs !== null ? formatCountdown(nextPingMs) : 'Off'}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/[0.1] overflow-hidden my-1.5 sm:my-2">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.round(pingProgress * 100)}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 truncate tabular-nums">
                    {zoneSubtext}
                  </div>
                </div>
              </div>

              {/* Bottom Runners Left Progress Bar */}
              <div className="px-3.5 sm:px-4 py-2 border-t border-white/[0.07] bg-[#080B12]/60 flex items-center gap-3">
                <span className="text-[11px] sm:text-xs font-medium text-slate-400 shrink-0">
                  Runners left
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${runnersProgressPct}%` }}
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-white tabular-nums shrink-0">
                  {activeRunnersCount} of {totalRunners}
                </span>
              </div>
            </div>

            {/* Offline Syncing Indicator & Compass Recenter Row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                {(!isOnline || offlineQueueCount > 0) && (
                  <div
                    role="status"
                    className="pointer-events-auto min-h-[36px] px-3 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/50 text-amber-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>{!isOnline ? 'Offline' : `Syncing (${offlineQueueCount})`}</span>
                  </div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setRecenterSignal((n) => n + 1)}
                aria-label="Recenter map on my GPS"
                className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0B0E17]/92 backdrop-blur-xl border border-emerald-500/25 shadow-xl flex flex-col items-center justify-center text-white hover:bg-[#141A29] transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-emerald-400 mb-0.5"
                />
                <span className="text-[10px] font-extrabold leading-none tracking-tight">N</span>
              </motion.button>
            </div>

            {/* Out-of-Bounds Elimination Countdown Banner (No Grace Period) */}
            <AnimatePresence>
              {role === 'runner' && oobEval.status !== 'inside' && (
                <motion.div
                  data-testid="oob-warning-banner"
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  className="pointer-events-auto rounded-2xl bg-red-600/95 border border-red-300/60 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                    <div className="text-xs font-bold text-white leading-snug">
                      OUT OF BOUNDS — RETURN NOW OR YOU&apos;RE OUT!
                    </div>
                  </div>
                  <div className="font-mono text-base font-extrabold text-white tabular-nums shrink-0">
                    {oobEval.secondsUntilEliminated}s
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Full-Screen Radio View (Team & Global Text Radio) */}
      <AnimatePresence>
        {activeTab === 'radio' && (
          <RadioView
            room={room}
            viewer={viewer}
            nowMs={nowMs}
            stealthHaptic={stealthHaptic}
            onToggleStealthHaptic={onToggleStealthHaptic}
            onBackToMap={() => setActiveTab('map')}
            onSendText={onSendText}
          />
        )}
      </AnimatePresence>

      {/* Unified Bottom Stack: Map Controls + Status/Radio Card + Primary Navigation Dock
          Keeping both inside one single flex-column container guarantees zero overlap
          on 9:16 mobile viewports and iOS notched safe-area insets. */}
      <div className="pointer-events-none fixed bottom-0 inset-x-0 z-40 px-3 sm:px-4 pb-safe">
        <div className="max-w-lg mx-auto flex flex-col gap-2.5 sm:gap-3">
          {activeTab === 'map' && (
            <div data-testid="map-bottom-hud" className="flex flex-col gap-2.5">
              {/* Left & Right Floating Circular Action Buttons */}
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-2 pointer-events-auto">
                  {room.settings.mode === 'imposter' && room.phase === 'hunt' && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={onCallImposterMeeting}
                      aria-label="Call Emergency Meeting"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-[#08090E] shadow-xl flex items-center justify-center transition-colors"
                    >
                      <Siren className="w-5 h-5" />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={handleToggleFlashlight}
                    aria-label={
                      flashlightMode === 'off' ? 'Turn on Flashlight' : 'Turn off Flashlight'
                    }
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-xl border shadow-xl flex items-center justify-center transition-colors ${
                      flashlightMode !== 'off'
                        ? 'bg-emerald-400 border-emerald-300 text-[#08090E]'
                        : 'bg-[#0B0E17]/92 border-emerald-500/25 text-white hover:bg-[#141A29]'
                    }`}
                  >
                    <Flashlight className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onToggleStealthHaptic}
                    aria-label={
                      stealthHaptic ? 'Disable Stealth Haptic Mode' : 'Enable Stealth Haptic Mode'
                    }
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-xl border shadow-xl flex items-center justify-center transition-colors ${
                      stealthHaptic
                        ? 'bg-emerald-500 border-emerald-300 text-[#08090E]'
                        : 'bg-[#0B0E17]/92 border-emerald-500/25 text-white hover:bg-[#141A29]'
                    }`}
                  >
                    {stealthHaptic ? (
                      <Vibrate className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Latest Radio Message Preview + Contextual Status / Slide-to-Tag Card */}
              <div
                data-testid="map-status-card"
                className="pointer-events-auto rounded-[22px] bg-[#0B0E17]/94 backdrop-blur-xl border border-emerald-500/20 p-2 sm:p-2.5 shadow-2xl space-y-2"
              >
                <button
                  type="button"
                  data-testid="radio-preview-row"
                  onClick={() => setActiveTab('radio')}
                  className="w-full min-h-[36px] px-2.5 flex items-center justify-between gap-2 text-left rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {previewSender && (
                      <span className="font-bold text-white shrink-0">{previewSender}</span>
                    )}
                    <span className="text-slate-300 truncate">{previewBody}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {isHeadStart && role === 'hunter' && (
                  <div
                    data-testid="headstart-status-banner"
                    className="rounded-[16px] bg-[#131927] border border-white/[0.08] px-4 py-2.5 text-center"
                  >
                    <div className="text-sm sm:text-base font-bold text-white">
                      Runners are hiding
                    </div>
                    <div className="text-xs text-emerald-400 font-medium tabular-nums mt-0.5">
                      You&apos;re out in {formatCountdown(activeCountdownMs)}
                    </div>
                  </div>
                )}

                {isHeadStart && role === 'runner' && (
                  <div
                    data-testid="headstart-status-banner"
                    className="rounded-[16px] bg-emerald-500/15 border border-emerald-400/35 px-4 py-2.5 text-center"
                  >
                    <div className="text-sm sm:text-base font-bold text-emerald-300">
                      Run &amp; hide now
                    </div>
                    <div className="text-xs text-emerald-200/80 tabular-nums mt-0.5">
                      Hunters release in {formatCountdown(activeCountdownMs)}
                    </div>
                  </div>
                )}

                {role === 'runner' && room.phase === 'hunt' && (
                  <SlideToConfirm
                    label="Slide to Confirm: I Got Tagged"
                    confirmedLabel="Tag Reported"
                    accent="crimson"
                    onConfirm={onRunnerGotTagged}
                    ariaLabel="Slide to confirm I Got Tagged"
                  />
                )}

                {role === 'spectator' && (
                  <div className="rounded-[16px] bg-[#131927] border border-white/[0.08] px-4 py-2 text-center text-xs text-slate-300">
                    <strong className="text-emerald-300">Spectator Mode</strong> ·{' '}
                    {room.settings.spectatorAccess === 'live'
                      ? 'Viewing all players live'
                      : room.settings.spectatorAccess === 'delayed_1m'
                      ? 'Viewing positions on 1-minute delay'
                      : 'Map feed disabled by host'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Floating Navigation Dock: Map | Radio Pill + Circular More (...) Button */}
          <div data-testid="bottom-nav-dock" className="flex items-center gap-2.5 sm:gap-3">
            <nav
              aria-label="Primary game navigation"
              className="pointer-events-auto flex-1 rounded-full bg-[#0B0E17]/96 backdrop-blur-xl border border-emerald-500/20 p-1.5 grid grid-cols-2 gap-1 shadow-2xl"
            >
              <button
                type="button"
                data-testid="nav-map-tab"
                onClick={() => setActiveTab('map')}
                aria-current={activeTab === 'map' ? 'page' : undefined}
                className={`min-h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  activeTab === 'map'
                    ? 'bg-emerald-500/20 border border-emerald-400/35 text-emerald-300'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <MapIcon className="w-5 h-5" />
                <span className="text-[11px] font-bold leading-none">Map</span>
              </button>

              <button
                type="button"
                data-testid="nav-radio-tab"
                onClick={() => setActiveTab('radio')}
                aria-current={activeTab === 'radio' ? 'page' : undefined}
                className={`relative min-h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  activeTab === 'radio'
                    ? 'bg-emerald-500/20 border border-emerald-400/35 text-emerald-300'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <div className="relative">
                  <Radio className="w-5 h-5" />
                  {unreadChatCount > 0 && activeTab !== 'radio' && (
                    <span
                      data-testid="radio-unread-badge"
                      className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-[#08090E] text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow"
                    >
                      {unreadChatCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold leading-none">Radio</span>
              </button>
            </nav>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              data-testid="nav-more-btn"
              onClick={onOpenMoreMenu}
              aria-label="Open Controls and Get Help"
              className="pointer-events-auto w-[58px] h-[58px] rounded-full bg-[#0B0E17]/96 hover:bg-[#141A29] backdrop-blur-xl border border-emerald-500/20 shadow-2xl flex items-center justify-center text-emerald-300 shrink-0 transition-colors"
            >
              <MoreHorizontal className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Emergency Pause Freeze Overlay */}
      {room.phase === 'emergency_pause' && room.emergency?.active && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 p-4 pb-safe bg-gradient-to-t from-[#08090E] via-[#08090E]/95 to-transparent"
          role="alertdialog"
          aria-label="Emergency Game Pause"
        >
          <div className="max-w-md mx-auto rounded-3xl bg-[#130D14] border-2 border-red-500/80 p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-red-400 shrink-0" />
              <div>
                <h2 className="text-base font-extrabold text-white">
                  GAME PAUSED — EMERGENCY ALERT
                </h2>
                <p className="text-xs text-red-200">
                  {room.emergency.triggeredByName} requested help · Live GPS pinned on map
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-black/50 p-3 font-mono text-xs text-amber-200 tabular-nums">
              {room.emergency.address || 'Exact Coordinates'}: {room.emergency.lat.toFixed(5)},{' '}
              {room.emergency.lng.toFixed(5)}
            </div>
            {(room.emergency.triggeredById === viewerId || isHost) && (
              <button
                type="button"
                onClick={onResolveEmergency}
                className="mt-4 w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#08090E] font-bold text-sm"
              >
                {room.emergency.triggeredById === viewerId
                  ? "I'm OK — Resume Game"
                  : 'Host Resume Game'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Screen-Torch High-Brightness White Fallback */}
      {flashlightMode === 'screen' && (
        <div
          onClick={() => setFlashlightMode('off')}
          role="dialog"
          aria-label="Screen Flashlight Active"
          className="fixed inset-0 z-[75] bg-white text-[#08090E] flex flex-col items-center justify-end p-8 pb-safe cursor-pointer"
        >
          <button
            type="button"
            onClick={() => setFlashlightMode('off')}
            className="min-h-[52px] px-8 rounded-2xl bg-[#08090E] text-white font-bold text-sm shadow-2xl"
          >
            Tap Anywhere to Turn Off Flashlight
          </button>
        </div>
      )}

      {/* Pocket Battery-Saver Mode Overlay */}
      {pocketModeOpen && (
        <PocketModeOverlay
          countdownLabel={formatCountdown(activeCountdownMs)}
          phaseLabel={leftMetricLabel.toUpperCase()}
          role={role}
          oobStatus={oobEval.status}
          oobSecondsLeft={oobEval.secondsUntilEliminated}
          onUnlock={() => onSetPocketMode(false)}
        />
      )}

      {/* Imposter Emergency Meeting Modal */}
      {room.phase === 'meeting' && room.meeting?.active && (
        <ImposterMeetingModal
          meeting={room.meeting}
          players={room.players}
          viewerId={viewerId}
          nowMs={nowMs}
          isHost={isHost}
          onCastVote={onCastMeetingVote}
          onResolveMeeting={onResolveMeeting}
        />
      )}
    </div>
  );
};
