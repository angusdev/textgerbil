const assert = require('assert');
const { getFunctions } = require('./extractor');

const { isEditableTarget } = getFunctions();

console.log('Testing: isEditableTarget()');

try {
  // null / undefined
  assert.strictEqual(isEditableTarget(null), false,
    'null is not editable');
  assert.strictEqual(isEditableTarget(undefined), false,
    'undefined is not editable');

  // INPUT element
  assert.strictEqual(isEditableTarget({ tagName: 'INPUT' }), true,
    'INPUT element is editable');

  // TEXTAREA element
  assert.strictEqual(isEditableTarget({ tagName: 'TEXTAREA' }), true,
    'TEXTAREA element is editable');

  // contentEditable element
  assert.strictEqual(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true,
    'contentEditable element is editable');

  // Non-editable div
  assert.strictEqual(isEditableTarget({ tagName: 'DIV', isContentEditable: false }), false,
    'Non-contentEditable div is not editable');

  // Button
  assert.strictEqual(isEditableTarget({ tagName: 'BUTTON' }), false,
    'BUTTON is not editable');

  // Span
  assert.strictEqual(isEditableTarget({ tagName: 'SPAN', isContentEditable: false }), false,
    'Non-editable SPAN is not editable');

  // Editable span
  assert.strictEqual(isEditableTarget({ tagName: 'SPAN', isContentEditable: true }), true,
    'ContentEditable SPAN is editable');

  console.log('✓ isEditableTarget() tests passed');
} catch (err) {
  console.error('✗ isEditableTarget() tests failed');
  console.error(err);
  process.exit(1);
}
