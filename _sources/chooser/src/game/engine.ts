import { NEON_PALETTE, type NeonColor } from './palette';

export const MAX_FINGERS = 10;
export const COUNTDOWN_DURATION = 5.0; // seconds
export const MIN_PULSE_HZ = 2.0;
export const MAX_PULSE_HZ = 16.0;
export const MAX_TRAIL_POINTS = 30;
export const TRAIL_LIFETIME = 0.42; // seconds

// Tuned damped harmonic spring: zeta ~= 0.479 gives ~1.18 overshoot peaking around ~128ms
const SPRING_OMEGA = 28.0;
const SPRING_ZETA = 0.479;
const SPRING_SUBSTEP = 0.004;

export type GamePhase = 'idle' | 'countdown' | 'winner';

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface ActiveFinger {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speedSmoothed: number;
  colorIndex: number;
  color: NeonColor;
  scale: number;
  scaleVel: number;
  targetScale: number;
  age: number;
  trail: TrailPoint[];
  isWinner: boolean;
  winnerTime: number;
}

export interface DyingFinger {
  x: number;
  y: number;
  color: NeonColor;
  startScale: number;
  elapsed: number;
  duration: number;
  kind: 'lift' | 'winnerFade';
}

export interface Ripple {
  x: number;
  y: number;
  color: NeonColor;
  startRadius: number;
  endRadius: number;
  elapsed: number;
  duration: number;
  lineWidth: number;
  maxAlpha: number;
}

export type EngineEvent =
  | { type: 'fingerDown'; id: number; colorIndex: number }
  | { type: 'fingerLift'; id: number }
  | { type: 'tick'; progress: number; frequencyHz: number }
  | { type: 'winner'; id: number; colorIndex: number };

export function computePulseFrequencyHz(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return MIN_PULSE_HZ + (MAX_PULSE_HZ - MIN_PULSE_HZ) * Math.pow(p, 1.7);
}

export class ChooserEngine {
  public phase: GamePhase = 'idle';
  public activeFingers: Map<number, ActiveFinger> = new Map();
  public physicalTouchIds: Set<number> = new Set();
  public dyingFingers: DyingFinger[] = [];
  public ripples: Ripple[] = [];
  public countdownElapsed = 0;
  public pulsePhase = 0;
  public flashIntensity = 0;
  public winnerId: number | null = null;
  public time = 0;

  private lastTickIndex = -1;
  private nextColorCursor = 0;
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  public getCountdownProgress(): number {
    if (this.phase !== 'countdown') return 0;
    return Math.max(0, Math.min(1, this.countdownElapsed / COUNTDOWN_DURATION));
  }

  public getCurrentPulseHz(): number {
    if (this.phase !== 'countdown') return 0;
    return computePulseFrequencyHz(this.getCountdownProgress());
  }

  public getActiveCount(): number {
    return this.activeFingers.size;
  }

  private allocateColorIndex(): number {
    const used = new Set<number>();
    for (const finger of this.activeFingers.values()) {
      used.add(finger.colorIndex);
    }
    for (let offset = 0; offset < NEON_PALETTE.length; offset++) {
      const idx = (this.nextColorCursor + offset) % NEON_PALETTE.length;
      if (!used.has(idx)) {
        this.nextColorCursor = (idx + 1) % NEON_PALETTE.length;
        return idx;
      }
    }
    const fallback = this.nextColorCursor % NEON_PALETTE.length;
    this.nextColorCursor = (fallback + 1) % NEON_PALETTE.length;
    return fallback;
  }

  private resetCountdownState(): void {
    this.countdownElapsed = 0;
    this.pulsePhase = 0;
    this.flashIntensity = 0;
    this.lastTickIndex = -1;
  }

