import assert from 'node:assert';
import test from 'node:test';
import {
  isVisualizerSource,
  REQUIRED_VISUALIZER_METHODS,
} from '../adapters/AudioVisualizerSource.js';
import { NativeAndroidPlayerAdapter } from '../adapters/NativeAndroidPlayerAdapter.js';
import { WebAudioPlayerAdapter } from '../adapters/WebAudioPlayerAdapter.js';
import { AudioPlayerService } from '../AudioPlayerService.js';

test('AudioVisualizerSource: REQUIRED_VISUALIZER_METHODS contains exact 4 contract methods', () => {
  const expected = [
    'getFrequencyData',
    'getWaveformData',
    'getFftResolution',
    'isAvailable',
  ];
  assert.deepStrictEqual(Array.from(REQUIRED_VISUALIZER_METHODS), expected);
});

test('AudioVisualizerSource: isVisualizerSource accurately detects compliance', () => {
  assert.strictEqual(isVisualizerSource(null), false);
  assert.strictEqual(isVisualizerSource(undefined), false);
  assert.strictEqual(isVisualizerSource({}), false);

  const partial = {
    getFrequencyData: () => {},
    getWaveformData: () => {},
  };
  assert.strictEqual(isVisualizerSource(partial), false);

  const full = {
    getFrequencyData: () => {},
    getWaveformData: () => {},
    getFftResolution: () => 128,
    isAvailable: () => true,
  };
  assert.strictEqual(isVisualizerSource(full), true);
});

test('WebAudioPlayerAdapter: implements AudioVisualizerSource contract (Section 1.4)', async () => {
  const adapter = new WebAudioPlayerAdapter();

  // Verifikasi adapter memenuhi kontrak AudioVisualizerSource
  assert.strictEqual(isVisualizerSource(adapter), true);

  const source = adapter.getVisualizerSource();
  assert.ok(source);
  assert.strictEqual(source, adapter);

  // Uji resolusi FFT default
  assert.strictEqual(adapter.getFftResolution(), 128);

  // Uji pengisian data frekuensi dan waveform tanpa throw di headless/Node environment
  const freq = new Uint8Array(64);
  const wave = new Uint8Array(64);

  adapter.getFrequencyData(freq);
  assert.strictEqual(freq.length, 64);
  // Di headless tanpa audio stream aktif, frekuensi terisi 0
  assert.strictEqual(freq[0], 0);

  adapter.getWaveformData(wave);
  assert.strictEqual(wave.length, 64);
  // Default waveform center point adalah 128
  assert.strictEqual(wave[0], 128);

  await adapter.cleanup();
});

test('NativeAndroidPlayerAdapter: visualizer is unsupported and isolated (Section 1.4)', () => {
  const mockBridge = {
    addListener: () => () => {},
    getPlaybackSnapshot: async () => ({ status: 'idle' }),
    loadTrack: async () => {},
    play: async () => {},
    pause: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    setPlaybackRate: async () => {},
  };

  const adapter = new NativeAndroidPlayerAdapter(mockBridge);

  // Sesuai Section 1.4: Android native tidak mengimplementasikan visualizer
  assert.strictEqual(isVisualizerSource(adapter), false);
  assert.strictEqual(adapter.getVisualizerSource(), null);
});

test('AudioPlayerService: delegates getVisualizerSource based on active platform adapter', async () => {
  const webAdapter = new WebAudioPlayerAdapter();
  const webService = new AudioPlayerService(webAdapter);
  assert.strictEqual(webService.getVisualizerSource(), webAdapter);

  const mockBridge = {
    addListener: () => () => {},
    getPlaybackSnapshot: async () => ({ status: 'idle' }),
    loadTrack: async () => {},
    play: async () => {},
    pause: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    setPlaybackRate: async () => {},
  };
  const nativeAdapter = new NativeAndroidPlayerAdapter(mockBridge);
  const nativeService = new AudioPlayerService(nativeAdapter);

  assert.strictEqual(nativeService.getVisualizerSource(), null);

  await webService.cleanup();
  await nativeService.cleanup();
});
