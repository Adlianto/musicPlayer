import {
  PLAYBACK_DISRUPTION_REASONS,
  PLAYBACK_ERROR_CODES,
  PLAYBACK_STATUS,
} from '../../../types/playerConstants.js';

export { PLAYBACK_DISRUPTION_REASONS };

/**
 * AudioPlayerInterface.js
 * Kontrak antarmuka pemutaran audio platform-agnostik sesuai Bab 1.3 draftv1.md.
 * Menjamin pemisahan murni antara PlaybackSnapshot publik dan OperationState internal.
 */

/**
 * @typedef {'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'seeking' | 'error'} PlaybackStatus
 */

/**
 * Snapshot publik untuk konsumsi UI.
 * Tidak mengekspos operationId atau properti browser-internal.
 *
 * @typedef {Object} PlaybackSnapshot
 * @property {PlaybackStatus} status
 * @property {string | null} currentTrackId - Stable string UUID/ULID
 * @property {number} currentTime
 * @property {number} duration
 * @property {number} bufferedTime
 * @property {number} volume - Rentang linier: 0.0 s/d 1.0
 * @property {boolean} isMuted
 * @property {number} playbackRate - 0.5 s/d 2.0 (default: 1.0)
 */

/**
 * State internal untuk concurrency guard.
 *
 * @typedef {Object} OperationState
 * @property {number} currentOperationId
 */

/**
 * @typedef {'audio_focus_loss_transient' | 'audio_focus_loss_permanent' | 'becoming_noisy' | 'user_pause'} PlaybackDisruptionReason
 */

/**
 * Definisi objek error pemutaran audio standar (Bab 1.3 & 5.3).
 *
 * @typedef {Object} PlaybackError
 * @property {string} code - Kode error standar dari PLAYBACK_ERROR_CODES
 * @property {string} message - Pesan informatif untuk log/UI
 * @property {boolean} isRecoverable - Apakah error ini dapat dipulihkan otomatis atau memerlukan intervensi user
 * @property {unknown} [originalError] - Exception atau error native asli jika ada
 */

/**
 * Event-event yang dipancarkan oleh implementasi AudioPlayerInterface.
 *
 * @typedef {Object} AudioPlayerEvents
 * @property {(status: PlaybackStatus, snapshot: PlaybackSnapshot) => void} stateChange
 * @property {(currentTime: number, duration: number, bufferedTime: number) => void} progress
 * @property {(trackId: string) => void} trackEnded
 * @property {(error: PlaybackError) => void} error
 * @property {(reason: PlaybackDisruptionReason) => void} disruption
 */

/**
 * Kontrak antarmuka pemutar audio platform-agnostik.
 *
 * @typedef {Object} AudioPlayerInterface
 * @property {() => Promise<void>} init
 * @property {(trackId: string, source: import('../../../types/trackSource.js').PersistedSourceDescriptor, operationId: number) => Promise<void>} loadTrack
 * @property {(operationId: number) => Promise<void>} play
 * @property {() => Promise<void>} pause
 * @property {(timeInSeconds: number) => Promise<void>} seek
 * @property {(volume: number) => Promise<void>} setVolume
 * @property {(rate: number) => Promise<void>} setPlaybackRate
 * @property {() => PlaybackSnapshot} getSnapshot
 * @property {<K extends keyof AudioPlayerEvents>(event: K, handler: AudioPlayerEvents[K]) => () => void} on
 * @property {() => Promise<void>} cleanup
 */

/**
 * Daftar method wajib yang harus diimplementasikan oleh setiap adapter audio
 */
export const REQUIRED_ADAPTER_METHODS = Object.freeze([
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
]);

/**
 * Helper untuk membuat snapshot default awal yang bersih
 * @returns {PlaybackSnapshot}
 */
export function createDefaultSnapshot() {
  return {
    status: PLAYBACK_STATUS.IDLE,
    currentTrackId: null,
    currentTime: 0,
    duration: 0,
    bufferedTime: 0,
    volume: 1.0,
    isMuted: false,
    playbackRate: 1.0,
  };
}

/**
 * Factory helper untuk membuat PlaybackError terstandarisasi sesuai taksonomi
 * @param {string} code - Salah satu kode dari PLAYBACK_ERROR_CODES
 * @param {string} message - Deskripsi penyebab kegagalan
 * @param {boolean} [isRecoverable=true] - Flag pemulihan otomatis
 * @param {unknown} [originalError=null] - Referensi error asli
 * @returns {PlaybackError}
 */
export function createPlaybackError(
  code = PLAYBACK_ERROR_CODES.UNKNOWN,
  message = 'Unknown playback error',
  isRecoverable = true,
  originalError = null
) {
  return Object.freeze({
    code,
    message,
    isRecoverable: Boolean(isRecoverable),
    originalError: originalError ?? undefined,
  });
}

/**
 * Validasi kepatuhan runtime sebuah adapter terhadap kontrak AudioPlayerInterface
 * @param {any} adapter
 * @throws {TypeError} Jika adapter tidak memenuhi kontrak antarmuka
 */
export function assertAdapterContract(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('[AudioPlayerInterface] Adapter must be a valid object instance');
  }

  const missingMethods = [];
  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[method] !== 'function') {
      missingMethods.push(method);
    }
  }

  if (missingMethods.length > 0) {
    throw new TypeError(
      `[AudioPlayerInterface] Adapter fails contract. Missing method(s): ${missingMethods.join(', ')}`
    );
  }
}

/**
 * BaseAudioPlayerAdapter
 * Kelas basis opsional yang menyediakan manajemen listener dan helper dasar untuk adapter.
 */
export class BaseAudioPlayerAdapter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Mendaftarkan event listener
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Fungsi unsubscribe
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Memancarkan event ke semua pendengar yang terdaftar
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[AudioPlayerAdapter] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Abstract methods yang wajib dioverride
   */
  async init() {
    throw new Error('Method "init" must be implemented by adapter');
  }

  async loadTrack(_trackId, _source, _operationId) {
    throw new Error('Method "loadTrack" must be implemented by adapter');
  }

  async play(_operationId) {
    throw new Error('Method "play" must be implemented by adapter');
  }

  async pause() {
    throw new Error('Method "pause" must be implemented by adapter');
  }

  async seek(_timeInSeconds) {
    throw new Error('Method "seek" must be implemented by adapter');
  }

  async setVolume(_volume) {
    throw new Error('Method "setVolume" must be implemented by adapter');
  }

  async setPlaybackRate(_rate) {
    throw new Error('Method "setPlaybackRate" must be implemented by adapter');
  }

  getSnapshot() {
    throw new Error('Method "getSnapshot" must be implemented by adapter');
  }

  async cleanup() {
    this.listeners.clear();
  }
}
