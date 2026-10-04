import assert from 'node:assert';
import test from 'node:test';
import { PLAYBACK_STATUS } from '../../../types/playerConstants.js';
import { AudioPlayerService } from '../AudioPlayerService.js';
import { OperationManager } from '../OperationManager.js';
import { PlaybackStateMachine } from '../PlaybackStateMachine.js';

test('OperationManager: should increment operationId and identify stale IDs', () => {
  const manager = new OperationManager();
  assert.strictEqual(manager.getCurrentId(), 0);

  const op1 = manager.next();
  assert.strictEqual(op1, 1);
  assert.strictEqual(manager.isStale(op1), false);

  const op2 = manager.next();
  assert.strictEqual(op2, 2);
  assert.strictEqual(manager.isStale(op1), true, 'op1 should now be stale');
  assert.strictEqual(manager.isStale(op2), false, 'op2 should be current');
});

test('PlaybackStateMachine: valid transitions and invalid transition rejection', () => {
  const sm = new PlaybackStateMachine();
  assert.strictEqual(sm.getState(), PLAYBACK_STATUS.IDLE);

  // Illegal direct transition IDLE -> PLAYING
  assert.strictEqual(sm.canTransitionTo(PLAYBACK_STATUS.PLAYING), false);
  sm.transition(PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(sm.getState(), PLAYBACK_STATUS.IDLE, 'State should remain IDLE');

  // Legal flow: IDLE -> LOADING -> READY -> PLAYING -> PAUSED
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.LOADING), PLAYBACK_STATUS.LOADING);
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.READY), PLAYBACK_STATUS.READY);
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.PLAYING), PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.PAUSED), PLAYBACK_STATUS.PAUSED);

  // SEEKING while paused
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.SEEKING), PLAYBACK_STATUS.SEEKING);
  assert.strictEqual(sm.transition(PLAYBACK_STATUS.PAUSED), PLAYBACK_STATUS.PAUSED);

  // Reset to IDLE
  sm.reset();
  assert.strictEqual(sm.getState(), PLAYBACK_STATUS.IDLE);
});

test('AudioPlayerService: unidirectional command flow with mock adapter', async () => {
  class MockAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.IDLE;
      this.currentTrackId = null;
      this.listeners = new Map();
    }

    async init() {
      this.status = PLAYBACK_STATUS.IDLE;
    }

    async loadTrack(trackId, _source, _opId) {
      this.currentTrackId = trackId;
      this.status = PLAYBACK_STATUS.READY;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async play(_opId) {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async pause() {
      this.status = PLAYBACK_STATUS.PAUSED;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async seek(_time) {}
    async setVolume(_vol) {}
    async setPlaybackRate(_rate) {}

    getSnapshot() {
      return {
        status: this.status,
        currentTrackId: this.currentTrackId,
        currentTime: 0,
        duration: 100,
        bufferedTime: 50,
        volume: 1.0,
        isMuted: false,
        playbackRate: 1.0,
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

  const mockAdapter = new MockAdapter();
  const service = new AudioPlayerService(mockAdapter);
  await service.init();

  let stateNotification = null;
  service.on('stateChange', (status, snapshot) => {
    stateNotification = { status, snapshot };
  });

  // Test loadTrack
  await service.loadTrack('track-101', { type: 'web_session_file', key: '/audio/test.mp3', displayName: 'Test.mp3' });
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.READY);
  assert.strictEqual(stateNotification.snapshot.currentTrackId, 'track-101');

  // Test play
  await service.play();
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);

  // Test pause
  await service.pause();
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PAUSED);

  await service.cleanup();
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.IDLE);
});

test('Concurrency Guard: out-of-order delayed async load completion is suppressed', async () => {
  class AsyncLatencyAdapter {
    constructor() {
      this.status = PLAYBACK_STATUS.IDLE;
      this.currentTrackId = null;
      this.listeners = new Map();
    }

    async init() {}

    async loadTrack(trackId, source, opId) {
      if (opId !== undefined) {
        this.currentOpId = opId;
      }
      const delayMs = source.delayMs || 0;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (opId !== undefined && opId < this.currentOpId) {
        return; // Stale operation suppression
      }
      this.currentTrackId = trackId;
      this.status = PLAYBACK_STATUS.READY;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async play(_opId) {
      this.status = PLAYBACK_STATUS.PLAYING;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async pause() {
      this.status = PLAYBACK_STATUS.PAUSED;
      this.emit('stateChange', this.status, this.getSnapshot());
    }

    async seek(_time) {}
    async setVolume(_vol) {}
    async setPlaybackRate(_rate) {}

    getSnapshot() {
      return {
        status: this.status,
        currentTrackId: this.currentTrackId,
        currentTime: 0,
        duration: 120,
        bufferedTime: 60,
        volume: 1.0,
        isMuted: false,
        playbackRate: 1.0,
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

  const adapter = new AsyncLatencyAdapter();
  const service = new AudioPlayerService(adapter);
  await service.init();

  let lastEmittedTrack = null;
  service.on('stateChange', (_status, snapshot) => {
    lastEmittedTrack = snapshot.currentTrackId;
  });

  // Track A lambat (60ms)
  const promiseA = service.loadTrack('track-A-slow', {
    type: 'web_session_file',
    key: 'a.mp3',
    displayName: 'A',
    delayMs: 60,
  });

  // User langsung klik Track B di 10ms (cepat, 15ms)
  await new Promise((r) => setTimeout(r, 10));
  const promiseB = service.loadTrack('track-B-fast', {
    type: 'web_session_file',
    key: 'b.mp3',
    displayName: 'B',
    delayMs: 15,
  });

  await Promise.all([promiseA, promiseB]);

  // Track B selesai lebih cepat (~25ms). Ketika Track A selesai (~60ms), update-nya disupresi
  assert.strictEqual(service.getSnapshot().currentTrackId, 'track-B-fast');
  assert.strictEqual(lastEmittedTrack, 'track-B-fast');

  await service.cleanup();
});
