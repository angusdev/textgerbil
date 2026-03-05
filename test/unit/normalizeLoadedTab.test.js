const assert = require('assert');
const { getFunctions } = require('./extractor');

const { normalizeLoadedTab } = getFunctions();

console.log('Testing: normalizeLoadedTab()');

try {
  // Test Case 1: Minimal valid tab
  const raw1 = { id: 't1', title: 'Test', mode: 'text' };
  const norm1 = normalizeLoadedTab(raw1);
  assert.strictEqual(norm1.id, 't1');
  assert.strictEqual(norm1.title, 'Test');
  assert.strictEqual(norm1.mode, 'text');
  assert.strictEqual(norm1.content, '');
  assert.deepStrictEqual(norm1.theme, {});
  assert.strictEqual(norm1.language, 'detect');

  // Test Case 2: Missing fields / Defaults
  const raw2 = {};
  const norm2 = normalizeLoadedTab(raw2);
  assert(norm2.id, 'Should generate a new ID if missing');
  assert.strictEqual(norm2.title, 'Text');
  assert.strictEqual(norm2.mode, 'text');

  // Test Case 3: Invalid mode
  const raw3 = { mode: 'invalid-mode' };
  const norm3 = normalizeLoadedTab(raw3);
  assert.strictEqual(norm3.mode, 'text', 'Should default to text mode for invalid inputs');

  // Test Case 4: Rich mode defaults
  const raw4 = { mode: 'rich' };
  const norm4 = normalizeLoadedTab(raw4);
  assert.strictEqual(norm4.language, 'plain', 'Rich mode should default language to plain');

  // Test Case 5: Preserve existing valid field
  const raw5 = { previewWidth: 500 };
  const norm5 = normalizeLoadedTab(raw5);
  assert.strictEqual(norm5.previewWidth, 500);

  // Test Case 6: Sanitize previewWidth
  const raw6 = { previewWidth: 'invalid' };
  const norm6 = normalizeLoadedTab(raw6);
  assert(typeof norm6.previewWidth === 'number', 'Should normalize previewWidth to a number');

  console.log('✓ normalizeLoadedTab() tests passed');
} catch (err) {
  console.error('✗ normalizeLoadedTab() tests failed');
  console.error(err);
  process.exit(1);
}
