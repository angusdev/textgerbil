const assert = require('assert');
const { getFunctions } = require('./extractor');

const { splitMarkdownToNotes } = getFunctions();

console.log('Testing: splitMarkdownToNotes()');

try {
  // Test Case 1: Simple notes
  const md1 = '# Note 1\nBody 1\n\n# Note 2\nBody 2';
  const notes1 = splitMarkdownToNotes(md1);
  assert.strictEqual(notes1.length, 2, 'Should split into 2 notes');
  assert.strictEqual(notes1[0].title, 'Note 1');
  assert.strictEqual(notes1[0].text, 'Body 1');
  assert.strictEqual(notes1[1].title, 'Note 2');
  assert.strictEqual(notes1[1].text, 'Body 2');

  // Test Case 2: Notes without titles
  const md2 = '# \nBody 1\n\n# \nBody 2';
  const notes2 = splitMarkdownToNotes(md2);
  assert.strictEqual(notes2.length, 2, 'Should split into 2 notes even with empty titles');
  assert.strictEqual(notes2[0].title, '');
  assert.strictEqual(notes2[0].text, 'Body 1');

  // Test Case 3: Body with escaped headers
  // In the real code, it's " #" -> "#"
  const md3 = '# Note 1\n # Subheader\nBody text';
  const notes3 = splitMarkdownToNotes(md3);
  assert.strictEqual(notes3.length, 1, 'Should NOT split on escaped headers');
  assert.strictEqual(notes3[0].text, '# Subheader\nBody text', 'Should unescape " #" to "#"');

  // Test Case 4: Complex multi-line bodies
  const md4 = '# Title\nLine 1\nLine 2\n\n# Next\nMore text';
  const notes4 = splitMarkdownToNotes(md4);
  assert.strictEqual(notes4.length, 2);
  assert.strictEqual(notes4[0].text, 'Line 1\nLine 2');

  // Test Case 5: Empty input
  assert.strictEqual(splitMarkdownToNotes('').length, 0);
  assert.strictEqual(splitMarkdownToNotes(null).length, 0);

  console.log('✓ splitMarkdownToNotes() tests passed');
} catch (err) {
  console.error('✗ splitMarkdownToNotes() tests failed');
  console.error(err);
  process.exit(1);
}
