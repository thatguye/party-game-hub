import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Minus,
  MoreHorizontal,
  Play,
  Plus,
  QrCode,
  Radio,
  Save,
  Trash2,
  UserMinus,
} from 'lucide-react';
import type {
  ActiveZone,
  CustomPreset,
  GameMode,
  LatLng,
  MapTheme,
  RoomSettings,
  RoomState,
  SpectatorAccess,
  TeamPreference,
  UnitSystem,
} from '../types/game';
import {
  applyBuiltInPreset,
  BUILT_IN_PRESETS,
  getCallsignInitial,
  type VisiblePlayerMarker,
} from '../game/rules';
import { createDefaultPolygonAround, formatZoneSize, roundCoord } from '../game/geo';
import { QuickSwitchMenu } from '@/components/QuickSwitchMenu';
import { BrandIcon } from './BrandIcon';
import { TacticalMap } from './TacticalMap';

interface LobbyViewProps {
  room: RoomState;
  viewerId: string;
  userPos: LatLng;
  customPresets: CustomPreset[];
  unreadChatCount?: number;
  onUpdateSettings: (settings: RoomSettings) => void;
  onUpdatePreference: (pref: TeamPreference) => void;
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onStartRound: () => void;
  onShowQr: () => void;
  onOpenChat: () => void;
  onOpenMoreMenu: () => void;
}

const MODES: { id: GameMode; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Elimination + Spectators' },
  { id: 'infection', label: 'Infection', desc: 'Tagged join Hunters' },
  { id: 'curfew', label: 'Curfew', desc: 'Teleporting sub-zones' },
  { id: 'imposter', label: 'Imposter', desc: 'Hidden roles + votes' },
];

