import { useEffect } from 'react';
import chooserIcon from '@/assets/game-icons/chooser-icon.svg';

interface StartScreenProps {
  visible: boolean;
  onPlay: () => void;
}

export function StartScreen({ visible, onPlay }: StartScreenProps) {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onPlay]);

  return (
    <main
      aria-hidden={!visible}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#07070A] px-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-[1.04] pointer-events-none'
      }`}
    >
      {/* Whisper-subtle OLED ambient concentric rings echoing the finger-ring motif */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 240, 255, 0.055) 0%, rgba(165, 94, 255, 0.02) 38%, rgba(7, 7, 10, 0) 70%)',
          }}
        />
        <div className="ambient-ring-slow absolute left-1/2 top-1/2 h-[340px] w-[340px] rounded-full border border-white/[0.045] sm:h-[420px] sm:w-[420px]" />
        <div className="ambient-ring-offset absolute left-1/2 top-1/2 h-[220px] w-[220px] rounded-full border border-white/[0.06] sm:h-[268px] sm:w-[268px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-9">
        <img
          src={chooserIcon}
          alt="Chooser icon"
          className="h-20 w-20 rounded-2xl border border-white/15 shadow-[0_0_40px_rgba(0,240,255,0.2)]"
        />

        <div className="space-y-2 text-center">
          <h1
            className="text-center text-[clamp(3rem,10vw,4.5rem)] font-semibold tracking-[-0.035em] text-[#F7F7FA] leading-none"
            style={{ textWrap: 'balance' }}
          >
            Chooser
          </h1>
          <p className="text-sm text-slate-400">
            Hold 2+ fingers on screen to start the 5-second countdown
          </p>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onPlay();
          }}
          className="inline-flex min-h-[56px] min-w-[168px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-[#F7F7FA] px-11 py-4 text-[17px] font-semibold tracking-[0.01em] text-[#07070A] shadow-[0_0_40px_rgba(247,247,250,0.16)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0FF]"
        >
          Play
        </button>
      </div>
    </main>
  );
}
