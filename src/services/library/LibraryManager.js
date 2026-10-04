/**
 * LibraryManager.js
 * Koordinator domain untuk manajemen pustaka musik lokal:
 * Import, deduplikasi berbasis fingerprint, ekstraksi metadata, Read, Update, Delete.
 * Sesuai Blueprint Bab 2.
 */
import { FileSourceResolver } from '../platform/fileSourceResolver.js';
import { TrackRepository } from '../storage/TrackRepository.js';
import { createSourceDescriptor } from '../../types/trackSource.js';

/**
 * Ekstraksi durasi berkas audio menggunakan HTMLAudioElement
 * @param {File} file
 * @returns {Promise<number>}
 */
export async function extractAudioDuration(file) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return 0;
  }

  return new Promise((resolve) => {
    try {
      const audio = document.createElement('audio');
      const objectUrl = URL.createObjectURL(file);
      audio.preload = 'metadata';

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // Ignore cleanup errors
        }
      };

      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        cleanup();
        resolve(duration);
      };

      audio.onerror = () => {
        cleanup();
        resolve(0);
      };

      audio.src = objectUrl;
    } catch {
      resolve(0);
    }
  });
}

/**
 * Parsing informasi judul dan artis dari nama berkas (heuristik)
 * @param {string} fileName
 * @returns {{ title: string, artist: string, album: string }}
 */
export function parseMetadataFromFilename(fileName) {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();
  const separatorIndex = cleanName.indexOf(' - ');

  if (separatorIndex !== -1) {
    const artist = cleanName.substring(0, separatorIndex).trim();
    const title = cleanName.substring(separatorIndex + 3).trim();
    return {
      title: title || cleanName,
      artist: artist || 'Unknown Artist',
      album: 'Local Music',
    };
  }

  return {
    title: cleanName,
    artist: 'Unknown Artist',
    album: 'Local Music',
  };
}

/**
 * Menghasilkan sidik jari heuristik (fileSize + lastModified + fileName)
 * Mencegah pemindaian hashing biner bergiga-giga sesuai Bab 2.5
 * @param {number} size
 * @param {number} lastModified
 * @param {string} name
 * @returns {string}
 */
export function computeFingerprint(size, lastModified, name) {
  return `${size || 0}_${lastModified || 0}_${name || ''}`;
}

export const LibraryManager = {
  /**
   * Mengimpor satu atau lebih File / FileSystemFileHandle ke dalam pustaka
   * @param {Array<File|FileSystemFileHandle>} items
   * @returns {Promise<{ imported: Array<Object>, skipped: Array<Object> }>}
   */
  async importItems(items) {
    const imported = [];
    const skipped = [];

    for (const item of items) {
      if (!item) continue;

      let file = null;
      let handle = null;
      let sourceType = 'web_session_file';

      if (typeof FileSystemFileHandle !== 'undefined' && item instanceof FileSystemFileHandle) {
        handle = item;
        file = await handle.getFile();
        sourceType = 'web_fs_access';
      } else if (typeof File !== 'undefined' && item instanceof File) {
        file = item;
        sourceType = 'web_session_file';
      } else if (item.file) {
        file = item.file;
        handle = item.handle || null;
        sourceType = handle ? 'web_fs_access' : 'web_session_file';
      } else if (item.name && typeof item.size === 'number') {
        file = item;
        sourceType = 'web_session_file';
      }

      if (!file) continue;

      const fingerprint = computeFingerprint(file.size, file.lastModified, file.name);

      // Cek apakah berkas sudah terdaftar di library (Deduplikasi)
      const existing = await TrackRepository.findTrackByFingerprint(fingerprint);
      if (existing) {
        // Pulihkan availability dan registrasi source jika user mengimpor ulang
        if (sourceType === 'web_session_file') {
          FileSourceResolver.registerSessionFile(existing.trackId, file);
        } else if (sourceType === 'web_fs_access' && handle) {
          await FileSourceResolver.storeFileHandle(existing.trackId, handle);
        }
        await TrackRepository.setTrackAvailability(existing.trackId, 1);
        skipped.push({ ...existing, isAvailable: 1 });
        continue;
      }

      // Track baru
      const duration = await extractAudioDuration(file);
      const meta = parseMetadataFromFilename(file.name);
      const trackId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `trk_${crypto.randomUUID()}`
          : `trk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

      const descriptor = createSourceDescriptor(
        sourceType,
        trackId,
        file.name,
        file.size,
        file.lastModified
      );

      if (sourceType === 'web_session_file') {
        FileSourceResolver.registerSessionFile(trackId, file);
      } else if (sourceType === 'web_fs_access' && handle) {
        await FileSourceResolver.storeFileHandle(trackId, handle);
      }

      const newTrack = {
        trackId,
        sourceFingerprint: fingerprint,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        duration,
        isAvailable: 1,
        dateAdded: Date.now(),
        source: descriptor,
      };

      await TrackRepository.addTrack(newTrack);
      imported.push(newTrack);
    }

    return { imported, skipped };
  },

  /**
   * Mengambil semua lagu dari pustaka
   * @returns {Promise<Array<Object>>}
   */
  async getAllTracks() {
    return await TrackRepository.getAllTracks();
  },

  /**
   * Mengambil satu lagu berdasarkan trackId
   * @param {string} trackId
   * @returns {Promise<Object|null>}
   */
  async getTrack(trackId) {
    return await TrackRepository.getTrackById(trackId);
  },

  /**
   * Memperbarui metadata lagu (title, artist, album)
   * Hanya memodifikasi metadata IndexedDB, tidak mengubah berkas fisik.
   * @param {string} trackId
   * @param {{ title?: string, artist?: string, album?: string }} metadata
   * @returns {Promise<Object>}
   */
  async updateTrack(trackId, metadata) {
    return await TrackRepository.updateTrackMetadata(trackId, metadata);
  },

  /**
   * Menghapus lagu dari library
   * Cascade delete menghapus entri playlist/queue/handles, tetapi TIDAK MENGHAPUS BERKAS ASLI.
   * @param {string} trackId
   */
  async deleteTrack(trackId) {
    FileSourceResolver.removeSessionFile(trackId);
    await FileSourceResolver.removeFileHandle(trackId);
    await TrackRepository.deleteTrack(trackId);
  },

  /**
   * Menyelesaikan sumber siap putar untuk pemutaran audio
   * @param {Object} track
   * @returns {Promise<Object>}
   */
  async resolveTrackSource(track) {
    return await FileSourceResolver.resolvePlayableSource(track);
  },
};
