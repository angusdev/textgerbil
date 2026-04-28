const assert = require('assert');
const { getFunctions } = require('./extractor');

const { getNextModeTabTitle } = getFunctions();

console.log('Testing: getNextModeTabTitle()');

try {
  // No existing tabs — returns base title
  assert.strictEqual(getNextModeTabTitle([], 'text', 'Text'), 'Text',
    'No existing tabs returns base title');

  // One existing "Text" tab — next is "Text 1"
  const tabs1 = [{ mode: 'text', title: 'Text' }];
  assert.strictEqual(getNextModeTabTitle(tabs1, 'text', 'Text'), 'Text 1',
    'One existing Text tab yields Text 1');

  // "Text" and "Text 1" — next is "Text 2"
  const tabs2 = [
    { mode: 'text', title: 'Text' },
    { mode: 'text', title: 'Text 1' }
  ];
  assert.strictEqual(getNextModeTabTitle(tabs2, 'text', 'Text'), 'Text 2',
    'Text and Text 1 yield Text 2');

  // Gap in numbering — uses max + 1
  const tabs3 = [
    { mode: 'text', title: 'Text 5' },
    { mode: 'text', title: 'Text 1' }
  ];
  assert.strictEqual(getNextModeTabTitle(tabs3, 'text', 'Text'), 'Text 6',
    'Gap in numbering uses max suffix + 1');

  // Only numbered tabs (no bare "Text") — still max + 1
  const tabs4 = [{ mode: 'text', title: 'Text 3' }];
  assert.strictEqual(getNextModeTabTitle(tabs4, 'text', 'Text'), 'Text 4',
    'Only numbered tabs uses max + 1');

  // Different modes are ignored
  const tabs5 = [
    { mode: 'text', title: 'Text' },
    { mode: 'rich', title: 'Doc' },
    { mode: 'notepad', title: 'Note' }
  ];
  assert.strictEqual(getNextModeTabTitle(tabs5, 'rich', 'Doc'), 'Doc 1',
    'Rich tab naming ignores text tabs');

  // Notepad mode
  const tabs6 = [
    { mode: 'notepad', title: 'Note' },
    { mode: 'notepad', title: 'Note 2' }
  ];
  assert.strictEqual(getNextModeTabTitle(tabs6, 'notepad', 'Note'), 'Note 3',
    'Notepad naming uses max + 1');

  // Tabs with non-matching titles don't affect counter
  const tabs7 = [
    { mode: 'text', title: 'README.md' },
    { mode: 'text', title: 'script.js' }
  ];
  assert.strictEqual(getNextModeTabTitle(tabs7, 'text', 'Text'), 'Text',
    'Non-matching titles do not increment counter');

  // Empty tabs array for rich
  assert.strictEqual(getNextModeTabTitle([], 'rich', 'Doc'), 'Doc',
    'Empty tabs returns Doc for rich mode');

  console.log('✓ getNextModeTabTitle() tests passed');
} catch (err) {
  console.error('✗ getNextModeTabTitle() tests failed');
  console.error(err);
  process.exit(1);
}
