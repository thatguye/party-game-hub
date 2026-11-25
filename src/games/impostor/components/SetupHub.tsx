import React, { useState } from 'react';
import {
  Check,
  Database,
  Globe,
  HelpCircle,
  Loader2,
  LogIn,
  MessageCircleQuestion,
  Play,
  Plus,
  Smartphone,
  Sparkles,
  Type,
  WifiOff,
  X,
} from 'lucide-react';
import {
  CategoryDeck,
  GameMode,
  GameSettings,
  OnlineProfile,
  Player,
  PlayerGroup,
  UsedHistory,
} from '../types/game';
import { PlayerManager } from './PlayerManager';
import { CategoryBrowser } from './CategoryBrowser';
import { SettingsDrawer } from './SettingsDrawer';
import { PLAYER_AVATAR_COLORS, PLAYER_AVATAR_EMOJIS } from '../data/gameData';
import { extractSingleIcon } from '../game/engine';
import { normalizeRoomCode } from '../game/online';
import { playTapSound } from '../utils/audio';

interface SetupHubProps {
  players: Player[];
  groups: PlayerGroup[];
  decks: CategoryDeck[];
  selectedDeckIds: string[];
  settings: GameSettings;
  usedHistory: UsedHistory;
  canStartError: string | null;
  playStyle: 'pass_and_play' | 'online';
  onlineActionTab: 'host' | 'join';
  onlineProfile: OnlineProfile;
  joinCodeDraft: string;
  onlineError: string | null;
  onlineLoading: boolean;
  isOnline: boolean;
  supabaseSource: 'env' | 'default' | 'local' | 'none';
  onChangePlayStyle: (style: 'pass_and_play' | 'online') => void;
  onChangeOnlineActionTab: (tab: 'host' | 'join') => void;
  onChangeOnlineProfile: (profile: OnlineProfile) => void;
  onChangeJoinCodeDraft: (code: string) => void;
  onHostOnlineRoom: () => void;
  onJoinOnlineRoom: () => void;
  onOpenSupabaseConfig: () => void;
  onChangePlayers: (players: Player[]) => void;
  onSaveGroup: (name: string) => void;
  onLoadGroup: (group: PlayerGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onToggleDeck: (deckId: string) => void;
  onSelectAllDecks: () => void;
  onDeselectAllDecks: () => void;
  onResetHistory: () => void;
  onCreateCustomDeck: () => void;
  onEditCustomDeck: (deck: CategoryDeck) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
}

export const SetupHub: React.FC<SetupHubProps> = ({
  players,
  groups,
  decks,
  selectedDeckIds,
  settings,
  usedHistory,
  canStartError,
  playStyle,
  onlineActionTab,
  onlineProfile,
  joinCodeDraft,
  onlineError,
  onlineLoading,
  isOnline,
  supabaseSource,
  onChangePlayStyle,
  onChangeOnlineActionTab,
  onChangeOnlineProfile,
  onChangeJoinCodeDraft,
  onHostOnlineRoom,
  onJoinOnlineRoom,
  onOpenSupabaseConfig,
  onChangePlayers,
  onSaveGroup,
  onLoadGroup,
  onDeleteGroup,
  onToggleDeck,
  onSelectAllDecks,
  onDeselectAllDecks,
  onResetHistory,
  onCreateCustomDeck,
  onEditCustomDeck,
  onUpdateSettings,
  onStartGame,
  onOpenHowToPlay,
}) => {
  const [editingOnlineAvatar, setEditingOnlineAvatar] = useState(false);
  const [customIconDraft, setCustomIconDraft] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleModeSwitch = (mode: GameMode) => {
    if (settings.mode === mode) return;
    playTapSound();
    onUpdateSettings({ mode });
  };

  const applyOnlineCustomIcon = (e: React.FormEvent) => {
    e.preventDefault();
    const icon = extractSingleIcon(customIconDraft);
    if (!icon) return;
    playTapSound();
    onChangeOnlineProfile({ ...onlineProfile, emoji: icon });
    setCustomIconDraft('');
    setShowCustomInput(false);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5 pb-12 pb-safe">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Hero, Play Mode Switcher, Players / Online Host-Join, Settings */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hero Mode Card & Primary Actions */}
          <section className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-4">
            <div className="space-y-1">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F4F4F8]">
                Pass, Bluff & Catch the Liar
              </h1>
              <p className="text-sm text-[#9898B0]">
                {playStyle === 'online'
                  ? 'Play live on separate phones over Discord, FaceTime, or across the room.'
                  : settings.mode === 'word'
                  ? 'Everyone sees the secret word except the Impostor. Give clues and vote them out.'
                  : 'Everyone secretly types their answer to a prompt—while the Impostor answers a sneaky decoy.'}
              </p>
            </div>

            {/* Pass-and-Play vs Online Multiplayer Switcher */}
            <div
              role="tablist"
              aria-label="Play Format"
              className="grid grid-cols-2 gap-2 rounded-2xl bg-[#09090E] p-1.5 border border-white/[0.06]"
            >
              <button
                type="button"
                role="tab"
                data-testid="format-pass-and-play"
                aria-selected={playStyle === 'pass_and_play'}
                onClick={() => {
                  playTapSound();
                  onChangePlayStyle('pass_and_play');
                }}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  playStyle === 'pass_and_play'
                    ? 'bg-[#1C1C2B] text-white border border-white/20 shadow-sm'
                    : 'text-[#9898B0] hover:text-[#F4F4F8]'
                }`}
              >
                <Smartphone className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>Pass & Play</span>
              </button>
              <button
                type="button"
                role="tab"
                data-testid="format-online"
                aria-selected={playStyle === 'online'}
                onClick={() => {
                  playTapSound();
                  onChangePlayStyle('online');
                }}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  playStyle === 'online'
                    ? 'bg-[#1C1C2B] text-cyan-300 border border-cyan-400/35 shadow-sm'
                    : 'text-[#9898B0] hover:text-[#F4F4F8]'
                }`}
              >
                <Globe className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>Online Room</span>
              </button>
            </div>

            {playStyle === 'pass_and_play' ? (
              <>
                {/* Word / Question Mode Switcher */}
                <div
                  role="tablist"
                  aria-label="Game Mode"
                  className="grid grid-cols-2 gap-2 rounded-2xl bg-[#09090E] p-1.5 border border-white/[0.06]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={settings.mode === 'word'}
                    onClick={() => handleModeSwitch('word')}
                    className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                      settings.mode === 'word'
                        ? 'bg-[#1C1C2B] text-cyan-300 border border-cyan-400/35 shadow-sm'
                        : 'text-[#9898B0] hover:text-[#F4F4F8]'
                    }`}
                  >
                    <Type className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Word Game</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={settings.mode === 'question'}
                    onClick={() => handleModeSwitch('question')}
                    className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                      settings.mode === 'question'
                        ? 'bg-[#1C1C2B] text-rose-300 border border-rose-400/35 shadow-sm'
                        : 'text-[#9898B0] hover:text-[#F4F4F8]'
                    }`}
                  >
                    <MessageCircleQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Question Game</span>
                  </button>
                </div>

                {/* Primary Play Button & How to Play */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!!canStartError}
                    onClick={onStartGame}
                    className="flex w-full min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                    <span>Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onOpenHowToPlay();
                    }}
                    className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.09] font-display text-sm font-semibold text-[#D6D6E6] hover:bg-white/[0.1] hover:text-white active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <HelpCircle className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    <span>How to Play</span>
                  </button>

                  {canStartError && (
                    <p role="alert" className="text-center text-xs font-medium text-rose-400 pt-0.5">
                      {canStartError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* ONLINE MULTIPLAYER (HOST / JOIN ROOM) */
              <div className="space-y-4 pt-1">
                {/* Host vs Join Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="online-tab-host"
                    onClick={() => {
                      playTapSound();
                      onChangeOnlineActionTab('host');
                    }}
                    className={`min-h-[42px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      onlineActionTab === 'host'
                        ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300'
                        : 'bg-[#09090E] border-white/[0.07] text-[#9898B0] hover:text-white'
                    }`}
                  >
                    Host Room
                  </button>
                  <button
                    type="button"
                    data-testid="online-tab-join"
                    onClick={() => {
                      playTapSound();
                      onChangeOnlineActionTab('join');
                    }}
                    className={`min-h-[42px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      onlineActionTab === 'join'
                        ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300'
                        : 'bg-[#09090E] border-white/[0.07] text-[#9898B0] hover:text-white'
                    }`}
                  >
                    Join Room
                  </button>
                </div>

                {/* Your Online Profile (Name + Icon) */}
                <div className="rounded-2xl bg-[#09090E] border border-white/[0.08] p-3.5 space-y-2.5">
                  <label
                    htmlFor="online-player-name"
                    className="block text-[11px] font-semibold text-[#9898B0]"
                  >
                    Your Name & Icon
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setEditingOnlineAvatar((v) => !v);
                      }}
                      aria-label="Customize your online icon"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-[#F4F4F8] cursor-pointer"
                      style={{
                        backgroundColor: `${onlineProfile.color}22`,
                        border: `1px solid ${onlineProfile.color}66`,
                      }}
                    >
                      {onlineProfile.emoji}
                    </button>
                    <input
                      id="online-player-name"
                      type="text"
                      value={onlineProfile.name}
                      onChange={(e) =>
                        onChangeOnlineProfile({ ...onlineProfile, name: e.target.value })
                      }
                      placeholder="Enter your name..."
                      maxLength={22}
                      className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-[#14141F] border border-white/10 px-3.5 text-sm font-semibold text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {editingOnlineAvatar && (
                    <div className="pt-2 space-y-2 border-t border-white/[0.06]">
                      <div className="flex flex-wrap gap-1.5">
                        {PLAYER_AVATAR_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              playTapSound();
                              onChangeOnlineProfile({ ...onlineProfile, color });
                            }}
                            aria-label={`Set online color ${color}`}
                            className={`h-6 w-6 rounded-full cursor-pointer ${
                              onlineProfile.color === color
                                ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#09090E]'
                                : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {PLAYER_AVATAR_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              playTapSound();
                              onChangeOnlineProfile({ ...onlineProfile, emoji: em });
                              setShowCustomInput(false);
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm cursor-pointer ${
                              onlineProfile.emoji === em
                                ? 'bg-white/15 ring-1 ring-cyan-400'
                                : 'hover:bg-white/[0.07]'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setShowCustomInput((v) => !v);
                          }}
                          aria-label="Add custom emoji, letter, or symbol"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-cyan-400/45 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      {showCustomInput && (
                        <form onSubmit={applyOnlineCustomIcon} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customIconDraft}
                            onChange={(e) => setCustomIconDraft(e.target.value)}
                            placeholder="Emoji, letter, or symbol..."
                            className="flex-1 min-w-0 min-h-[36px] rounded-xl bg-[#14141F] border border-cyan-400/40 px-3 text-xs text-[#F4F4F8] focus:border-cyan-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!extractSingleIcon(customIconDraft)}
                            className="flex min-h-[36px] items-center gap-1 rounded-xl bg-cyan-400 px-3 text-xs font-bold text-[#061318] disabled:opacity-40 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Set</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomInput(false)}
                            aria-label="Close custom icon"
                            className="flex h-9 w-9 items-center justify-center text-[#9898B0] hover:text-white cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {!isOnline && (
                  <div
                    role="status"
                    data-testid="impostor-offline-notice"
                    className="flex items-center gap-2 rounded-xl bg-amber-500/14 border border-amber-400/35 px-3 py-2 text-xs font-semibold text-amber-200"
                  >
                    <WifiOff className="h-3.5 w-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                    <span>Offline Mode — Online rooms disabled. Switch to Pass &amp; Play to play offline.</span>
                  </div>
                )}

                {onlineActionTab === 'host' ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      data-testid="host-room-btn"
                      disabled={onlineLoading || !isOnline}
                      onClick={() => {
                        playTapSound();
                        onHostOnlineRoom();
                      }}
                      className="flex w-full min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {onlineLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : !isOnline ? (
                        <WifiOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span>
                        {onlineLoading
                          ? 'Creating Room...'
                          : !isOnline
                          ? 'Offline — Online Hosting Paused'
                          : 'Generate Room Code & Host'}
                      </span>
                    </button>
                    <p className="text-[11px] text-[#9898B0] text-center">
                      Creates a 4-letter code (e.g., K9XP) for your friends to join live.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isOnline) return;
                      playTapSound();
                      onJoinOnlineRoom();
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label
                        htmlFor="join-room-code"
                        className="block text-[11px] font-semibold text-[#9898B0] mb-1.5"
                      >
                        4-Letter Room Code
                      </label>
                      <input
                        id="join-room-code"
                        data-testid="join-room-code-input"
                        type="text"
                        value={joinCodeDraft}
                        onChange={(e) => onChangeJoinCodeDraft(normalizeRoomCode(e.target.value))}
                        placeholder="K9XP"
                        maxLength={4}
                        autoCapitalize="characters"
                        autoComplete="off"
                        className="w-full min-h-[54px] rounded-2xl bg-[#09090E] border border-white/15 px-4 text-center font-mono text-2xl font-extrabold tracking-[0.35em] text-white placeholder:text-[#55556E] focus:border-cyan-400 focus:outline-none uppercase"
                      />
                    </div>

                    <button
                      type="submit"
                      data-testid="join-room-btn"
                      disabled={onlineLoading || !isOnline || normalizeRoomCode(joinCodeDraft).length < 4}
                      className="flex w-full min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-base font-extrabold text-[#061318] shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:bg-white/[0.08] disabled:text-[#666680] disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      {onlineLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : !isOnline ? (
                        <WifiOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <LogIn className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span>
                        {onlineLoading
                          ? 'Joining Room...'
                          : !isOnline
                          ? 'Offline — Joining Paused'
                          : 'Join Room'}
                      </span>
                    </button>
                  </form>
                )}

                {onlineError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-rose-500/12 border border-rose-500/35 px-3.5 py-2.5 text-center text-xs font-medium text-rose-300"
                  >
                    {onlineError}
                  </p>
                )}

                {/* Supabase Connection Status */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#9898B0]">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        supabaseSource === 'none' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    {supabaseSource === 'env' || supabaseSource === 'default'
                      ? 'Supabase Ready'
                      : supabaseSource === 'local'
                      ? 'Custom Supabase Saved'
                      : 'Supabase Setup Needed'}
                  </span>
                  {supabaseSource !== 'env' && supabaseSource !== 'default' && (
                    <button
                      type="button"
                      data-testid="open-supabase-config-btn"
                      onClick={() => {
                        playTapSound();
                        onOpenSupabaseConfig();
                      }}
                      className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-white/[0.12] cursor-pointer"
                    >
                      <Database className="h-3 w-3" aria-hidden="true" />
                      <span>{supabaseSource === 'local' ? 'Edit Keys' : 'Paste Keys'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {playStyle === 'pass_and_play' && (
            <PlayerManager
              players={players}
              groups={groups}
              onChangePlayers={onChangePlayers}
              onSaveGroup={onSaveGroup}
              onLoadGroup={onLoadGroup}
              onDeleteGroup={onDeleteGroup}
            />
          )}

          {(playStyle === 'pass_and_play' || onlineActionTab === 'host') && (
            <SettingsDrawer
              settings={settings}
              playerCount={players.length}
              onUpdateSettings={onUpdateSettings}
            />
          )}
        </div>

        {/* Right Column: 22+ Category Decks & Custom Deck Studio */}
        <div className="lg:col-span-7">
          <CategoryBrowser
            decks={decks}
            selectedDeckIds={selectedDeckIds}
            mode={settings.mode}
            usedHistory={usedHistory}
            onToggleDeck={onToggleDeck}
            onSelectAll={onSelectAllDecks}
            onDeselectAll={onDeselectAllDecks}
            onResetHistory={onResetHistory}
            onCreateCustomDeck={onCreateCustomDeck}
            onEditCustomDeck={onEditCustomDeck}
          />
        </div>
      </div>
    </main>
  );
};