  public touchStart(id: number, x: number, y: number): EngineEvent[] {
    const events: EngineEvent[] = [];

    if (this.physicalTouchIds.has(id)) {
      this.touchMove(id, x, y);
      return events;
    }

    // While winner is revealed, track physical touches so winner stays highlighted until all fingers lift,
    // without spawning new circles mid-celebration.
    if (this.phase === 'winner') {
      if (this.physicalTouchIds.size < MAX_FINGERS) {
        this.physicalTouchIds.add(id);
      }
      return events;
    }

    if (this.activeFingers.size >= MAX_FINGERS) {
      return events;
    }

    this.physicalTouchIds.add(id);
    const colorIndex = this.allocateColorIndex();
    const color = NEON_PALETTE[colorIndex];

    const finger: ActiveFinger = {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      speedSmoothed: 0,
      colorIndex,
      color,
      scale: 0,
      scaleVel: 0,
      targetScale: 1.0,
      age: 0,
      trail: [{ x, y, age: 0 }],
      isWinner: false,
      winnerTime: 0,
    };

    this.activeFingers.set(id, finger);

    // Expanding outer ripple ring on finger down
    this.ripples.push({
      x,
      y,
      color,
      startRadius: 34,
      endRadius: 118,
      elapsed: 0,
      duration: 0.44,
      lineWidth: 2.5,
      maxAlpha: 0.72,
    });

    events.push({ type: 'fingerDown', id, colorIndex });

    // Start or fairly reset the 5.0-second countdown whenever 2+ fingers are down
    if (this.activeFingers.size >= 2) {
      this.phase = 'countdown';
      this.resetCountdownState();
    } else {
      this.phase = 'idle';
      this.resetCountdownState();
    }

    return events;
  }

