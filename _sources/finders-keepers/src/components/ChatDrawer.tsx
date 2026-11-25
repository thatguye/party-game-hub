import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Globe, Send, Users, X } from 'lucide-react';
import type { ChatMessage, ChatScope, PlayerState, RoundPhase } from '../types/game';
import { filterVisibleChatMessages, getCallsignInitial } from '../game/rules';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  viewer: PlayerState | undefined;
  phase: RoundPhase;
  onSendText: (scope: ChatScope, text: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  viewer,
  phase,
  onSendText,
}) => {
  const [activeScope, setActiveScope] = useState<ChatScope>('team');
  const [draft, setDraft] = useState('');

  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const visibleAll = filterVisibleChatMessages(messages, viewer, phase);
  const scopedMessages = visibleAll.filter((m) => m.scope === activeScope);
  const teamCount = visibleAll.filter((m) => m.scope === 'team').length;
  const globalCount = visibleAll.filter((m) => m.scope === 'global').length;

  const teamLabel =
    phase === 'lobby'
      ? 'Squad Team'
      : viewer?.role === 'hunter'
      ? 'Hunters Team'
      : viewer?.role === 'runner'
      ? 'Runners Team'
      : 'Spectators';

  useEffect(() => {
    if (isOpen) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isOpen, scopedMessages.length, activeScope]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendText(activeScope, trimmed);
    setDraft('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Team and Global Radio"
        >
          <motion.div
            data-testid="chat-drawer"
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="w-full sm:max-w-md h-[78dvh] sm:h-[620px] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#0D1019] border-t sm:border border-emerald-500/20 shadow-2xl overflow-hidden"
          >
            {/* Header & Scope Switcher */}
            <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.08] bg-[#090B12] space-y-3">
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto sm:hidden" />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-white leading-tight">
                    Radio
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {activeScope === 'team'
                      ? `${teamLabel} channel · Private frequency`
                      : 'Global channel · Visible to every player in room'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close radio"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Team vs Global Switcher */}
              <div
                role="tablist"
                aria-label="Radio channels"
                className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#07080D] border border-white/[0.07]"
              >
                {(
                  [
                    { id: 'team', label: teamLabel, count: teamCount, Icon: Users },
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
                      className={`relative min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        active
                          ? tab.id === 'team'
                            ? 'text-[#08090E]'
                            : 'text-cyan-200'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="chat-scope-tab"
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
                          className={`relative z-10 font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
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

            {/* Messages Feed */}
            <div data-testid="chat-feed" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {scopedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3">
                    {activeScope === 'team' ? (
                      <Users className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Globe className="w-6 h-6 text-cyan-400" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {activeScope === 'team' ? `${teamLabel} Channel` : 'Global Room Radio'}
                  </div>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs">
                    {activeScope === 'team'
                      ? 'Coordinate routes with your squad — only your teammates receive messages here.'
                      : 'Send messages to everyone currently in the room.'}
                  </p>
                </div>
              ) : (
                scopedMessages.map((msg) => {
                  const isMine = msg.senderId === viewer?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-[#08090E] shrink-0"
                          style={{ backgroundColor: msg.senderColor }}
                        >
                          {getCallsignInitial(msg.senderName)}
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                          isMine
                            ? activeScope === 'global'
                              ? 'bg-cyan-500/20 border border-cyan-400/40 text-white rounded-br-md'
                              : 'bg-emerald-500/20 border border-emerald-400/40 text-white rounded-br-md'
                            : 'bg-[#141826] border border-white/[0.08] text-slate-100 rounded-bl-md'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-[11px] font-bold text-slate-300 truncate">
                            {isMine ? 'You' : msg.senderName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums">
                            {formatTime(msg.ts)}
                          </span>
                        </div>
                        <p className="text-sm leading-snug break-words">
                          {msg.text ?? 'Radio transmission'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={feedEndRef} />
            </div>

            {/* Text-Only Composer */}
            <div className="p-3 pb-safe border-t border-white/[0.08] bg-[#090B12]">
              <form onSubmit={handleSubmitText} className="flex items-center gap-2">
                <input
                  data-testid="chat-text-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={240}
                  placeholder={
                    activeScope === 'team'
                      ? `Message ${teamLabel}...`
                      : 'Message everyone in room...'
                  }
                  className="flex-1 min-w-0 min-h-[46px] px-4 rounded-full bg-[#131622] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  data-testid="chat-send-btn"
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="min-h-[46px] min-w-[46px] rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#08090E] flex items-center justify-center shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
