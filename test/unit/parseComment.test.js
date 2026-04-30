const assert = require('assert');
const { getFunctions } = require('./extractor');

const { parseComment, getSlideParts } = getFunctions();

console.log('Testing: parseComment() and getSlideParts()');

{
  console.log('  parseComment');
  const testCases = [
    {
      input: 'fit-to-page: false\nline-height: 1.5\nfont-size: 16px',
      expected: { 'fit-to-page': 'false', 'line-height': '1.5', 'font-size': '16px' }
    },
    {
      input: '',
      expected: {}
    },
    {
      input: 'key: value\nanother: val',
      expected: { key: 'value', another: 'val' }
    },
    {
      input: 'key:value\nno space: also value',
      expected: { key: 'value', 'no space': 'also value' }
    }
  ];

  testCases.forEach((testCase, i) => {
    const result = parseComment(testCase.input);
    assert.deepStrictEqual(result, testCase.expected, `Test case ${i + 1} failed`);
  });
}

{
  console.log('  getSlideParts');
  const testCases = [
    {
      input: `<!--
fit-to-page: false
line-height: 1.5
-->

# Slide Title

Some body text.`,
      expected: {
        title: 'Slide Title',
        body: 'Some body text.',
        comment: { 'fit-to-page': 'false', 'line-height': '1.5' }
      }
    },
    {
      input: '# No Comment\n\nBody here.',
      expected: {
        title: 'No Comment',
        body: 'Body here.',
        comment: {}
      }
    },
    {
      input: `<!-- comment -->
# Title

Body`,
      expected: {
        title: 'Title',
        body: 'Body',
        comment: {}
      }
    }
  ];

  testCases.forEach((testCase, i) => {
    const result = getSlideParts(testCase.input);
    assert.deepStrictEqual(result, testCase.expected, `Test case ${i + 1} failed`);
  });
}

console.log('All tests passed!');