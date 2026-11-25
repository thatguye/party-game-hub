import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Check,
  FolderOpen,
  GripVertical,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Player, PlayerGroup } from '../types/game';
import { PLAYER_AVATAR_COLORS, PLAYER_AVATAR_EMOJIS } from '../data/gameData';
import { extractSingleIcon } from '../game/engine';
import { playTapSound } from '../utils/audio';

interface PlayerManagerProps {
  players: Player[];
  groups: PlayerGroup[];
  onChangePlayers: (players: Player[]) => void;
  onSaveGroup: (name: string) => void;
  onLoadGroup: (group: PlayerGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const PlayerManager: React.FC<PlayerManagerProps> = ({
  players,
  groups,
  onChangePlayers,
  onSaveGroup,
  onLoadGroup,
  onDeleteGroup,
}) => {
  const [newName, setNewName] = useState('');
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [customIconPlayerId, setCustomIconPlayerId] = useState<string | null>(null);
  const [customIconDraft, setCustomIconDraft] = useState('');
  const customIconInputRef = useRef<HTMLInputElement | null>(null);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [groupFeedback, setGroupFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (customIconPlayerId) {
      customIconInputRef.current?.focus();
    }
  }, [customIconPlayerId]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    playTapSound();

    const nextEmoji =
      PLAYER_AVATAR_EMOJIS[players.length % PLAYER_AVATAR_EMOJIS.length];
    const nextColor =
      PLAYER_AVATAR_COLORS[players.length % PLAYER_AVATAR_COLORS.length];

    const player: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      emoji: nextEmoji,
      color: nextColor,
    };
    onChangePlayers([...players, player]);
    setNewName('');
  };

