const assert = require('assert');
const { getFunctions } = require('./extractor');

const { getDefaultLanguageForMode } = getFunctions();

console.log('Testing: getDefaultLanguageForMode()');

try {
  assert.strictEqual(getDefaultLanguageForMode('text'), 'detect',
    'text mode defaults to detect');
  assert.strictEqual(getDefaultLanguageForMode('rich'), 'plain',
    'rich mode defaults to plain');
  assert.strictEqual(getDefaultLanguageForMode('notepad'), 'plain',
    'notepad mode defaults to plain');
  assert.strictEqual(getDefaultLanguageForMode('slide'), 'markdown',
    'slide mode defaults to markdown');
  assert.strictEqual(getDefaultLanguageForMode('unknown'), 'plain',
    'unknown mode defaults to plain');
  assert.strictEqual(getDefaultLanguageForMode(undefined), 'plain',
    'undefined mode defaults to plain');

  console.log('✓ getDefaultLanguageForMode() tests passed');
} catch (err) {
  console.error('✗ getDefaultLanguageForMode() tests failed');
  console.error(err);
  process.exit(1);
}
