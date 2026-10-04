import assert from 'node:assert';
import test from 'node:test';
import { PLAYBACK_STATUS } from '../../../types/playerConstants.js';
import { createDefaultSnapshot } from '../adapters/AudioPlayerInterface.js';
import { WebAudioPlayerAdapter } from '../adapters/WebAudioPlayerAdapter.js';
import { AudioPlayerService } from '../AudioPlayerService.js';

test('Seeking Lifecycle: seeking -> seeked transitions state correctly (ISSUE-02)', async () => {
  class MockSeekAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.IDLE;
      this.currentTrackId = null;
      this.currentTime = 0;
      this.duration = 180;
      this.listeners = new Map();
    }

    async init() {}

    async loadTrack(trackId) {
      this.currentTrackId = trackId;
      this.status = PLAYBACK_STATUS.READY;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async play() {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async pause() {
      this.status = PLAYBACK_STATUS.PAUSED;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async seek(targetTime) {
      this.currentTime = targetTime;
      // Simulasi delay asinkron native seek
      this.status = PLAYBACK_STATUS.SEEKING;
      this.emit('stateChange', this.status, this.getSnapshot());

      // Emit seeked setelah seek selesai
      setImmediate(() => {
        this.status = PLAYBACK_STATUS.PLAYING;
        this.emit('stateChange', this.status, this.getSnapshot());
      });
    }

    async setVolume() {}
    async setPlaybackRate() {}

    getSnapshot() {
      return {
        ...createDefaultSnapshot(),
        status: this.status,
        currentTrackId: this.currentTrackId,
        currentTime: this.currentTime,
        duration: this.duration,
      };
    }

    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
      return () => this.listeners.get(event)?.delete(handler);
    }

    emit(event, ...args) {
      this.listeners.get(event)?.forEach((fn) => fn(...args));
    }

    async cleanup() {
      this.status = PLAYBACK_STATUS.IDLE;
    }
  }

  const adapter = new MockSeekAdapter();
  const service = new AudioPlayerService(adapter);
  await service.init();
  await service.loadTrack('track-101', { type: 'web_session_file', key: 'a.mp3', displayName: 'A' });
  await service.play();

  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);

  const stateHistory = [];
  service.on('stateChange', (status) => {
    stateHistory.push(status);
  });

  // Panggil seek ke detik 45
  await service.seek(45);

  // State awal seek harus SEEKING dan tidak langsung kembali secara prematur
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.SEEKING);

  // Tunggu penyelesaian native seeked
  await new Promise((r) => setImmediate(r));

  // Setelah event seeked diterima, state harus kembali ke PLAYING
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(service.getSnapshot().currentTime, 45);
  assert.ok(stateHistory.includes(PLAYBACK_STATUS.SEEKING));

  await service.cleanup();
});

test('Seeking Lifecycle: seek to 0 is strictly valid and verified', async () => {
  class MockZeroSeekAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.currentTrackId = 'track-zero';
      this.currentTime = 50;
      this.listeners = new Map();
    }
    async init() {}
    async loadTrack() {}
    async play() {}
    async pause() {}
    async seek(time) {
      this.currentTime = time;
      this.status = PLAYBACK_STATUS.SEEKING;
      this.emit('stateChange', this.status, this.getSnapshot());
      setImmediate(() => {
        this.status = PLAYBACK_STATUS.PLAYING;
        this.emit('stateChange', this.status, this.getSnapshot());
      });
    }
    async setVolume() {}
    async setPlaybackRate() {}
    getSnapshot() {
      return {
        ...createDefaultSnapshot(),
        status: this.status,
        currentTrackId: this.currentTrackId,
        currentTime: this.currentTime,
      };
    }
    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
      return () => this.listeners.get(event)?.delete(handler);
    }
    emit(event, ...args) {
      this.listeners.get(event)?.forEach((fn) => fn(...args));
    }
    async cleanup() { this.status = PLAYBACK_STATUS.IDLE; }
  }

  const adapter = new MockZeroSeekAdapter();
  const service = new AudioPlayerService(adapter);
  await service.init();
  service.stateMachine.restore(PLAYBACK_STATUS.PLAYING);

  // Seek ke tepat 0
  await service.seek(0);
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.SEEKING);

  await new Promise((r) => setImmediate(r));
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(service.getSnapshot().currentTime, 0);

  await service.cleanup();
});

