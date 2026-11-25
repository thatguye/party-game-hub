import React, { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SlideToConfirmProps {
  label: string;
  confirmedLabel?: string;
  accent?: 'crimson' | 'emerald' | 'slate';
  onConfirm: () => void;
  ariaLabel?: string;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label,
  confirmedLabel = 'Confirmed',
  accent = 'crimson',
  onConfirm,
  ariaLabel,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const knobSize = 48;
    const usable = Math.max(1, rect.width - knobSize - 8);
    const rel = Math.max(0, Math.min(usable, clientX - rect.left - knobSize / 2 - 4));
    const ratio = rel / usable;
    setProgress(ratio);
    if (ratio >= 0.92 && !done) {
      setDone(true);
      setDragging(false);
      onConfirm();
      window.setTimeout(() => {
        setDone(false);
        setProgress(0);
      }, 650);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    if (!done) {
      setProgress(0);
    }
    setDragging(false);
  };

  const bgClass =
    accent === 'crimson'
      ? 'bg-[#261116] border-red-500/50'
      : accent === 'emerald'
      ? 'bg-[#0F241D] border-emerald-500/50'
      : 'bg-[#12131A] border-white/25';

  const knobClass =
    accent === 'crimson'
      ? 'bg-red-500 text-white'
      : accent === 'emerald'
      ? 'bg-emerald-400 text-[#09090E]'
      : 'bg-white text-[#09090E]';

  const fillClass =
    accent === 'crimson'
      ? 'bg-red-500/25'
      : accent === 'emerald'
      ? 'bg-emerald-500/25'
      : 'bg-white/15';

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative h-[56px] w-full rounded-2xl border overflow-hidden flex items-center touch-none cursor-grab active:cursor-grabbing ${bgClass}`}
      >
        <div
          className={`absolute inset-y-0 left-0 ${fillClass}`}
          style={{ width: `${Math.min(100, progress * 100 + 14)}%` }}
        />

        <span className="relative z-10 w-full text-center text-sm font-bold text-white/90 pointer-events-none px-14 truncate">
          {done ? confirmedLabel : label}
        </span>

        <div
          className={`absolute top-1 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
            dragging ? 'duration-0' : 'duration-200'
          } ${knobClass}`}
          style={{
            left: `calc(4px + ${progress} * (100% - 56px))`,
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </div>

        {/* Accessible keyboard/slider control */}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(progress * 100)}
          aria-label={ariaLabel || label}
          onChange={(e) => {
            const val = Number(e.target.value) / 100;
            setProgress(val);
            if (val >= 0.92) {
              setDone(true);
              onConfirm();
              window.setTimeout(() => {
                setDone(false);
                setProgress(0);
              }, 400);
            }
          }}
          className="sr-only"
        />
      </div>
    </div>
  );
};
