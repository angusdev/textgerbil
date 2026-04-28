const assert = require('assert');
const { getFunctions } = require('./extractor');

const { isMeaningfulRichContent } = getFunctions();

console.log('Testing: isMeaningfulRichContent()');

try {
  // Empty / whitespace only
  assert.strictEqual(isMeaningfulRichContent(''), false,
    'Empty string is not meaningful');
  assert.strictEqual(isMeaningfulRichContent('   '), false,
    'Whitespace only is not meaningful');
  assert.strictEqual(isMeaningfulRichContent(null), false,
    'null is not meaningful');
  assert.strictEqual(isMeaningfulRichContent(undefined), false,
    'undefined is not meaningful');
  assert.strictEqual(isMeaningfulRichContent(123), false,
    'number is not meaningful');

  // Quill default placeholder
  assert.strictEqual(isMeaningfulRichContent('<p><br></p>'), false,
    'Quill default <p><br></p> is not meaningful');
  assert.strictEqual(isMeaningfulRichContent('<p><BR></p>'), false,
    'Quill default (uppercase BR) is not meaningful');

  // Only <br> tags
  assert.strictEqual(isMeaningfulRichContent('<br>'), false,
    'Single <br> is not meaningful');
  assert.strictEqual(isMeaningfulRichContent('<br /><br/>'), false,
    'Multiple <br> variants is not meaningful');

  // &nbsp; only
  assert.strictEqual(isMeaningfulRichContent('&nbsp;&nbsp;'), false,
    'Only &nbsp; is not meaningful');
  assert.strictEqual(isMeaningfulRichContent('<p>&nbsp;</p>'), false,
    'Paragraph with only &nbsp; is not meaningful');

  // Actual content
  assert.strictEqual(isMeaningfulRichContent('<p>hello</p>'), true,
    'Paragraph with text is meaningful');
  assert.strictEqual(isMeaningfulRichContent('<p><strong>bold</strong></p>'), true,
    'Paragraph with bold text is meaningful');
  assert.strictEqual(isMeaningfulRichContent('plain text'), true,
    'Plain text is meaningful');
  assert.strictEqual(isMeaningfulRichContent('<h1>Title</h1>'), true,
    'Heading is meaningful');
  assert.strictEqual(isMeaningfulRichContent('<ul><li>item</li></ul>'), true,
    'List is meaningful');

  // Mixed meaningful and non-meaningful
  assert.strictEqual(isMeaningfulRichContent('<p><br></p><p>content</p>'), true,
    'Mixed placeholder and content is meaningful');

  console.log('✓ isMeaningfulRichContent() tests passed');
} catch (err) {
  console.error('✗ isMeaningfulRichContent() tests failed');
  console.error(err);
  process.exit(1);
}