  public touchMove(id: number, x: number, y: number, dtHint = 1 / 60): void {
    const finger = this.activeFingers.get(id);
    if (!finger) return;

    const dx = x - finger.x;
    const dy = y - finger.y;
    const dist = Math.hypot(dx, dy);

    finger.x = x;
    finger.y = y;

    const safeDt = Math.max(0.004, Math.min(0.05, dtHint));
    finger.vx = dx / safeDt;
    finger.vy = dy / safeDt;

    if (dist > 1.5) {
      const last = finger.trail[finger.trail.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) >= 3) {
        finger.trail.push({ x, y, age: 0 });
        if (finger.trail.length > MAX_TRAIL_POINTS) {
          finger.trail.shift();
        }
      }
    }
  }

  public touchEnd(id: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    this.physicalTouchIds.delete(id);

    if (this.phase === 'winner') {
      // Keep the winning circle highlighted until ALL fingers are lifted off the screen
      if (this.physicalTouchIds.size === 0) {
        if (this.winnerId !== null) {
          const winner = this.activeFingers.get(this.winnerId);
          if (winner) {
            this.dyingFingers.push({
              x: winner.x,
              y: winner.y,
              color: winner.color,
              startScale: winner.scale,
              elapsed: 0,
              duration: 0.42,
              kind: 'winnerFade',
            });
          }
        }
        this.activeFingers.clear();
        this.winnerId = null;
        this.phase = 'idle';
        this.resetCountdownState();
      }
      return events;
    }

    const finger = this.activeFingers.get(id);
    if (!finger) return events;

    this.activeFingers.delete(id);

    // Smooth shrink + fade out with dissipating ring burst
    this.dyingFingers.push({
      x: finger.x,
      y: finger.y,
      color: finger.color,
      startScale: Math.max(0.2, finger.scale),
      elapsed: 0,
      duration: 0.28,
      kind: 'lift',
    });

    this.ripples.push({
      x: finger.x,
      y: finger.y,
      color: finger.color,
      startRadius: 46 * Math.max(0.5, finger.scale),
      endRadius: 96,
      elapsed: 0,
      duration: 0.34,
      lineWidth: 2.0,
      maxAlpha: 0.48,
    });

    events.push({ type: 'fingerLift', id });

    // Fair reset: if >= 2 fingers remain, reset the 5.0-second timer; otherwise cancel to idle
    if (this.activeFingers.size >= 2) {
      this.phase = 'countdown';
      this.resetCountdownState();
    } else {
      this.phase = 'idle';
      this.resetCountdownState();
    }

    return events;
  }

  public reconcilePhysicalTouches(liveIds: ReadonlySet<number>): EngineEvent[] {
    const events: EngineEvent[] = [];
    const staleIds: number[] = [];
    for (const id of this.physicalTouchIds) {
      if (!liveIds.has(id)) {
        staleIds.push(id);
      }
    }
    for (const id of staleIds) {
      events.push(...this.touchEnd(id));
    }
    return events;
  }

  public step(rawDt: number): EngineEvent[] {
    const dt = Math.max(0, Math.min(0.05, rawDt));
    const events: EngineEvent[] = [];
    if (dt === 0) return events;

    this.time += dt;

    // Update active fingers (spring scale, velocity smoothing, trail decay)
    for (const finger of this.activeFingers.values()) {
      finger.age += dt;
      if (finger.isWinner) {
        finger.winnerTime += dt;
      }

      // Sub-stepped damped spring for exact, frame-rate-independent 1.18 elastic overshoot
      let remaining = dt;
      while (remaining > 0) {
        const h = Math.min(SPRING_SUBSTEP, remaining);
        const displacement = finger.scale - finger.targetScale;
        const accel =
          -SPRING_OMEGA * SPRING_OMEGA * displacement -
          2 * SPRING_ZETA * SPRING_OMEGA * finger.scaleVel;
        finger.scaleVel += accel * h;
        finger.scale += finger.scaleVel * h;
        remaining -= h;
      }

      // Smoothly decay velocity and update velocity-reactive ring factor
      const instSpeed = Math.hypot(finger.vx, finger.vy);
      const blend = 1 - Math.exp(-14 * dt);
      finger.speedSmoothed += (instSpeed - finger.speedSmoothed) * blend;
      const decay = Math.exp(-12 * dt);
      finger.vx *= decay;
      finger.vy *= decay;

      // Age & prune glow trail points
      for (let i = finger.trail.length - 1; i >= 0; i--) {
        finger.trail[i].age += dt;
        if (finger.trail[i].age >= TRAIL_LIFETIME) {
          finger.trail.splice(i, 1);
        }
      }
    }

    // Countdown progression, accelerating flash, audio ticks, and winner reveal
    if (this.phase === 'countdown' && this.activeFingers.size >= 2) {
      this.countdownElapsed += dt;
      const progress = Math.min(1, this.countdownElapsed / COUNTDOWN_DURATION);
      const freqHz = computePulseFrequencyHz(progress);

      this.pulsePhase += 2 * Math.PI * freqHz * dt;
      const wave = 0.5 - 0.5 * Math.cos(this.pulsePhase);
      this.flashIntensity = Math.pow(wave, 1.3);

      // Trigger synchronized subtle audio tick at each flash peak
      const tickIndex = Math.floor((this.pulsePhase + Math.PI) / (2 * Math.PI));
      if (tickIndex > this.lastTickIndex && this.countdownElapsed < COUNTDOWN_DURATION) {
        this.lastTickIndex = tickIndex;
        events.push({ type: 'tick', progress, frequencyHz: freqHz });
      }

      if (this.countdownElapsed >= COUNTDOWN_DURATION) {
        this.revealWinner(events);
      }
    } else if (this.phase !== 'countdown') {
      this.flashIntensity = 0;
    }

    // Update dying fingers
    for (let i = this.dyingFingers.length - 1; i >= 0; i--) {
      const df = this.dyingFingers[i];
      df.elapsed += dt;
      if (df.elapsed >= df.duration) {
        this.dyingFingers.splice(i, 1);
      }
    }

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.elapsed += dt;
      if (r.elapsed >= r.duration) {
        this.ripples.splice(i, 1);
      }
    }

    return events;
  }

  private revealWinner(events: EngineEvent[]): void {
    const activeIds = Array.from(this.activeFingers.keys());
    if (activeIds.length === 0) {
      this.phase = 'idle';
      this.resetCountdownState();
      return;
    }

    const chosenIndex = Math.min(
      activeIds.length - 1,
      Math.floor(this.rng() * activeIds.length)
    );
    const chosenId = activeIds[chosenIndex];
    const winner = this.activeFingers.get(chosenId)!;

    // Immediately vanish all other circles so ONLY the chosen finger remains visible
    for (const id of activeIds) {
      if (id !== chosenId) {
        this.activeFingers.delete(id);
      }
    }

    // Clear residual ripples so the celebratory winner halo owns the screen
    this.ripples = [];
    this.dyingFingers = [];

    this.phase = 'winner';
    this.winnerId = chosenId;
    this.flashIntensity = 0;

    winner.isWinner = true;
    winner.winnerTime = 0;
    winner.targetScale = 1.42;
    winner.scaleVel = 6.5;

    // Celebratory shockwave halo rings
    this.ripples.push(
      {
        x: winner.x,
        y: winner.y,
        color: winner.color,
        startRadius: 56,
        endRadius: 240,
        elapsed: 0,
        duration: 0.72,
        lineWidth: 3.5,
        maxAlpha: 0.9,
      },
      {
        x: winner.x,
        y: winner.y,
        color: winner.color,
        startRadius: 48,
        endRadius: 170,
        elapsed: 0,
        duration: 0.54,
        lineWidth: 2.0,
        maxAlpha: 0.65,
      }
    );

    events.push({
      type: 'winner',
      id: chosenId,
      colorIndex: winner.colorIndex,
    });
  }

  public clearAll(): void {
    this.activeFingers.clear();
    this.physicalTouchIds.clear();
    this.dyingFingers = [];
    this.ripples = [];
    this.winnerId = null;
    this.phase = 'idle';
    this.resetCountdownState();
  }
}
