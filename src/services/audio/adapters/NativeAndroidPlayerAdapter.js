import { PLAYBACK_ERROR_CODES, PLAYBACK_STATUS } from '../../../types/playerConstants.js';
import { nativeMediaBridge } from '../../platform/nativeMediaBridge.js';
import { createDefaultSnapshot, createPlaybackError } from './AudioPlayerInterface.js';

/**
 * NativeAndroidPlayerAdapter.js
 * Implementasi AudioPlayerInterface untuk platform Android.
 * Berkomunikasi dengan native MediaSessionService / ExoPlayer melalui MediaController bridge.
 * Memenuhi kontrak AudioPlayerInterface dan taksonomi error Bab 1.3 & 5.3 draftv1.md.
 */
export class NativeAndroidPlayerAdapter {
  constructor(bridge = nativeMediaBridge) {
    this.bridge = bridge;
    this.status = PLAYBACK_STATUS.IDLE;
    this.currentTrackId = null;
    this.listeners = new Map();
    this.bridgeUnsubscribers = [];
    this.latestSnapshot = createDefaultSnapshot();
  }

  async init() {
    this.cleanupBridgeListeners();

    // 1. Berlangganan event native dari MediaController
    const unsubState = this.bridge.addListener('playbackStateChanged', (payload) => {
      if (payload?.status) {
        this.status = payload.status;
      }
      if (payload?.snapshot) {
        this.latestSnapshot = {
          status: payload.snapshot.status || this.status,
          currentTrackId: payload.snapshot.currentTrackId ?? null,
          currentTime: Number.isFinite(payload.snapshot.currentTime) ? payload.snapshot.currentTime : 0,
          duration: Number.isFinite(payload.snapshot.duration) ? payload.snapshot.duration : 0,
          bufferedTime: Number.isFinite(payload.snapshot.bufferedTime) ? payload.snapshot.bufferedTime : 0,
          volume: Number.isFinite(payload.snapshot.volume) ? payload.snapshot.volume : 1.0,
          isMuted: Boolean(payload.snapshot.isMuted),
          playbackRate: Number.isFinite(payload.snapshot.playbackRate) ? payload.snapshot.playbackRate : 1.0,
        };
        this.currentTrackId = this.latestSnapshot.currentTrackId;
      }
      this.emitStateChange();
    });

    const unsubProgress = this.bridge.addListener('playbackProgress', (payload) => {
      const cur = Number.isFinite(payload?.currentTime) ? payload.currentTime : 0;
      const dur = Number.isFinite(payload?.duration) ? payload.duration : 0;
      const buf = Number.isFinite(payload?.bufferedTime) ? payload.bufferedTime : 0;

      this.latestSnapshot.currentTime = cur;
      this.latestSnapshot.duration = dur;
      this.latestSnapshot.bufferedTime = buf;

      this.emit('progress', cur, dur, buf);
    });

    const unsubEnded = this.bridge.addListener('playbackEnded', (payload) => {
      this.status = PLAYBACK_STATUS.READY;
      this.latestSnapshot.status = PLAYBACK_STATUS.READY;
      this.emitStateChange();
      if (payload?.trackId) {
        this.emit('trackEnded', payload.trackId);
      }
    });

    const unsubError = this.bridge.addListener('playbackError', (payload) => {
      this.status = PLAYBACK_STATUS.ERROR;
      this.latestSnapshot.status = PLAYBACK_STATUS.ERROR;
      this.emitStateChange();

      const rawCode = payload?.error?.code;
      const code = PLAYBACK_ERROR_CODES[rawCode] || PLAYBACK_ERROR_CODES.UNKNOWN;
      const playbackError = createPlaybackError(
        code,
        payload?.error?.message || 'Native playback error',
        payload?.error?.isRecoverable ?? true,
        payload?.error?.originalError || payload?.error
      );
      this.emit('error', playbackError);
    });

    const unsubDisruption = this.bridge.addListener('playbackDisruption', (payload) => {
      if (payload?.reason) {
        this.emit('disruption', payload.reason);
      }
    });

    this.bridgeUnsubscribers = [
      unsubState,
      unsubProgress,
      unsubEnded,
      unsubError,
      unsubDisruption,
    ];

    // 2. Reconnection Protocol: Minta snapshot aktif saat WebView di-mount / recreate
    const activeSnapshot = await this.bridge.getPlaybackSnapshot();
    if (activeSnapshot && activeSnapshot.status !== PLAYBACK_STATUS.IDLE) {
      this.status = activeSnapshot.status;
      this.currentTrackId = activeSnapshot.currentTrackId ?? null;
      this.latestSnapshot = {
        status: activeSnapshot.status,
        currentTrackId: activeSnapshot.currentTrackId ?? null,
        currentTime: Number.isFinite(activeSnapshot.currentTime) ? activeSnapshot.currentTime : 0,
        duration: Number.isFinite(activeSnapshot.duration) ? activeSnapshot.duration : 0,
        bufferedTime: Number.isFinite(activeSnapshot.bufferedTime) ? activeSnapshot.bufferedTime : 0,
        volume: Number.isFinite(activeSnapshot.volume) ? activeSnapshot.volume : 1.0,
        isMuted: Boolean(activeSnapshot.isMuted),
        playbackRate: Number.isFinite(activeSnapshot.playbackRate) ? activeSnapshot.playbackRate : 1.0,
      };
      this.emitStateChange();
    }
  }

  async loadTrack(trackId, source, operationId) {
    this.currentTrackId = trackId;
    this.status = PLAYBACK_STATUS.LOADING;
    this.latestSnapshot.currentTrackId = trackId;
    this.latestSnapshot.status = PLAYBACK_STATUS.LOADING;
    this.emitStateChange();

    await this.bridge.loadTrack(trackId, source, operationId);
  }

  async play(operationId) {
    await this.bridge.play(operationId);
  }

  async pause() {
    await this.bridge.pause();
  }

  async seek(timeInSeconds) {
    if (!Number.isFinite(timeInSeconds)) return;
    await this.bridge.seek(timeInSeconds);
  }

  async setVolume(volume) {
    if (!Number.isFinite(volume)) return;
    this.latestSnapshot.volume = Math.max(0, Math.min(1, volume));
    await this.bridge.setVolume(this.latestSnapshot.volume);
    this.emitStateChange();
  }

  async setPlaybackRate(rate) {
    if (!Number.isFinite(rate)) return;
    this.latestSnapshot.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    await this.bridge.setPlaybackRate(this.latestSnapshot.playbackRate);
    this.emitStateChange();
  }

  getSnapshot() {
    return { ...this.latestSnapshot };
  }

  /**
   * Section 1.4: Visualizer tidak diimplementasikan pada Android Native
   * karena audio diproses oleh native ExoPlayer di luar JavaScript runtime.
   * @returns {null}
   */
  getVisualizerSource() {
    return null;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[NativeAndroidPlayerAdapter] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  emitStateChange() {
    this.emit('stateChange', this.status, this.getSnapshot());
  }

  cleanupBridgeListeners() {
    for (const unsub of this.bridgeUnsubscribers) {
      if (typeof unsub === 'function') {
        unsub();
      }
    }
    this.bridgeUnsubscribers = [];
  }

  async cleanup() {
    this.cleanupBridgeListeners();
    this.listeners.clear();
    this.status = PLAYBACK_STATUS.IDLE;
    this.currentTrackId = null;
    this.latestSnapshot = createDefaultSnapshot();
  }
}
