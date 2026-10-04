/**
 * fileSourceResolver.js
 * Bertanggung jawab memetakan PersistedSourceDescriptor ke objek sumber fisik
 * yang dapat diputar (Blob/File/URL) sesuai platform runtime.
 * Sesuai Blueprint Bab 2.1.
 */
import { db } from '../storage/db.js';
import { TrackRepository } from '../storage/TrackRepository.js';

/**
 * Peta memori untuk menyimpan instance File lokal selama sesi aktif browser.
 * Tidak menyimpan binary di IndexedDB, sesuai kebijakan Zero-Binary Duplication.
 * @type {Map<string, File>}
 */
const sessionFileMap = new Map();

export const FileSourceResolver = {
  /**
   * Mendaftarkan file instance sesi aktif
   * @param {string} trackId
   * @param {File} file
   */
  registerSessionFile(trackId, file) {
    if (trackId && file) {
      sessionFileMap.set(trackId, file);
    }
  },

  /**
   * Mengambil file instance sesi aktif
   * @param {string} trackId
   * @returns {File|undefined}
   */
  getSessionFile(trackId) {
    return sessionFileMap.get(trackId);
  },

  /**
   * Menghapus file instance dari memori
   * @param {string} trackId
   */
  removeSessionFile(trackId) {
    sessionFileMap.delete(trackId);
  },

  /**
   * Menyimpan FileSystemFileHandle ke IndexedDB khusus Web FS Access
   * @param {string} trackId
   * @param {FileSystemFileHandle} handle
   */
  async storeFileHandle(trackId, handle) {
    if (trackId && handle) {
      await db.fileHandles.put({ trackId, handle });
    }
  },

  /**
   * Mengambil FileSystemFileHandle dari IndexedDB
   * @param {string} trackId
   * @returns {Promise<FileSystemFileHandle|null>}
   */
  async getFileHandle(trackId) {
    if (!trackId) return null;
    const item = await db.fileHandles.get(trackId);
    return item?.handle || null;
  },

  /**
   * Menghapus FileSystemFileHandle dari IndexedDB
   * @param {string} trackId
   */
  async removeFileHandle(trackId) {
    if (trackId) {
      await db.fileHandles.delete(trackId);
    }
  },

  /**
   * Memeriksa apakah source untuk trackId saat ini dapat diputar
   * @param {Object} track
   * @returns {Promise<boolean>}
   */
  async isSourcePlayable(track) {
    if (!track || !track.source) return false;

    if (track.source.type === 'web_session_file') {
      return sessionFileMap.has(track.trackId);
    }

    if (track.source.type === 'web_fs_access') {
      const handle = await this.getFileHandle(track.trackId);
      if (!handle) return false;
      try {
        if (typeof handle.queryPermission === 'function') {
          const perm = await handle.queryPermission({ mode: 'read' });
          return perm === 'granted';
        }
        return true;
      } catch {
        return false;
      }
    }

    return true;
  },

  /**
   * Menyelesaikan PersistedSourceDescriptor menjadi descriptor siap putar dengan fileInstance.
   * Jika berkas tidak dapat diakses, availability diubah menjadi 0 dan melempar error.
   * @param {Object} track
   * @returns {Promise<import('../../types/trackSource.js').PersistedSourceDescriptor & { fileInstance?: Blob|File }>}
   */
  async resolvePlayableSource(track) {
    if (!track || !track.source) {
      throw new Error('Track record does not contain a valid source descriptor');
    }

    const { trackId, source } = track;

    // 1. Web File System Access API
    if (source.type === 'web_fs_access') {
      const handle = await this.getFileHandle(trackId);
      if (!handle) {
        await TrackRepository.setTrackAvailability(trackId, 0);
        throw new Error(
          'File handle not found in storage. File access may have been revoked or deleted.'
        );
      }

      try {
        if (typeof handle.queryPermission === 'function') {
          let permission = await handle.queryPermission({ mode: 'read' });
          if (permission !== 'granted' && typeof handle.requestPermission === 'function') {
            permission = await handle.requestPermission({ mode: 'read' });
          }
          if (permission !== 'granted') {
            await TrackRepository.setTrackAvailability(trackId, 0);
            throw new Error('Storage permission denied by user.');
          }
        }

        const file = await handle.getFile();
        await TrackRepository.setTrackAvailability(trackId, 1);
        return {
          ...source,
          fileInstance: file,
        };
      } catch (err) {
        await TrackRepository.setTrackAvailability(trackId, 0);
        throw new Error(`Failed to access file through FileSystemHandle: ${err.message}`);
      }
    }

    // 2. Web Fallback Session File
    if (source.type === 'web_session_file') {
      const file = this.getSessionFile(trackId);
      if (file) {
        await TrackRepository.setTrackAvailability(trackId, 1);
        return {
          ...source,
          fileInstance: file,
        };
      }

      // Sesi kedaluwarsa setelah browser reload
      await TrackRepository.setTrackAvailability(trackId, 0);
      throw new Error(
        'Session expired: This audio file was imported in a previous browser session and is no longer in memory. Please re-import the file to play.'
      );
    }

    // 3. Desktop (Tauri) atau Android
    return { ...source };
  },
};
