const assert = require('assert');
const { getFunctions } = require('./extractor');

const { ensureExtension } = getFunctions();

console.log('Testing: ensureExtension()');

try {
  // Already has the extension
  assert.strictEqual(ensureExtension('file.txt', '.txt'), 'file.txt',
    'Does not double-add .txt');
  assert.strictEqual(ensureExtension('doc.html', '.html'), 'doc.html',
    'Does not double-add .html');

  // Case-insensitive check
  assert.strictEqual(ensureExtension('FILE.TXT', '.txt'), 'FILE.TXT',
    'Case-insensitive match for .TXT');
  assert.strictEqual(ensureExtension('Doc.HTML', '.html'), 'Doc.HTML',
    'Case-insensitive match for .HTML');

  // Missing extension — adds it
  assert.strictEqual(ensureExtension('readme', '.md'), 'readme.md',
    'Adds .md when missing');
  assert.strictEqual(ensureExtension('untitled', '.txt'), 'untitled.txt',
    'Adds .txt when missing');

  // Empty/null title — falls back to "untitled"
  assert.strictEqual(ensureExtension('', '.txt'), 'untitled.txt',
    'Empty title becomes untitled.txt');
  assert.strictEqual(ensureExtension(null, '.txt'), 'untitled.txt',
    'null title becomes untitled.txt');
  assert.strictEqual(ensureExtension(undefined, '.txt'), 'untitled.txt',
    'undefined title becomes untitled.txt');

  // Whitespace-only title
  assert.strictEqual(ensureExtension('   ', '.txt'), 'untitled.txt',
    'Whitespace-only title becomes untitled.txt');

  // Different extension — appends the target extension
  assert.strictEqual(ensureExtension('file.js', '.txt'), 'file.js.txt',
    'Appends .txt even if already has .js (only checks target extension)');
  assert.strictEqual(ensureExtension('data', '.json'), 'data.json',
    'Adds .json when missing');

  console.log('✓ ensureExtension() tests passed');
} catch (err) {
  console.error('✗ ensureExtension() tests failed');
  console.error(err);
  process.exit(1);
}
