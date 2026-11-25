import React, { useState } from 'react';
import { ChevronDown, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import {
  DiscussionTimerSeconds,
  GameSettings,
  ImpostorCountMode,
} from '../types/game';
import { calculateBalancedImpostorCount } from '../game/engine';
import { playTapSound } from '../utils/audio';

interface SettingsDrawerProps {
  settings: GameSettings;
  playerCount: number;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
}

const TIMER_OPTIONS: Array<{ value: DiscussionTimerSeconds; label: string }> = [
  { value: 0, label: 'Off' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
];

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  settings,
  playerCount,
  onUpdateSettings,
}) => {
  const [expanded, setExpanded] = useState(false);

  const maxStandardImpostors = Math.max(1, playerCount - 1);
  const balancedCount = calculateBalancedImpostorCount(playerCount);

  const summaryParts: string[] = [];
  if (settings.impostorCountMode === 'standard') {
    const count = Math.min(maxStandardImpostors, settings.impostorCount);
    summaryParts.push(`${count} ${count === 1 ? 'Impostor' : 'Impostors'}`);
  } else if (settings.impostorCountMode === 'balanced') {
    summaryParts.push(`Balanced (${balancedCount})`);
  } else {
    summaryParts.push('Chaos');
  }
  summaryParts.push(settings.discussionTimer === 0 ? 'No Timer' : `${settings.discussionTimer / 60}m Timer`);
  if (settings.survivalMode) summaryParts.push('Survival');

  const ToggleRow: React.FC<{
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
  }> = ({ id, label, description, checked, onChange, disabled }) => (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-45' : ''}`}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-[#F4F4F8] cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-[#9898B0] leading-snug mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          playTapSound();
          onChange(!checked);
        }}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
          checked ? 'bg-cyan-400' : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <section
      aria-labelledby="settings-heading"
      className="rounded-3xl bg-[#14141F] border border-white/[0.08] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => {
          playTapSound();
          setExpanded((v) => !v);
        }}
        aria-expanded={expanded}
        className="flex w-full min-h-[60px] items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
            <h2 id="settings-heading" className="font-display text-base font-bold text-[#F4F4F8]">
              Game Settings
            </h2>
          </div>
          {!expanded && (
            <p className="mt-0.5 text-xs text-[#9898B0] truncate">
              {summaryParts.join(' · ')}
            </p>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-[#9898B0] transition-transform shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-white/[0.06]">
          {/* Impostor Count Mode */}
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D6D6E6]">Impostor Setup</span>
              <span className="text-xs text-[#9898B0] font-mono tabular-nums">
                {settings.impostorCountMode === 'balanced' && `Auto: ${balancedCount}`}
                {settings.impostorCountMode === 'chaos' && `0 to ${playerCount}`}
                {settings.impostorCountMode === 'standard' &&
                  `${Math.min(maxStandardImpostors, settings.impostorCount)} selected`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#09090E] p-1 border border-white/[0.06]">
              {(
                [
                  { id: 'standard', label: 'Standard' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'chaos', label: 'Chaos' },
                ] as Array<{ id: ImpostorCountMode; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onUpdateSettings({ impostorCountMode: opt.id });
                  }}
                  aria-pressed={settings.impostorCountMode === opt.id}
                  className={`min-h-[42px] rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    settings.impostorCountMode === opt.id
                      ? opt.id === 'chaos'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#1C1C2B] text-cyan-300 border border-cyan-400/30'
                      : 'text-[#9898B0] hover:text-[#F4F4F8]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {settings.impostorCountMode === 'standard' && (
              <div className="flex items-center justify-between rounded-2xl bg-[#09090E] border border-white/[0.06] px-4 py-2.5">
                <span className="text-sm font-medium text-[#D6D6E6]">Exact Impostors</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={settings.impostorCount <= 1}
                    onClick={() => {
                      playTapSound();
                      onUpdateSettings({
                        impostorCount: Math.max(1, settings.impostorCount - 1),
                      });
                    }}
                    aria-label="Decrease impostor count"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.15] disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center font-mono text-base font-bold text-rose-400 tabular-nums">
                    {Math.min(maxStandardImpostors, settings.impostorCount)}
                  </span>
                  <button
                    type="button"
                    disabled={settings.impostorCount >= maxStandardImpostors}
                    onClick={() => {
                      playTapSound();
                      onUpdateSettings({
                        impostorCount: Math.min(
                          maxStandardImpostors,
                          settings.impostorCount + 1
                        ),
                      });
                    }}
                    aria-label="Increase impostor count"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.15] disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {settings.impostorCountMode === 'balanced' && (
              <p className="text-xs text-[#9898B0]">
                Automatically assigns <strong className="text-cyan-300">{balancedCount}</strong>{' '}
                {balancedCount === 1 ? 'Impostor' : 'Impostors'} for {playerCount} players.
              </p>
            )}

            {settings.impostorCountMode === 'chaos' && (
              <div className="rounded-2xl bg-rose-500/[0.07] border border-rose-500/20 px-4 py-1">
                <ToggleRow
                  id="toggle-hide-chaos"
                  label="Hide Impostor Count"
                  description="Mystery count—could be 0 Impostors, several, or everyone!"
                  checked={settings.hideImpostorCountInChaos}
                  onChange={(v) => onUpdateSettings({ hideImpostorCountInChaos: v })}
                />
              </div>
            )}
          </div>

          {/* Discussion Timer */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-[#D6D6E6]">Discussion Timer</span>
            <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-[#09090E] p-1 border border-white/[0.06]">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onUpdateSettings({ discussionTimer: opt.value });
                  }}
                  aria-pressed={settings.discussionTimer === opt.value}
                  className={`min-h-[42px] rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    settings.discussionTimer === opt.value
                      ? 'bg-[#1C1C2B] text-cyan-300 border border-cyan-400/30'
                      : 'text-[#9898B0] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gameplay Toggles */}
          <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {settings.mode === 'word' && (
              <ToggleRow
                id="toggle-impostor-hints"
                label="Impostor Hints"
                description="Gives each Impostor a subtle contextual clue word."
                checked={settings.impostorHints}
                onChange={(v) => onUpdateSettings({ impostorHints: v })}
              />
            )}

            <ToggleRow
              id="toggle-impostor-team"
              label="Impostor Team Mode"
              description="When 2+ Impostors play, reveal teammates on their role card."
              checked={settings.impostorTeamMode}
              onChange={(v) => onUpdateSettings({ impostorTeamMode: v })}
            />

            <ToggleRow
              id="toggle-prevent-first"
              label="Prevent Impostor Going First"
              description="Always picks a Civilian as the starting speaker."
              checked={settings.preventImpostorFirst}
              onChange={(v) => onUpdateSettings({ preventImpostorFirst: v })}
            />

            <ToggleRow
              id="toggle-survival-mode"
              label="Survival Mode"
              description="Keep debating if an innocent Civilian is voted out until Impostors are caught or outnumber Civilians."
              checked={settings.survivalMode}
              onChange={(v) => onUpdateSettings({ survivalMode: v })}
            />

            <ToggleRow
              id="toggle-scoreboard"
              label="Track Scoreboard"
              description="Keep running points across rounds with one-tap reset."
              checked={settings.scoreboardEnabled}
              onChange={(v) => onUpdateSettings({ scoreboardEnabled: v })}
            />
          </div>
        </div>
      )}
    </section>
  );
};
