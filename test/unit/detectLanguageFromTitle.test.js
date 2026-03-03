const assert = require('assert');
const { getFunctions } = require('./extractor');

const { detectLanguageFromTitle } = getFunctions();

console.log('Testing: detectLanguageFromTitle()');

const testCases = [
  { input: 'test.js', expected: 'javascript' },
  { input: 'script.py', expected: 'python' },
  { input: 'README.md', expected: 'markdown' },
  { input: 'index.html', expected: 'htmlmixed' },
  { input: 'style.css', expected: 'css' },
  { input: 'data.json', expected: 'json' },
  { input: 'query.sql', expected: 'sql' },
  { input: 'run.sh', expected: 'shell' },
  { input: 'config.xml', expected: 'xml' },
  { input: 'Main.java', expected: 'java' },
  { input: 'docker-compose.yaml', expected: 'yaml' },
  { input: 'config.yml', expected: 'yaml' },
  { input: 'app.ts', expected: 'javascript' },
  { input: 'component.jsx', expected: 'javascript' },
  { input: 'page.tsx', expected: 'htmlmixed' },
  { input: 'notes.txt', expected: 'plain' },
  { input: 'noextension', expected: 'plain' },
  { input: '', expected: 'plain' },
  { input: null, expected: 'plain' }
];

try {
  testCases.forEach(({ input, expected }) => {
    const result = detectLanguageFromTitle(input);
    assert.strictEqual(result, expected, `detectLanguageFromTitle("${input}") should be "${expected}", got "${result}"`);
  });

  console.log('✓ detectLanguageFromTitle() tests passed');
} catch (err) {
  console.error('✗ detectLanguageFromTitle() tests failed');
  console.error(err);
  process.exit(1);
}
