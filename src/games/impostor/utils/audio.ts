/**
 * Synthesized Web Audio API sound effects + iOS Silent Switch audio unlock.
 * Works 100% offline with zero external audio assets.
 */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let mutedState = false;

// Tiny silent WAV data URI (44 bytes + 2 bytes of silence) to unlock iOS Safari hardware silent switch
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxCtor) {
      audioCtx = new AudioCtxCtor();
    }
  }
  return audioCtx;
}

export function setAudioMuted(muted: boolean): void {
  mutedState = muted;
}

export function isAudioMuted(): boolean {
  return mutedState;
}

/**
 * Call on the first user tap/gesture. Sets iOS audioSession to 'playback' and plays a silent HTML5 audio
 * element so synthesized Web Audio effects remain audible even with the iPhone Silent switch engaged.
 */
export function unlockIOSAudio(): void {
  if (typeof window === 'undefined') return;

  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if ('audioSession' in nav && nav.audioSession) {
      nav.audioSession.type = 'playback';
    }
  } catch {
    // Ignore on browsers without audioSession support
  }

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if (!audioUnlocked) {
    audioUnlocked = true;
    try {
      const audio = new Audio(SILENT_WAV_DATA_URI);
      audio.setAttribute('playsinline', 'true');
      audio.volume = 0.01;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Reset so next gesture can retry if blocked
          audioUnlocked = false;
        });
      }
    } catch {
      audioUnlocked = false;
    }
  }
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.14,
  delay = 0,
  endFreq?: number
): void {
  if (mutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Tactile UI tap */
export function playTapSound(): void {
  playTone(540, 0.045, 'triangle', 0.06, 0, 420);
}

/** Smooth 3D card flip whoosh */
export function playCardFlipSound(revealing = true): void {
  if (mutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Filtered noise sweep for tactile card whoosh
  const duration = 0.16;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.6;
  const now = ctx.currentTime;
  filter.frequency.setValueAtTime(revealing ? 420 : 1250, now);
  filter.frequency.exponentialRampToValueAtTime(revealing ? 1600 : 380, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration + 0.01);

  // Subtle tonal sparkle on reveal
  if (revealing) {
    playTone(520, 0.11, 'sine', 0.07, 0.03, 660);
  } else {
    playTone(380, 0.08, 'sine', 0.05, 0.01, 260);
  }
}

/** Subtle timer tick for last 10 seconds */
export function playTimerTickSound(urgent = false): void {
  if (urgent) {
    playTone(880, 0.09, 'square', 0.08, 0, 740);
  } else {
    playTone(640, 0.05, 'triangle', 0.06, 0, 580);
  }
}

/** Timer expired alarm beep */
export function playTimerExpiredSound(): void {
  playTone(784, 0.16, 'sawtooth', 0.09, 0);
  playTone(784, 0.16, 'sawtooth', 0.09, 0.2);
  playTone(587.33, 0.34, 'sawtooth', 0.1, 0.4);
}

/** Dramatic reveal chord when a player is voted out */
export function playDramaticRevealSound(wasImpostor: boolean): void {
  if (wasImpostor) {
    // High-tension resolved sting
    playTone(220, 0.45, 'sawtooth', 0.08, 0);
    playTone(329.63, 0.45, 'triangle', 0.09, 0.05);
    playTone(440, 0.5, 'sine', 0.12, 0.1);
    playTone(659.25, 0.55, 'triangle', 0.1, 0.16);
  } else {
    // Ominous minor drop for innocent Civilian voted out
    playTone(261.63, 0.32, 'triangle', 0.11, 0);
    playTone(233.08, 0.34, 'triangle', 0.11, 0.15);
    playTone(196.0, 0.55, 'sawtooth', 0.08, 0.3, 174.61);
  }
}

/** Victory fanfare */
export function playVictoryFanfare(civiliansWon: boolean): void {
  if (civiliansWon) {
    // Bright major arpeggio
    playTone(523.25, 0.16, 'triangle', 0.12, 0);
    playTone(659.25, 0.16, 'triangle', 0.12, 0.11);
    playTone(783.99, 0.18, 'triangle', 0.13, 0.22);
    playTone(1046.5, 0.52, 'sine', 0.15, 0.34);
    playTone(523.25, 0.52, 'triangle', 0.08, 0.34);
  } else {
    // Sinister dark synth triumph for Impostors
    playTone(196.0, 0.22, 'sawtooth', 0.09, 0);
    playTone(233.08, 0.22, 'sawtooth', 0.09, 0.14);
    playTone(293.66, 0.24, 'sawtooth', 0.1, 0.28);
    playTone(185.0, 0.6, 'sawtooth', 0.11, 0.44);
  }
}
