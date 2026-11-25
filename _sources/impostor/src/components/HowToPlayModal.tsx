import React, { useState } from 'react';
import { HelpCircle, MessageSquareText, ShieldAlert, Sparkles, X } from 'lucide-react';
import { GameMode } from '../types/game';
import { playTapSound } from '../utils/audio';

interface HowToPlayModalProps {
  isOpen: boolean;
  initialMode: GameMode;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  initialMode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GameMode>(initialMode);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-[#14141F] border border-white/10 shadow-2xl overflow-hidden">
        {/* Grab handle on mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2 id="how-to-play-title" className="font-display text-xl font-bold text-[#F4F4F8]">
              How to Play
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            aria-label="Close How to Play"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4">
          <div
            role="tablist"
            aria-label="Game Mode Instructions"
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#09090E] p-1.5 border border-white/[0.06]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'word'}
              onClick={() => {
                playTapSound();
                setActiveTab('word');
              }}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'word'
                  ? 'bg-[#1C1C2B] text-cyan-300 shadow-sm'
                  : 'text-[#9898B0] hover:text-[#F4F4F8]'
              }`}
            >
              Word Game
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'question'}
              onClick={() => {
                playTapSound();
                setActiveTab('question');
              }}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'question'
                  ? 'bg-[#1C1C2B] text-rose-300 shadow-sm'
                  : 'text-[#9898B0] hover:text-[#F4F4F8]'
              }`}
            >
              Question Game
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === 'word' ? (
            <>
              <p className="text-sm text-[#B8B8CE] leading-relaxed">
                Everyone secretly gets the same <strong className="text-cyan-300">Secret Word</strong>—except the <strong className="text-rose-400">Impostor(s)</strong>, who must bluff their way through without knowing it.
              </p>

              <ol className="space-y-4">
                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                    1
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Tap Your Name & Hold to Peek</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Tap your name on screen, then press and hold the card to privately see your role. Civilians see the Category, Secret Word, and a quick definition; Impostors see an alert (plus a subtle Hint if enabled).
                    </p>
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                    2
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Give One-Word Clues</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Starting with the announced player, go around the circle giving a subtle one-word or short clue related to the secret word. Be specific enough to prove you know it—without making it obvious to the Impostor.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                    3
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Debate & Vote Out the Impostor</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Discuss suspicious clues before the timer runs out, then vote to eliminate a suspect. <strong className="text-[#F4F4F8]">Once all Impostors are voted out, Civilians win immediately.</strong>
                    </p>
                  </div>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-sm text-[#B8B8CE] leading-relaxed">
                Also known as <strong className="text-[#F4F4F8]">Find the Liar</strong>. Civilians answer the <strong className="text-cyan-300">Main Question</strong>, while Impostors secretly answer a clever <strong className="text-rose-400">Decoy Question</strong> with the same answer format.
              </p>

              <ol className="space-y-4">
                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/15 font-mono text-xs font-bold text-rose-300">
                    1
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Tap Your Name & Reveal Question</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Tap your name on screen, then click the card to flip it open and secretly read your prompt.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/15 font-mono text-xs font-bold text-rose-300">
                    2
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Type Your Answer & Submit</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Enter your answer in the input box and submit. Your answer immediately hides and returns to the player screen for the next person.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/15 font-mono text-xs font-bold text-rose-300">
                    3
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F4F4F8]">Reveal All Answers & Catch the Liar</h3>
                    <p className="text-sm text-[#9898B0] leading-relaxed">
                      Once everyone submits, the <strong className="text-[#F4F4F8]">Real Question</strong> and <strong className="text-[#F4F4F8]">everyone’s answers</strong> appear on screen together. Spot whose answer looks suspicious, debate, and vote!
                    </p>
                  </div>
                </li>
              </ol>

              {/* Example Pair */}
              <div className="rounded-2xl bg-[#09090E] border border-white/[0.08] p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#9898B0]">
                  <MessageSquareText className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Example Paired Prompt</span>
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-cyan-300">Civilians: </span>
                  <span className="text-[#F4F4F8]">“What is a food you would refuse to eat even for $100?”</span>
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-rose-400">Impostor: </span>
                  <span className="text-[#F4F4F8]">“What is a food you could eat every single day?”</span>
                </div>
              </div>
            </>
          )}

          {/* Extra Modes Summary */}
          <div className="border-t border-white/[0.08] pt-4 space-y-2.5">
            <h3 className="text-xs font-bold text-[#9898B0] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Bonus Settings</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#9898B0]">
              <div className="rounded-xl bg-[#09090E] p-3 border border-white/[0.05]">
                <strong className="text-[#F4F4F8] block mb-0.5">Chaos Mode</strong>
                Mystery impostor count—could be 0 impostors, several, or everyone!
              </div>
              <div className="rounded-xl bg-[#09090E] p-3 border border-white/[0.05]">
                <strong className="text-[#F4F4F8] block mb-0.5">Survival Mode</strong>
                Voting out an innocent eliminates them and continues the round.
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-[#9898B0] pt-1">
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
              <span>Every category, custom deck, and game rule is 100% unlocked offline.</span>
            </p>
          </div>
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
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
