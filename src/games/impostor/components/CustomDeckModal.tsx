import React, { useEffect, useState } from 'react';
import { FileUp, Plus, Trash2, X } from 'lucide-react';
import { CategoryDeck, GameMode, QuestionPair, WordEntry } from '../types/game';
import { DECK_EMOJIS } from '../data/gameData';
import { parseBulkImportQuestions, parseBulkImportWords } from '../game/engine';
import { playTapSound } from '../utils/audio';

interface CustomDeckModalProps {
  isOpen: boolean;
  initialMode: GameMode;
  editingDeck: CategoryDeck | null;
  onSave: (deck: CategoryDeck) => void;
  onDelete?: (deckId: string) => void;
  onClose: () => void;
}

export const CustomDeckModal: React.FC<CustomDeckModalProps> = ({
  isOpen,
  initialMode,
  editingDeck,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [activeTab, setActiveTab] = useState<GameMode>(initialMode);
  const [words, setWords] = useState<WordEntry[]>([]);
  const [questions, setQuestions] = useState<QuestionPair[]>([]);

  // Single item inputs
  const [singleWord, setSingleWord] = useState('');
  const [singleHint1, setSingleHint1] = useState('');
  const [singleHint2, setSingleHint2] = useState('');
  const [singleMainQ, setSingleMainQ] = useState('');
  const [singleDecoyQ, setSingleDecoyQ] = useState('');

  // Bulk import
  const [showBulk, setShowBulk] = useState(true);
  const [bulkText, setBulkText] = useState('');
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingDeck) {
      setName(editingDeck.name);
      setEmoji(editingDeck.emoji);
      setWords(editingDeck.words);
      setQuestions(editingDeck.questions);
      setActiveTab(
        editingDeck.words.length === 0 && editingDeck.questions.length > 0
          ? 'question'
          : initialMode
      );
    } else {
      setName('');
      setEmoji('🎯');
      setWords([]);
      setQuestions([]);
      setActiveTab(initialMode);
    }
    setBulkText('');
    setBulkErrors([]);
    setFormError(null);
    setSingleWord('');
    setSingleHint1('');
    setSingleHint2('');
    setSingleMainQ('');
    setSingleDecoyQ('');
  }, [isOpen, editingDeck, initialMode]);

  if (!isOpen) return null;

  const handleBulkImport = () => {
    playTapSound();
    setBulkErrors([]);
    if (!bulkText.trim()) return;

    if (activeTab === 'word') {
      const result = parseBulkImportWords(bulkText);
      if (result.entries.length > 0) {
        setWords((prev) => [...prev, ...result.entries]);
        if (result.errors.length === 0) {
          setBulkText('');
        }
      }
      setBulkErrors(result.errors);
    } else {
      const result = parseBulkImportQuestions(bulkText);
      if (result.entries.length > 0) {
        setQuestions((prev) => [...prev, ...result.entries]);
        if (result.errors.length === 0) {
          setBulkText('');
        }
      }
      setBulkErrors(result.errors);
    }
  };

  const handleAddSingleWord = () => {
    const w = singleWord.trim();
    const h1 = singleHint1.trim();
    const h2 = singleHint2.trim();
    if (!w || !h1) {
      setFormError('Enter both a secret word and at least one subtle hint.');
      return;
    }
    playTapSound();
    setFormError(null);
    const entry: WordEntry = {
      id: `cw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      word: w,
      hints: h2 ? [h1, h2] : [h1],
    };
    setWords((prev) => [...prev, entry]);
    setSingleWord('');
    setSingleHint1('');
    setSingleHint2('');
  };

  const handleAddSingleQuestion = () => {
    const main = singleMainQ.trim();
    const decoy = singleDecoyQ.trim();
    if (!main || !decoy) {
      setFormError('Enter both a Main Question and a Decoy Question.');
      return;
    }
    playTapSound();
    setFormError(null);
    const entry: QuestionPair = {
      id: `cq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      main,
      decoy,
    };
    setQuestions((prev) => [...prev, entry]);
    setSingleMainQ('');
    setSingleDecoyQ('');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Give your custom deck a name.');
      return;
    }
    if (words.length === 0 && questions.length === 0) {
      setFormError('Add at least one Word entry or Question pair before saving.');
      return;
    }

    playTapSound();
    const deck: CategoryDeck = {
      id: editingDeck ? editingDeck.id : `custom-${Date.now()}`,
      name: trimmedName,
      emoji,
      accent: '#22D3EE',
      description: 'Custom deck created on this device.',
      isCustom: true,
      words,
      questions,
    };
    onSave(deck);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-deck-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl bg-[#14141F] border border-white/10 shadow-2xl overflow-hidden">
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.08]">
          <h2 id="custom-deck-title" className="font-display text-xl font-bold text-[#F4F4F8]">
            {editingDeck ? 'Edit Custom Deck' : 'Custom Deck Studio'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Custom Deck Studio"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Deck Name & Icon */}
          <div className="space-y-3">
            <div>
              <label htmlFor="custom-deck-name" className="block text-xs font-semibold text-[#9898B0] mb-1.5">
                Deck Name
              </label>
              <input
                id="custom-deck-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g. Inside Jokes, Office Crew, Road Trip..."
                maxLength={36}
                className="w-full min-h-[46px] rounded-2xl bg-[#09090E] border border-white/10 px-4 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#9898B0] mb-1.5">
                Deck Icon
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DECK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setEmoji(em);
                    }}
                    aria-label={`Select ${em} icon`}
                    aria-pressed={emoji === em}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all cursor-pointer ${
                      emoji === em
                        ? 'bg-cyan-400/20 border border-cyan-400 scale-105'
                        : 'bg-[#09090E] border border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Type Switcher */}
          <div
            role="tablist"
            aria-label="Deck Content Type"
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#09090E] p-1.5 border border-white/[0.06]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'word'}
              onClick={() => {
                playTapSound();
                setActiveTab('word');
                setBulkErrors([]);
                setFormError(null);
              }}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'word'
                  ? 'bg-[#1C1C2B] text-cyan-300'
                  : 'text-[#9898B0] hover:text-[#F4F4F8]'
              }`}
            >
              Words ({words.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'question'}
              onClick={() => {
                playTapSound();
                setActiveTab('question');
                setBulkErrors([]);
                setFormError(null);
              }}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'question'
                  ? 'bg-[#1C1C2B] text-rose-300'
                  : 'text-[#9898B0] hover:text-[#F4F4F8]'
              }`}
            >
              Questions ({questions.length})
            </button>
          </div>

          {/* Bulk Import Toggle & Textarea */}
          <div className="rounded-2xl bg-[#09090E] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-[#F4F4F8]">
                <FileUp className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <span>Bulk Import (Fastest)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowBulk((v) => !v)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {showBulk ? 'Hide' : 'Show'}
              </button>
            </div>

            {showBulk && (
              <>
                <label htmlFor="bulk-import-textarea" className="block text-xs text-[#9898B0] leading-relaxed">
                  {activeTab === 'word'
                    ? 'Paste one item per line using "Word | Hint" (or "Word | Hint 1 | Hint 2"):'
                    : 'Paste one pair per line using "Main Question | Decoy Question":'}
                </label>
                <textarea
                  id="bulk-import-textarea"
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    activeTab === 'word'
                      ? 'Espresso | Morning fuel | Crema\nSkatepark | Concrete ramps | Helmet\nKaraoke | Microphone | Late night'
                      : 'What food would you refuse to eat for $100? | What food could you eat every day?\nWhich celebrity would be the worst roommate? | Which celebrity would you invite to dinner?'
                  }
                  className="w-full rounded-xl bg-[#14141F] border border-white/10 p-3 text-xs text-[#F4F4F8] placeholder:text-[#5B5B73] focus:border-cyan-400 focus:outline-none font-mono"
                />
                {bulkErrors.length > 0 && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 space-y-1">
                    {bulkErrors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={!bulkText.trim()}
                  className="min-h-[44px] w-full rounded-xl bg-white/[0.08] px-4 text-xs font-bold text-[#F4F4F8] hover:bg-white/[0.14] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Import Lines into Deck
                </button>
              </>
            )}
          </div>

          {/* Single Item Quick Add */}
          {activeTab === 'word' ? (
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-[#9898B0]">Or add one word</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={singleWord}
                  onChange={(e) => setSingleWord(e.target.value)}
                  placeholder="Secret Word"
                  aria-label="Secret Word"
                  className="min-h-[44px] rounded-xl bg-[#09090E] border border-white/10 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={singleHint1}
                  onChange={(e) => setSingleHint1(e.target.value)}
                  placeholder="Hint 1 (Required)"
                  aria-label="Hint 1"
                  className="min-h-[44px] rounded-xl bg-[#09090E] border border-white/10 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={singleHint2}
                  onChange={(e) => setSingleHint2(e.target.value)}
                  placeholder="Hint 2 (Optional)"
                  aria-label="Hint 2"
                  className="min-h-[44px] rounded-xl bg-[#09090E] border border-white/10 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSingleWord}
                className="flex min-h-[44px] items-center justify-center gap-1.5 w-full rounded-xl border border-white/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Word</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-[#9898B0]">Or add one question pair</span>
              <input
                type="text"
                value={singleMainQ}
                onChange={(e) => setSingleMainQ(e.target.value)}
                placeholder="Main Question (Civilians)"
                aria-label="Main Question"
                className="w-full min-h-[44px] rounded-xl bg-[#09090E] border border-white/10 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="text"
                value={singleDecoyQ}
                onChange={(e) => setSingleDecoyQ(e.target.value)}
                placeholder="Decoy Question (Impostor — same answer format)"
                aria-label="Decoy Question"
                className="w-full min-h-[44px] rounded-xl bg-[#09090E] border border-white/10 px-3 text-sm text-[#F4F4F8] placeholder:text-[#666680] focus:border-rose-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSingleQuestion}
                className="flex min-h-[44px] items-center justify-center gap-1.5 w-full rounded-xl border border-white/10 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Question Pair</span>
              </button>
            </div>
          )}

          {/* Current Items Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9898B0]">
              <span>
                {activeTab === 'word'
                  ? `${words.length} words in this deck`
                  : `${questions.length} question pairs in this deck`}
              </span>
            </div>

            {activeTab === 'word' ? (
              words.length === 0 ? (
                <p className="rounded-xl bg-[#09090E]/60 p-4 text-center text-xs text-[#75758E]">
                  No words added yet. Use Bulk Import above to add dozens in seconds.
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto divide-y divide-white/[0.06] rounded-2xl bg-[#09090E] border border-white/[0.06]">
                  {words.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F4F4F8] truncate">{item.word}</p>
                        <p className="text-xs text-[#9898B0] truncate">
                          Hints: {item.hints.join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWords((prev) => prev.filter((w) => w.id !== item.id))}
                        aria-label={`Remove ${item.word}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#9898B0] hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : questions.length === 0 ? (
              <p className="rounded-xl bg-[#09090E]/60 p-4 text-center text-xs text-[#75758E]">
                No question pairs added yet. Paste pairs above or add one manually.
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-white/[0.06] rounded-2xl bg-[#09090E] border border-white/[0.06]">
                {questions.map((item, idx) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 space-y-0.5 text-xs">
                      <p className="text-[#F4F4F8]">
                        <span className="text-cyan-400 font-semibold">Main:</span> {item.main}
                      </p>
                      <p className="text-[#9898B0]">
                        <span className="text-rose-400 font-semibold">Decoy:</span> {item.decoy}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== item.id))}
                      aria-label={`Remove question pair ${idx + 1}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#9898B0] hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              {formError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-white/[0.08] pb-safe bg-[#14141F]">
          {editingDeck && onDelete && (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onDelete(editingDeck.id);
                onClose();
              }}
              aria-label={`Delete ${editingDeck.name}`}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-rose-500/15 px-4 text-sm font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-1 rounded-2xl bg-cyan-400 font-display text-sm font-bold text-[#061318] hover:bg-cyan-300 active:scale-[0.99] transition-all cursor-pointer"
          >
            {editingDeck ? 'Save Deck' : 'Save Custom Deck'}
          </button>
        </div>
      </div>
    </div>
  );
};
