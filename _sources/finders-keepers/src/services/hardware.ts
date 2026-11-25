export type TacticalAlertType =
  | 'head_start_end'
  | 'radar_ping'
  | 'zone_shrink'
  | 'tagged'
  | 'oob_warning'
  | 'emergency'
  | 'radio_rx'
  | 'victory';

export type FlashColor = 'emerald' | 'amber' | 'crimson' | 'cyan';

let audioCtx: AudioContext | null = null;
let wakeLockSentinel: WakeLockSentinel | null = null;
let torchStream: MediaStream | null = null;

/**
 * Call on first user tap so iOS Safari plays tactical alerts even when hardware mute switch is on
 * (when Stealth Haptic Mode is OFF).
 */
export function unlockAudioSession(): void {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if ('audioSession' in nav && nav.audioSession) {
      nav.audioSession.type = 'playback';
    }
  } catch {
    // unsupported browser
  }
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
  } catch {
    // ignore audio init errors
  }
}

const VIBRATE_PATTERNS: Record<TacticalAlertType, number[]> = {
  head_start_end: [140, 80, 140, 80, 260],
  radar_ping: [70, 60, 70],
  zone_shrink: [120, 80, 120],
  tagged: [220, 100, 220],
  oob_warning: [90, 50, 90, 50, 90],
  emergency: [300, 100, 300, 100, 400],
  radio_rx: [50],
  victory: [100, 60, 100, 60, 240],
};

const FLASH_COLORS: Record<TacticalAlertType, FlashColor> = {
  head_start_end: 'amber',
  radar_ping: 'cyan',
  zone_shrink: 'amber',
  tagged: 'crimson',
  oob_warning: 'crimson',
  emergency: 'crimson',
  radio_rx: 'emerald',
  victory: 'emerald',
};

export function triggerTacticalAlert(
  type: TacticalAlertType,
  stealthHapticMode: boolean,
  onVisualFlash?: (color: FlashColor) => void
): void {
  // Always flash visual screen-edge indicator in stealth mode or for critical events
  if (stealthHapticMode || type === 'emergency' || type === 'oob_warning' || type === 'tagged') {
    onVisualFlash?.(FLASH_COLORS[type]);
  }

  // Trigger distinct haptic pattern when stealth mode is active (or emergency)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function' &&
    (stealthHapticMode || type === 'emergency' || type === 'tagged')
  ) {
    try {
      navigator.vibrate(VIBRATE_PATTERNS[type]);
    } catch {
      // ignore
    }
  }

  // In Stealth Haptic Mode, NEVER play audible sound (except real emergency alert!)
  if (stealthHapticMode && type !== 'emergency') {
    return;
  }

  playSynthChime(type);
}

function playSynthChime(type: TacticalAlertType): void {
  try {
    unlockAudioSession();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const tone = (
      freq: number,
      startOffset: number,
      duration: number,
      wave: OscillatorType = 'sine',
      gainPeak = 0.14
    ) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    switch (type) {
      case 'radar_ping':
        tone(980, 0, 0.22, 'sine', 0.12);
        tone(1480, 0.11, 0.26, 'sine', 0.08);
        break;
      case 'head_start_end':
        tone(520, 0, 0.14, 'triangle', 0.16);
        tone(660, 0.16, 0.14, 'triangle', 0.16);
        tone(880, 0.32, 0.32, 'triangle', 0.18);
        break;
      case 'zone_shrink':
        tone(440, 0, 0.18, 'sawtooth', 0.08);
        tone(370, 0.2, 0.24, 'sawtooth', 0.08);
        break;
      case 'tagged':
        tone(600, 0, 0.12, 'square', 0.1);
        tone(420, 0.13, 0.25, 'square', 0.1);
        break;
      case 'oob_warning':
        tone(760, 0, 0.1, 'sawtooth', 0.09);
        tone(760, 0.14, 0.1, 'sawtooth', 0.09);
        break;
      case 'emergency':
        tone(880, 0, 0.22, 'sawtooth', 0.18);
        tone(660, 0.24, 0.22, 'sawtooth', 0.18);
        tone(880, 0.48, 0.26, 'sawtooth', 0.18);
        break;
      case 'radio_rx':
        tone(1200, 0, 0.06, 'sine', 0.07);
        break;
      case 'victory':
        tone(523.25, 0, 0.14, 'triangle', 0.14);
        tone(659.25, 0.14, 0.14, 'triangle', 0.14);
        tone(783.99, 0.28, 0.18, 'triangle', 0.16);
        tone(1046.5, 0.46, 0.34, 'triangle', 0.16);
        break;
    }
  } catch {
    // ignore Web Audio failures
  }
}

export async function acquireWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator && navigator.wakeLock) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    }
  } catch {
    // unsupported or page hidden
  }
  return false;
}

export async function releaseWakeLock(): Promise<void> {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    }
  } catch {
    // ignore
  }
}

/**
 * Attempts hardware rear-camera flashlight torch; returns 'hardware' if camera torch enabled,
 * 'screen' if caller should render the full-screen white screen-torch fallback.
 */
export async function enableFlashlightTorch(): Promise<'hardware' | 'screen'> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return 'screen';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      return 'screen';
    }
    const caps = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
    if (caps.torch) {
      await track.applyConstraints({
        advanced: [{ torch: true } as MediaTrackConstraintSet],
      });
      torchStream = stream;
      return 'hardware';
    }
    stream.getTracks().forEach((t) => t.stop());
    return 'screen';
  } catch {
    return 'screen';
  }
}

