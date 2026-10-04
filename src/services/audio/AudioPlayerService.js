import { PLAYBACK_ERROR_CODES, PLAYBACK_STATUS } from '../../types/playerConstants.js';
import { getPlatformCapabilities } from '../platform/platformCapabilities.js';
import {
  assertAdapterContract,
  createPlaybackError,
} from './adapters/AudioPlayerInterface.js';
import { isVisualizerSource } from './adapters/AudioVisualizerSource.js';
import { NativeAndroidPlayerAdapter } from './adapters/NativeAndroidPlayerAdapter.js';
import { WebAudioPlayerAdapter } from './adapters/WebAudioPlayerAdapter.js';
import { OperationManager } from './OperationManager.js';
import { PlaybackStateMachine } from './PlaybackStateMachine.js';

/**
 * Factory untuk memilih adapter berdasarkan kapabilitas platform aktif
 * @returns {import('./adapters/AudioPlayerInterface.js').AudioPlayerInterface}
 */
export function createPlatformAdapter() {
  const caps = getPlatformCapabilities();
  if (caps.platform === 'android') {
    return new NativeAndroidPlayerAdapter();
  }
  return new WebAudioPlayerAdapter();
}

/**
 * AudioPlayerService.js
 * Koordinator singleton pemutar musik yang mengelola alur perintah satu arah,
 * state machine deterministik, dan daur hidup lintas platform (Reconnection Protocol).
 * Menjamin kepatuhan adapter terhadap AudioPlayerInterface sesuai Bab 1.3 draftv1.md.
 */
export class AudioPlayerService {
  constructor(adapter = null) {
    this.adapter = adapter || createPlatformAdapter();
    assertAdapterContract(this.adapter);

    this.operationManager = new OperationManager();
    this.stateMachine = new PlaybackStateMachine();
    this.currentTrackId = null;
    this.listeners = new Map();
    this.isInitialized = false;

    this.handleAdapterStateChange = this.handleAdapterStateChange.bind(this);
    this.handleAdapterProgress = this.handleAdapterProgress.bind(this);
    this.handleAdapterTrackEnded = this.handleAdapterTrackEnded.bind(this);
    this.handleAdapterError = this.handleAdapterError.bind(this);
    this.handleAdapterDisruption = this.handleAdapterDisruption.bind(this);
  }

  async init() {
    if (this.isInitialized) return;

    this.adapter.on('stateChange', this.handleAdapterStateChange);
    this.adapter.on('progress', this.handleAdapterProgress);
    this.adapter.on('trackEnded', this.handleAdapterTrackEnded);
    this.adapter.on('error', this.handleAdapterError);
    this.adapter.on('disruption', this.handleAdapterDisruption);

    await this.adapter.init();
    this.isInitialized = true;

    // Protokol Rekonsiliasi: Jika adapter telah mengadopsi status aktif (misal dari service Android native)
    const initialSnapshot = this.adapter.getSnapshot();
    if (initialSnapshot && initialSnapshot.status !== PLAYBACK_STATUS.IDLE) {
      this.stateMachine.restore(initialSnapshot.status);
      this.emit('stateChange', this.stateMachine.getState(), initialSnapshot);
      this.emit('progress', initialSnapshot.currentTime, initialSnapshot.duration, initialSnapshot.bufferedTime);
    }
  }

  /**
   * Mengganti adapter secara dinamis (berguna untuk testing atau runtime switching)
   * @param {import('./adapters/AudioPlayerInterface.js').AudioPlayerInterface} nextAdapter
   */
  async switchAdapter(nextAdapter) {
    assertAdapterContract(nextAdapter);
    await this.cleanup();
    this.adapter = nextAdapter;
    await this.init();
  }

  /**
   * Memuat lagu dengan pelindung konkurensi (operation ID)
   * @param {string} trackId
   * @param {import('../../types/trackSource.js').PersistedSourceDescriptor} source
   */
  async loadTrack(trackId, source) {
    if (!this.isInitialized) {
      await this.init();
    }

    const opId = this.operationManager.next();
    this.currentTrackId = trackId;
    this.stateMachine.transition(PLAYBACK_STATUS.LOADING);

    try {
      await this.adapter.loadTrack(trackId, source, opId);

      // Verifikasi apakah operasi ini telah basi (stale)
      if (this.operationManager.isStale(opId)) {
        return;
      }
    } catch (err) {
      if (!this.operationManager.isStale(opId)) {
        this.stateMachine.transition(PLAYBACK_STATUS.ERROR);
        this.emit(
          'error',
          createPlaybackError(
            PLAYBACK_ERROR_CODES.DECODING_ERROR,
            err.message || 'Failed to load track',
            true,
            err
          )
        );
      }
    }
  }

