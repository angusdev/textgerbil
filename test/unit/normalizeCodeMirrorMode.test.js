const assert = require('assert');
const { getFunctions } = require('./extractor');

const { normalizeCodeMirrorMode } = getFunctions();

console.log('Testing: normalizeCodeMirrorMode()');

try {
  // Java maps to MIME type
  assert.strictEqual(normalizeCodeMirrorMode('java'), 'text/x-java',
    'java maps to text/x-java MIME type');

  // JSON maps to object with json flag
  const jsonMode = normalizeCodeMirrorMode('json');
  assert.strictEqual(typeof jsonMode, 'object', 'json returns an object');
  assert.strictEqual(jsonMode.name, 'javascript', 'json mode name is javascript');
  assert.strictEqual(jsonMode.json, true, 'json mode has json flag true');

  // Other languages pass through unchanged
  assert.strictEqual(normalizeCodeMirrorMode('javascript'), 'javascript',
    'javascript passes through');
  assert.strictEqual(normalizeCodeMirrorMode('python'), 'python',
    'python passes through');
  assert.strictEqual(normalizeCodeMirrorMode('markdown'), 'markdown',
    'markdown passes through');
  assert.strictEqual(normalizeCodeMirrorMode('htmlmixed'), 'htmlmixed',
    'htmlmixed passes through');
  assert.strictEqual(normalizeCodeMirrorMode('css'), 'css',
    'css passes through');
  assert.strictEqual(normalizeCodeMirrorMode('plain'), 'plain',
    'plain passes through');
  assert.strictEqual(normalizeCodeMirrorMode('shell'), 'shell',
    'shell passes through');
  assert.strictEqual(normalizeCodeMirrorMode('sql'), 'sql',
    'sql passes through');
  assert.strictEqual(normalizeCodeMirrorMode('xml'), 'xml',
    'xml passes through');
  assert.strictEqual(normalizeCodeMirrorMode('yaml'), 'yaml',
    'yaml passes through');

  console.log('✓ normalizeCodeMirrorMode() tests passed');
} catch (err) {
  console.error('✗ normalizeCodeMirrorMode() tests failed');
  console.error(err);
  process.exit(1);
}
