import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  History,
  Share,
  Trophy,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { GamePhase } from '../types/game';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { playTapSound } from '../utils/audio';

interface HeaderBarProps {
  phase: GamePhase;
  isOnlineRoom?: boolean;
  isMuted: boolean;
  scoreboardEnabled: boolean;
  hasScores: boolean;
  onToggleMute: () => void;
  onOpenScoreboard: () => void;
  onOpenChangelog: () => void;
  onReturnToLobby: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  phase,
  isOnlineRoom = false,
  isMuted,
  scoreboardEnabled,
  hasScores,
  onToggleMute,
  onOpenScoreboard,
  onOpenChangelog,
  onReturnToLobby,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  const inActiveGame = !isOnlineRoom && phase !== 'lobby';

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#09090E]/90 backdrop-blur-md border-b border-white/[0.08] pt-safe">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Brand or Back to Lobby */}
          <div className="flex items-center gap-3 min-w-0">
            {inActiveGame ? (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onReturnToLobby();
                }}
                aria-label="Exit to Lobby"
                className="flex min-h-[44px] items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-[#9898B0] hover:bg-white/[0.06] hover:text-[#F4F4F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Lobby</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 shrink-0">
                <img
                  src="/pwa-192x192.png"
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-[9px] border border-white/15 object-cover shrink-0 shadow-sm"
                />
                <span className="font-display text-lg font-extrabold tracking-tight text-[#F4F4F8] whitespace-nowrap">
                  Impostor
                </span>
              </div>
            )}
          </div>

          {/* Right: Contextual Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isOnline && (
              <span
                className="flex items-center gap-1.5 px-2 text-xs font-medium text-amber-300 whitespace-nowrap"
                title="Playing offline"
              >
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Offline Ready</span>
              </span>
            )}

            {!isInstalled && (isInstallable || isIOS) && !inActiveGame && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  if (isInstallable) {
                    install();
                  } else {
                    setShowIOSInstall(true);
                  }
                }}
                aria-label={isIOS ? 'Install on iPhone' : 'Install App'}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-[#F4F4F8] hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Install</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playTapSound();
                onOpenChangelog();
              }}
              aria-label="Open Changelog"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-[#9898B0] hover:bg-white/[0.06] hover:text-[#F4F4F8] transition-colors cursor-pointer"
            >
              <History className="h-4 w-4 text-[#9898B0]" aria-hidden="true" />
              <span className="hidden sm:inline text-xs font-semibold">Updates</span>
            </button>

            {scoreboardEnabled && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onOpenScoreboard();
                }}
                aria-label="Open Scoreboard"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-[#9898B0] hover:bg-white/[0.06] hover:text-[#F4F4F8] transition-colors cursor-pointer"
              >
                <Trophy
                  className={`h-4 w-4 ${hasScores ? 'text-amber-400' : 'text-[#9898B0]'}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline text-xs font-semibold">Scores</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
              aria-pressed={isMuted}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.06] hover:text-[#F4F4F8] transition-colors cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-rose-400" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5 text-cyan-400" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* iOS Safari Add to Home Screen Guide */}
      {showIOSInstall && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#14141F] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="ios-install-title" className="font-display text-lg font-bold text-[#F4F4F8]">
                Install Impostor on iOS
              </h2>
              <button
                type="button"
                onClick={() => setShowIOSInstall(false)}
                aria-label="Close iOS Install Guide"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#9898B0] leading-relaxed">
              Play fullscreen offline in Airplane Mode just like a native App Store game:
            </p>
            <ol className="mt-4 space-y-3 text-sm text-[#F4F4F8]">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                  1
                </span>
                <span>
                  Tap the <strong className="inline-flex items-center gap-1 text-white"><Share className="h-3.5 w-3.5 text-cyan-400" /> Share</strong> button in Safari’s bottom toolbar.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 font-mono text-xs font-bold text-cyan-300">
                  3
                </span>
                <span>Launch Impostor from your Home Screen anytime—no internet needed.</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSInstall(false)}
              className="mt-6 w-full min-h-[48px] rounded-2xl bg-cyan-400 font-display text-sm font-bold text-[#061318] hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