test('Seeking Lifecycle: stale seek event from old track is suppressed', async () => {
  class DelayedSeekAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.currentTrackId = 'track-1';
      this.listeners = new Map();
    }
    async init() {}
    async loadTrack(id) {
      this.currentTrackId = id;
      this.status = PLAYBACK_STATUS.LOADING;
      this.emit('stateChange', this.status, this.getSnapshot());
    }
    async play() {}
    async pause() {}
    async seek() {
      // Seek tertunda di background
    }
    async setVolume() {}
    async setPlaybackRate() {}
    getSnapshot() {
      return {
        ...createDefaultSnapshot(),
        status: this.status,
        currentTrackId: this.currentTrackId,
      };
    }
    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
      return () => this.listeners.get(event)?.delete(handler);
    }
    emit(event, ...args) {
      this.listeners.get(event)?.forEach((fn) => fn(...args));
    }
    async cleanup() {}
  }

  const adapter = new DelayedSeekAdapter();
  const service = new AudioPlayerService(adapter);
  await service.init();
  await service.loadTrack('track-1', { type: 'web_session_file', key: '1.mp3', displayName: '1' });
  service.stateMachine.restore(PLAYBACK_STATUS.PLAYING);

  await service.seek(10);
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.SEEKING);

  // User langsung berganti lagu ke track-2 saat seek masih berlangsung
  await service.loadTrack('track-2', { type: 'web_session_file', key: '2.mp3', displayName: '2' });
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.LOADING);
  assert.strictEqual(service.getSnapshot().currentTrackId, 'track-2');

  // Event seeked dari track-1 terlambat datang
  adapter.emit('stateChange', PLAYBACK_STATUS.PLAYING, {
    ...createDefaultSnapshot(),
    status: PLAYBACK_STATUS.PLAYING,
    currentTrackId: 'track-1',
    currentTime: 10,
  });

  // State machine TIDAK boleh terkontaminasi oleh track-1, tetap di LOADING track-2
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.LOADING);
  assert.strictEqual(service.getSnapshot().currentTrackId, 'track-2');

  await service.cleanup();
});

test('Seeking Lifecycle: seek error is recovered and does not leave state stuck in SEEKING', async () => {
  class FaultySeekAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.listeners = new Map();
    }
    async init() {}
    async loadTrack() {}
    async play() {}
    async pause() {}
    async seek() {
      throw new Error('Hardware seek failure');
    }
    async setVolume() {}
    async setPlaybackRate() {}
    getSnapshot() {
      return { ...createDefaultSnapshot(), status: this.status };
    }
    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
      return () => this.listeners.get(event)?.delete(handler);
    }
    emit(event, ...args) {
      this.listeners.get(event)?.forEach((fn) => fn(...args));
    }
    async cleanup() {}
  }

  const adapter = new FaultySeekAdapter();
  const service = new AudioPlayerService(adapter);
  await service.init();
  service.stateMachine.restore(PLAYBACK_STATUS.PLAYING);

  await assert.rejects(
    () => service.seek(20),
    /Hardware seek failure/
  );

  // State harus dipulihkan kembali ke PLAYING, tidak boleh corrupt/stuck di SEEKING
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);

  await service.cleanup();
});

test('WebAudioPlayerAdapter: cleans up seeking and seeked listeners on cleanup', async () => {
  const mockAudio = {
    listeners: new Map(),
    addEventListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(fn);
    },
    removeEventListener(event, fn) {
      this.listeners.get(event)?.delete(fn);
    },
    pause() {},
    src: '',
  };

  const adapter = new WebAudioPlayerAdapter(mockAudio);
  await adapter.init();

  // Verifikasi listener terpasang
  assert.ok(mockAudio.listeners.get('seeking')?.size > 0, 'seeking listener should be attached');
  assert.ok(mockAudio.listeners.get('seeked')?.size > 0, 'seeked listener should be attached');

  await adapter.cleanup();

  // Verifikasi listener dilepaskan
  assert.strictEqual(mockAudio.listeners.get('seeking')?.size || 0, 0, 'seeking listener should be removed');
  assert.strictEqual(mockAudio.listeners.get('seeked')?.size || 0, 0, 'seeked listener should be removed');
});
