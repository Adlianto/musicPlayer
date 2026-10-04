import assert from 'node:assert';
import test from 'node:test';
import {
  PLAYBACK_DISRUPTION_REASONS,
  PLAYBACK_ERROR_CODES,
  PLAYBACK_STATUS,
} from '../../../types/playerConstants.js';
import {
  assertAdapterContract,
  BaseAudioPlayerAdapter,
  createDefaultSnapshot,
  createPlaybackError,
  REQUIRED_ADAPTER_METHODS,
} from '../adapters/AudioPlayerInterface.js';
import { isVisualizerSource } from '../adapters/AudioVisualizerSource.js';
import { NativeAndroidPlayerAdapter } from '../adapters/NativeAndroidPlayerAdapter.js';
import { WebAudioPlayerAdapter } from '../adapters/WebAudioPlayerAdapter.js';
import { AudioPlayerService } from '../AudioPlayerService.js';

test('AudioPlayerInterface: REQUIRED_ADAPTER_METHODS includes all 10 contract methods', () => {
  const expected = [
    'init',
    'loadTrack',
    'play',
    'pause',
    'seek',
    'setVolume',
    'setPlaybackRate',
    'getSnapshot',
    'on',
    'cleanup',
  ];
  assert.deepStrictEqual(Array.from(REQUIRED_ADAPTER_METHODS), expected);
});

test('assertAdapterContract: enforces compliance and detects missing methods', () => {
  assert.throws(() => assertAdapterContract(null), {
    name: 'TypeError',
    message: /must be a valid object/,
  });

  const incomplete = {
    init: async () => {},
    play: async () => {},
  };
  assert.throws(() => assertAdapterContract(incomplete), {
    name: 'TypeError',
    message: /Missing method\(s\): loadTrack, pause, seek, setVolume, setPlaybackRate, getSnapshot, on, cleanup/,
  });

  const validMock = {
    init: async () => {},
    loadTrack: async () => {},
    play: async () => {},
    pause: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    setPlaybackRate: async () => {},
    getSnapshot: () => createDefaultSnapshot(),
    on: () => () => {},
    cleanup: async () => {},
  };
  assert.doesNotThrow(() => assertAdapterContract(validMock));
});

test('createDefaultSnapshot & createPlaybackError: factory output matches Section 1.3 spec', () => {
  const snap = createDefaultSnapshot();
  assert.strictEqual(snap.status, PLAYBACK_STATUS.IDLE);
  assert.strictEqual(snap.currentTrackId, null);
  assert.strictEqual(snap.currentTime, 0);
  assert.strictEqual(snap.duration, 0);
  assert.strictEqual(snap.bufferedTime, 0);
  assert.strictEqual(snap.volume, 1.0);
  assert.strictEqual(snap.isMuted, false);
  assert.strictEqual(snap.playbackRate, 1.0);
  // Ensure internal OperationState is NOT present in PlaybackSnapshot
  assert.strictEqual('currentOperationId' in snap, false);

  const rawErr = new Error('Physical storage unmounted');
  const errorObj = createPlaybackError(
    PLAYBACK_ERROR_CODES.SOURCE_NOT_FOUND,
    'Storage file not reachable',
    false,
    rawErr
  );
  assert.strictEqual(errorObj.code, 'SOURCE_NOT_FOUND');
  assert.strictEqual(errorObj.message, 'Storage file not reachable');
  assert.strictEqual(errorObj.isRecoverable, false);
  assert.strictEqual(errorObj.originalError, rawErr);
});

test('WebAudioPlayerAdapter: satisfies contract and emits taxonomy-compliant errors', async () => {
  const adapter = new WebAudioPlayerAdapter();
  assert.doesNotThrow(() => assertAdapterContract(adapter));

  const snap = adapter.getSnapshot();
  assert.strictEqual(snap.status, PLAYBACK_STATUS.IDLE);
  assert.strictEqual('currentOperationId' in snap, false);

  let capturedError = null;
  adapter.on('error', (err) => {
    capturedError = err;
  });

  // Load invalid descriptor to trigger SOURCE_NOT_FOUND
  await adapter.loadTrack('trk-err', { type: 'web_session_file', key: '' }, 1);
  assert.ok(capturedError, 'Should emit an error');
  assert.strictEqual(capturedError.code, PLAYBACK_ERROR_CODES.SOURCE_NOT_FOUND);
  assert.strictEqual(capturedError.isRecoverable, false);
  assert.strictEqual(adapter.getSnapshot().status, PLAYBACK_STATUS.ERROR);

  await adapter.cleanup();
});

test('NativeAndroidPlayerAdapter: satisfies contract and wraps native errors in taxonomy', async () => {
  const mockBridge = {
    listeners: new Map(),
    addListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(fn);
      return () => this.listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      this.listeners.get(event)?.forEach((fn) => fn(payload));
    },
    getPlaybackSnapshot: async () => createDefaultSnapshot(),
    loadTrack: async () => {},
    play: async () => {},
    pause: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    setPlaybackRate: async () => {},
  };

  const adapter = new NativeAndroidPlayerAdapter(mockBridge);
  assert.doesNotThrow(() => assertAdapterContract(adapter));

  await adapter.init();

  let receivedError = null;
  adapter.on('error', (err) => {
    receivedError = err;
  });

  // Simulate native error with AUDIO_HARDWARE_BUSY
  mockBridge.emit('playbackError', {
    error: {
      code: 'AUDIO_HARDWARE_BUSY',
      message: 'Audio focus held by navigation app',
      isRecoverable: true,
    },
  });

  assert.ok(receivedError);
  assert.strictEqual(receivedError.code, PLAYBACK_ERROR_CODES.AUDIO_HARDWARE_BUSY);
  assert.strictEqual(receivedError.isRecoverable, true);

  // Test disruption event
  let receivedDisruption = null;
  adapter.on('disruption', (reason) => {
    receivedDisruption = reason;
  });

  mockBridge.emit('playbackDisruption', {
    reason: PLAYBACK_DISRUPTION_REASONS.BECOMING_NOISY,
  });

  assert.strictEqual(receivedDisruption, 'becoming_noisy');

  await adapter.cleanup();
});

test('AudioPlayerService: constructor rejects non-compliant adapters', () => {
  assert.throws(() => new AudioPlayerService({}), {
    name: 'TypeError',
    message: /Adapter fails contract/,
  });
});

test('AudioVisualizerSource: validates visualizer contract compliance', () => {
  const nonVisualizer = {};
  assert.strictEqual(isVisualizerSource(nonVisualizer), false);

  const mockVisualizer = {
    getFrequencyData: () => {},
    getWaveformData: () => {},
    getFftResolution: () => 1024,
    isAvailable: () => true,
  };
  assert.strictEqual(isVisualizerSource(mockVisualizer), true);
});

test('BaseAudioPlayerAdapter: abstract methods throw when not overridden and events work', async () => {
  const base = new BaseAudioPlayerAdapter();
  await assert.rejects(() => base.init(), /Method "init" must be implemented/);
  await assert.rejects(() => base.play(1), /Method "play" must be implemented/);

  let called = false;
  const unsub = base.on('testEvent', () => {
    called = true;
  });
  base.emit('testEvent');
  assert.strictEqual(called, true);
  unsub();
});
