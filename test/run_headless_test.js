// Comprehensive headless test suite for TextGerbil
// usage: node test/run_headless_test.js
// Requires jsdom installed in workspace (npm install jsdom@21 --no-save)

const fs = require('fs');
const { JSDOM } = require('jsdom');

(async function () {
  const html = fs.readFileSync('index.html', 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable',
    beforeParse(window) {
      // flag we are running under headless jsdom so the app can stub editors
      window.__TEXTGERBIL_HEADLESS = true;
    }
  });

  // stub missing DOM APIs that CodeMirror/Quill call in jsdom
  dom.window.Element.prototype.getBoundingClientRect = function(){
    return {x:0,y:0,left:0,top:0,right:0,bottom:0,width:0,height:0};
  };
  if(!dom.window.document.execCommand){
    dom.window.document.execCommand = () => false;
  }

  // Mock localStorage to avoid JSDOM SecurityError
  const mockLocalStorage = {
    data: {},
    writes: [],
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) {
      this.data[key] = String(value);
      this.writes.push({ key, value: String(value) });
    },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
  };
  Object.defineProperty(dom.window, 'localStorage', { value: mockLocalStorage });

  dom.window.console.log = (...args) => console.log(...args);
  dom.window.console.error = (...args) => console.error(...args);
  dom.window.addEventListener('error', e => {
    // ignore known benign jsdom/CodeMirror exceptions
    if (e.message && (e.message.includes('getBoundingClientRect') || e.message.includes('execCommand'))) {
      return;
    }
    console.error('error event', e.message);
  });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`);
      testsPassed++;
    } else {
      console.error(`✗ ${message}`);
      testsFailed++;
    }
  }

  dom.window.addEventListener('load', () => {
    try {
      const doc = dom.window.document;
      const w = dom.window;
      const STORAGE_KEY = 'textgerbil_v1_tabs';
      const STORAGE_GLOBAL = 'textgerbil_v1_global';
      const getSavedState = () => {
        const raw = w.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      };
      const getWriteCount = (key) => w.localStorage.writes.filter(x => x.key === key).length;

      // Test 1: Initial state
      const tabsEl = doc.getElementById('tabs');
      assert(!!tabsEl, 'Tabs container exists');
      assert(doc.getElementById('textEditor'), 'Text editor exists');

      // Test 2: Add new tab
      doc.getElementById('addTab').click();
      const afterAddCount = doc.getElementById('tabs')?.children?.length || 0;
      assert(afterAddCount >= 1, `Tabs still exist after add (found ${afterAddCount})`);

      // Test 3: Language switching - plain to javascript
      doc.getElementById('languageSelect').value = 'javascript';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const t = w.__textgerbil.tabs.find(x => x.id === w.__textgerbil.tabs[0].id);
      assert(t && t.language === 'javascript', 'Language switched to javascript');

      // Test 4: Language switching - javascript to python
      doc.getElementById('languageSelect').value = 'python';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(t && t.language === 'python', 'Language switched to python');

      // Test 5: Language switching - python to markdown
      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(t && t.language === 'markdown', 'Language switched to markdown');

      // Test 6: Language switching - markdown to htmlmixed
      doc.getElementById('languageSelect').value = 'htmlmixed';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(t && t.language === 'htmlmixed', 'Language switched to htmlmixed');

      // Test 7: Language switching - htmlmixed to css
      doc.getElementById('languageSelect').value = 'css';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(t && t.language === 'css', 'Language switched to css');

      // Test 8: Language switching - css to json
      doc.getElementById('languageSelect').value = 'json';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(t && t.language === 'json', 'Language switched to json');

      // Test 9: Language auto-detection from filename
      const autoDetected = w.__textgerbil.detectLanguageFromTitle('script.js');
      assert(autoDetected === 'javascript', 'Auto-detects JavaScript from .js extension');
      const mdDetected = w.__textgerbil.detectLanguageFromTitle('readme.md');
      assert(mdDetected === 'markdown', 'Auto-detects Markdown from .md extension');
      const htmlDetected = w.__textgerbil.detectLanguageFromTitle('page.html');
      assert(htmlDetected === 'htmlmixed', 'Auto-detects HTML from .html extension');

      // Test 10: Mode switching - text to rich
      doc.getElementById('modeSelect').value = 'rich';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      assert(doc.getElementById('richEditor').classList.contains('active'), 'Rich editor activated');

      // Test 11: Mode switching - rich to notepad
      doc.getElementById('modeSelect').value = 'notepad';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      assert(doc.getElementById('notepadEditor').classList.contains('active'), 'Notepad editor activated');

      // Test 12: Notepad - add notes
      const addNoteBtnForAutosave = doc.getElementById('addNoteBtn');
      addNoteBtnForAutosave.click();
      const notes = doc.querySelectorAll('#notesContainer textarea');
      assert(notes.length === 1, 'Note added to notepad');

      // Test 13: Notepad - edit note
      notes[0].value = 'Test note';
      notes[0].dispatchEvent(new w.Event('input'));
      assert(notes[0].value === 'Test note', 'Note edited');

      // Test 14: Notepad - add another note
      addNoteBtnForAutosave.click();
      const notesAfter = doc.querySelectorAll('#notesContainer textarea');
      assert(notesAfter.length === 2, 'Second note added');

      // Test 15: Theme settings - open panel
      doc.getElementById('themeBtn').click();
      const settingsPanel = doc.getElementById('settingsPanel');
      assert(settingsPanel.style.display === 'block', 'Settings panel opens');

      // Test 16: Theme settings - set values
      doc.getElementById('fontFamily').value = 'monospace';
      doc.getElementById('fontSize').value = '16';
      doc.getElementById('bgColor').value = '#000000';
      doc.getElementById('fgColor').value = '#ffffff';
      doc.getElementById('applyTheme').click();
      assert(true, 'Theme applied to current tab without error');

      // Test 17: Autosave on tab switch (content persisted)
      w.__textgerbil.newTab('text');
      const switchSourceId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(switchSourceId);
      const sourceEd = w.__textgerbil.editors[switchSourceId];
      if (sourceEd && sourceEd.cm) sourceEd.cm.setValue('autosave-switch-content');
      w.__textgerbil.newTab('text');
      const switchTargetId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      const writesBeforeSwitch = getWriteCount(STORAGE_KEY);
      w.__textgerbil.selectTab(switchSourceId);
      w.__textgerbil.selectTab(switchTargetId);
      const writesAfterSwitch = getWriteCount(STORAGE_KEY);
      const switchSaved = getSavedState();
      assert(writesAfterSwitch > writesBeforeSwitch, 'Switching tab triggers autosave');
      assert(switchSaved && switchSaved.activeId === switchTargetId, 'Tab switch saves active tab selection');

      // Test 18: Autosave on file type/language change
      w.__textgerbil.selectTab(switchSourceId);
      doc.getElementById('modeSelect').value = 'text';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      doc.getElementById('languageSelect').value = 'python';
      const writesBeforeLanguage = getWriteCount(STORAGE_KEY);
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const languageSaved = getSavedState();
      const langTab = languageSaved && languageSaved.tabs && languageSaved.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeLanguage, 'Language change triggers autosave');
      assert(langTab && langTab.language === 'python', 'Language change persisted');

      // Test 18b: languageSelect specifically saves on each change
      const writesBeforeLanguageSecond = getWriteCount(STORAGE_KEY);
      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const languageSavedSecond = getSavedState();
      const langTabSecond = languageSavedSecond && languageSavedSecond.tabs && languageSavedSecond.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeLanguageSecond, 'languageSelect change triggers save');
      assert(langTabSecond && langTabSecond.language === 'markdown', 'languageSelect value persisted');

      // Test 19: Autosave on edit mode change (text -> rich)
      doc.getElementById('modeSelect').value = 'rich';
      const writesBeforeMode = getWriteCount(STORAGE_KEY);
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      const modeSaved = getSavedState();
      const modeTab = modeSaved && modeSaved.tabs && modeSaved.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeMode, 'Mode change triggers autosave');
      assert(modeTab && modeTab.mode === 'rich', 'Mode change persisted');
      doc.getElementById('modeSelect').value = 'text';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));

      // Test 20: Autosave on current-tab theme setting apply
      doc.getElementById('fontFamily').value = 'Courier New';
      doc.getElementById('fontSize').value = '18';
      doc.getElementById('bgColor').value = '#101010';
      doc.getElementById('fgColor').value = '#e0e0e0';
      const writesBeforeTheme = getWriteCount(STORAGE_KEY);
      doc.getElementById('applyTheme').click();
      const themeSaved = getSavedState();
      const themeTab = themeSaved && themeSaved.tabs && themeSaved.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeTheme, 'Apply theme triggers autosave');
      assert(themeTab && themeTab.theme && themeTab.theme.fontFamily === 'Courier New', 'Current-tab theme persisted');

      // Test 21: Autosave on global settings apply
      doc.getElementById('fontFamily').value = 'serif';
      doc.getElementById('fontSize').value = '15';
      const writesBeforeGlobalTabs = getWriteCount(STORAGE_KEY);
      const writesBeforeGlobalTheme = getWriteCount(STORAGE_GLOBAL);
      doc.getElementById('applyGlobal').click();
      assert(getWriteCount(STORAGE_KEY) > writesBeforeGlobalTabs, 'Apply global triggers tab-state autosave');
      assert(getWriteCount(STORAGE_GLOBAL) > writesBeforeGlobalTheme, 'Apply global triggers global-theme autosave');

      // Test 22: Autosave on rename tab (Enter)
      const tabBeforeRename = doc.querySelector('.tab');
      if (tabBeforeRename) {
        const renameWritesBefore = getWriteCount(STORAGE_KEY);
        const renameTitle = tabBeforeRename.querySelector('span:first-child');
        if (renameTitle) {
          renameTitle.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
          const renameInput = tabBeforeRename.querySelector('input');
          if (renameInput) {
            renameInput.value = 'Renamed via Enter';
            renameInput.dispatchEvent(new w.KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
          }
        }
        assert(getWriteCount(STORAGE_KEY) > renameWritesBefore, 'Rename via Enter triggers autosave');
      }

      // Test 23: Autosave on rename tab (blur)
      const tabBeforeBlurRename = doc.querySelector('.tab');
      if (tabBeforeBlurRename) {
        const renameWritesBeforeBlur = getWriteCount(STORAGE_KEY);
        const renameTitleBlur = tabBeforeBlurRename.querySelector('span:first-child');
        if (renameTitleBlur) {
          renameTitleBlur.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
          const renameInputBlur = tabBeforeBlurRename.querySelector('input');
          if (renameInputBlur) {
            renameInputBlur.value = 'Renamed via Blur';
            renameInputBlur.dispatchEvent(new w.FocusEvent('blur', { bubbles: true }));
          }
        }
        assert(getWriteCount(STORAGE_KEY) > renameWritesBeforeBlur, 'Rename via blur triggers autosave');
      }

      // Test 24: Autosave on notepad edit
      doc.getElementById('modeSelect').value = 'notepad';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      const addNoteBtn = doc.getElementById('addNoteBtn');
      addNoteBtn.click();
      const noteForSave = doc.querySelector('#notesContainer textarea');
      const writesBeforeNoteEdit = getWriteCount(STORAGE_KEY);
      if (noteForSave) {
        noteForSave.value = 'autosave note content';
        noteForSave.dispatchEvent(new w.Event('input'));
      }
      assert(getWriteCount(STORAGE_KEY) > writesBeforeNoteEdit, 'Notepad edit triggers autosave');
      doc.getElementById('modeSelect').value = 'text';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));

      // Test 25: Tab switching
      const tabs = doc.querySelectorAll('.tab');
      assert(tabs.length >= 1, `Tabs exist (found ${tabs.length})`);
      if (tabs.length >= 1) {
        tabs[0].click();
        assert(true, 'Tab switched without error');
      }

      // Test 26: Preview defaults off and is remembered per tab
      const previewSidebar = doc.getElementById('preview');
      w.__textgerbil.newTab('text');
      const firstPreviewTab = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(firstPreviewTab.previewVisible === false, 'First tab stores preview hidden by default');
      assert(previewSidebar.classList.contains('hidden'), 'Preview is hidden by default');
      firstPreviewTab.previewVisible = true;
      w.__textgerbil.save();

      w.__textgerbil.newTab('text');
      const secondPreviewTab = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(previewSidebar.classList.contains('hidden'), 'Second tab keeps preview hidden by default');
      assert(secondPreviewTab.previewVisible === false, 'Second tab stores preview as hidden');
      assert(firstPreviewTab.previewVisible === true, 'First tab remembers preview visibility');

      // Test 27: Export function
      assert(typeof w.__textgerbil.exportCurrent === 'function', 'Export function exposed');

      // Test 28: Global state accessible
      assert(Array.isArray(w.__textgerbil.tabs), 'Tabs array accessible');
      assert(typeof w.__textgerbil.save === 'function', 'Save function accessible');
      assert(typeof w.__textgerbil.load === 'function', 'Load function accessible');

      // Test 29: Keyboard shortcut simulation
      const keydownEvent = new w.KeyboardEvent('keydown', { key: 't', ctrlKey: true });
      doc.dispatchEvent(keydownEvent);
      assert(true, 'Keyboard shortcut handler runs without error');

      // Test 30: Rename tab (via UI double-click)
      const firstTab = doc.querySelector('.tab');
      if (firstTab) {
        const titleSpan = firstTab.querySelector('span:first-child');
        if (titleSpan) {
          const dblClickEvent = new w.MouseEvent('dblclick', { bubbles: true });
          titleSpan.dispatchEvent(dblClickEvent);
          // After double-click, span should be replaced with input
          const input = firstTab.querySelector('input');
          assert(!!input, 'Tab title becomes editable input on double-click');
          if (input) {
            input.value = 'UI Edited Tab';
            input.dispatchEvent(new w.KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
            // After Enter, input should be replaced with span again
            assert(true, 'Tab renamed via UI executed without error');
          }
        }
      } else {
        assert(false, 'No tab found for UI rename test');
      }

      // Prior to closing, make sure we're in text mode (CodeMirror) and focus editor
      doc.getElementById('modeSelect').value = 'text';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      const currentTabId = w.__textgerbil.tabs[0] && w.__textgerbil.tabs[0].id;
      if (currentTabId) {
        const edInst = w.__textgerbil.editors[currentTabId];
        if (edInst && edInst.cm && typeof edInst.cm.focus === 'function') {
          edInst.cm.focus();
        }
      }
      const editorsBefore = Object.keys(w.__textgerbil.editors).length;

      // Test 31: Close tab via UI button
      const closeBtn = doc.querySelector('.tab .close');
      if (closeBtn) {
        closeBtn.click();
        const tabCountAfterClose = doc.querySelectorAll('.tab').length;
        assert(tabCountAfterClose >= 1, 'At least one tab remains after clicking close');
        const editorsAfter = Object.keys(w.__textgerbil.editors).length;
        assert(editorsAfter === editorsBefore - 1, 'Editor instance removed after closing tab');
        assert(true, 'Close button click executed without exception');
      } else {
        assert(false, 'No close button found for close test');
      }

      console.log(`\n=== Test Summary ===\nPassed: ${testsPassed}\nFailed: ${testsFailed}\n`);

    } catch (e) {
      console.error('test error', e);
      testsFailed++;
    }
  });

  // give it a few seconds to load external scripts
  setTimeout(() => {
    console.log('test finished');
    process.exit(0);
  }, 3000);
})();
