import { PLAYBACK_ERROR_CODES, PLAYBACK_STATUS } from '../../../types/playerConstants.js';
import { createDefaultSnapshot, createPlaybackError } from './AudioPlayerInterface.js';

/**
 * WebAudioPlayerAdapter.js
 * Implementasi AudioPlayerInterface untuk platform Web menggunakan HTML5 Audio element.
 * Memenuhi kontrak AudioPlayerInterface dan kapabilitas opsional AudioVisualizerSource (Bab 1.4 draftv1.md).
 */
export class WebAudioPlayerAdapter {
  constructor(audioElement = null) {
    this.audio = audioElement;
    this.status = PLAYBACK_STATUS.IDLE;
    this.currentTrackId = null;
    this.currentOperationId = 0;
    this.listeners = new Map();
    this.currentObjectUrl = null;

    // Web Audio API graph untuk AudioVisualizerSource (Section 1.4)
    this.audioContext = null;
    this.analyser = null;
    this.mediaElementSource = null;

    this.onTimeUpdate = this.onTimeUpdate.bind(this);
    this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
    this.onCanPlay = this.onCanPlay.bind(this);
    this.onPlaying = this.onPlaying.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onWaiting = this.onWaiting.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.onError = this.onError.bind(this);
    this.onSeeking = this.onSeeking.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
  }

  async init() {
    if (!this.audio && typeof Audio !== 'undefined') {
      this.audio = new Audio();
    }

    if (this.audio && typeof this.audio.addEventListener === 'function') {
      this.audio.preload = 'metadata';
      this.audio.addEventListener('timeupdate', this.onTimeUpdate);
      this.audio.addEventListener('loadedmetadata', this.onLoadedMetadata);
      this.audio.addEventListener('canplay', this.onCanPlay);
      this.audio.addEventListener('playing', this.onPlaying);
      this.audio.addEventListener('pause', this.onPause);
      this.audio.addEventListener('waiting', this.onWaiting);
      this.audio.addEventListener('ended', this.onEnded);
      this.audio.addEventListener('error', this.onError);
      this.audio.addEventListener('seeking', this.onSeeking);
      this.audio.addEventListener('seeked', this.onSeeked);
    }

    this.status = PLAYBACK_STATUS.IDLE;
    this.emitStateChange();
  }

  /**
   * Menyiapkan Web Audio Graph (AudioContext & AnalyserNode) secara lazy
   * @returns {boolean}
   */
  ensureVisualizerGraph() {
    if (this.analyser) return true;
    if (typeof window === 'undefined') return false;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !this.audio) return false;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      if (!this.mediaElementSource && typeof this.audioContext.createMediaElementSource === 'function') {
        this.mediaElementSource = this.audioContext.createMediaElementSource(this.audio);
      }

      if (!this.analyser && typeof this.audioContext.createAnalyser === 'function') {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }

