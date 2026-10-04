/**
 * AudioVisualizerSource.js
 * Kontrak kapabilitas visualisasi audio opsional sesuai Bab 1.4 draftv1.md.
 *
 * Dipisahkan dari kontrak antarmuka playback utama untuk menjaga performa,
 * efisiensi baterai, dan isolasi thread pada platform yang tidak mendukung visualizer (misal Android Media3).
 *
 * @typedef {Object} AudioVisualizerSource
 * @property {(outputArray: Uint8Array) => void} getFrequencyData
 * @property {(outputArray: Uint8Array) => void} getWaveformData
 * @property {() => number} getFftResolution
 * @property {() => boolean} isAvailable
 */

export const REQUIRED_VISUALIZER_METHODS = Object.freeze([
  'getFrequencyData',
  'getWaveformData',
  'getFftResolution',
  'isAvailable',
]);

/**
 * Validasi runtime apakah sebuah objek memenuhi kontrak AudioVisualizerSource
 * @param {any} source
 * @returns {boolean}
 */
export function isVisualizerSource(source) {
  if (!source || typeof source !== 'object') {
    return false;
  }
  return REQUIRED_VISUALIZER_METHODS.every((m) => typeof source[m] === 'function');
}
