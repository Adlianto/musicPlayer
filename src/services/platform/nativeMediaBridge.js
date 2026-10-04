import { PLAYBACK_STATUS } from '../../types/playerConstants.js';
import { isCapacitor } from './platformCapabilities.js';

/**
 * nativeMediaBridge.js
 * Jembatan komunikasi antara WebView dan native Android MediaController / MediaSessionService.
 */

class NativeMediaBridge {
  constructor() {
    this.plugin = null;
    this.eventListeners = new Map();
  }

  getPlugin() {
    if (this.plugin) return this.plugin;

    if (isCapacitor() && window.Capacitor?.Plugins?.MusicBridge) {
      this.plugin = window.Capacitor.Plugins.MusicBridge;
    }
    return this.plugin;
  }

  /**
   * Mengambil snapshot playback aktif dari native service (Reconnection Protocol).
   * @returns {Promise<import('../../types/playerConstants.js').PlaybackSnapshot>}
   */
  async getPlaybackSnapshot() {
    const plugin = this.getPlugin();
    if (plugin?.getPlaybackSnapshot) {
      try {
        const raw = await plugin.getPlaybackSnapshot();
        return {
          status: raw.status || PLAYBACK_STATUS.IDLE,
          currentTrackId: raw.currentTrackId || null,
          currentTime: Number.isFinite(raw.currentTime) ? raw.currentTime : 0,
          duration: Number.isFinite(raw.duration) ? raw.duration : 0,
          bufferedTime: Number.isFinite(raw.bufferedTime) ? raw.bufferedTime : 0,
          volume: Number.isFinite(raw.volume) ? raw.volume : 1.0,
          isMuted: Boolean(raw.isMuted),
          playbackRate: Number.isFinite(raw.playbackRate) ? raw.playbackRate : 1.0,
        };
      } catch (err) {
        console.warn('[NativeMediaBridge] Error querying native snapshot:', err);
      }
    }

    // Default fallback jika plugin belum terpasang atau di lingkungan non-native
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

  async loadTrack(trackId, source, operationId) {
    const plugin = this.getPlugin();
    if (plugin?.loadTrack) {
      await plugin.loadTrack({
        trackId,
        sourceKey: source.key,
        sourceType: source.type,
        displayName: source.displayName,
        operationId,
      });
    }
  }

  async play(operationId) {
    const plugin = this.getPlugin();
    if (plugin?.play) {
      await plugin.play({ operationId });
    }
  }

  async pause() {
    const plugin = this.getPlugin();
    if (plugin?.pause) {
      await plugin.pause();
    }
  }

  async seek(timeInSeconds) {
    const plugin = this.getPlugin();
    if (plugin?.seek && Number.isFinite(timeInSeconds)) {
      await plugin.seek({ timeInSeconds });
    }
  }

  async setVolume(volume) {
    const plugin = this.getPlugin();
    if (plugin?.setVolume && Number.isFinite(volume)) {
      await plugin.setVolume({ volume });
    }
  }

  async setPlaybackRate(rate) {
    const plugin = this.getPlugin();
    if (plugin?.setPlaybackRate && Number.isFinite(rate)) {
      await plugin.setPlaybackRate({ rate });
    }
  }

  addListener(eventName, handler) {
    const plugin = this.getPlugin();
    if (plugin?.addListener) {
      const handle = plugin.addListener(eventName, handler);
      return () => {
        if (handle?.then) {
          handle.then((sub) => sub.remove?.());
        } else if (handle?.remove) {
          handle.remove();
        }
      };
    }

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(handler);

    return () => {
      this.eventListeners.get(eventName)?.delete(handler);
    };
  }

  /**
   * Helper untuk menyimulasikan event native (berguna untuk testing dan reconnect simulation)
   */
  emitMockEvent(eventName, payload) {
    const handlers = this.eventListeners.get(eventName);
    if (handlers) {
      handlers.forEach((fn) => fn(payload));
    }
  }
}

export const nativeMediaBridge = new NativeMediaBridge();