  const handleRename = (id: string, name: string) => {
    onChangePlayers(
      players.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const handleUpdateAvatar = (id: string, patch: Partial<Pick<Player, 'emoji' | 'color'>>) => {
    playTapSound();
    onChangePlayers(
      players.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleApplyCustomIcon = (playerId: string, e: React.FormEvent) => {
    e.preventDefault();
    const icon = extractSingleIcon(customIconDraft);
    if (!icon) return;
    handleUpdateAvatar(playerId, { emoji: icon });
    setCustomIconDraft('');
    setCustomIconPlayerId(null);
  };

  const handleRemove = (id: string) => {
    if (players.length <= 3) return;
    playTapSound();
    if (editingAvatarId === id) {
      setEditingAvatarId(null);
      setCustomIconPlayerId(null);
      setCustomIconDraft('');
    }
    onChangePlayers(players.filter((p) => p.id !== id));
  };

  const movePlayer = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= players.length || fromIndex === toIndex) return;
    playTapSound();
    const copy = [...players];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    onChangePlayers(copy);
  };

  const handleSaveCurrentGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupNameInput.trim();
    if (!trimmed) return;
    playTapSound();
    onSaveGroup(trimmed);
    setGroupNameInput('');
    setGroupFeedback(`Saved "${trimmed}"`);
    setTimeout(() => setGroupFeedback(null), 2200);
  };

  return (
    <section
      aria-labelledby="players-heading"
      className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Users className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <h2 id="players-heading" className="font-display text-base font-bold text-[#F4F4F8]">
            Players
          </h2>
          <span className="text-xs text-[#9898B0] font-mono tabular-nums">
            · {players.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setShowGroupsPanel((v) => !v);
          }}
          aria-expanded={showGroupsPanel}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-xs font-semibold text-[#D6D6E6] hover:bg-white/[0.1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderOpen className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>Groups {groups.length > 0 ? `(${groups.length})` : ''}</span>
        </button>
      </div>

      {/* Saved Player Groups Drawer */}
      {showGroupsPanel && (
        <div className="rounded-2xl bg-[#09090E] border border-white/[0.08] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F4F4F8]">Saved Player Groups</span>
            <button
              type="button"
              onClick={() => setShowGroupsPanel(false)}
              aria-label="Close Saved Groups"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9898B0] hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSaveCurrentGroup} className="flex gap-2">
            <input
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Save current roster as..."
              aria-label="New group name"
              maxLength={28}
              className="flex-1 min-h-[42px] rounded-xl bg-[#14141F] border border-white/10 px-3 text-xs text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!groupNameInput.trim()}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 text-xs font-bold text-[#061318] hover:bg-cyan-300 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save</span>
            </button>
          </form>

          {groupFeedback && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{groupFeedback}</span>
            </p>
          )}

          {groups.length === 0 ? (
            <p className="text-xs text-[#75758E] py-1">
              Save your regular friend or family crew to load them in one tap next time.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-44 overflow-y-auto">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#14141F] px-3 py-2 border border-white/[0.06]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onLoadGroup(group);
                      setShowGroupsPanel(false);
                    }}
                    className="flex-1 text-left min-w-0 py-0.5 cursor-pointer group"
                  >
                    <p className="text-xs font-semibold text-[#F4F4F8] group-hover:text-cyan-300 truncate">
                      {group.name}
                    </p>
                    <p className="text-[11px] text-[#9898B0] truncate">
                      {group.players.length} players · {group.players.map((p) => p.name).join(', ')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onDeleteGroup(group.id);
                    }}
                    aria-label={`Delete group ${group.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#9898B0] hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Quick Add Player Form */}
      <form onSubmit={handleAddPlayer} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add player name..."
          aria-label="Add player name"
          maxLength={22}
          className="flex-1 min-h-[46px] rounded-2xl bg-[#09090E] border border-white/10 px-4 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          aria-label="Add Player"
          className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-white/[0.1] px-4 text-sm font-semibold text-[#F4F4F8] hover:bg-white/[0.16] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span>Add</span>
        </button>
      </form>

      {/* Player List */}
      <ul className="divide-y divide-white/[0.06] max-h-[340px] overflow-y-auto -mx-1 px-1">
        {players.map((player, index) => {
          const isEditingAvatar = editingAvatarId === player.id;
          return (
            <li
              key={player.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) {
                  movePlayer(dragIndex, index);
                  setDragIndex(null);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className="py-2 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className="hidden sm:flex h-8 w-5 items-center justify-center text-[#5A5A72] cursor-grab active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* Avatar Customization Button */}
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    const nextId = isEditingAvatar ? null : player.id;
                    setEditingAvatarId(nextId);
                    setCustomIconPlayerId(null);
                    setCustomIconDraft('');
                  }}
                  aria-label={`Customize avatar for ${player.name}`}
                  aria-expanded={isEditingAvatar}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold leading-none text-[#F4F4F8] transition-transform active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: `${player.color}22`,
                    border: `1px solid ${isEditingAvatar ? player.color : `${player.color}55`}`,
                  }}
                >
                  {player.emoji}
                </button>

                {/* Editable Player Name */}
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handleRename(player.id, e.target.value)}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      handleRename(player.id, `Player ${index + 1}`);
                    }
                  }}
                  aria-label={`Player ${index + 1} name`}
                  maxLength={22}
                  className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-transparent px-2 text-sm font-semibold text-[#F4F4F8] hover:bg-white/[0.04] focus:bg-[#09090E] focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
                />

                {/* Reorder Up/Down & Delete */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePlayer(index, index - 1)}
                    aria-label={`Move ${player.name} up`}
                    className="flex h-9 w-8 items-center justify-center rounded-lg text-[#7C7C96] hover:bg-white/[0.06] hover:text-white disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === players.length - 1}
                    onClick={() => movePlayer(index, index + 1)}
                    aria-label={`Move ${player.name} down`}
                    className="flex h-9 w-8 items-center justify-center rounded-lg text-[#7C7C96] hover:bg-white/[0.06] hover:text-white disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={players.length <= 3}
                    onClick={() => handleRemove(player.id)}
                    aria-label={`Remove ${player.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C7C96] hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-25 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Inline Avatar Emoji & Color Picker */}
              {isEditingAvatar && (
                <div className="mt-2 rounded-2xl bg-[#09090E] border border-white/[0.08] p-3 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {PLAYER_AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleUpdateAvatar(player.id, { color })}
                        aria-label={`Set color ${color}`}
                        className={`h-7 w-7 rounded-full transition-transform cursor-pointer ${
                          player.color === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#09090E]' : ''
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
                          handleUpdateAvatar(player.id, { emoji: em });
                          setCustomIconPlayerId(null);
                        }}
                        aria-label={`Set avatar ${em}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-base cursor-pointer ${
                          player.emoji === em
                            ? 'bg-white/15 ring-1 ring-cyan-400'
                            : 'hover:bg-white/[0.07]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}

                    {!PLAYER_AVATAR_EMOJIS.includes(player.emoji) && (
                      <button
                        type="button"
                        onClick={() => {
                          playTapSound();
                          setCustomIconPlayerId(player.id);
                          setCustomIconDraft(player.emoji);
                        }}
                        aria-label={`Current custom icon ${player.emoji}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-cyan-400 font-display text-base font-bold text-[#F4F4F8] cursor-pointer"
                      >
                        {player.emoji}
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="custom-icon-trigger"
                      onClick={() => {
                        playTapSound();
                        if (customIconPlayerId === player.id) {
                          setCustomIconPlayerId(null);
                          setCustomIconDraft('');
                        } else {
                          setCustomIconPlayerId(player.id);
                          setCustomIconDraft(
                            PLAYER_AVATAR_EMOJIS.includes(player.emoji) ? '' : player.emoji
                          );
                        }
                      }}
                      aria-label="Add custom emoji, letter, or symbol"
                      aria-expanded={customIconPlayerId === player.id}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-dashed transition-colors cursor-pointer ${
                        customIconPlayerId === player.id
                          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                          : 'border-cyan-400/45 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
                      }`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {customIconPlayerId === player.id && (
                    <form
                      onSubmit={(e) => handleApplyCustomIcon(player.id, e)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        ref={customIconInputRef}
                        type="text"
                        data-testid="custom-icon-input"
                        value={customIconDraft}
                        onChange={(e) => setCustomIconDraft(e.target.value)}
                        placeholder="Emoji, letter, or symbol..."
                        aria-label="Custom emoji, letter, or symbol"
                        className="flex-1 min-w-0 min-h-[40px] rounded-xl bg-[#14141F] border border-cyan-400/40 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        data-testid="custom-icon-apply"
                        disabled={!extractSingleIcon(customIconDraft)}
                        className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-cyan-400 px-3.5 text-xs font-bold text-[#061318] hover:bg-cyan-300 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Set</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomIconPlayerId(null);
                          setCustomIconDraft('');
                        }}
                        aria-label="Cancel custom icon"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