  async play() {
    if (!this.isInitialized) {
      await this.init();
    }

    const opId = this.operationManager.next();
    try {
      await this.adapter.play(opId);
      if (this.operationManager.isStale(opId)) {
        return;
      }
    } catch (err) {
      if (this.operationManager.isStale(opId) || err?.name === 'AbortError') {
        // Operasi basi atau di-abort diserap secara diam-diam (silent drop) sesuai Section 5.3
        return;
      }
      this.stateMachine.transition(PLAYBACK_STATUS.ERROR);
      throw err;
    }
  }

  async pause() {
    if (!this.isInitialized) return;
    await this.adapter.pause();
  }

  async seek(timeInSeconds) {
    if (!this.isInitialized || !Number.isFinite(timeInSeconds)) return;

    const previousState = this.stateMachine.getState();
    const canSeekTransition = previousState === PLAYBACK_STATUS.PLAYING || previousState === PLAYBACK_STATUS.PAUSED;
    if (canSeekTransition) {
      this.stateMachine.transition(PLAYBACK_STATUS.SEEKING);
      this.emit('stateChange', this.stateMachine.getState(), this.getSnapshot());
    }

    try {
      await this.adapter.seek(timeInSeconds);
    } catch (err) {
      console.error('[AudioPlayerService] Seek error:', err);
      if (this.stateMachine.getState() === PLAYBACK_STATUS.SEEKING && canSeekTransition) {
        this.stateMachine.transition(previousState);
        this.emit('stateChange', this.stateMachine.getState(), this.getSnapshot());
      }
      throw err;
    }
  }

  async setVolume(volume) {
    if (!this.isInitialized || !Number.isFinite(volume)) return;
    await this.adapter.setVolume(volume);
  }

  async setPlaybackRate(rate) {
    if (!this.isInitialized || !Number.isFinite(rate)) return;
    await this.adapter.setPlaybackRate(rate);
  }

  getSnapshot() {
    return this.adapter.getSnapshot();
  }

  getStatus() {
    return this.stateMachine.getState();
  }

  /**
   * Mengembalikan objek sumber visualisasi audio jika didukung platform adapter aktif (Section 1.4)
   * @returns {import('./adapters/AudioVisualizerSource.js').AudioVisualizerSource | null}
   */
  getVisualizerSource() {
    if (this.adapter && typeof this.adapter.getVisualizerSource === 'function') {
      return this.adapter.getVisualizerSource();
    }
    if (isVisualizerSource(this.adapter)) {
      return this.adapter;
    }
    return null;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(handler);
      }
    };
  }

  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[AudioPlayerService] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  handleAdapterStateChange(adapterStatus, snapshot) {
    // Abaikan update dari lagu lama yang terlambat datang (stale-result suppression)
    if (this.currentTrackId && snapshot?.currentTrackId && snapshot.currentTrackId !== this.currentTrackId) {
      return;
    }

    if (this.stateMachine.canTransitionTo(adapterStatus)) {
      this.stateMachine.transition(adapterStatus);
    } else {
      this.stateMachine.restore(adapterStatus);
    }
    this.emit('stateChange', this.stateMachine.getState(), snapshot);
  }

  handleAdapterProgress(currentTime, duration, bufferedTime) {
    this.emit('progress', currentTime, duration, bufferedTime);
  }

  handleAdapterTrackEnded(trackId) {
    if (this.currentTrackId && trackId !== this.currentTrackId) {
      return;
    }
    this.emit('trackEnded', trackId);
  }

  handleAdapterError(error) {
    this.stateMachine.transition(PLAYBACK_STATUS.ERROR);
    const playbackError = error?.code
      ? error
      : createPlaybackError(
          PLAYBACK_ERROR_CODES.UNKNOWN,
          error?.message || 'Playback error occurred',
          true,
          error
        );
    this.emit('error', playbackError);
  }

  handleAdapterDisruption(reason) {
    this.emit('disruption', reason);
  }

  async cleanup() {
    this.operationManager.next(); // invalidate any pending operations
    this.stateMachine.reset();
    this.currentTrackId = null;
    await this.adapter.cleanup();
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Singleton instance default untuk aplikasi
export const audioPlayerService = new AudioPlayerService();
