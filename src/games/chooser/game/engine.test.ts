import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChooserEngine,
  COUNTDOWN_DURATION,
  MAX_FINGERS,
  MIN_PULSE_HZ,
  MAX_PULSE_HZ,
  computePulseFrequencyHz,
} from './engine';

test('supports up to 10 simultaneous fingers with 10 distinct neon colors', () => {
  const engine = new ChooserEngine(() => 0);
  const colors = new Set<number>();

  for (let i = 0; i < 12; i++) {
    engine.touchStart(i + 1, 100 + i * 20, 200);
  }

  assert.equal(engine.getActiveCount(), MAX_FINGERS);
  for (const finger of engine.activeFingers.values()) {
    colors.add(finger.colorIndex);
  }
  assert.equal(colors.size, 10);

  // Lifting a finger frees its color for a subsequent touch
  const removedColor = engine.activeFingers.get(1)!.colorIndex;
  engine.touchEnd(1);
  assert.equal(engine.getActiveCount(), 9);
  engine.touchStart(99, 300, 300);
  assert.equal(engine.getActiveCount(), 10);
  assert.equal(engine.activeFingers.get(99)!.colorIndex, removedColor);
});

test('elastic spring overshoot peaks near 1.18 and settles to 1.0', () => {
  const engine = new ChooserEngine();
  engine.touchStart(1, 200, 200);

  let maxScale = 0;
  for (let i = 0; i < 90; i++) {
    engine.step(1 / 120);
    const scale = engine.activeFingers.get(1)!.scale;
    if (scale > maxScale) maxScale = scale;
  }

  assert.ok(
    maxScale >= 1.15 && maxScale <= 1.21,
    `Expected peak overshoot ~1.18, got ${maxScale.toFixed(4)}`
  );
  const finalScale = engine.activeFingers.get(1)!.scale;
  assert.ok(
    Math.abs(finalScale - 1.0) < 0.02,
    `Expected settled scale ~1.0, got ${finalScale.toFixed(4)}`
  );
});

test('idle state with 0 or 1 fingers does not run countdown', () => {
  const engine = new ChooserEngine();
  engine.step(0.05);
  assert.equal(engine.phase, 'idle');
  assert.equal(engine.countdownElapsed, 0);

  engine.touchStart(1, 120, 240);
  assert.equal(engine.phase, 'idle');
  for (let i = 0; i < 60; i++) engine.step(0.05);
  assert.equal(engine.phase, 'idle');
  assert.equal(engine.countdownElapsed, 0);
});

test('pulse frequency smoothly accelerates from 2 Hz at 0.0s to 16 Hz at 5.0s', () => {
  assert.equal(computePulseFrequencyHz(0), MIN_PULSE_HZ);
  assert.equal(computePulseFrequencyHz(1), MAX_PULSE_HZ);
  assert.ok(computePulseFrequencyHz(0.5) > MIN_PULSE_HZ);
  assert.ok(computePulseFrequencyHz(0.5) < MAX_PULSE_HZ);
  assert.ok(computePulseFrequencyHz(0.8) > computePulseFrequencyHz(0.4));
});

test('5.0-second countdown resets fairly on new finger or finger lift', () => {
  const engine = new ChooserEngine(() => 0.4);
  engine.touchStart(1, 100, 100);
  engine.touchStart(2, 200, 200);
  assert.equal(engine.phase, 'countdown');

  // Advance 2.5 seconds
  for (let i = 0; i < 50; i++) engine.step(0.05);
  assert.ok(Math.abs(engine.countdownElapsed - 2.5) < 0.001);

  // Adding a 3rd finger resets timer back to 0.0s
  engine.touchStart(3, 300, 300);
  assert.equal(engine.phase, 'countdown');
  assert.equal(engine.countdownElapsed, 0);

  // Advance 1.5 seconds
  for (let i = 0; i < 30; i++) engine.step(0.05);
  assert.ok(Math.abs(engine.countdownElapsed - 1.5) < 0.001);

  // Lifting 1 of 3 fingers keeps countdown active but resets timer to 0.0s
  engine.touchEnd(3);
  assert.equal(engine.phase, 'countdown');
  assert.equal(engine.countdownElapsed, 0);
  assert.equal(engine.getActiveCount(), 2);

  // Lifting another finger leaves only 1 -> cancels countdown back to idle
  engine.touchEnd(2);
  assert.equal(engine.phase, 'idle');
  assert.equal(engine.countdownElapsed, 0);
  assert.equal(engine.getActiveCount(), 1);
});

test('winner reveal at 5.0s selects one active finger, vanishes others, and resets only after all fingers lift', () => {
  // rng = 0.6 with 3 fingers -> Math.floor(0.6 * 3) = 1 -> second finger (id=20)
  const engine = new ChooserEngine(() => 0.6);
  engine.touchStart(10, 100, 100);
  engine.touchStart(20, 200, 200);
  engine.touchStart(30, 300, 300);

  const tickFreqs: number[] = [];
  let winnerEventId: number | null = null;

  // Step 5.05s in 1/60s frames
  for (let i = 0; i < 305; i++) {
    const events = engine.step(1 / 60);
    for (const ev of events) {
      if (ev.type === 'tick') tickFreqs.push(ev.frequencyHz);
      if (ev.type === 'winner') winnerEventId = ev.id;
    }
  }

  assert.equal(engine.phase, 'winner');
  assert.equal(engine.winnerId, 20);
  assert.equal(winnerEventId, 20);
  assert.equal(engine.getActiveCount(), 1);
  assert.ok(engine.activeFingers.has(20));
  assert.equal(engine.activeFingers.has(10), false);
  assert.equal(engine.activeFingers.has(30), false);

  // Verify accelerating ticks occurred across the 5.0s countdown
  assert.ok(tickFreqs.length >= 20, `Expected accelerating ticks, got ${tickFreqs.length}`);
  assert.ok(tickFreqs[tickFreqs.length - 1] > tickFreqs[0] * 4);

  // Winner stays highlighted even if the winning finger lifts while others remain down
  engine.touchEnd(20);
  assert.equal(engine.phase, 'winner');
  assert.equal(engine.getActiveCount(), 1);

  engine.touchEnd(10);
  assert.equal(engine.phase, 'winner');
  assert.equal(engine.getActiveCount(), 1);

  // Lifting the final finger fades out winner and returns to idle ready for next round
  engine.touchEnd(30);
  assert.equal(engine.phase, 'idle');
  assert.equal(engine.winnerId, null);
  assert.equal(engine.getActiveCount(), 0);
  assert.equal(engine.dyingFingers.length, 1);
  assert.equal(engine.dyingFingers[0].kind, 'winnerFade');

  // Verify next round starts cleanly immediately
  engine.touchStart(101, 150, 150);
  engine.touchStart(102, 250, 250);
  assert.equal(engine.phase, 'countdown');
  assert.equal(COUNTDOWN_DURATION, 5.0);
});

test('reconcilePhysicalTouches clears dropped touches and resets winner when screen is empty', () => {
  const engine = new ChooserEngine(() => 0.1);
  engine.touchStart(1, 100, 100);
  engine.touchStart(2, 200, 200);
  for (let i = 0; i < 310; i++) engine.step(1 / 60);
  assert.equal(engine.phase, 'winner');

  // Simulate iOS dropping touch 2 without touchend, leaving empty live touch set
  engine.reconcilePhysicalTouches(new Set());
  assert.equal(engine.phase, 'idle');
  assert.equal(engine.winnerId, null);
  assert.equal(engine.getActiveCount(), 0);
});
