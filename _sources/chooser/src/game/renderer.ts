import {
  type ActiveFinger,
  type ChooserEngine,
  TRAIL_LIFETIME,
} from './engine';
import { rgba } from './palette';

const OLED_BG = '#07070A';
const BASE_FINGER_RADIUS = 50;

function easeOutCubic(t: number): number {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

export function renderChooserCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: ChooserEngine
): void {
  // Pure deep OLED dark canvas
  ctx.fillStyle = OLED_BG;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient winner backdrop illumination when chosen
  if (engine.phase === 'winner' && engine.winnerId !== null) {
    const winner = engine.activeFingers.get(engine.winnerId);
    if (winner) {
      const pulse = 0.5 + 0.5 * Math.sin(engine.time * 4.2);
      const bgGlowRadius = Math.max(width, height) * 0.62;
      const bgGrad = ctx.createRadialGradient(
        winner.x,
        winner.y,
        20,
        winner.x,
        winner.y,
        bgGlowRadius
      );
      bgGrad.addColorStop(0, rgba(winner.color.rgb, 0.18 + pulse * 0.05));
      bgGrad.addColorStop(0.45, rgba(winner.color.rgb, 0.05));
      bgGrad.addColorStop(1, rgba(winner.color.rgb, 0));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 1. Render expanding outer ripples (finger down, lift burst, winner shockwaves)
  for (const ripple of engine.ripples) {
    const t = Math.min(1, ripple.elapsed / ripple.duration);
    const eased = easeOutCubic(t);
    const radius = ripple.startRadius + (ripple.endRadius - ripple.startRadius) * eased;
    const alpha = ripple.maxAlpha * (1 - t) * (1 - t * 0.35);
    if (alpha <= 0.004) continue;

    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(ripple.color.rgb, alpha);
    ctx.lineWidth = Math.max(0.75, ripple.lineWidth * (1 - t * 0.55));
    ctx.stroke();
  }

  // 2. Render dying / fading circles (lift or post-winner fade-out)
  for (const df of engine.dyingFingers) {
    const t = Math.min(1, df.elapsed / df.duration);
    const eased = easeOutCubic(t);
    const alpha = 1 - eased;
    if (alpha <= 0.004) continue;

    const scale =
      df.kind === 'winnerFade'
        ? df.startScale * (1 + eased * 0.18)
        : df.startScale * (1 - eased * 0.85);
    const radius = Math.max(2, BASE_FINGER_RADIUS * scale);

    // Soft glow
    const glow = ctx.createRadialGradient(df.x, df.y, 0, df.x, df.y, radius * 1.85);
    glow.addColorStop(0, rgba(df.color.rgb, 0.22 * alpha));
    glow.addColorStop(1, rgba(df.color.rgb, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(df.x, df.y, radius * 1.85, 0, Math.PI * 2);
    ctx.fill();

    // Inner fill + crisp ring
    ctx.beginPath();
    ctx.arc(df.x, df.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = rgba(df.color.rgb, 0.14 * alpha);
    ctx.fill();
    ctx.strokeStyle = rgba(df.color.rgb, 0.9 * alpha);
    ctx.lineWidth = 3.5 * alpha + 0.5;
    ctx.stroke();
  }

  // 3. Render smooth fading fingertip glow trails
  for (const finger of engine.activeFingers.values()) {
    drawFingerTrail(ctx, finger);
  }

  // 4. Render active finger circles
  const countdownProgress = engine.getCountdownProgress();
  for (const finger of engine.activeFingers.values()) {
    drawActiveFinger(ctx, finger, engine, countdownProgress);
  }
}

function drawFingerTrail(ctx: CanvasRenderingContext2D, finger: ActiveFinger): void {
  const pts = finger.trail;
  if (pts.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const life = Math.max(0, 1 - curr.age / TRAIL_LIFETIME);
    if (life <= 0.01) continue;

    const taper = life * life;

    // Outer OLED bloom ribbon
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = rgba(finger.color.rgb, taper * 0.34);
    ctx.lineWidth = 14 + taper * 32;
    ctx.stroke();

    // Crisp luminous mid-trail
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = rgba(finger.color.rgb, taper * 0.72);
    ctx.lineWidth = 4 + taper * 12;
    ctx.stroke();

    // Bright core filament
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(taper * 0.42).toFixed(3)})`;
    ctx.lineWidth = 1.5 + taper * 3.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawActiveFinger(
  ctx: CanvasRenderingContext2D,
  finger: ActiveFinger,
  engine: ChooserEngine,
  countdownProgress: number
): void {
  const isIdle = engine.phase === 'idle';
  const isCountdown = engine.phase === 'countdown';
  const isWinner = finger.isWinner;

  // Idle gentle breathing vs. accelerating countdown pulse vs. celebratory winner halo
  const breathe = isIdle ? 1 + 0.038 * Math.sin(engine.time * 2.4 + finger.colorIndex) : 1;
  const flash = isCountdown ? engine.flashIntensity : 0;
  const countdownPulseScale = isCountdown ? 1 + flash * (0.07 + countdownProgress * 0.095) : 1;
  const winnerPulse = isWinner ? 0.5 + 0.5 * Math.sin(finger.winnerTime * 5.6) : 0;
  const winnerScaleMod = isWinner ? 1 + winnerPulse * 0.055 : 1;

  // Velocity-reactive outer ring expansion as finger moves
  const speedNorm = Math.min(1, finger.speedSmoothed / 950);
  const velocityBoost = speedNorm * 18;

  const coreRadius = Math.max(
    4,
    BASE_FINGER_RADIUS * Math.max(0, finger.scale) * breathe * countdownPulseScale * winnerScaleMod
  );

  // Subtle trough dimming near climax makes accelerating flashes pop dramatically on OLED
  const flashBrightness = isCountdown
    ? 0.52 + 0.48 * flash + countdownProgress * 0.22 * flash
    : 1;

  // A. Radial OLED ambient glow beneath circle (fast gradient, zero shadowBlur jank)
  const glowRadius = coreRadius * (isWinner ? 2.9 : 2.1 + flash * 0.65 + speedNorm * 0.4);
  const glowAlpha = isWinner
    ? 0.46 + winnerPulse * 0.14
    : (0.2 + flash * (0.34 + countdownProgress * 0.18)) * flashBrightness;
  const glow = ctx.createRadialGradient(
    finger.x,
    finger.y,
    coreRadius * 0.15,
    finger.x,
    finger.y,
    glowRadius
  );
  glow.addColorStop(0, rgba(finger.color.rgb, Math.min(0.75, glowAlpha)));
  glow.addColorStop(0.55, rgba(finger.color.rgb, Math.min(0.3, glowAlpha * 0.34)));
  glow.addColorStop(1, rgba(finger.color.rgb, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(finger.x, finger.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // B. Velocity-reactive / celebratory outer halo ring
  if (isWinner) {
    const halo1R = coreRadius + 18 + winnerPulse * 22;
    const halo2R = coreRadius + 38 + winnerPulse * 36;

    ctx.beginPath();
    ctx.arc(finger.x, finger.y, halo1R, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(finger.color.rgb, 0.78 - winnerPulse * 0.24);
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(finger.x, finger.y, halo2R, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(finger.color.rgb, 0.34 - winnerPulse * 0.15);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    const outerRingRadius = coreRadius + 10 + velocityBoost + flash * 10;
    const outerAlpha = (0.22 + speedNorm * 0.4 + flash * 0.44) * flashBrightness;
    ctx.beginPath();
    ctx.arc(finger.x, finger.y, outerRingRadius, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(finger.color.rgb, Math.min(0.92, outerAlpha));
    ctx.lineWidth = 1.6 + speedNorm * 1.4 + flash * 1.4;
    ctx.stroke();
  }

  // C. Main luminous circle body
  const fillAlpha = isWinner
    ? 0.34 + winnerPulse * 0.1
    : (0.13 + flash * (0.38 + countdownProgress * 0.2)) * flashBrightness;
  ctx.beginPath();
  ctx.arc(finger.x, finger.y, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = rgba(finger.color.rgb, Math.min(0.68, fillAlpha));
  ctx.fill();

  // Main neon stroke ring
  ctx.beginPath();
  ctx.arc(finger.x, finger.y, coreRadius, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(finger.color.rgb, Math.min(1, 0.65 + 0.35 * flashBrightness));
  ctx.lineWidth = isWinner ? 6.0 : 4.2 + flash * 2.6;
  ctx.stroke();

  // White-hot flash highlight ring during countdown peaks or winner celebration
  if (flash > 0.08 || isWinner) {
    ctx.beginPath();
    ctx.arc(finger.x, finger.y, coreRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isWinner
      ? `rgba(255, 255, 255, ${(0.52 + winnerPulse * 0.26).toFixed(3)})`
      : `rgba(255, 255, 255, ${(flash * (0.45 + countdownProgress * 0.45)).toFixed(3)})`;
    ctx.lineWidth = isWinner ? 2.6 : 1.8 + flash * 1.4;
    ctx.stroke();
  }

  // D. Inner tactile fingertip core ring / focal dot
  const innerRadius = coreRadius * (isWinner ? 0.54 : 0.4);
  ctx.beginPath();
  ctx.arc(finger.x, finger.y, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = isWinner
    ? finger.color.coreHex
    : rgba(finger.color.rgb, Math.min(0.95, (0.28 + flash * 0.56) * flashBrightness));
  ctx.fill();
}
