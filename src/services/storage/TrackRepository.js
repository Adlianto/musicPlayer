/**
 * TrackRepository.js
 * Repositori akses data untuk entitas Track dan penanganan cascade deletion.
 * Sesuai Blueprint Bab 2.3 & 2.4.
 */
import { db } from './db.js';

export const TrackRepository = {
  /**
   * Mengambil semua lagu dalam pustaka, diurutkan berdasarkan tanggal ditambahkan (terbaru di atas)
   * @returns {Promise<Array<Object>>}
   */
  async getAllTracks() {
    return await db.tracks.orderBy('dateAdded').reverse().toArray();
  },

  /**
   * Mengambil satu lagu berdasarkan ID
   * @param {string} trackId
   * @returns {Promise<Object|null>}
   */
  async getTrackById(trackId) {
    if (!trackId) return null;
    return (await db.tracks.get(trackId)) || null;
  },

  /**
   * Mencari lagu berdasarkan heuristic fingerprint untuk mencegah duplikasi
   * @param {string} sourceFingerprint
   * @returns {Promise<Object|null>}
   */
  async findTrackByFingerprint(sourceFingerprint) {
    if (!sourceFingerprint) return null;
    return (await db.tracks.where('sourceFingerprint').equals(sourceFingerprint).first()) || null;
  },

  /**
   * Menambahkan lagu baru ke basis data
   * @param {Object} track
   * @returns {Promise<string>} trackId
   */
  async addTrack(track) {
    if (!track.trackId) {
      throw new Error('Track requires a valid trackId');
    }

    const record = {
      ...track,
      title_lower: (track.title || '').trim().toLowerCase(),
      artist_lower: (track.artist || '').trim().toLowerCase(),
      album_lower: (track.album || '').trim().toLowerCase(),
      isAvailable: track.isAvailable !== undefined ? (track.isAvailable ? 1 : 0) : 1,
      dateAdded: track.dateAdded || Date.now(),
    };

    await db.tracks.put(record);
    return record.trackId;
  },

  /**
   * Memperbarui metadata lagu (Title, Artist, Album) tanpa memodifikasi berkas asli
   * @param {string} trackId
   * @param {{ title?: string, artist?: string, album?: string }} metadata
   * @returns {Promise<Object>} Updated track
   */
  async updateTrackMetadata(trackId, { title, artist, album }) {
    const existing = await this.getTrackById(trackId);
    if (!existing) {
      throw new Error(`Track with ID ${trackId} not found in library`);
    }

    const updates = {};
    if (title !== undefined) {
      updates.title = title.trim();
      updates.title_lower = title.trim().toLowerCase();
    }
    if (artist !== undefined) {
      updates.artist = artist.trim();
      updates.artist_lower = artist.trim().toLowerCase();
    }
    if (album !== undefined) {
      updates.album = album.trim();
      updates.album_lower = album.trim().toLowerCase();
    }

    await db.tracks.update(trackId, updates);
    return { ...existing, ...updates };
  },

  /**
   * Mengubah status ketersediaan lagu (isAvailable)
   * @param {string} trackId
   * @param {number|boolean} isAvailable
   */
  async setTrackAvailability(trackId, isAvailable) {
    const val = isAvailable ? 1 : 0;
    await db.tracks.update(trackId, { isAvailable: val });
  },

  /**
   * Menghapus lagu dari library dengan transaksi cascade deletion
   * Mencegah orphan record di relasi playlist, queue, history, dan fileHandles.
   * TIDAK MENGHAPUS BERKAS ASLI PENGGUNA DI DISK.
   * @param {string} trackId
   */
  async deleteTrack(trackId) {
    if (!trackId) return;

    await db.transaction(
      'rw',
      [db.tracks, db.fileHandles, db.playlistTracks, db.activeQueue, db.playbackHistory],
      async () => {
        await db.playlistTracks.where('trackId').equals(trackId).delete();
        await db.activeQueue.where('trackId').equals(trackId).delete();
        await db.playbackHistory.where('trackId').equals(trackId).delete();
        await db.fileHandles.delete(trackId);
        await db.tracks.delete(trackId);
      }
    );
  },

  /**
   * Menghapus semua entri dalam library (untuk reset/maintenance jika diperlukan)
   */
  async clearAll() {
    await db.transaction(
      'rw',
      [db.tracks, db.fileHandles, db.playlistTracks, db.activeQueue, db.playbackHistory],
      async () => {
        await db.playlistTracks.clear();
        await db.activeQueue.clear();
        await db.playbackHistory.clear();
        await db.fileHandles.clear();
        await db.tracks.clear();
      }
    );
  }
};
