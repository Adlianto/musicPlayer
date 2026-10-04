/**
 * db.js
 * Definisi skema basis data IndexedDB via Dexie.js sesuai Blueprint Bab 2.3.
 */
import Dexie from 'dexie';

export const db = new Dexie('ModernMusicPlayerDB');

db.version(1).stores({
  // tracks:
  // - trackId: Primary key (stable UUID string)
  // - sourceFingerprint: Heuristic fingerprint (size + duration + lastModified)
  // - isAvailable: 1 (dapat diakses) atau 0 (sesi kedaluwarsa / berkas tidak ditemukan)
  tracks: 'trackId, sourceFingerprint, title_lower, artist_lower, album_lower, duration, isAvailable, dateAdded, [artist_lower+album_lower]',

  // fileHandles: Penyimpanan FileSystemFileHandle via structured cloning untuk Web FS Access API
  fileHandles: 'trackId',

  // playlists: Metadata playlist
  playlists: '++id, name, createdAt, updatedAt',

  // playlistTracks: Relasi many-to-many playlist
  playlistTracks: '++id, playlistId, trackId, orderIndex, [playlistId+orderIndex]',

  // playbackHistory: Riwayat pemutaran (dibatasi 1.000 entri terbaru)
  playbackHistory: '++id, trackId, playedAt',

  // activeQueue: Persistensi antrean saat aplikasi ditutup
  activeQueue: '++id, trackId, queueIndex',

  // settings: Preferensi pengguna berupa key-value
  settings: 'key'
});
