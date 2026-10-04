/**
 * playerConstants.js
 * Status, event, dan kode error standar pemutar audio.
 */

export const PLAYBACK_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
  SEEKING: 'seeking',
  ERROR: 'error',
});

export const PLAYBACK_ERROR_CODES = Object.freeze({
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  SOURCE_PERMISSION_DENIED: 'SOURCE_PERMISSION_DENIED',
  DECODING_ERROR: 'DECODING_ERROR',
  AUDIO_HARDWARE_BUSY: 'AUDIO_HARDWARE_BUSY',
  NATIVE_SERVICE_DISCONNECTED: 'NATIVE_SERVICE_DISCONNECTED',
  STALE_OPERATION: 'STALE_OPERATION',
  UNKNOWN: 'UNKNOWN',
});

export const PLAYBACK_DISRUPTION_REASONS = Object.freeze({
  AUDIO_FOCUS_LOSS_TRANSIENT: 'audio_focus_loss_transient',
  AUDIO_FOCUS_LOSS_PERMANENT: 'audio_focus_loss_permanent',
  BECOMING_NOISY: 'becoming_noisy',
  USER_PAUSE: 'user_pause',
});

export const REPEAT_MODE = Object.freeze({
  OFF: 'off',
  ALL: 'all',
  ONE: 'one',
});

export const SHUFFLE_MODE = Object.freeze({
  OFF: 'off',
  ON: 'on',
});
