import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Globe, Send, Users, Vibrate, Volume2 } from 'lucide-react';
import type { ChatScope, PlayerState, RoomState } from '../types/game';
import { filterVisibleChatMessages } from '../game/rules';
import { formatCountdown } from '../game/geo';

interface RadioViewProps {
  room: RoomState;
  viewer: PlayerState | undefined;
  nowMs: number;
  stealthHaptic: boolean;
  onToggleStealthHaptic: () => void;
  onBackToMap: () => void;
  onSendText: (scope: ChatScope, text: string) => void;
}

export const RadioView: React.FC<RadioViewProps> = ({
  room,
  viewer,
  nowMs,
  stealthHaptic,
  onToggleStealthHaptic,
  onBackToMap,
  onSendText,
}) => {
  const [activeScope, setActiveScope] = useState<ChatScope>('team');
  const [draft, setDraft] = useState('');

  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const visibleAll = filterVisibleChatMessages(room.chatMessages, viewer, room.phase);
  const scopedMessages = visibleAll.filter((m) => m.scope === activeScope);
  const teamCount = visibleAll.filter((m) => m.scope === 'team').length;
  const globalCount = visibleAll.filter((m) => m.scope === 'global').length;

  const teamMembersOnline = room.players.filter(
    (p) => (room.phase === 'lobby' ? true : p.role === viewer?.role) && p.connected
  ).length;
  const totalOnline = room.players.filter((p) => p.connected).length;

  const teamChannelLabel =
    room.phase === 'lobby'
      ? 'Squad'
      : viewer?.role === 'hunter'
      ? 'Hunters'
      : viewer?.role === 'runner'
      ? 'Runners'
      : 'Spectators';

  const quickReplies =
    activeScope === 'global'
      ? ['Good luck!', 'Anyone nearby?', 'Nice move!', 'Watch the zone']
      : viewer?.role === 'hunter'
      ? ['Spotted one!', 'Cover the flank', 'Where are you?', 'Closing in']
      : ['Coast is clear', 'Moving now', 'Hunter nearby!', 'Stay low'];

  const remainingMs =
    room.phase === 'head_start'
      ? Math.max(0, (room.headStartEndsAt ?? nowMs) - nowMs)
      : Math.max(0, (room.roundEndsAt ?? nowMs) - nowMs);

  const headStartLabel =
    room.settings.headStartMin >= 1
      ? `${Math.round(room.settings.headStartMin)} min`
      : `${Math.round(room.settings.headStartMin * 60)} sec`;

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [scopedMessages.length, activeScope]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendText(activeScope, trimmed);
    setDraft('');
  };

  const formatRelativeTime = (ts: number) => {
    const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
    if (diffSec < 45) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <motion.div
      data-testid="radio-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-30 bg-[#08090E] text-[#F4F5F9] flex flex-col pt-safe"
    >
      {/* Top Radio Bar */}
      <header className="px-4 pt-2 pb-3 border-b border-white/[0.08] bg-[#0B0E17]">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onBackToMap}
                aria-label="Back to Map"
                className="min-h-[44px] min-w-[36px] -ml-2 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-extrabold tracking-tight leading-none text-white">
                  Radio
                </h1>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {activeScope === 'team'
                    ? `${teamChannelLabel} channel · ${teamMembersOnline} on air`
                    : `Global channel · ${totalOnline} on air`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleStealthHaptic}
                aria-label={
                  stealthHaptic ? 'Unmute radio alerts' : 'Switch to stealth haptic alerts'
                }
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  stealthHaptic
                    ? 'bg-emerald-500 border-emerald-300 text-[#08090E]'
                    : 'bg-[#141826] border-white/[0.08] text-slate-200 hover:bg-[#1C2235]'
                }`}
              >
                {stealthHaptic ? <Vibrate className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="px-3.5 h-10 rounded-full bg-[#141826] border border-emerald-500/25 text-sm font-bold text-emerald-300 flex items-center justify-center font-mono tabular-nums">
                {formatCountdown(remainingMs)}
              </div>
            </div>
          </div>

          {/* Team vs Global Channel Switcher */}
          <div
            role="tablist"
            aria-label="Radio channels"
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#070910] border border-white/[0.07]"
          >
            {(
              [
                { id: 'team', label: `${teamChannelLabel} Team`, count: teamCount, Icon: Users },
                { id: 'global', label: 'Global', count: globalCount, Icon: Globe },
              ] as const
            ).map((tab) => {
              const active = activeScope === tab.id;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveScope(tab.id)}
                  className={`relative min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    active
                      ? tab.id === 'team'
                        ? 'text-[#08090E]'
                        : 'text-cyan-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="radio-channel-tab"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className={`absolute inset-0 rounded-xl ${
                        tab.id === 'team'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-500/20 border border-cyan-400/40'
                      }`}
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                  <span className="relative z-10">{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`relative z-10 font-mono text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                        active
                          ? tab.id === 'team'
                            ? 'bg-black/20 text-[#08090E]'
                            : 'bg-cyan-400/20 text-cyan-200'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Scrollable Radio Messages Feed */}
      <div data-testid="chat-feed" className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto min-h-full flex flex-col justify-end space-y-3.5">
          {/* System Round Event Notice */}
          <div className="text-center space-y-2 py-2">
            <p className="text-[11px] text-slate-400">
              {activeScope === 'team'
                ? `Private ${teamChannelLabel.toLowerCase()} frequency · Only teammates receive these messages.`
                : 'Open frequency · Every player in the room receives these messages.'}
            </p>
            {room.settings.headStartMin > 0 && (
              <p className="text-xs font-semibold text-emerald-400">
                {room.phase === 'head_start'
                  ? `Runners have a ${headStartLabel} head start. Hold tight.`
                  : `Head start complete · Hunt is live.`}
              </p>
            )}
          </div>

          {scopedMessages.map((msg) => {
            const isMine = msg.senderId === viewer?.id;
            const senderDisplay = isMine ? 'You' : msg.senderName.replace(' (AI)', '');

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[11px] font-medium text-slate-400 mb-1 px-1">
                  {senderDisplay} · {formatRelativeTime(msg.ts)}
                </div>

                <div
                  className={`max-w-[82%] rounded-[20px] px-4 py-3 ${
                    isMine
                      ? activeScope === 'team'
                        ? 'bg-emerald-500/18 border border-emerald-400/40 text-white rounded-br-md'
                        : 'bg-cyan-500/18 border border-cyan-400/40 text-white rounded-br-md'
                      : 'bg-[#141826] border border-white/[0.08] text-slate-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-[15px] leading-snug break-words">
                    {msg.text ?? 'Radio transmission'}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      </div>

      {/* Quick Replies + Text Composer (guaranteed safe-area clearance above floating Map/Radio dock) */}
      <div
        className="px-4 pt-2 bg-[#0B0E17] border-t border-white/[0.07]"
        style={{
          paddingBottom: 'calc(80px + max(env(safe-area-inset-bottom, 0px), 12px))',
        }}
      >
        <div className="max-w-lg mx-auto space-y-2.5">
          {/* Quick-Reply Tactical Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {quickReplies.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => onSendText(activeScope, phrase)}
                className="shrink-0 min-h-[36px] px-3.5 rounded-full bg-[#121624] hover:bg-[#1A2135] border border-emerald-500/20 text-xs font-semibold text-emerald-100 whitespace-nowrap transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Text-Only Radio Composer */}
          <form onSubmit={handleSubmitText} className="flex items-center gap-2.5">
            <input
              data-testid="chat-text-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={240}
              placeholder={
                activeScope === 'team' ? 'Message your team' : 'Message everyone on global'
              }
              className="flex-1 min-w-0 min-h-[46px] px-4 rounded-full bg-[#121624] border border-white/[0.1] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              data-testid="chat-send-btn"
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send radio message"
              className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#08090E] flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