export function disableFlashlightTorch(): void {
  if (torchStream) {
    torchStream.getTracks().forEach((t) => t.stop());
    torchStream = null;
  }
}

/**
 * Free OpenStreetMap Nominatim reverse geocoding (zero API keys) for Emergency Screen.
 */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat.toFixed(6)
    )}&lon=${encodeURIComponent(lng.toFixed(6))}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Geocoder unavailable');
    const data = (await res.json()) as { display_name?: string };
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `GPS Lock: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Subtle walkie-talkie PTT chirp when keying up or releasing transmission.
 */
export function playRadioKeyTone(kind: 'start' | 'end'): void {
  try {
    unlockAudioSession();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    if (kind === 'start') {
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(1280, now + 0.055);
    } else {
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.085);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'start' ? 0.065 : 0.095));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    // ignore Web Audio failures
  }
}

/**
 * Low-bitrate Walkie-Talkie voice clip recorder (capped at 10 seconds for weak cellular links)
 * with live AudioContext AnalyserNode level metering for real-time waveform animations.
 */
export interface ActiveRecorder {
  stop: () => Promise<{ base64: string; mimeType: string; durationSec: number } | null>;
  cancel: () => void;
}

export interface RadioStartResult {
  recorder: ActiveRecorder | null;
  error?: 'permission_denied' | 'no_device' | 'unsupported';
}

export async function startRadioRecording(
  maxSeconds = 10,
  onAudioLevel?: (level: number) => void
): Promise<RadioStartResult> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === 'undefined'
  ) {
    return { recorder: null, error: 'unsupported' };
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      return { recorder: null, error: 'permission_denied' };
    }
    return { recorder: null, error: 'no_device' };
  }

  try {
    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 12000,
    });

    // Live voice level metering for animated waveform
    let meterRaf: number | null = null;
    let meterSource: MediaStreamAudioSourceNode | null = null;
    if (onAudioLevel) {
      try {
        unlockAudioSession();
        if (audioCtx) {
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.72;
          meterSource = audioCtx.createMediaStreamSource(stream);
          meterSource.connect(analyser);
          const bins = new Uint8Array(analyser.frequencyBinCount);
          const sample = () => {
            analyser.getByteTimeDomainData(bins);
            let peak = 0;
            for (let i = 0; i < bins.length; i++) {
              const v = Math.abs(bins[i] - 128) / 128;
              if (v > peak) peak = v;
            }
            onAudioLevel(Math.min(1, peak * 2.6));
            meterRaf = requestAnimationFrame(sample);
          };
          meterRaf = requestAnimationFrame(sample);
        }
      } catch {
        // Metering optional; recording still works
      }
    }

    const stopMeter = () => {
      if (meterRaf !== null) {
        cancelAnimationFrame(meterRaf);
        meterRaf = null;
      }
      if (meterSource) {
        try {
          meterSource.disconnect();
        } catch {
          // ignore
        }
        meterSource = null;
      }
      onAudioLevel?.(0);
    };

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    let cancelled = false;
    let resolveStop:
      | ((val: { base64: string; mimeType: string; durationSec: number } | null) => void)
      | null = null;

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onstop = () => {
      stopMeter();
      stream.getTracks().forEach((t) => t.stop());
      if (cancelled) {
        resolveStop?.(null);
        return;
      }
      const durationSec = Math.max(0.3, (Date.now() - startedAt) / 1000);
      const effectiveMime = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: effectiveMime });
      if (blob.size === 0) {
        resolveStop?.(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolveStop?.(base64 ? { base64, mimeType: effectiveMime, durationSec } : null);
      };
      reader.onerror = () => resolveStop?.(null);
      reader.readAsDataURL(blob);
    };

    recorder.start(200);
    const maxTimer = window.setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, maxSeconds * 1000);

    return {
      recorder: {
        stop: () =>
          new Promise((resolve) => {
            window.clearTimeout(maxTimer);
            resolveStop = resolve;
            if (recorder.state === 'recording') {
              recorder.stop();
            } else {
              stopMeter();
              stream.getTracks().forEach((t) => t.stop());
              resolve(null);
            }
          }),
        cancel: () => {
          window.clearTimeout(maxTimer);
          cancelled = true;
          resolveStop = null;
          stopMeter();
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          stream.getTracks().forEach((t) => t.stop());
        },
      },
    };
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return { recorder: null, error: 'unsupported' };
  }
}

export interface VoicePlaybackHandle {
  stop: () => void;
}

export function playVoiceClip(
  base64: string,
  mimeType: string,
  onEnded?: () => void
): VoicePlaybackHandle | null {
  try {
    unlockAudioSession();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      URL.revokeObjectURL(url);
      onEnded?.();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    void audio.play().catch(cleanup);
    return {
      stop: () => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // ignore
        }
        cleanup();
      },
    };
  } catch {
    onEnded?.();
    return null;
  }
}

/**
 * Generates a compact valid WAV tone clip (base64) for Solo Demo voice message testing
 * on devices without a physical microphone.
 */
export function createDemoVoiceWavBase64(durationSec = 1.2): { base64: string; mimeType: string } {
  const sampleRate = 8000;
  const clampedSec = Math.min(4, Math.max(0.6, durationSec));
  const numSamples = Math.floor(sampleRate * clampedSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 14) * Math.min(1, (clampedSec - t) * 14);
    const freq = t < clampedSec * 0.45 ? 587.33 : 880;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.22 * env;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { base64: btoa(binary), mimeType: 'audio/wav' };
}
