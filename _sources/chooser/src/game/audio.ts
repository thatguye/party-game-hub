// Procedural Web Audio API synthesizer unlocked on Play tap for native iOS Safari feel.

const PENTATONIC_RATIOS = [1, 1.125, 1.25, 1.5, 1.667, 2.0, 2.25, 2.5, 3.0, 3.333];

// Valid 0.1s 8kHz 8-bit unsigned mono PCM silent WAV (44-byte RIFF/WAVE header + 802 bytes of 0x80 silence).
// Using unmuted silent PCM routes iOS Safari Web Audio through the media playback channel even in Silent Mode.
export const SILENT_WAV_DATA_URI = `data:audio/wav;base64,UklGRkYDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIDAACA${'gICA'.repeat(267)}`;

interface AudioSessionLike {
  type: string;
}

type NavigatorWithAudioSession = Navigator & {
  audioSession?: AudioSessionLike;
};

export function configurePlaybackAudioSession(
  nav: NavigatorWithAudioSession | undefined = typeof navigator !== 'undefined'
    ? (navigator as NavigatorWithAudioSession)
    : undefined
): boolean {
  if (!nav || !('audioSession' in nav) || !nav.audioSession) {
    return false;
  }
  try {
    nav.audioSession.type = 'playback';
    return true;
  } catch {
    return false;
  }
}

export class ChooserAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private keepAliveEl: HTMLAudioElement | null = null;

  constructor() {
    configurePlaybackAudioSession();
  }

  public attachKeepAliveAudio(el: HTMLAudioElement | null): void {
    this.keepAliveEl = el;
  }

  public pauseKeepAlive(): void {
    if (this.keepAliveEl && !this.keepAliveEl.paused) {
      try {
        this.keepAliveEl.pause();
      } catch {
        // Ignore pause errors
      }
    }
  }

  public unlock(keepAliveAudio?: HTMLAudioElement | null): void {
    // Configure playback audio session BEFORE creating or resuming AudioContext (iOS 17+ Silent Mode bypass)
    configurePlaybackAudioSession();

    if (keepAliveAudio !== undefined) {
      this.keepAliveEl = keepAliveAudio;
    }

    // Fallback silent looping HTML5 <audio> trigger to route Web Audio onto iOS media playback channel
    if (this.keepAliveEl) {
      try {
        this.keepAliveEl.loop = true;
        this.keepAliveEl.muted = false;
        this.keepAliveEl.volume = 1;
        if (this.keepAliveEl.paused) {
          const playPromise = this.keepAliveEl.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      } catch {
        // Ignore if autoplay policy blocks outside a direct gesture
      }
    }

    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.72;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Play an inaudible 1-sample buffer to reliably unlock iOS Safari audio output
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      // Ignore if context is already unlocked or unavailable
    }
  }

  private ensureReady(): { ctx: AudioContext; out: GainNode } | null {
    if (!this.ctx || !this.masterGain) return null;
    if (this.ctx.state === 'suspended') {
      configurePlaybackAudioSession();
      this.ctx.resume().catch(() => {});
    }
    return { ctx: this.ctx, out: this.masterGain };
  }

  public playPop(colorIndex: number): void {
    const audio = this.ensureReady();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;

    const ratio = PENTATONIC_RATIOS[colorIndex % PENTATONIC_RATIOS.length];
    const baseFreq = 290 * (0.85 + ratio * 0.18);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.78, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.42, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.11);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLift(): void {
    const audio = this.ensureReady();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.085);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playTick(progress: number): void {
    const audio = this.ensureReady();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const p = Math.max(0, Math.min(1, progress));

    // Crisp subtle wood/glass tick rising gently in pitch and tightening as countdown approaches 5.0s
    const freq = 520 + p * 540;
    const dur = 0.045 - p * 0.018;
    const peakGain = 0.065 + p * 0.055;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + dur);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  public playWinnerChime(): void {
    const audio = this.ensureReady();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;

    // Clean, luminous major-9th arpeggiated bell chime (C5, E5, G5, D6)
    const notes = [523.25, 659.25, 783.99, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, start);

      const amp = idx === notes.length - 1 ? 0.16 : 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(amp, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);

      overtoneGain.gain.setValueAtTime(0.0001, start);
      overtoneGain.gain.linearRampToValueAtTime(amp * 0.2, start + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(out);

      osc.start(start);
      overtone.start(start);
      osc.stop(start + 0.9);
      overtone.stop(start + 0.32);
    });
  }
}
