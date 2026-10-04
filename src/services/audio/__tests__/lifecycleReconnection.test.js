import assert from 'node:assert';
import test from 'node:test';
import { PLAYBACK_STATUS } from '../../../types/playerConstants.js';
import { AudioPlayerService } from '../AudioPlayerService.js';
import { NativeAndroidPlayerAdapter } from '../adapters/NativeAndroidPlayerAdapter.js';
import { getPlatformCapabilities } from '../../platform/platformCapabilities.js';

test('PlatformCapabilities: returns default web capabilities when not running in native container', () => {
  const caps = getPlatformCapabilities();
  assert.strictEqual(caps.platform, 'web');
  assert.strictEqual(caps.authoritativeSource, 'javascript');
  assert.strictEqual(caps.supportsBackgroundPlayback, 'browser-dependent');
  assert.strictEqual(caps.supportsVisualizer, true);
});

test('Reconnection Protocol: restores active native playback snapshot on init without re-triggering play', async () => {
  // Simulasi bridge native Android di mana Media3 service sedang aktif memutar lagu di background
  const mockActiveSnapshot = {
    status: PLAYBACK_STATUS.PLAYING,
    currentTrackId: 'trk_01HXYZ789',
    currentTime: 84.2,
    duration: 215.0,
    bufferedTime: 120.5,
    volume: 0.85,
    isMuted: false,
    playbackRate: 1.0,
  };

  let playCallCount = 0;
  let loadTrackCallCount = 0;

  const mockBridge = {
    async getPlaybackSnapshot() {
      return mockActiveSnapshot;
    },
    async loadTrack() {
      loadTrackCallCount++;
    },
    async play() {
      playCallCount++;
    },
    async pause() {},
    async seek() {},
    async setVolume() {},
    async setPlaybackRate() {},
    addListener(_event, _handler) {
      return () => {};
    },
  };

  const adapter = new NativeAndroidPlayerAdapter(mockBridge);
  const service = new AudioPlayerService(adapter);

  let capturedState = null;
  let capturedSnapshot = null;

  service.on('stateChange', (status, snapshot) => {
    capturedState = status;
    capturedSnapshot = snapshot;
  });

  // Eksekusi inisialisasi / reconnect
  await service.init();

  // Validasi: Status langsung sinkron dengan native player
  assert.strictEqual(service.getStatus(), PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(capturedState, PLAYBACK_STATUS.PLAYING);
  assert.strictEqual(capturedSnapshot.currentTrackId, 'trk_01HXYZ789');
  assert.strictEqual(capturedSnapshot.currentTime, 84.2);
  assert.strictEqual(capturedSnapshot.duration, 215.0);

  // Validasi kritis: Tidak memicu pemutaran ganda atau loadTrack ulang
  assert.strictEqual(playCallCount, 0, 'play() should NOT be called during reconnection');
  assert.strictEqual(loadTrackCallCount, 0, 'loadTrack() should NOT be called during reconnection');

  await service.cleanup();
});

test('Audio Disruption: NativeAndroidPlayerAdapter handles becoming_noisy and audio focus events', async () => {
  let disruptionHandler = null;

  const mockBridge = {
    async getPlaybackSnapshot() {
      return { status: PLAYBACK_STATUS.IDLE };
    },
    addListener(event, handler) {
      if (event === 'playbackDisruption') {
        disruptionHandler = handler;
      }
      return () => {};
    },
    async loadTrack() {},
    async play() {},
    async pause() {},
    async seek() {},
    async setVolume() {},
    async setPlaybackRate() {},
  };

  const adapter = new NativeAndroidPlayerAdapter(mockBridge);
  const service = new AudioPlayerService(adapter);
  await service.init();

  let receivedDisruption = null;
  service.on('disruption', (reason) => {
    receivedDisruption = reason;
  });

  // Simulasikan earphone Bluetooth terputus
  disruptionHandler({ reason: 'becoming_noisy' });
  assert.strictEqual(receivedDisruption, 'becoming_noisy');

  // Simulasikan interupsi panggilan telepon
  disruptionHandler({ reason: 'audio_focus_loss_transient' });
  assert.strictEqual(receivedDisruption, 'audio_focus_loss_transient');

  await service.cleanup();
});
