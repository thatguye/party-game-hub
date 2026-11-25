import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import chooserIcon from '@/assets/game-icons/chooser-icon.svg';
import { GameCanvas } from './components/GameCanvas';
import { StartScreen } from './components/StartScreen';
import {
  ChooserAudio,
  configurePlaybackAudioSession,
  SILENT_WAV_DATA_URI,
} from './game/audio';

function hasAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function ChooserGame() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState<boolean>(hasAutostartParam);
  const [mountStartScreen, setMountStartScreen] = useState<boolean>(() => !hasAutostartParam());
  const [activeFingerCount, setActiveFingerCount] = useState<number>(0);
  const audioRef = useRef<ChooserAudio | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioRef.current) {
    audioRef.current = new ChooserAudio();
  }

  useEffect(() => {
    configurePlaybackAudioSession();
    audioRef.current?.attachKeepAliveAudio(silentAudioRef.current);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioRef.current?.pauseKeepAlive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audioRef.current?.pauseKeepAlive();
      delete document.body.dataset.state;
    };
  }, []);

  useEffect(() => {
    document.body.dataset.state = isPlaying ? 'playing' : 'title';
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      setMountStartScreen(false);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    configurePlaybackAudioSession();
    audioRef.current?.unlock(silentAudioRef.current);
    document.body.dataset.state = 'playing';
    setIsPlaying(true);
  }, []);

  const exitLocked = isPlaying && activeFingerCount > 0;

  return (
    <div className="chooser-root flex flex-col bg-[#07070A]">
      <audio
        ref={silentAudioRef}
        src={SILENT_WAV_DATA_URI}
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="hidden"
      />

      {/* Dedicated Top Safe-Zone Header — physically isolated outside the multi-touch canvas */}
      <header
        data-testid="chooser-safe-header"
        className="relative z-30 shrink-0 border-b border-white/[0.08] bg-[#0B0B11]/95 backdrop-blur-md pt-safe"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={chooserIcon}
              alt="Chooser icon"
              data-testid="chooser-header-icon"
              className="h-8 w-8 rounded-lg border border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-[#F7F7FA] leading-none">
                Chooser
              </span>
              <span className="block text-[10px] font-medium text-cyan-300/80 mt-0.5">
                100% Offline · Multi-Touch
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={exitLocked}
            onClick={() => {
              if (!exitLocked) {
                navigate('/');
              }
            }}
            data-testid="chooser-hub-btn"
            aria-label={
              exitLocked
                ? 'Back to Hub locked while fingers are touching the canvas'
                : 'Back to Party Game Hub'
            }
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all whitespace-nowrap ${
              exitLocked
                ? 'border-white/10 bg-white/[0.03] text-slate-500 cursor-not-allowed'
                : 'border-white/14 bg-white/[0.07] text-[#F7F7FA] hover:bg-white/[0.14] active:scale-[0.96] cursor-pointer'
            }`}
          >
            {exitLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-300/70" aria-hidden="true" />
                <span>Playing ({activeFingerCount})</span>
              </>
            ) : (
              <>
                <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                <span>Back to Hub</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Isolated Multi-Touch Playfield Area strictly below the safe-zone header */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-[#07070A]">
        <GameCanvas
          active={isPlaying}
          audio={audioRef.current}
          onActiveFingerCountChange={setActiveFingerCount}
        />
        {mountStartScreen && <StartScreen visible={!isPlaying} onPlay={handlePlay} />}
      </div>
    </div>
  );
}
