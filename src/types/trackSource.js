/**
 * trackSource.js
 * Definisi tipe sumber berkas audio untuk layer persistensi dan runtime.
 */

/**
 * @typedef {'web_fs_access' | 'web_session_file' | 'tauri_fs_path' | 'android_media_uri'} SourceType
 */

/**
 * @typedef {Object} PersistedSourceDescriptor
 * @property {SourceType} type
 * @property {string} key - Path string, Content URI, atau reference key
 * @property {string} displayName - Nama file asli
 * @property {number} sizeBytes - Ukuran berkas dalam byte
 * @property {number} lastModifiedMs - Timestamp modifikasi berkas
 */

/**
 * Helper untuk membuat descriptor sumber berkas
 * @param {SourceType} type
 * @param {string} key
 * @param {string} displayName
 * @param {number} sizeBytes
 * @param {number} lastModifiedMs
 * @returns {PersistedSourceDescriptor}
 */
export function createSourceDescriptor(type, key, displayName, sizeBytes = 0, lastModifiedMs = 0) {
  return {
    type,
    key,
    displayName,
    sizeBytes,
    lastModifiedMs,
  };
}
