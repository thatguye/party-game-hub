import React, { useMemo, useState } from 'react';
import { Check, Layers, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react';
import { CategoryDeck, GameMode, UsedHistory } from '../types/game';
import { playTapSound } from '../utils/audio';

interface CategoryBrowserProps {
  decks: CategoryDeck[];
  selectedDeckIds: string[];
  mode: GameMode;
  usedHistory: UsedHistory;
  onToggleDeck: (deckId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onResetHistory: () => void;
  onCreateCustomDeck: () => void;
  onEditCustomDeck: (deck: CategoryDeck) => void;
}

export const CategoryBrowser: React.FC<CategoryBrowserProps> = ({
  decks,
  selectedDeckIds,
  mode,
  usedHistory,
  onToggleDeck,
  onSelectAll,
  onDeselectAll,
  onResetHistory,
  onCreateCustomDeck,
  onEditCustomDeck,
}) => {
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedDeckIds), [selectedDeckIds]);
  const usedSet = useMemo(
    () => new Set(mode === 'word' ? usedHistory.word : usedHistory.question),
    [mode, usedHistory]
  );

  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [decks, query]);

  const totalSelectedPrompts = useMemo(() => {
    return decks
      .filter((d) => selectedSet.has(d.id))
      .reduce((sum, d) => sum + (mode === 'word' ? d.words.length : d.questions.length), 0);
  }, [decks, selectedSet, mode]);

  const totalUsedInMode = mode === 'word' ? usedHistory.word.length : usedHistory.question.length;

  return (
    <section
      aria-labelledby="categories-heading"
      className="rounded-3xl bg-[#14141F] border border-white/[0.08] p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 id="categories-heading" className="font-display text-base font-bold text-[#F4F4F8]">
              Category Decks
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#9898B0] font-mono tabular-nums">
            {selectedDeckIds.length} of {decks.length} selected · {totalSelectedPrompts}{' '}
            {mode === 'word' ? 'words' : 'questions'} ready
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            onCreateCustomDeck();
          }}
          className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-cyan-400/15 border border-cyan-400/30 px-3.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Custom Deck</span>
        </button>
      </div>

      {/* Search & Bulk Select Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75758E]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 22+ decks..."
            aria-label="Search category decks"
            className="w-full min-h-[44px] rounded-2xl bg-[#09090E] border border-white/10 pl-10 pr-9 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[#9898B0] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onSelectAll();
            }}
            className="min-h-[44px] rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-[#D6D6E6] hover:bg-white/[0.12] transition-colors whitespace-nowrap cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onDeselectAll();
            }}
            className="min-h-[44px] rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-[#9898B0] hover:bg-white/[0.12] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            Deselect All
          </button>
          {totalUsedInMode > 0 && (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onResetHistory();
              }}
              aria-label="Reset played history"
              title={`Reset ${totalUsedInMode} played prompts`}
              className="flex min-h-[44px] items-center gap-1 rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-amber-300 hover:bg-amber-400/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Reset Used</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Grid */}
      {filteredDecks.length === 0 ? (
        <div className="rounded-2xl bg-[#09090E] border border-white/[0.06] p-8 text-center">
          <p className="text-sm font-semibold text-[#F4F4F8]">No matching decks</p>
          <p className="mt-1 text-xs text-[#9898B0]">
            Try another keyword or create your own custom deck.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[560px] lg:max-h-[680px] overflow-y-auto pr-0.5">
          {filteredDecks.map((deck) => {
            const isSelected = selectedSet.has(deck.id);
            const items = mode === 'word' ? deck.words : deck.questions;
            const totalCount = items.length;
            const usedCount = items.filter((item) => usedSet.has(item.id)).length;
            const remaining = Math.max(0, totalCount - usedCount);
            const unavailableForMode = totalCount === 0;

            return (
              <div
                key={deck.id}
                className={`relative flex items-stretch rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-[#1B1C2E] border-cyan-400/60'
                    : 'bg-[#0E0E17] border-white/[0.07] hover:border-white/[0.16]'
                } ${unavailableForMode ? 'opacity-50' : ''}`}
              >
                <button
                  type="button"
                  disabled={unavailableForMode}
                  onClick={() => {
                    playTapSound();
                    onToggleDeck(deck.id);
                  }}
                  aria-pressed={isSelected}
                  className="flex flex-1 items-start gap-3 p-3.5 text-left min-w-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl bg-white/[0.05]"
                    aria-hidden="true"
                  >
                    {deck.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#F4F4F8] truncate">
                        {deck.name}
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-cyan-400 border-cyan-400 text-[#061318]'
                            : 'border-white/20 bg-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#9898B0] font-mono tabular-nums">
                      <span>
                        {unavailableForMode
                          ? `No ${mode === 'word' ? 'words' : 'questions'}`
                          : `${remaining}/${totalCount} fresh`}
                      </span>
                      {deck.isCustom && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-cyan-300 font-medium">Custom</span>
                        </>
                      )}
                      {deck.isSpicy && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-rose-400 font-medium">18+</span>
                        </>
                      )}
                      {deck.isFamilyFriendly && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-emerald-400 font-medium">All Ages</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                {deck.isCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onEditCustomDeck(deck);
                    }}
                    aria-label={`Edit custom deck ${deck.name}`}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-white/[0.06] text-[#9898B0] hover:bg-white/[0.06] hover:text-cyan-300 rounded-r-2xl cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
