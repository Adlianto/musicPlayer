/**
 * audioMath.js
 * Utility matematika audio sesuai blueprint draftv1.md Bab 10.
 * Slider UI menerapkan skala eksponensial kuadratik: gain = Math.pow(sliderValue, 2)
 */

/**
 * Mengonversi nilai posisi slider (0.0 s/d 1.0) menjadi audio gain eksponensial (0.0 s/d 1.0)
 * Formula blueprint: gain = Math.pow(sliderValue, 2)
 *
 * @param {number} sliderValue - Nilai slider linier [0..1]
 * @returns {number} Audio gain eksponensial [0..1]
 */
export function sliderToGain(sliderValue) {
  if (!Number.isFinite(sliderValue)) return 0;
  const clamped = Math.max(0, Math.min(1, sliderValue));
  return Math.pow(clamped, 2);
}

/**
 * Mengonversi audio gain eksponensial (0.0 s/d 1.0) kembali ke posisi slider (0.0 s/d 1.0)
 * Formula inversi: sliderValue = Math.sqrt(gain)
 *
 * @param {number} gain - Audio gain [0..1]
 * @returns {number} Nilai posisi slider [0..1]
 */
export function gainToSlider(gain) {
  if (!Number.isFinite(gain)) return 0;
  const clamped = Math.max(0, Math.min(1, gain));
  return Math.sqrt(clamped);
}
