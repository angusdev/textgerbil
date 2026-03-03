const assert = require('assert');
const { getFunctions } = require('./extractor');

const { notesToMarkdown } = getFunctions();

console.log('Testing: notesToMarkdown()');

try {
  // Test Case 1: Multiple notes
  const notes1 = [
    { title: 'Note 1', text: 'Body 1' },
    { title: 'Note 2', text: 'Body 2' }
  ];
  const expected1 = '# Note 1\nBody 1\n\n# Note 2\nBody 2';
  assert.strictEqual(notesToMarkdown(notes1), expected1, 'Should serialize multiple notes correctly');

  // Test Case 2: Note without title
  const notes2 = [{ title: '', text: 'No Title' }];
  const expected2 = '# \nNo Title';
  assert.strictEqual(notesToMarkdown(notes2), expected2, 'Should use "# " for notes with empty titles');

  // Test Case 3: Body starting with # (Escaping)
  const notes3 = [{ title: 'Title', text: '# Header\nText' }];
  const expected3 = '# Title\n # Header\nText';
  assert.strictEqual(notesToMarkdown(notes3), expected3, 'Should escape leading # in body lines');

  // Test Case 4: Multiple escaped headers
  const notes4 = [{ title: 'Note', text: '# H1\n## H2\n### H3' }];
  const expected4 = '# Note\n # H1\n ## H2\n ### H3';
  assert.strictEqual(notesToMarkdown(notes4), expected4, 'Should escape all lines starting with #');

  // Test Case 5: Empty input
  assert.strictEqual(notesToMarkdown([]), '', 'Empty array should result in empty string');
  assert.strictEqual(notesToMarkdown(null), '', 'Null should result in empty string');

  console.log('✓ notesToMarkdown() tests passed');
} catch (err) {
  console.error('✗ notesToMarkdown() tests failed');
  console.error(err);
  process.exit(1);
}
