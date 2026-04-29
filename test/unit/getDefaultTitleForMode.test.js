const assert = require('assert');
const { getFunctions } = require('./extractor');

const { getDefaultTitleForMode } = getFunctions();

console.log('Testing: getDefaultTitleForMode()');

try {
  assert.strictEqual(getDefaultTitleForMode('text'), 'Text',
    'text mode defaults to Text');
  assert.strictEqual(getDefaultTitleForMode('rich'), 'Doc',
    'rich mode defaults to Doc');
  assert.strictEqual(getDefaultTitleForMode('notepad'), 'Note',
    'notepad mode defaults to Note');
  assert.strictEqual(getDefaultTitleForMode('slide'), 'Slides',
    'slide mode defaults to Slides');
  assert.strictEqual(getDefaultTitleForMode('unknown'), 'Text',
    'unknown mode falls back to Text');
  assert.strictEqual(getDefaultTitleForMode(undefined), 'Text',
    'undefined mode falls back to Text');
  assert.strictEqual(getDefaultTitleForMode(null), 'Text',
    'null mode falls back to Text');

  console.log('✓ getDefaultTitleForMode() tests passed');
} catch (err) {
  console.error('✗ getDefaultTitleForMode() tests failed');
  console.error(err);
  process.exit(1);
}