      if (this.mediaElementSource && this.analyser) {
        this.mediaElementSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      return true;
    } catch (err) {
      console.warn('[WebAudioPlayerAdapter] Failed to initialize Web Audio visualizer graph:', err);
      return false;
    }
  }

  async loadTrack(trackId, source, operationId) {
    if (operationId !== undefined && operationId < this.currentOperationId) {
      return;
    }
    this.currentOperationId = operationId || 0;

    if (!this.audio && typeof Audio !== 'undefined') {
      await this.init();
    }

    this.cleanupCurrentSource();

    this.currentTrackId = trackId;
    this.status = PLAYBACK_STATUS.LOADING;
    this.emitStateChange();

    let playUrl = '';

    if (typeof Blob !== 'undefined' && source?.fileInstance instanceof Blob && typeof URL !== 'undefined') {
      this.currentObjectUrl = URL.createObjectURL(source.fileInstance);
      playUrl = this.currentObjectUrl;
    } else if (source?.key) {
      playUrl = source.key;
    } else {
      this.status = PLAYBACK_STATUS.ERROR;
      this.emit(
        'error',
        createPlaybackError(
          PLAYBACK_ERROR_CODES.SOURCE_NOT_FOUND,
          'Invalid source URL or file descriptor',
          false
        )
      );
      this.emitStateChange();
      return;
    }

    if (this.audio) {
      this.audio.src = playUrl;
      if (typeof this.audio.load === 'function') {
        this.audio.load();
      }
    }
  }

  async play(_operationId) {
    if (!this.audio) return;

    // Pastikan AudioContext di-resume jika dalam keadaan suspended karena browser autoplay policy
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('[WebAudioPlayerAdapter] Could not resume AudioContext:', err);
      }
    }

    try {
      if (typeof this.audio.play === 'function') {
        await this.audio.play();
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // AbortError terjadi ketika browser menghentikan play() karena lagu baru dimuat (Section 5.3: silent drop)
        return;
      }

      this.status = PLAYBACK_STATUS.ERROR;
      const isAutoplay = err.name === 'NotAllowedError';
      const code = isAutoplay
        ? PLAYBACK_ERROR_CODES.AUDIO_HARDWARE_BUSY
        : PLAYBACK_ERROR_CODES.DECODING_ERROR;
      const message = isAutoplay
        ? 'Autoplay blocked or audio hardware busy. User interaction required.'
        : err.message || 'Failed to play audio';

      const playbackError = createPlaybackError(code, message, true, err);
      this.emit('error', playbackError);
      this.emitStateChange();
      throw err;
    }
  }

  async pause() {
    if (!this.audio) return;
    if (typeof this.audio.pause === 'function') {
      this.audio.pause();
    }
  }

  async seek(timeInSeconds) {
    if (!Number.isFinite(timeInSeconds)) return;
    if (!this.audio) return;

    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const target = Math.max(0, duration > 0 ? Math.min(timeInSeconds, duration) : timeInSeconds);

    if (this.status !== PLAYBACK_STATUS.IDLE && this.status !== PLAYBACK_STATUS.ERROR) {
      this.status = PLAYBACK_STATUS.SEEKING;
      this.emitStateChange();
    }

    this.audio.currentTime = target;
  }

  async setVolume(volume) {
    if (!this.audio || !Number.isFinite(volume)) return;
    const clamped = Math.max(0, Math.min(1, volume));
    this.audio.volume = clamped;
    this.emitStateChange();
  }

  async setPlaybackRate(rate) {
    if (!this.audio || !Number.isFinite(rate)) return;
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    this.audio.playbackRate = clamped;
    this.emitStateChange();
  }

  /**
   * Menghasilkan PlaybackSnapshot publik (Section 1.3)
   * Bebas dari internal operation ID dan engine handler browser.
   * @returns {import('./AudioPlayerInterface.js').PlaybackSnapshot}
   */
  getSnapshot() {
    if (!this.audio) {
      const defaultSnap = createDefaultSnapshot();
      return {
        ...defaultSnap,
        status: this.status,
        currentTrackId: this.currentTrackId,
      };
    }

    const currentTime = this.audio.currentTime || 0;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const volume = this.audio.volume ?? 1.0;
    const isMuted = Boolean(this.audio.muted);
    const playbackRate = this.audio.playbackRate || 1.0;

    let bufferedTime = 0;
    if (this.audio.buffered && this.audio.buffered.length > 0) {
      bufferedTime = this.audio.buffered.end(this.audio.buffered.length - 1);
    }

    return {
      status: this.status,
      currentTrackId: this.currentTrackId,
      currentTime,
      duration,
      bufferedTime,
      volume,
      isMuted,
      playbackRate,
    };
  }

  // =========================================================================
  // Implementasi AudioVisualizerSource (Section 1.4 draftv1.md)
  // =========================================================================

  /**
   * Mengisi array dengan data frekuensi audio (0 s/d 255)
   * @param {Uint8Array} outputArray
   */
  getFrequencyData(outputArray) {
    if (!this.analyser) {
      this.ensureVisualizerGraph();
    }

    if (this.analyser && outputArray instanceof Uint8Array) {
      this.analyser.getByteFrequencyData(outputArray);
    } else if (outputArray instanceof Uint8Array) {
      outputArray.fill(0);
    }
  }

  /**
   * Mengisi array dengan data domain waktu (waveform) audio (0 s/d 255, center 128)
   * @param {Uint8Array} outputArray
   */
  getWaveformData(outputArray) {
    if (!this.analyser) {
      this.ensureVisualizerGraph();
    }

    if (this.analyser && outputArray instanceof Uint8Array) {
      this.analyser.getByteTimeDomainData(outputArray);
    } else if (outputArray instanceof Uint8Array) {
      outputArray.fill(128);
    }
  }

  /**
   * Mengembalikan resolusi bin frekuensi analyser (fftSize / 2)
   * @returns {number}
   */
  getFftResolution() {
    if (!this.analyser) {
      this.ensureVisualizerGraph();
    }
    return this.analyser ? this.analyser.frequencyBinCount : 128;
  }

  /**
   * Memeriksa ketersediaan visualizer Web Audio
   * @returns {boolean}
   */
  isAvailable() {
    if (this.analyser) return true;
    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      return true;
    }
    return false;
  }

  /**
   * Mengembalikan instance AudioVisualizerSource
   * @returns {import('./AudioVisualizerSource.js').AudioVisualizerSource}
   */
  getVisualizerSource() {
    return this;
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
          console.error(`[WebAudioPlayerAdapter] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  emitStateChange() {
    this.emit('stateChange', this.status, this.getSnapshot());
  }

  onTimeUpdate() {
    if (!this.audio) return;
    const currentTime = this.audio.currentTime || 0;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    let bufferedTime = 0;
    if (this.audio.buffered && this.audio.buffered.length > 0) {
      bufferedTime = this.audio.buffered.end(this.audio.buffered.length - 1);
    }

    this.emit('progress', currentTime, duration, bufferedTime);
  }

  onLoadedMetadata() {
    if (this.status === PLAYBACK_STATUS.LOADING) {
      this.status = PLAYBACK_STATUS.READY;
      this.emitStateChange();
    }
  }

  onCanPlay() {
    if (this.status === PLAYBACK_STATUS.LOADING) {
      this.status = PLAYBACK_STATUS.READY;
      this.emitStateChange();
    }
  }

  onPlaying() {
    this.status = PLAYBACK_STATUS.PLAYING;
    this.emitStateChange();
  }

  onPause() {
    if (this.status !== PLAYBACK_STATUS.IDLE && this.status !== PLAYBACK_STATUS.ERROR) {
      this.status = PLAYBACK_STATUS.PAUSED;
      this.emitStateChange();
    }
  }

  onWaiting() {
    if (this.status === PLAYBACK_STATUS.PLAYING) {
      this.status = PLAYBACK_STATUS.BUFFERING;
      this.emitStateChange();
    }
  }

  onSeeking() {
    if (this.status !== PLAYBACK_STATUS.IDLE && this.status !== PLAYBACK_STATUS.ERROR) {
      this.status = PLAYBACK_STATUS.SEEKING;
      this.emitStateChange();
    }
  }

  onSeeked() {
    if (this.status === PLAYBACK_STATUS.SEEKING) {
      this.status = this.audio && !this.audio.paused ? PLAYBACK_STATUS.PLAYING : PLAYBACK_STATUS.PAUSED;
      this.emitStateChange();
    }
  }

  onEnded() {
    this.status = PLAYBACK_STATUS.READY;
    this.emitStateChange();
    if (this.currentTrackId) {
      this.emit('trackEnded', this.currentTrackId);
    }
  }

  onError(e) {
    this.status = PLAYBACK_STATUS.ERROR;
    const mediaErr = this.audio ? this.audio.error : null;
    let code = PLAYBACK_ERROR_CODES.UNKNOWN;
    let message = 'Audio playback error';
    let isRecoverable = true;

    if (mediaErr) {
      switch (mediaErr.code) {
        case 1: // MEDIA_ERR_ABORTED
          code = PLAYBACK_ERROR_CODES.STALE_OPERATION;
          message = 'Audio loading aborted by user or system';
          isRecoverable = false;
          break;
        case 2: // MEDIA_ERR_NETWORK
          code = PLAYBACK_ERROR_CODES.SOURCE_NOT_FOUND;
          message = 'Audio network error or file cannot be reached';
          isRecoverable = true;
          break;
        case 3: // MEDIA_ERR_DECODE
          code = PLAYBACK_ERROR_CODES.DECODING_ERROR;
          message = 'Audio decoding error or corrupted format';
          isRecoverable = false;
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          code = PLAYBACK_ERROR_CODES.SOURCE_NOT_FOUND;
          message = 'Audio format not supported or file not found';
          isRecoverable = false;
          break;
        default:
          code = PLAYBACK_ERROR_CODES.UNKNOWN;
          message = `Audio element error code ${mediaErr.code}`;
          isRecoverable = true;
      }
    }

    const playbackError = createPlaybackError(code, message, isRecoverable, e);
    this.emit('error', playbackError);
    this.emitStateChange();
  }

  cleanupCurrentSource() {
    if (this.currentObjectUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  async cleanup() {
    if (this.audio) {
      if (typeof this.audio.pause === 'function') {
        this.audio.pause();
      }
      if (typeof this.audio.removeEventListener === 'function') {
        this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
        this.audio.removeEventListener('loadedmetadata', this.onLoadedMetadata);
        this.audio.removeEventListener('canplay', this.onCanPlay);
        this.audio.removeEventListener('playing', this.onPlaying);
        this.audio.removeEventListener('pause', this.onPause);
        this.audio.removeEventListener('waiting', this.onWaiting);
        this.audio.removeEventListener('ended', this.onEnded);
        this.audio.removeEventListener('error', this.onError);
        this.audio.removeEventListener('seeking', this.onSeeking);
        this.audio.removeEventListener('seeked', this.onSeeked);
      }
      this.audio.src = '';
      this.audio = null;
    }

    if (this.audioContext && typeof this.audioContext.close === 'function') {
      try {
        await this.audioContext.close();
      } catch {
        // Abaikan error saat cleanup
      }
      this.audioContext = null;
      this.analyser = null;
      this.mediaElementSource = null;
    }

    this.cleanupCurrentSource();
    this.listeners.clear();
    this.status = PLAYBACK_STATUS.IDLE;
    this.currentTrackId = null;
  }
}
