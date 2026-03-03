const assert = require('assert');
const { getFunctions } = require('./extractor');

const { uid } = getFunctions();

console.log('Testing: uid()');

try {
  // Test Case 1: Generates a string
  const id1 = uid();
  assert(typeof id1 === 'string', 'uid() should return a string');
  assert(id1.length > 0, 'uid() should not be empty');

  // Test Case 2: Uniqueness
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    ids.add(uid());
  }
  assert(ids.size === 100, 'uid() should generate unique IDs in sequence');

  console.log('✓ uid() tests passed');
} catch (err) {
  console.error('✗ uid() tests failed');
  console.error(err);
  process.exit(1);
}
