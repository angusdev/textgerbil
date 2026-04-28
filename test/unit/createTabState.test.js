const assert = require('assert');
const { getFunctions } = require('./extractor');

const { createTabState, DEFAULT_PREVIEW_WIDTH } = getFunctions();

console.log('Testing: createTabState()');

try {
  // Text tab defaults
  const textTab = createTabState('text', 'Text');
  assert.strictEqual(typeof textTab.id, 'string', 'id is a string');
  assert(textTab.id.length > 0, 'id is not empty');
  assert.strictEqual(textTab.title, 'Text', 'title is Text');
  assert.strictEqual(textTab.mode, 'text', 'mode is text');
  assert.strictEqual(textTab.language, 'detect', 'text tab language defaults to detect');
  assert.strictEqual(textTab.content, '', 'content starts empty');
  assert.deepStrictEqual(textTab.theme, {}, 'theme starts as empty object');
  assert.strictEqual(textTab.previewVisible, false, 'previewVisible defaults to false');
  assert.strictEqual(textTab.previewWidth, DEFAULT_PREVIEW_WIDTH, 'previewWidth defaults correctly');
  assert.strictEqual(textTab.wrapText, false, 'wrapText defaults to false');
  assert.strictEqual(textTab.notepadData, undefined, 'text tab has no notepadData');

  // Rich tab defaults
  const richTab = createTabState('rich', 'Doc');
  assert.strictEqual(richTab.mode, 'rich', 'mode is rich');
  assert.strictEqual(richTab.language, 'plain', 'rich tab language defaults to plain');
  assert.strictEqual(richTab.notepadData, undefined, 'rich tab has no notepadData');

  // Notepad tab defaults
  const noteTab = createTabState('notepad', 'Note');
  assert.strictEqual(noteTab.mode, 'notepad', 'mode is notepad');
  assert.strictEqual(noteTab.language, 'plain', 'notepad language defaults to plain');
  assert.deepStrictEqual(noteTab.notepadData, [], 'notepad has empty notepadData array');

  // Unique IDs
  const tab1 = createTabState('text', 'A');
  const tab2 = createTabState('text', 'B');
  assert.notStrictEqual(tab1.id, tab2.id, 'Each tab gets a unique id');

  // Custom title preserved
  const customTab = createTabState('text', 'my-file.js');
  assert.strictEqual(customTab.title, 'my-file.js', 'Custom title is preserved');

  console.log('✓ createTabState() tests passed');
} catch (err) {
  console.error('✗ createTabState() tests failed');
  console.error(err);
  process.exit(1);
}
