import assert from 'node:assert';
import test from 'node:test';
import { gainToSlider, sliderToGain } from '../audioMath.js';

test('audioMath: sliderToGain applies quadratic exponential curve gain = Math.pow(sliderValue, 2)', () => {
  // Boundary tests
  assert.strictEqual(sliderToGain(0), 0, 'Slider 0 should produce gain 0');
  assert.strictEqual(sliderToGain(1), 1, 'Slider 1 should produce gain 1');

  // Curve checks
  assert.strictEqual(sliderToGain(0.5), 0.25, 'Slider 0.5 should produce gain 0.25');
  assert.strictEqual(Math.round(sliderToGain(0.2) * 100) / 100, 0.04, 'Slider 0.2 should produce gain 0.04');
  assert.strictEqual(Math.round(sliderToGain(0.7) * 100) / 100, 0.49, 'Slider 0.7 should produce gain 0.49');

  // Clamping checks
  assert.strictEqual(sliderToGain(-0.5), 0, 'Negative values should clamp to 0');
  assert.strictEqual(sliderToGain(1.5), 1, 'Values > 1 should clamp to 1');

  // Resilience against NaN and non-finite
  assert.strictEqual(sliderToGain(NaN), 0, 'NaN should safely return 0');
  assert.strictEqual(sliderToGain(Infinity), 0, 'Infinity should safely return 0');
  assert.strictEqual(sliderToGain(-Infinity), 0, '-Infinity should safely return 0');
  assert.strictEqual(sliderToGain(null), 0, 'null should safely return 0');
  assert.strictEqual(sliderToGain(undefined), 0, 'undefined should safely return 0');
});

test('audioMath: gainToSlider performs accurate inverse transformation sliderValue = Math.sqrt(gain)', () => {
  // Boundary tests
  assert.strictEqual(gainToSlider(0), 0, 'Gain 0 should produce slider 0');
  assert.strictEqual(gainToSlider(1), 1, 'Gain 1 should produce slider 1');

  // Inverse curve checks
  assert.strictEqual(gainToSlider(0.25), 0.5, 'Gain 0.25 should produce slider 0.5');
  assert.strictEqual(Math.round(gainToSlider(0.04) * 10) / 10, 0.2, 'Gain 0.04 should produce slider 0.2');

  // Clamping checks
  assert.strictEqual(gainToSlider(-0.1), 0, 'Negative gain should clamp to 0');
  assert.strictEqual(gainToSlider(2.0), 1, 'Gain > 1 should clamp to 1');

  // Non-finite checks
  assert.strictEqual(gainToSlider(NaN), 0, 'NaN should safely return 0');
  assert.strictEqual(gainToSlider(Infinity), 0, 'Infinity should safely return 0');
});

test('audioMath: round-trip consistency gainToSlider(sliderToGain(x)) === x', () => {
  const steps = [0, 0.1, 0.25, 0.33, 0.5, 0.75, 0.9, 1.0];
  for (const step of steps) {
    const gain = sliderToGain(step);
    const backToSlider = gainToSlider(gain);
    assert.ok(
      Math.abs(backToSlider - step) < 1e-6,
      `Round-trip failed for ${step}: got ${backToSlider}`
    );
  }
});
