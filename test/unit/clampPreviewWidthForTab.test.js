const assert = require('assert');
const { getFunctions } = require('./extractor');

const { clampPreviewWidthForTab, MIN_PREVIEW_WIDTH, DEFAULT_PREVIEW_WIDTH } = getFunctions();

console.log('Testing: clampPreviewWidthForTab()');

try {
  // Without a main element or non-text tab, just clamps to MIN_PREVIEW_WIDTH
  // The function needs a DOM 'main' element for full clamping, but we test the numeric logic

  // Below minimum — clamps up
  const result1 = clampPreviewWidthForTab(null, 100);
  assert.strictEqual(result1, MIN_PREVIEW_WIDTH,
    'Below minimum clamps to MIN_PREVIEW_WIDTH');

  // At minimum — stays
  const result2 = clampPreviewWidthForTab(null, MIN_PREVIEW_WIDTH);
  assert.strictEqual(result2, MIN_PREVIEW_WIDTH,
    'At minimum stays at MIN_PREVIEW_WIDTH');

  // Above minimum without tab — no upper clamp (no main element)
  const result3 = clampPreviewWidthForTab(null, 500);
  assert.strictEqual(result3, 500,
    'Above minimum without tab returns the value');

  // NaN input — defaults to DEFAULT_PREVIEW_WIDTH
  const result4 = clampPreviewWidthForTab(null, NaN);
  assert.strictEqual(result4, DEFAULT_PREVIEW_WIDTH,
    'NaN input defaults to DEFAULT_PREVIEW_WIDTH');

  // String input — defaults to DEFAULT_PREVIEW_WIDTH
  const result5 = clampPreviewWidthForTab(null, 'invalid');
  assert.strictEqual(result5, DEFAULT_PREVIEW_WIDTH,
    'String input defaults to DEFAULT_PREVIEW_WIDTH');

  // undefined input — defaults to DEFAULT_PREVIEW_WIDTH
  const result6 = clampPreviewWidthForTab(null, undefined);
  assert.strictEqual(result6, DEFAULT_PREVIEW_WIDTH,
    'undefined input defaults to DEFAULT_PREVIEW_WIDTH');

  // Negative input — clamps to MIN_PREVIEW_WIDTH
  const result7 = clampPreviewWidthForTab(null, -100);
  assert.strictEqual(result7, MIN_PREVIEW_WIDTH,
    'Negative input clamps to MIN_PREVIEW_WIDTH');

  // Rounds to integer
  const result8 = clampPreviewWidthForTab(null, 350.7);
  assert.strictEqual(result8, 351,
    'Fractional input rounds to nearest integer');

  // Non-text mode tab — no upper clamp from main
  const richTab = { mode: 'rich', previewVisible: false };
  const result9 = clampPreviewWidthForTab(richTab, 600);
  assert.strictEqual(result9, 600,
    'Rich mode tab does not apply editor-width clamping');

  console.log('✓ clampPreviewWidthForTab() tests passed');
} catch (err) {
  console.error('✗ clampPreviewWidthForTab() tests failed');
  console.error(err);
  process.exit(1);
}
