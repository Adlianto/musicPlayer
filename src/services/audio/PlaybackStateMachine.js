import { PLAYBACK_STATUS } from '../../types/playerConstants.js';

/**
 * PlaybackStateMachine.js
 * Memvalidasi transisi state pemutaran audio agar deterministik dan tidak masuk ke impossible state.
 */
export class PlaybackStateMachine {
  constructor(initialState = PLAYBACK_STATUS.IDLE) {
    this.currentState = initialState;
    this.previousState = initialState;

    // Tabel transisi valid
    this.transitions = {
      [PLAYBACK_STATUS.IDLE]: [PLAYBACK_STATUS.LOADING],
      [PLAYBACK_STATUS.LOADING]: [PLAYBACK_STATUS.READY, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.READY]: [PLAYBACK_STATUS.PLAYING, PLAYBACK_STATUS.LOADING, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.PLAYING]: [PLAYBACK_STATUS.PAUSED, PLAYBACK_STATUS.BUFFERING, PLAYBACK_STATUS.SEEKING, PLAYBACK_STATUS.LOADING, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.PAUSED]: [PLAYBACK_STATUS.PLAYING, PLAYBACK_STATUS.SEEKING, PLAYBACK_STATUS.LOADING, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.BUFFERING]: [PLAYBACK_STATUS.PLAYING, PLAYBACK_STATUS.PAUSED, PLAYBACK_STATUS.LOADING, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.SEEKING]: [PLAYBACK_STATUS.PLAYING, PLAYBACK_STATUS.PAUSED, PLAYBACK_STATUS.LOADING, PLAYBACK_STATUS.ERROR, PLAYBACK_STATUS.IDLE],
      [PLAYBACK_STATUS.ERROR]: [PLAYBACK_STATUS.IDLE, PLAYBACK_STATUS.LOADING],
    };
  }

  /**
   * Mengecek apakah transisi dari status sekarang ke status baru diperbolehkan
   * @param {string} nextState
   * @returns {boolean}
   */
  canTransitionTo(nextState) {
    if (nextState === this.currentState) return true;
    const allowed = this.transitions[this.currentState] || [];
    return allowed.includes(nextState);
  }

  /**
   * Melakukan transisi ke status baru jika valid
   * @param {string} nextState
   * @returns {string} Status baru
   */
  transition(nextState) {
    if (!this.canTransitionTo(nextState)) {
      console.warn(`[PlaybackStateMachine] Invalid state transition: ${this.currentState} -> ${nextState}`);
      return this.currentState;
    }
    this.previousState = this.currentState;
    this.currentState = nextState;
    return this.currentState;
  }

  getState() {
    return this.currentState;
  }

  getPreviousState() {
    return this.previousState;
  }

  /**
   * Mengatur state secara langsung saat sinkronisasi state native (Reconnection Protocol)
   * @param {string} state
   * @returns {string}
   */
  restore(state) {
    if (Object.values(PLAYBACK_STATUS).includes(state)) {
      this.previousState = this.currentState;
      this.currentState = state;
    }
    return this.currentState;
  }

  reset() {
    this.previousState = this.currentState;
    this.currentState = PLAYBACK_STATUS.IDLE;
    return this.currentState;
  }
}
