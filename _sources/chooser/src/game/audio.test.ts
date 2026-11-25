import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChooserAudio,
  configurePlaybackAudioSession,
  SILENT_WAV_DATA_URI,
} from './audio';

test('SILENT_WAV_DATA_URI decodes to a valid 8kHz mono 8-bit PCM silent WAV', () => {
  assert.ok(SILENT_WAV_DATA_URI.startsWith('data:audio/wav;base64,'));
  const base64 = SILENT_WAV_DATA_URI.slice('data:audio/wav;base64,'.length);
  const buf = Buffer.from(base64, 'base64');

  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.readUInt32LE(4), buf.length - 8);
  assert.equal(buf.toString('ascii', 8, 12), 'WAVE');
  assert.equal(buf.toString('ascii', 12, 16), 'fmt ');
  assert.equal(buf.readUInt16LE(20), 1); // PCM
  assert.equal(buf.readUInt16LE(22), 1); // mono
  assert.equal(buf.readUInt32LE(24), 8000); // 8kHz
  assert.equal(buf.readUInt16LE(34), 8); // 8-bit
  assert.equal(buf.toString('ascii', 36, 40), 'data');

  const dataLen = buf.readUInt32LE(40);
  assert.equal(dataLen, buf.length - 44);
  assert.equal(dataLen, 802);

  // Every PCM sample must be 0x80 (exact zero-amplitude silence for unsigned 8-bit WAV)
  for (let i = 44; i < buf.length; i++) {
    assert.equal(buf[i], 0x80);
  }
});

test('configurePlaybackAudioSession sets navigator.audioSession.type to playback when supported', () => {
  const fakeNav = { audioSession: { type: 'ambient' } } as unknown as Navigator & {
    audioSession: { type: string };
  };
  const ok = configurePlaybackAudioSession(fakeNav);
  assert.equal(ok, true);
  assert.equal(fakeNav.audioSession.type, 'playback');

  const unsupportedNav = {} as Navigator;
  assert.equal(configurePlaybackAudioSession(unsupportedNav), false);
});

test('ChooserAudio.unlock configures audioSession before AudioContext and plays silent keep-alive element', () => {
  const order: string[] = [];
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  const fakeSession = {
    _type: 'ambient',
    get type() {
      return this._type;
    },
    set type(val: string) {
      this._type = val;
      order.push(`audioSession=${val}`);
    },
  };

  class FakeAudioContext {
    public state = 'suspended';
    public destination = {};
    constructor() {
      order.push('AudioContext.new');
    }
    createGain() {
      return { gain: { value: 1 }, connect() {} };
    }
    resume() {
      order.push('AudioContext.resume');
      this.state = 'running';
      return Promise.resolve();
    }
    createBuffer() {
      return {};
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} };
    }
  }

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { audioSession: fakeSession },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { AudioContext: FakeAudioContext },
  });

  try {
    const audio = new ChooserAudio();
    assert.deepEqual(order, ['audioSession=playback']);

    let played = false;
    const fakeAudioEl = {
      loop: false,
      muted: true,
      volume: 0,
      paused: true,
      play() {
        played = true;
        order.push('keepAlive.play');
        return Promise.resolve();
      },
      pause() {},
    } as unknown as HTMLAudioElement;

    audio.unlock(fakeAudioEl);

    assert.equal(played, true);
    assert.equal(fakeAudioEl.loop, true);
    assert.equal(fakeAudioEl.muted, false);
    assert.equal(order[1], 'audioSession=playback');
    assert.ok(order.indexOf('keepAlive.play') < order.indexOf('AudioContext.new'));
    assert.ok(order.indexOf('AudioContext.new') < order.indexOf('AudioContext.resume'));
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete (globalThis as Record<string, unknown>).navigator;
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  }
});
