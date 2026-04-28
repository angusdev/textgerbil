const assert = require('assert');
const { getFunctions } = require('./extractor');

const { hasExtension } = getFunctions();

console.log('Testing: hasExtension()');

try {
  // Has extension
  assert.strictEqual(hasExtension('file.txt'), true,
    'file.txt has extension');
  assert.strictEqual(hasExtension('script.js'), true,
    'script.js has extension');
  assert.strictEqual(hasExtension('archive.tar.gz'), true,
    'archive.tar.gz has extension');
  assert.strictEqual(hasExtension('name.a'), true,
    'Single-char extension counts');

  // No extension
  assert.strictEqual(hasExtension('Makefile'), false,
    'No dot means no extension');
  assert.strictEqual(hasExtension('README'), false,
    'README has no extension');

  // Dot at start (hidden file) — not an extension
  assert.strictEqual(hasExtension('.gitignore'), false,
    'Dot at position 0 is not an extension');
  assert.strictEqual(hasExtension('.env'), false,
    'Dot at position 0 is not an extension (.env)');

  // Trailing dot — not valid
  assert.strictEqual(hasExtension('file.'), false,
    'Trailing dot is not a valid extension');

  // Empty / null
  assert.strictEqual(hasExtension(''), false,
    'Empty string has no extension');
  assert.strictEqual(hasExtension(null), false,
    'null has no extension');
  assert.strictEqual(hasExtension(undefined), false,
    'undefined has no extension');

  // Whitespace only
  assert.strictEqual(hasExtension('   '), false,
    'Whitespace only has no extension');

  console.log('✓ hasExtension() tests passed');
} catch (err) {
  console.error('✗ hasExtension() tests failed');
  console.error(err);
  process.exit(1);
}
