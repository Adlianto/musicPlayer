/**
 * platformCapabilities.js
 * Deteksi runtime platform dan pemetaan kapabilitas sistem operasi.
 */

/**
 * Mengecek apakah berjalan di lingkungan Tauri v2
 * @returns {boolean}
 */
export function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

/**
 * Mengecek apakah berjalan di lingkungan Capacitor (Mobile)
 * @returns {boolean}
 */
export function isCapacitor() {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
}

/**
 * Mengecek apakah platform adalah Android
 * @returns {boolean}
 */
export function isAndroid() {
  if (isCapacitor()) {
    return window.Capacitor?.getPlatform?.() === 'android';
  }
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

/**
 * Mengecek apakah berjalan di Web murni (SPA/PWA)
 * @returns {boolean}
 */
export function isWeb() {
  return !isTauri() && !isCapacitor();
}

/**
 * Mengambil nama platform aktif
 * @returns {'web' | 'tauri' | 'android'}
 */
export function getPlatformName() {
  if (isTauri()) return 'tauri';
  if (isCapacitor() && isAndroid()) return 'android';
  return 'web';
}

/**
 * Mengambil metadata kapabilitas platform aktif
 * @returns {{
 *   platform: 'web' | 'tauri' | 'android',
 *   authoritativeSource: 'javascript' | 'native',
 *   supportsBackgroundPlayback: 'browser-dependent' | 'verified',
 *   supportsFileSystemAccess: boolean,
 *   supportsVisualizer: boolean,
 * }}
 */
export function getPlatformCapabilities() {
  const platform = getPlatformName();

  return {
    platform,
    // Di Android, MediaSessionService native adalah Authoritative Source of Truth
    authoritativeSource: platform === 'android' ? 'native' : 'javascript',
    supportsBackgroundPlayback: platform === 'web' ? 'browser-dependent' : 'verified',
    supportsFileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
    supportsVisualizer: platform !== 'android',
  };
}
