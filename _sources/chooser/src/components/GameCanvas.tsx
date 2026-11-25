import { useEffect, useRef } from 'react';
import { type ChooserAudio } from '../game/audio';
import { ChooserEngine, type EngineEvent } from '../game/engine';
import { renderChooserCanvas } from '../game/renderer';

interface GameCanvasProps {
  active: boolean;
  audio: ChooserAudio;
}

const MOUSE_TOUCH_ID = -1;

export function GameCanvas({ active, audio }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  const audioRef = useRef(audio);

  activeRef.current = active;
  audioRef.current = audio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const engine = new ChooserEngine();
    let cssWidth = window.innerWidth;
    let cssHeight = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    let lastTouchTimestamp = 0;
    let mouseDown = false;
    let lastFrameTime = performance.now();
    let rafId = 0;

    // Cache last reflected data-* attributes so DOM stays untouched on unchanged frames
    let lastPhase = '';
    let lastFingers = -1;
    let lastWinner = '';

    const syncDataAttributes = () => {
      if (engine.phase !== lastPhase) {
        canvas.dataset.phase = engine.phase;
        lastPhase = engine.phase;
      }
      const count = engine.getActiveCount();
      if (count !== lastFingers) {
        canvas.dataset.fingers = String(count);
        lastFingers = count;
      }
      const winnerStr = engine.winnerId === null ? '' : String(engine.winnerId);
      if (winnerStr !== lastWinner) {
        canvas.dataset.winnerId = winnerStr;
        lastWinner = winnerStr;
      }
    };

    const dispatchAudio = (events: EngineEvent[]) => {
      const sound = audioRef.current;
      for (const ev of events) {
        if (ev.type === 'fingerDown') {
          sound.playPop(ev.colorIndex);
        } else if (ev.type === 'fingerLift') {
          sound.playLift();
        } else if (ev.type === 'tick') {
          sound.playTick(ev.progress);
        } else if (ev.type === 'winner') {
          sound.playWinnerChime();
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width || window.innerWidth);
      cssHeight = Math.max(1, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize);

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    // Raw Touch Events with { passive: false } and e.preventDefault()
    const handleTouchStart = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      lastTouchTimestamp = performance.now();
      audioRef.current.unlock();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const { x, y } = getCanvasCoords(t.clientX, t.clientY);
        dispatchAudio(engine.touchStart(t.identifier, x, y));
      }
      syncDataAttributes();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      lastTouchTimestamp = performance.now();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const { x, y } = getCanvasCoords(t.clientX, t.clientY);
        engine.touchMove(t.identifier, x, y);
      }
    };

    const handleTouchEndOrCancel = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      lastTouchTimestamp = performance.now();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        dispatchAudio(engine.touchEnd(t.identifier));
      }

      const liveIds = new Set<number>();
      for (let i = 0; i < e.touches.length; i++) {
        liveIds.add(e.touches[i].identifier);
      }
      dispatchAudio(engine.reconcilePhysicalTouches(liveIds));
      syncDataAttributes();
    };

    // Prevent iOS Safari multi-finger gesture zoom/rotate interference
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Single-finger desktop mouse fallback (strictly ignored right after touch events)
    const handleMouseDown = (e: MouseEvent) => {
      if (!activeRef.current || e.button !== 0) return;
      if (performance.now() - lastTouchTimestamp < 600) return;
      mouseDown = true;
      audioRef.current.unlock();
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      dispatchAudio(engine.touchStart(MOUSE_TOUCH_ID, x, y));
      syncDataAttributes();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!activeRef.current || !mouseDown) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      engine.touchMove(MOUSE_TOUCH_ID, x, y);
    };

    const handleMouseUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      dispatchAudio(engine.touchEnd(MOUSE_TOUCH_ID));
      syncDataAttributes();
    };

    const handleVisibilityOrBlur = () => {
      mouseDown = false;
      engine.clearAll();
      syncDataAttributes();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleVisibilityOrBlur();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEndOrCancel, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    window.addEventListener('gesturestart', preventGesture, { passive: false });
    window.addEventListener('gesturechange', preventGesture, { passive: false });
    window.addEventListener('gestureend', preventGesture, { passive: false });
    window.addEventListener('blur', handleVisibilityOrBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const loop = (now: number) => {
      const rawDt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      if (activeRef.current) {
        const events = engine.step(rawDt);
        if (events.length > 0) {
          dispatchAudio(events);
        }
        syncDataAttributes();
      }

      renderChooserCanvas(ctx, cssWidth, cssHeight, engine);
      rafId = window.requestAnimationFrame(loop);
    };

    syncDataAttributes();
    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEndOrCancel);
      canvas.removeEventListener('touchcancel', handleTouchEndOrCancel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('gesturestart', preventGesture);
      window.removeEventListener('gesturechange', preventGesture);
      window.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('blur', handleVisibilityOrBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="game-canvas"
      aria-label="Multi-touch finger chooser canvas"
      className="fixed inset-0 block h-full w-full touch-none select-none bg-[#07070A]"
    />
  );
}
