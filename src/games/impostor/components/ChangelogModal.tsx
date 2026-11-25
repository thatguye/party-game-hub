import React from 'react';
import { Clock, History, X } from 'lucide-react';
import { CHANGELOG_ENTRIES } from '../data/changelog';
import { playTapSound } from '../utils/audio';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-[#14141F] border border-white/10 shadow-2xl overflow-hidden">
        {/* Grab handle on mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2 id="changelog-title" className="font-display text-xl font-bold text-[#F4F4F8]">
              Changelog
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            aria-label="Close Changelog"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Release Notes */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {CHANGELOG_ENTRIES.map((entry, idx) => (
            <article
              key={entry.version}
              className={`rounded-2xl border p-4 space-y-2.5 ${
                idx === 0
                  ? 'bg-[#0E1820] border-cyan-400/35'
                  : 'bg-[#09090E] border-white/[0.07]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      idx === 0 ? 'text-cyan-300' : 'text-[#9898B0]'
                    }`}
                  >
                    {entry.version}
                  </span>
                  {idx === 0 && (
                    <span className="text-[11px] font-semibold text-cyan-400">· Latest</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#9898B0] tabular-nums">
                  <Clock className="h-3 w-3 text-[#75758E]" aria-hidden="true" />
                  <span>
                    {entry.date} · {entry.time}
                  </span>
                </div>
              </div>

              <h3 className="font-display text-sm font-bold text-[#F4F4F8]">
                {entry.title}
              </h3>

              <ul className="space-y-1.5 text-xs text-[#B8B8CE] leading-relaxed">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-cyan-400 shrink-0" aria-hidden="true">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] pb-safe bg-[#14141F]">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-full min-h-[48px] rounded-2xl bg-cyan-400 font-display text-sm font-bold text-[#061318] hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
