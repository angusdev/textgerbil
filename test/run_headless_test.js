// Comprehensive headless test suite for TextGerbil
// usage: node test/run_headless_test.js
// Requires jsdom installed in workspace (npm install jsdom@21 --no-save)

const fs = require('fs');
const { JSDOM } = require('jsdom');

(async function () {
  const html = fs.readFileSync('index.html', 'utf8').replace(/<script src="https:\/\/cdn.tailwindcss.com"><\/script>/, '');
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

  dom.window.addEventListener('load', async () => {
    try {
      const doc = dom.window.document;
      const w = dom.window;
      const DEFAULT_PREVIEW_WIDTH = 360;
      const MIN_PREVIEW_WIDTH = 260;
      const STORAGE_KEY = 'textgerbil_v1_tabs';
      const STORAGE_GLOBAL = 'textgerbil_v1_global';
      const getSavedState = () => {
        const raw = w.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      };
      const getWriteCount = (key) => w.localStorage.writes.filter(x => x.key === key).length;
      const runLocalStorageInitScenario = async (name, seededStorage, verify) => {
        const scenarioDom = new JSDOM(html, {
          runScripts: 'dangerously',
          resources: 'usable',
          beforeParse(window) {
            window.__TEXTGERBIL_HEADLESS = true;
            const mock = {
              data: { ...seededStorage },
              writes: [],
              getItem(key) { return this.data[key] || null; },
              setItem(key, value) {
                this.data[key] = String(value);
                this.writes.push({ key, value: String(value) });
              },
              removeItem(key) { delete this.data[key]; },
              clear() { this.data = {}; this.writes = []; }
            };
            Object.defineProperty(window, 'localStorage', { value: mock });
          }
        });
        scenarioDom.window.Element.prototype.getBoundingClientRect = function(){
          return {x:0,y:0,left:0,top:0,right:0,bottom:0,width:0,height:0};
        };
        if(!scenarioDom.window.document.execCommand){
          scenarioDom.window.document.execCommand = () => false;
        }
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`${name} timed out waiting for load`)), 3000);
          scenarioDom.window.addEventListener('load', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
        try {
          await verify(scenarioDom.window, scenarioDom.window.document);
        } catch (err) {
          assert(false, `${name} threw: ${err.message}`);
        } finally {
          scenarioDom.window.close();
        }
      };

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
      const activeTabIdForLanguageTests = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      const t = w.__textgerbil.tabs.find(x => x.id === activeTabIdForLanguageTests);
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
      assert(firstPreviewTab.previewWidth === DEFAULT_PREVIEW_WIDTH, 'First tab stores default preview width');
      assert(previewSidebar.classList.contains('hidden'), 'Preview is hidden by default');
      firstPreviewTab.previewVisible = true;
      firstPreviewTab.previewWidth = 420;
      w.__textgerbil.save();

      w.__textgerbil.newTab('text');
      const secondPreviewTab = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(previewSidebar.classList.contains('hidden'), 'Second tab keeps preview hidden by default');
      assert(secondPreviewTab.previewVisible === false, 'Second tab stores preview as hidden');
      assert(secondPreviewTab.previewWidth === DEFAULT_PREVIEW_WIDTH, 'Second tab starts with default preview width');
      assert(firstPreviewTab.previewVisible === true, 'First tab remembers preview visibility');
      secondPreviewTab.previewWidth = 300;
      w.__textgerbil.selectTab(firstPreviewTab.id);
      assert(w.__textgerbil.getActiveTabPreviewWidth() === 420, 'Tab A remembers custom preview width');
      w.__textgerbil.selectTab(secondPreviewTab.id);
      assert(w.__textgerbil.getActiveTabPreviewWidth() === 300, 'Tab B remembers custom preview width');

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

      // Test 32: Initialize tabs and per-tab settings from localStorage (full settings)
      await runLocalStorageInitScenario(
        'init-full-settings',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [
              {
                id: 'tab-alpha',
                title: 'README.md',
                mode: 'text',
                language: 'markdown',
                content: '# Alpha',
                theme: { fontFamily: 'serif', fontSize: 13, bg: '#fafafa', fg: '#111111' },
                previewVisible: true,
                previewWidth: 480
              },
              {
                id: 'tab-beta',
                title: 'Notes',
                mode: 'notepad',
                content: JSON.stringify([{ id: 'n1', text: 'todo 1' }, { id: 'n2', text: 'todo 2' }]),
                theme: { fontFamily: 'monospace', fontSize: 16, bg: '#101010', fg: '#f0f0f0' },
                previewVisible: false,
                previewWidth: 300
              }
            ],
            activeId: 'tab-beta'
          }),
          [STORAGE_GLOBAL]: JSON.stringify({ fontFamily: 'cursive', fontSize: 18, bg: '#ffeeaa', fg: '#222222' })
        },
        (sw, sdoc) => {
          assert(sw.__textgerbil.tabs.length === 2, 'Init from storage restores tab count');
          assert(sdoc.querySelectorAll('.tab').length === 2, 'Init from storage renders tab bar entries');
          assert(sdoc.getElementById('tabTitle').textContent === 'Notes', 'Init from storage restores active tab');
          assert(sdoc.getElementById('modeSelect').value === 'notepad', 'Init from storage restores active tab mode');
          assert(sdoc.querySelectorAll('#notesContainer textarea').length === 2, 'Init from storage restores notepad notes');
          const restoredActive = sw.__textgerbil.tabs.find(x => x.id === 'tab-beta');
          assert(restoredActive && restoredActive.theme && restoredActive.theme.fontFamily === 'monospace', 'Init keeps per-tab theme from storage');
          assert(restoredActive && restoredActive.previewWidth === 300, 'Init restores per-tab preview width from storage');
          assert(sdoc.getElementById('notesContainer').style.fontFamily === 'monospace', 'Init applies restored active tab theme');
          sw.__textgerbil.selectTab('tab-alpha');
          const restoredPreview = sdoc.getElementById('preview');
          assert(restoredPreview && restoredPreview.style.width === '480px', 'Selecting stored tab applies saved preview width style');
        }
      );

      // Test 33: Initialize with empty saved tabs should still create one tab
      await runLocalStorageInitScenario(
        'init-empty-tabs',
        { [STORAGE_KEY]: JSON.stringify({ tabs: [], activeId: null }) },
        (sw, sdoc) => {
          assert(sw.__textgerbil.tabs.length === 1, 'Init with empty tabs creates a default tab');
          assert(sdoc.querySelectorAll('.tab').length === 1, 'Init with empty tabs renders one tab');
        }
      );

      // Test 34: Initialize with invalid activeId should select first available tab
      await runLocalStorageInitScenario(
        'init-invalid-active-id',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [
              { id: 'first-tab', title: 'first.js', mode: 'text', content: 'a', theme: {}, previewVisible: false },
              { id: 'second-tab', title: 'second.md', mode: 'text', content: 'b', theme: {}, previewVisible: false }
            ],
            activeId: 'does-not-exist'
          })
        },
        (_sw, sdoc) => {
          const active = Array.from(sdoc.querySelectorAll('.tab')).find(x => x.className.includes('border-brand-500'));
          assert(!!active, 'Init with invalid activeId still marks an active tab');
          assert(sdoc.getElementById('tabTitle').textContent === 'first.js', 'Init with invalid activeId falls back to first tab');
        }
      );

      // Test 35: Initialize defaults for missing tab fields
      await runLocalStorageInitScenario(
        'init-missing-fields',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [{ id: 'script-tab', title: 'script.js', mode: 'text', content: 'console.log(1);', theme: {} }],
            activeId: 'script-tab'
          })
        },
        (sw, sdoc) => {
          const restored = sw.__textgerbil.tabs.find(x => x.id === 'script-tab');
          assert(restored && restored.previewVisible === false, 'Init sets missing previewVisible to false');
          assert(restored && restored.previewWidth === DEFAULT_PREVIEW_WIDTH, 'Init sets missing previewWidth to default');
          assert(restored && restored.language === 'detect', 'Init sets missing language to detect');
          assert(sdoc.getElementById('languageSelect').value === 'detect', 'Init syncs detect language to selector');
        }
      );

      // Test 36: Initialize text content and text cursor from localStorage
      await runLocalStorageInitScenario(
        'init-text-content-cursor',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [{
              id: 'text-cursor-tab',
              title: 'main.py',
              mode: 'text',
              language: 'python',
              content: 'print(\"cursor\")',
              theme: {},
              previewVisible: false,
              cursor: { line: 3, ch: 7 }
            }],
            activeId: 'text-cursor-tab'
          })
        },
        async (sw) => {
          const restored = sw.__textgerbil.tabs.find(x => x.id === 'text-cursor-tab');
          assert(restored && restored.content === 'print(\"cursor\")', 'Init restores text content');
          const cm = sw.__textgerbil.editors['text-cursor-tab'] && sw.__textgerbil.editors['text-cursor-tab'].cm;
          assert(cm && cm.getValue() === 'print(\"cursor\")', 'Init loads text editor content');
          await new Promise(resolve => setTimeout(resolve, 180));
          const cursor = cm && cm.getCursor ? cm.getCursor() : null;
          assert(cursor && cursor.line === 3 && cursor.ch === 7, 'Init restores text cursor position');
        }
      );

      // Test 37: Initialize rich content from localStorage
      await runLocalStorageInitScenario(
        'init-rich-content',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [{
              id: 'rich-tab',
              title: 'doc',
              mode: 'rich',
              content: '<p><strong>Rich hello</strong></p>',
              theme: {},
              previewVisible: false
            }],
            activeId: 'rich-tab'
          })
        },
        (sw, sdoc) => {
          const restored = sw.__textgerbil.tabs.find(x => x.id === 'rich-tab');
          assert(restored && restored.content === '<p><strong>Rich hello</strong></p>', 'Init restores rich content in tab state');
          const richRoot = sdoc.querySelector('#quill-root');
          assert(!!richRoot, 'Init creates rich editor root');
          const richEditor = sw.__textgerbil.editors['rich-tab'] && sw.__textgerbil.editors['rich-tab'].quill;
          assert(richEditor && richEditor.root && richEditor.root.innerHTML === '<p><strong>Rich hello</strong></p>', 'Init loads rich editor content');
        }
      );

      // Test 38: Initialize notepad cursor from localStorage
      await runLocalStorageInitScenario(
        'init-notepad-cursor',
        {
          [STORAGE_KEY]: JSON.stringify({
            tabs: [{
              id: 'np-tab',
              title: 'notes',
              mode: 'notepad',
              content: JSON.stringify([{ id: 'a', text: 'first note' }, { id: 'b', text: 'second note' }]),
              theme: {},
              previewVisible: false,
              cursor: { noteId: 'b', start: 2, end: 6 }
            }],
            activeId: 'np-tab'
          })
        },
        async (_sw, sdoc) => {
          await new Promise(resolve => setTimeout(resolve, 180));
          const focused = sdoc.activeElement;
          assert(focused && focused.tagName === 'TEXTAREA' && focused.dataset.noteId === 'b', 'Init restores notepad focused note from cursor');
          assert(focused && focused.selectionStart === 2 && focused.selectionEnd === 6, 'Init restores notepad cursor range');
        }
      );

      // Test 39: Switch tab restores text cursor and focuses editor
      w.__textgerbil.newTab('text');
      const focusSourceId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(focusSourceId);
      const focusSourceEd = w.__textgerbil.editors[focusSourceId] && w.__textgerbil.editors[focusSourceId].cm;
      if (focusSourceEd) {
        focusSourceEd.setValue('cursor restore on switch');
        focusSourceEd.setCursor({ line: 2, ch: 5 });
      }
      w.__textgerbil.newTab('text');
      const focusTargetId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(focusTargetId);
      w.__textgerbil.selectTab(focusSourceId);
      await new Promise(resolve => setTimeout(resolve, 90));
      const restoredEd = w.__textgerbil.editors[focusSourceId] && w.__textgerbil.editors[focusSourceId].cm;
      const restoredCursor = restoredEd && restoredEd.getCursor ? restoredEd.getCursor() : null;
      assert(restoredCursor && restoredCursor.line === 2 && restoredCursor.ch === 5, 'Tab switch restores previous text cursor position');
      assert(
        w.__TEXTGERBIL_HEADLESS_LAST_FOCUS &&
          w.__TEXTGERBIL_HEADLESS_LAST_FOCUS.tabId === focusSourceId &&
          w.__TEXTGERBIL_HEADLESS_LAST_FOCUS.mode === 'text',
        'Tab switch focuses text editor area'
      );

      // Test 40: Preview security behavior and availability by language
      const previewToggle = doc.getElementById('togglePreview');
      const previewPanel = doc.getElementById('preview');
      const previewContent = doc.getElementById('previewContent');
      const previewTabId = focusSourceId;
      w.__textgerbil.selectTab(previewTabId);
      doc.getElementById('modeSelect').value = 'text';
      doc.getElementById('modeSelect').dispatchEvent(new w.Event('change'));
      w.__textgerbil.setPreviewSupportOverride({ supportsIframe: true, supportsSrcdoc: true, supportsSandbox: true });
      const mainLayout = doc.querySelector('main');
      if (mainLayout) {
        mainLayout.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 });
      }
      w.__textgerbil.setMarkdownRendererForTest({
        render(input) {
          const safe = String(input || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<p>${safe}</p>`;
        }
      });

      doc.getElementById('languageSelect').value = 'python';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const previewTab = w.__textgerbil.tabs.find(x => x.id === previewTabId);
      const beforePythonToggle = !!previewTab.previewVisible;
      previewToggle.click();
      assert(previewTab.previewVisible === beforePythonToggle, 'Preview toggle ignored for non-markdown/html/json language');
      assert(previewPanel.classList.contains('hidden'), 'Preview stays hidden for non-markdown/html/json language');

      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      previewTab.content = '<script>alert(1)</script><img src=x onerror=alert(1)>';
      w.__textgerbil.updatePreview();
      previewToggle.click();
      assert(previewTab.previewVisible === true, 'Preview toggle works for markdown');
      assert(!previewPanel.classList.contains('hidden'), 'Preview shows for markdown');
      let markdownIframe = previewContent.querySelector('iframe');
      assert(!!markdownIframe, 'Markdown preview renders inside iframe');
      assert(markdownIframe.getAttribute('sandbox') !== null, 'Markdown preview iframe has sandbox attribute');
      assert((markdownIframe.getAttribute('sandbox') || '') === '', 'Markdown preview iframe uses strict empty sandbox');
      const markdownSrcdoc = markdownIframe.getAttribute('srcdoc') || '';
      assert(markdownSrcdoc.includes("default-src 'none'"), 'Markdown iframe srcdoc includes strict CSP');
      assert(markdownSrcdoc.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Markdown raw HTML is escaped in preview output');
      assert(!markdownSrcdoc.includes('<script>alert(1)</script>'), 'Markdown raw script tag is not active in preview output');

      doc.getElementById('languageSelect').value = 'htmlmixed';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(!previewPanel.classList.contains('hidden'), 'Preview remains available for HTML');
      previewTab.content = '<h1>safe</h1>';
      w.__textgerbil.updatePreview();
      const htmlIframe = previewContent.querySelector('iframe');
      assert(!!htmlIframe, 'HTML preview renders inside iframe');
      assert(htmlIframe.getAttribute('sandbox') !== null, 'HTML preview iframe has sandbox attribute');
      assert((htmlIframe.getAttribute('sandbox') || '') === '', 'HTML preview iframe uses strict empty sandbox');
      assert((htmlIframe.getAttribute('srcdoc') || '').includes("default-src 'none'"), 'HTML iframe srcdoc includes strict CSP');

      w.__textgerbil.setPreviewSupportOverride({ supportsIframe: true, supportsSrcdoc: false, supportsSandbox: true });
      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      assert(previewToggle.disabled === true, 'Preview toggle disabled when secure iframe support is missing');
      assert(
        previewToggle.title.includes('browser lacks secure iframe support (sandbox + srcdoc)'),
        'Preview toggle explains missing secure iframe support'
      );
      previewTab.previewVisible = true;
      w.__textgerbil.updatePreview();
      assert(
        /Secure preview unavailable/.test(previewContent.textContent || ''),
        'Unsupported browser path shows secure preview unavailable message'
      );
      w.__textgerbil.setPreviewSupportOverride(null);
      w.__textgerbil.updatePreview();

      w.__textgerbil.setPreviewSupportOverride({ supportsIframe: true, supportsSrcdoc: true, supportsSandbox: true });
      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      w.__textgerbil.setActiveTabPreviewWidth(100);
      assert(w.__textgerbil.getActiveTabPreviewWidth() === MIN_PREVIEW_WIDTH, 'Preview width clamps to minimum bound');
      w.__textgerbil.setActiveTabPreviewWidth(900);
      assert(w.__textgerbil.getActiveTabPreviewWidth() === 672, 'Preview width clamps to preserve minimum editor width');
      assert(previewPanel.style.width === '672px', 'Clamped preview width is applied to preview panel style');

      doc.getElementById('languageSelect').value = 'json';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const activePreviewTab = w.__textgerbil.tabs.find(x => x.id === previewTabId);
      if (activePreviewTab) {
        activePreviewTab.content = '{\"name\":\"textgerbil\",\"items\":[1,2]}';
        activePreviewTab.previewVisible = false;
      }
      w.__textgerbil.selectTab(previewTabId);
      const hasFormatter = !!w.JSONFormatter;
      previewToggle.click();
      if (hasFormatter) {
        assert(previewTab.previewVisible === true, 'Preview toggle works for JSON when formatter is available');
        assert(!!previewContent.querySelector('.json-formatter-row') || /Object/.test(previewContent.textContent || ''), 'JSON preview renders tree view');
      } else {
        assert(previewTab.previewVisible === false, 'Preview toggle ignored for JSON when formatter is unavailable');
        assert(previewToggle.disabled === true, 'Preview button disabled for JSON when formatter is unavailable');
      }

      // Test 41: Preview CSP validation
      w.__textgerbil.selectTab(previewTabId);
      w.__textgerbil.setPreviewSupportOverride({ supportsIframe: true, supportsSrcdoc: true, supportsSandbox: true });
      
      const checkCSP = (lang) => {
        doc.getElementById('languageSelect').value = lang;
        doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
        if (!w.__textgerbil.tabs.find(x => x.id === previewTabId).previewVisible) {
          doc.getElementById('togglePreview').click();
        }
        w.__textgerbil.updatePreview();
        const iframe = doc.getElementById('previewContent').querySelector('iframe');
        assert(!!iframe, `Preview iframe created for ${lang}`);
        if (iframe) {
          const srcdoc = iframe.getAttribute('srcdoc') || '';
          assert(!srcdoc.includes('frame-ancestors'), `CSP for ${lang} does not contain ignored 'frame-ancestors' directive`);
        }
      };

      checkCSP('markdown');
      checkCSP('htmlmixed');
      checkCSP('css');

      // Test 42: Language dropdown order
      const langOptions = Array.from(doc.getElementById('languageSelect').options).map(o => o.text);
      const expectedOrder = ['Detect', 'Plain', 'CSS', 'HTML', 'JavaScript', 'JSON', 'Markdown', 'Python', 'SQL'];
      assert(JSON.stringify(langOptions) === JSON.stringify(expectedOrder), 'Language dropdown order is correct (Detect, Plain, then Alphabetical)');

    } catch (e) {
      console.error('test error', e);
      testsFailed++;
    } finally {
      console.log(`\n=== Test Summary ===\nPassed: ${testsPassed}\nFailed: ${testsFailed}\n`);
      process.exit(testsFailed ? 1 : 0);
    }
  });
})();