const MAP_THEMES: { id: MapTheme; label: string }[] = [
  { id: 'night', label: 'Night' },
  { id: 'standard', label: 'Street' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'snow', label: 'Snow' },
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  viewerId,
  userPos,
  customPresets,
  unreadChatCount = 0,
  onUpdateSettings,
  onUpdatePreference,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onRemovePlayer,
  onStartRound,
  onShowQr,
  onOpenChat,
  onOpenMoreMenu,
}) => {
  const [copied, setCopied] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [panelTab, setPanelTab] = useState<'squad' | 'rules'>('squad');
  const [mobileView, setMobileView] = useState<'squad' | 'rules' | 'map'>('squad');

  const viewer = room.players.find((p) => p.id === viewerId);
  const isHost = room.hostId === viewerId;
  const s = room.settings;

  // Show ALL players in the lobby right on the live map with their callsign first letter
  const lobbyPlayerMarkers: VisiblePlayerMarker[] = room.players.map((p) => ({
    player: p,
    position: p.lastPos ?? {
      lat: s.zone.center.lat,
      lng: s.zone.center.lng,
      ts: p.lastSeenAt,
    },
    isExposedOob: false,
    isEmergencyPin: false,
    isDelayed: false,
  }));

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?code=${room.code}`
      : `?code=${room.code}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const patchSettings = (patch: Partial<RoomSettings>) => {
    if (!isHost) return;
    onUpdateSettings({ ...s, ...patch });
  };

  const handleZoneShapeChange = (shape: ActiveZone['shape']) => {
    if (!isHost) return;
    const nextPolygon =
      s.zone.polygon.length >= 3 ? s.zone.polygon : createDefaultPolygonAround(s.zone.center, 450);
    patchSettings({
      zone: {
        ...s.zone,
        shape,
        polygon: nextPolygon,
      },
    });
  };

  const handleAddPolygonVertex = () => {
    if (!isHost || s.zone.polygon.length < 2) return;
    const poly = s.zone.polygon;
    const last = poly[poly.length - 1];
    const first = poly[0];
    const mid: LatLng = {
      lat: roundCoord((last.lat + first.lat) / 2 + 0.0004),
      lng: roundCoord((last.lng + first.lng) / 2 + 0.0004),
    };
    patchSettings({ zone: { ...s.zone, polygon: [...poly, mid] } });
  };

  const handleRemovePolygonVertex = () => {
    if (!isHost || s.zone.polygon.length <= 3) return;
    patchSettings({ zone: { ...s.zone, polygon: s.zone.polygon.slice(0, -1) } });
  };

  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = presetName.trim();
    if (!trimmed) return;
    onSaveCustomPreset(trimmed);
    setPresetName('');
    setShowPresetForm(false);
  };

  const showMap = mobileView === 'map';

  return (
    <div className="min-h-dvh bg-[#08090E] text-[#F4F5F9] flex flex-col">
      {/* Clean Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0A0B12]/92 backdrop-blur-md pt-safe">
        <div
          data-testid="lobby-header-bar"
          className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <QuickSwitchMenu currentGame="finders-keepers" compact />
            <BrandIcon className="hidden sm:block w-8 h-8 rounded-lg shrink-0" />
            <div data-testid="lobby-room-code-block" className="shrink-0">
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 whitespace-nowrap leading-tight">
                Room Code
              </div>
              <div className="font-mono text-lg sm:text-2xl font-bold tracking-[0.12em] sm:tracking-[0.18em] text-emerald-400 leading-none tabular-nums whitespace-nowrap mt-0.5">
                {room.code}
              </div>
            </div>
          </div>

          <div data-testid="lobby-header-actions" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleCopyInvite}
              className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3.5 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="sm:hidden">{copied ? 'Copied' : 'Invite'}</span>
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite Link'}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onShowQr}
              aria-label="Show QR Code"
              className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] sm:px-3 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">QR Code</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onOpenChat}
              aria-label="Open Lobby Radio"
              className="relative min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] sm:px-3 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Radio</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-[#08090E] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {unreadChatCount}
                </span>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={onOpenMoreMenu}
              aria-label="More options and Get Help"
              className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 flex items-center justify-center text-white"
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile 3-Tab Switcher (keeps each screen uncluttered) */}
      <div className="lg:hidden px-4 pt-3">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#10121C] border border-white/[0.08]">
          {(
            [
              { id: 'squad', label: `Squad (${room.players.length})` },
              { id: 'rules', label: 'Rules' },
              { id: 'map', label: 'Play Zone' },
            ] as const
          ).map((tab) => {
            const active = mobileView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMobileView(tab.id);
                  if (tab.id !== 'map') setPanelTab(tab.id);
                }}
                className={`relative min-h-[40px] rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  active ? 'text-[#08090E]' : 'text-slate-300'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="lobby-mobile-tab"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-emerald-400"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Clean Tabbed Squad & Rules */}
        <section
          className={`lg:col-span-5 flex flex-col rounded-3xl bg-[#10121C] border border-white/[0.08] overflow-hidden ${
            showMap ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Desktop Panel Sub-Tabs */}
          <div className="hidden lg:grid grid-cols-2 gap-1 p-2 border-b border-white/[0.07] bg-[#0B0D14]">
            {(
              [
                { id: 'squad', label: `Squad (${room.players.length})` },
                { id: 'rules', label: 'Mode & Rules' },
              ] as const
            ).map((tab) => {
              const active = panelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setPanelTab(tab.id);
                    setMobileView(tab.id);
                  }}
                  className={`relative min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                    active ? 'text-[#08090E]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="lobby-desktop-tab"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-emerald-400"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 space-y-5 flex-1">
            <AnimatePresence mode="wait">
              {panelTab === 'squad' ? (
                <motion.div
                  key="squad"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-5"
                >
                  {/* Team Preference */}
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Your Team Preference
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      {(['hunter', 'runner', 'random'] as TeamPreference[]).map((pref) => {
                        const active = viewer?.preference === pref;
                        return (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            key={pref}
                            type="button"
                            onClick={() => onUpdatePreference(pref)}
                            className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors capitalize ${
                              active
                                ? pref === 'hunter'
                                  ? 'bg-red-500/20 border-red-400 text-red-200'
                                  : pref === 'runner'
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                : 'bg-[#090A10] border-white/[0.08] text-slate-400 hover:text-white'
                            }`}
                          >
                            {pref}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Game Mode Compact Grid */}
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Game Mode
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {MODES.map((m) => (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          key={m.id}
                          type="button"
                          disabled={!isHost}
                          onClick={() => patchSettings({ mode: m.id })}
                          className={`p-3 rounded-xl border text-left transition-colors disabled:opacity-75 ${
                            s.mode === m.id
                              ? 'bg-emerald-500/12 border-emerald-500/70 text-white'
                              : 'bg-[#090A10] border-white/[0.08] text-slate-300 hover:bg-[#141724]'
                          }`}
                        >
                          <div className="text-sm font-bold">{m.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {m.desc}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Squad Roster — shows ALL players inside the lobby */}
                  <div data-testid="lobby-players-list">
                    <div className="flex items-center justify-between mb-2.5">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Players in Lobby ({room.players.length})
                      </h2>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {room.players.filter((p) => p.connected).length} online
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.06] rounded-2xl bg-[#090A10] border border-white/[0.07] overflow-hidden">
                      {room.players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 px-3.5 py-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-[#08090E] shrink-0"
                              style={{ backgroundColor: p.color }}
                            >
                              {getCallsignInitial(p.name)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm font-semibold text-white truncate">
                                  {p.name}
                                  {p.id === viewerId ? ' (You)' : ''}
                                </span>
                                {p.isHost && (
                                  <span className="text-[11px] font-semibold text-cyan-400 shrink-0">
                                    Host
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    p.connected ? 'bg-emerald-400' : 'bg-slate-500'
                                  }`}
                                />
                                <span>{p.connected ? 'Ready in lobby' : 'Reconnecting'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-slate-300 capitalize">
                              {p.preference}
                            </span>
                            {isHost && p.id !== viewerId && (
                              <button
                                type="button"
                                onClick={() => onRemovePlayer(p.id)}
                                aria-label={`Remove ${p.name}`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-5"
                >
                  {/* Built-in + Custom Presets */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Quick Presets
                      </h2>
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => setShowPresetForm((v) => !v)}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Setup</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {BUILT_IN_PRESETS.map((preset) => (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          key={preset.id}
                          type="button"
                          disabled={!isHost}
                          onClick={() => onUpdateSettings(applyBuiltInPreset(s, preset.id))}
                          className="min-h-[54px] px-2.5 py-2 rounded-xl bg-[#090A10] hover:bg-[#151927] border border-white/[0.08] text-left transition-colors disabled:opacity-60"
                        >
                          <div className="text-xs font-bold text-white">{preset.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {preset.summary}
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {showPresetForm && isHost && (
                      <form onSubmit={handleSavePresetSubmit} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          placeholder="Preset name"
                          className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#090A10] border border-white/10 text-xs text-white placeholder:text-slate-500"
                        />
                        <button
                          type="submit"
                          className="min-h-[42px] px-4 rounded-xl bg-emerald-500 text-[#08090E] text-xs font-bold"
                        >
                          Save
                        </button>
                      </form>
                    )}

                    {customPresets.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {customPresets.map((cp) => (
                          <div
                            key={cp.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#090A10] border border-white/[0.08]"
                          >
                            <button
                              type="button"
                              disabled={!isHost}
                              onClick={() => onUpdateSettings(cp.settings)}
                              className="flex-1 text-left text-xs font-semibold text-cyan-300 hover:text-cyan-200 truncate"
                            >
                              {cp.name} · {cp.settings.mode} · {cp.settings.roundLengthMin}m
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCustomPreset(cp.id)}
                              aria-label={`Delete preset ${cp.name}`}
                              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timers & Zone Shrink Sliders */}
                  <div className="space-y-4 pt-4 border-t border-white/[0.07]">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <label htmlFor="slider-round-len" className="text-slate-300 font-medium">
                          Round Length
                        </label>
                        <span className="font-mono font-bold text-white tabular-nums">
                          {s.roundLengthMin >= 60
                            ? `${Math.floor(s.roundLengthMin / 60)}h ${s.roundLengthMin % 60}m`
                            : `${s.roundLengthMin} min`}
                        </span>
                      </div>
                      <input
                        id="slider-round-len"
                        type="range"
                        min={5}
                        max={180}
                        step={5}
                        disabled={!isHost}
                        value={s.roundLengthMin}
                        onChange={(e) => patchSettings({ roundLengthMin: Number(e.target.value) })}
                        className="w-full fk-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <label htmlFor="slider-ping-int" className="text-slate-300 font-medium">
                          Runner Radar Ping Interval
                        </label>
                        <span className="font-mono font-bold text-cyan-400 tabular-nums">
                          {s.pingIntervalMin === 0 ? 'Off' : `Every ${s.pingIntervalMin} min`}
                        </span>
                      </div>
                      <input
                        id="slider-ping-int"
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        disabled={!isHost}
                        value={s.pingIntervalMin}
                        onChange={(e) => patchSettings({ pingIntervalMin: Number(e.target.value) })}
                        className="w-full fk-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <label htmlFor="slider-head-start" className="text-slate-300 font-medium">
                          Head Start (Scatter)
                        </label>
                        <span className="font-mono font-bold text-amber-400 tabular-nums">
                          {s.headStartMin === 0 ? 'None' : `${s.headStartMin} min`}
                        </span>
                      </div>
                      <input
                        id="slider-head-start"
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        disabled={!isHost}
                        value={s.headStartMin}
                        onChange={(e) => patchSettings({ headStartMin: Number(e.target.value) })}
                        className="w-full fk-slider"
                      />
                    </div>

                    <div className="pt-3 border-t border-white/[0.07] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white">
                          {s.mode === 'curfew' ? 'Curfew Zone Teleports' : 'Shrinking Zone'}
                        </div>
                        <button
                          type="button"
                          disabled={!isHost}
                          onClick={() => patchSettings({ zoneShrinkEnabled: !s.zoneShrinkEnabled })}
                          className={`min-h-[38px] px-4 rounded-xl text-xs font-bold transition-colors ${
                            s.zoneShrinkEnabled
                              ? 'bg-emerald-500 text-[#08090E]'
                              : 'bg-[#090A10] text-slate-400 border border-white/10'
                          }`}
                        >
                          {s.zoneShrinkEnabled ? 'On' : 'Off'}
                        </button>
                      </div>

                      {s.zoneShrinkEnabled && s.zone.shape !== 'off' && (
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <label htmlFor="slider-final-zone" className="text-slate-300 font-medium">
                              Final Shrink Size
                            </label>
                            <span className="font-mono font-bold text-amber-300 tabular-nums">
                              {formatZoneSize(s.finalZoneDiameterMeters, s.units)}
                            </span>
                          </div>
                          <input
                            id="slider-final-zone"
                            type="range"
                            min={150}
                            max={Math.max(300, Math.min(3000, s.zone.diameterMeters - 50))}
                            step={50}
                            disabled={!isHost}
                            value={Math.min(s.finalZoneDiameterMeters, s.zone.diameterMeters)}
                            onChange={(e) =>
                              patchSettings({ finalZoneDiameterMeters: Number(e.target.value) })
                            }
                            className="w-full fk-slider"
                          />
                        </div>
                      )}
                    </div>

                    {s.mode === 'classic' && (
                      <div className="pt-3 border-t border-white/[0.07]">
                        <div className="text-xs font-semibold text-slate-300 mb-2">
                          Eliminated Spectator Map Access
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'live', label: 'Live All' },
                              { id: 'delayed_1m', label: '1-Min Delay' },
                              { id: 'disabled', label: 'Disabled' },
                            ] as { id: SpectatorAccess; label: string }[]
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={!isHost}
                              onClick={() => patchSettings({ spectatorAccess: opt.id })}
                              className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                                s.spectatorAccess === opt.id
                                  ? 'bg-emerald-500 text-[#08090E]'
                                  : 'bg-[#090A10] text-slate-300 border border-white/[0.08]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Units (American Miles default) */}
                    <div className="pt-3 border-t border-white/[0.07]">
                      <div className="text-xs font-semibold text-slate-300 mb-2">Distance Units</div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['mi', 'km'] as UnitSystem[]).map((u) => (
                          <button
                            key={u}
                            type="button"
                            disabled={!isHost}
                            onClick={() => patchSettings({ units: u })}
                            className={`min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                              s.units === u
                                ? 'bg-white text-[#08090E]'
                                : 'bg-[#090A10] text-slate-400 border border-white/[0.08]'
                            }`}
                          >
                            {u === 'mi' ? 'Miles & Feet (US)' : 'Kilometers'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Panel: Interactive Play Zone & Live Map Theme Bar */}
        <section
          className={`lg:col-span-7 flex flex-col rounded-3xl bg-[#10121C] border border-white/[0.08] overflow-hidden min-h-[520px] lg:h-[calc(100dvh-160px)] lg:sticky lg:top-20 ${
            !showMap ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="relative z-10 bg-[#10121C] p-4 border-b border-white/[0.07] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">Play Zone</h2>
                <p className="text-xs text-slate-400">
                  {s.zone.shape === 'off'
                    ? 'Open world — play anywhere'
                    : s.zone.shape === 'circle'
                    ? 'Tap map or drag pin to move boundary'
                    : 'Tap map to add corners · Drag points to reshape'}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090A10] border border-white/[0.08]">
                {(
                  [
                    { id: 'off', label: 'Off' },
                    { id: 'circle', label: 'Circle' },
                    { id: 'polygon', label: 'Polygon' },
                  ] as { id: ActiveZone['shape']; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleZoneShapeChange(mode.id)}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      s.zone.shape === mode.id
                        ? 'bg-emerald-500 text-[#08090E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {s.zone.shape === 'circle' && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="slider-zone-diam" className="text-slate-300 font-medium">
                    Zone Diameter ({s.units === 'mi' ? '650 ft – 3.7 mi' : '200 m – 6 km'})
                  </label>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {formatZoneSize(s.zone.diameterMeters, s.units)}
                  </span>
                </div>
                <input
                  id="slider-zone-diam"
                  type="range"
                  min={200}
                  max={6000}
                  step={100}
                  disabled={!isHost}
                  value={s.zone.diameterMeters}
                  onChange={(e) =>
                    patchSettings({
                      zone: { ...s.zone, diameterMeters: Number(e.target.value) },
                    })
                  }
                  className="w-full fk-slider"
                />
              </div>
            )}

            {s.zone.shape === 'polygon' && isHost && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-cyan-300 tabular-nums">
                  {s.zone.polygon.length} corners placed
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddPolygonVertex}
                    aria-label="Add polygon corner"
                    className="min-h-[38px] px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-bold text-cyan-200 inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Corner</span>
                  </button>
                  <button
                    type="button"
                    disabled={s.zone.polygon.length <= 3}
                    onClick={handleRemovePolygonVertex}
                    aria-label="Remove last polygon corner"
                    className="min-h-[38px] px-3 rounded-xl bg-[#161926] hover:bg-[#1E2233] border border-white/10 text-xs font-bold text-slate-200 inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}

            {/* Instant Map Theme Selector Strip */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Map Style</span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#090A10] border border-white/[0.08] flex-1 max-w-xs">
                {MAP_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => patchSettings({ mapTheme: t.id })}
                    className={`min-h-[34px] rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                      s.mapTheme === t.id
                        ? 'bg-white text-[#08090E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Lobby Players Bar above map so everyone in the lobby is always visible */}
          <div className="relative z-10 px-4 py-2 bg-[#0B0D14] border-b border-white/[0.07] flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              In Lobby ({room.players.length})
            </span>
            <div className="flex items-center gap-1.5">
              {room.players.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-[#151824] border border-white/[0.08] text-xs font-semibold text-white whitespace-nowrap"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-[#08090E]"
                    style={{ backgroundColor: p.color }}
                  >
                    {getCallsignInitial(p.name)}
                  </span>
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 relative min-h-[360px] overflow-hidden">
            <TacticalMap
              center={s.zone.center || userPos}
              mapTheme={s.mapTheme}
              activeZone={s.zone}
              visibleMarkers={lobbyPlayerMarkers}
              viewerId={viewerId}
              centerLabel={viewer?.name || 'Host'}
              editableZone={isHost}
              onZoneChange={(nextZone) => patchSettings({ zone: nextZone })}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </section>
      </main>

      {/* Sticky Bottom Start Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0A0B12]/92 backdrop-blur-md border-t border-white/[0.08] px-4 py-3 pb-safe">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block text-xs text-slate-400">
            {s.mode.toUpperCase()} · {s.roundLengthMin}m round ·{' '}
            {s.headStartMin > 0 ? `${s.headStartMin}m head start` : 'No head start'} ·{' '}
            {s.pingIntervalMin > 0 ? `${s.pingIntervalMin}m pings` : 'Pings off'} ·{' '}
            {s.zone.shape === 'circle' ? formatZoneSize(s.zone.diameterMeters, s.units) : s.zone.shape}
          </div>
          {isHost ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onStartRound}
              className="w-full sm:w-auto sm:min-w-[240px] min-h-[50px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#08090E] font-extrabold text-base inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Let&apos;s Go</span>
            </motion.button>
          ) : (
            <div className="w-full sm:w-auto text-center text-sm font-semibold text-slate-300 py-2">
              Waiting for host to start the round...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
