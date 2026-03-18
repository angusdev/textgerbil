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
  if(!dom.window.requestAnimationFrame){
    dom.window.requestAnimationFrame = (cb)=>dom.window.setTimeout(()=>cb(Date.now()),0);
  }
  if(!dom.window.cancelAnimationFrame){
    dom.window.cancelAnimationFrame = (id)=>dom.window.clearTimeout(id);
  }
  
  // Polyfill <dialog> for JSDOM
  const dialogProto = dom.window.Element.prototype;
  if (!dialogProto.showModal) {
    dialogProto.showModal = function() { this.setAttribute('open', ''); this.open = true; };
  }
  if (!dialogProto.close) {
    dialogProto.close = function() { this.removeAttribute('open'); this.open = false; };
  }
  if (!('open' in dialogProto)) {
    Object.defineProperty(dialogProto, 'open', {
      get() { return this.hasAttribute('open'); },
      set(val) { if(val) this.setAttribute('open', ''); else this.removeAttribute('open'); }
    });
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
        if(!scenarioDom.window.requestAnimationFrame){
          scenarioDom.window.requestAnimationFrame = (cb)=>scenarioDom.window.setTimeout(()=>cb(Date.now()),0);
        }
        if(!scenarioDom.window.cancelAnimationFrame){
          scenarioDom.window.cancelAnimationFrame = (id)=>scenarioDom.window.clearTimeout(id);
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
      const getActiveCloseButton = () => doc.querySelector('.tab.border-brand-500 .close');
      const closeActiveTabAndCheck = (shouldConfirm, message) => {
        const beforeCount = w.__textgerbil.tabs.length;
        const confirmDialog = doc.getElementById('confirmDialog');
        const closeBtn = getActiveCloseButton();
        assert(!!closeBtn, `${message}: active close button exists`);
        if (!closeBtn) return;
        closeBtn.click();
        assert(confirmDialog.open === shouldConfirm, message);
        if (shouldConfirm) {
          doc.getElementById('dialogConfirm').click();
          assert(confirmDialog.open === false, `${message}: dialog closes after confirm`);
        }
        assert(w.__textgerbil.tabs.length === beforeCount - 1, `${message}: tab closes`);
      };
      const createModeTab = (mode) => {
        w.__textgerbil.newTab(mode);
        return w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      };
      const editModeTab = (tab, mode, value) => {
        w.__textgerbil.selectTab(tab.id);
        if (mode === 'text') {
          const ed = w.__textgerbil.editors[tab.id];
          if (ed && ed.cm) ed.cm.setValue(value);
          return;
        }
        if (mode === 'rich') {
          const ed = w.__textgerbil.editors[tab.id];
          if (ed && ed.quill && ed.quill.root) ed.quill.root.innerHTML = value;
          return;
        }
        doc.getElementById('addNoteBtn').click();
        const note = doc.querySelector('#notesContainer textarea');
        if (note) {
          note.value = value;
          note.dispatchEvent(new w.Event('input'));
        }
      };
      const clearModeTab = (tab, mode) => {
        w.__textgerbil.selectTab(tab.id);
        if (mode === 'text') {
          const ed = w.__textgerbil.editors[tab.id];
          if (ed && ed.cm) ed.cm.setValue('');
          return;
        }
        if (mode === 'rich') {
          const ed = w.__textgerbil.editors[tab.id];
          if (ed && ed.quill && ed.quill.root) ed.quill.root.innerHTML = '';
          return;
        }
        const delBtn = doc.querySelector('#notesContainer .note-delete');
        if (!delBtn) return;
        delBtn.click();
        const confirmDialog = doc.getElementById('confirmDialog');
        if (confirmDialog.open) doc.getElementById('dialogConfirm').click();
      };

      // Test 1: Initial state
      const tabsEl = doc.getElementById('tabs');
      assert(!!tabsEl, 'Tabs container exists');
      assert(doc.getElementById('textEditor'), 'Text editor exists');
      assert(w.__textgerbil.tabs[0] && w.__textgerbil.tabs[0].title === 'Text', 'Initial default text tab is named Text');
      const editorAreaEl = doc.querySelector('.editor-area');
      const previewEl = doc.getElementById('preview');
      const previewHandleEl = doc.getElementById('previewResizeHandle');
      assert(!!editorAreaEl, 'Editor area exists');
      assert(!!previewEl && editorAreaEl.contains(previewEl), 'Preview pane is inside editor area');
      assert(!!previewHandleEl && editorAreaEl.contains(previewHandleEl), 'Preview resize handle is inside editor area');

      // Test 2: Add default tab (text mode) from split button
      const tabsBeforeDefaultAdd = w.__textgerbil.tabs.length;
      doc.getElementById('addTabDefault').click();
      const afterAddCount = doc.getElementById('tabs')?.children?.length || 0;
      const defaultAddedTab = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(afterAddCount >= 1, `Tabs still exist after add (found ${afterAddCount})`);
      assert(w.__textgerbil.tabs.length === tabsBeforeDefaultAdd + 1, 'Default add button creates one tab');
      assert(defaultAddedTab && defaultAddedTab.mode === 'text', 'Default add button creates text mode tab');
      assert(defaultAddedTab && defaultAddedTab.title === 'Text 1', 'Default add button names next text tab Text 1');

      // Test 2b: Add tabs from dropdown for all three modes
      const addToggleBtn = doc.getElementById('addTabToggle');
      const addMenuEl = doc.getElementById('addTabMenu');
      const openAddMenu = () => {
        if (addMenuEl && addMenuEl.classList.contains('hidden')) addToggleBtn.click();
      };
      ['text', 'rich', 'notepad'].forEach(mode => {
        const countBefore = w.__textgerbil.tabs.length;
        openAddMenu();
        const opt = doc.querySelector(`#addTabMenu .add-tab-option[data-mode="${mode}"]`);
        assert(!!opt, `Dropdown option exists for ${mode}`);
        if (opt) opt.click();
        const added = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
        assert(w.__textgerbil.tabs.length === countBefore + 1, `Dropdown add creates one ${mode} tab`);
        assert(added && added.mode === mode, `Dropdown add sets mode to ${mode}`);
      });

      // Test 2b-1: Text tabs use Text / Text N naming with max suffix + 1
      const textTitles = w.__textgerbil.tabs
        .filter(tab => tab.mode === 'text')
        .map(tab => tab.title);
      assert(textTitles.includes('Text 1'), 'Second text tab is named Text 1');
      const firstNamedText = w.__textgerbil.tabs.find(tab => tab.mode === 'text' && tab.title === 'Text');
      if (firstNamedText) firstNamedText.title = 'Text 4';
      w.__textgerbil.newTab('text');
      const nextNamedText = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(nextNamedText && nextNamedText.title === 'Text 5', 'New text tab uses highest existing Text suffix plus one');

      // Test 2b-2: Rich tabs use Doc / Doc N naming with max suffix + 1
      const richTitles = w.__textgerbil.tabs
        .filter(tab => tab.mode === 'rich')
        .map(tab => tab.title);
      assert(richTitles.includes('Doc'), 'First rich tab is named Doc');
      const firstNamedDoc = w.__textgerbil.tabs.find(tab => tab.mode === 'rich' && tab.title === 'Doc');
      if (firstNamedDoc) firstNamedDoc.title = 'Doc 6';
      w.__textgerbil.newTab('rich');
      const nextNamedDoc = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(nextNamedDoc && nextNamedDoc.title === 'Doc 7', 'New rich tab uses highest existing Doc suffix plus one');

      // Test 2b-3: Notepad tabs use Note / Note N naming with max suffix + 1
      const noteTitles = w.__textgerbil.tabs
        .filter(tab => tab.mode === 'notepad')
        .map(tab => tab.title);
      assert(noteTitles.includes('Note'), 'First notepad tab is named Note');
      const firstNamedNote = w.__textgerbil.tabs.find(tab => tab.mode === 'notepad' && tab.title === 'Note');
      if (firstNamedNote) firstNamedNote.title = 'Note 2';
      w.__textgerbil.newTab('notepad');
      const secondNamedNote = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1];
      assert(secondNamedNote && secondNamedNote.title === 'Note 3', 'New notepad tab uses highest existing Note suffix plus one');

      // Test 2c: Close-confirm behavior for all three modes
      ['text', 'rich', 'notepad'].forEach(mode => {
        const emptyTab = createModeTab(mode);
        closeActiveTabAndCheck(false, `${mode} empty tab closes without confirmation`);

        const editedTab = createModeTab(mode);
        editModeTab(editedTab, mode, mode === 'rich' ? '<p>edited</p>' : 'edited');
        closeActiveTabAndCheck(true, `${mode} edited tab requires confirmation`);

        const clearedTab = createModeTab(mode);
        editModeTab(clearedTab, mode, mode === 'rich' ? '<p>edited</p>' : 'edited');
        clearModeTab(clearedTab, mode);
        closeActiveTabAndCheck(false, `${mode} cleared tab closes without confirmation`);
      });

      const richPlaceholderTab = createModeTab('rich');
      w.__textgerbil.selectTab(richPlaceholderTab.id);
      const richPlaceholderEditor = w.__textgerbil.editors[richPlaceholderTab.id];
      if (richPlaceholderEditor && richPlaceholderEditor.quill && richPlaceholderEditor.quill.root) {
        richPlaceholderEditor.quill.root.innerHTML = '<p><br></p>';
      }
      closeActiveTabAndCheck(false, 'rich Quill placeholder markup closes without confirmation');

      // Test 3: Language switching - plain to javascript
      w.__textgerbil.selectTab(defaultAddedTab.id);
      doc.getElementById('languageSelect').value = 'javascript';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const activeTabIdForLanguageTests = defaultAddedTab.id;
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

      // Test 10: Theme settings - open panel
      doc.getElementById('themeBtn').click();
      const settingsPanel = doc.getElementById('settingsPanel');
      assert(settingsPanel.style.display === 'block', 'Settings panel opens');

      // Test 11: Theme settings - set values
      doc.getElementById('fontFamily').value = 'monospace';
      doc.getElementById('fontSize').value = '16';
      doc.getElementById('bgColor').value = '#000000';
      doc.getElementById('fgColor').value = '#ffffff';
      doc.getElementById('applyTheme').click();
      assert(true, 'Theme applied to current tab without error');

      // Test 12: Autosave on tab switch (content persisted)
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

      // Test 13: Autosave on file type/language change
      w.__textgerbil.selectTab(switchSourceId);
      doc.getElementById('languageSelect').value = 'python';
      const writesBeforeLanguage = getWriteCount(STORAGE_KEY);
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const languageSaved = getSavedState();
      const langTab = languageSaved && languageSaved.tabs && languageSaved.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeLanguage, 'Language change triggers autosave');
      assert(langTab && langTab.language === 'python', 'Language change persisted');

      // Test 13b: languageSelect specifically saves on each change
      const writesBeforeLanguageSecond = getWriteCount(STORAGE_KEY);
      doc.getElementById('languageSelect').value = 'markdown';
      doc.getElementById('languageSelect').dispatchEvent(new w.Event('change'));
      const languageSavedSecond = getSavedState();
      const langTabSecond = languageSavedSecond && languageSavedSecond.tabs && languageSavedSecond.tabs.find(x => x.id === switchSourceId);
      assert(getWriteCount(STORAGE_KEY) > writesBeforeLanguageSecond, 'languageSelect change triggers save');
      assert(langTabSecond && langTabSecond.language === 'markdown', 'languageSelect value persisted');

      // Test 14: Autosave on current-tab theme setting apply
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

      // Test 15: Autosave on global settings apply
      doc.getElementById('fontFamily').value = 'serif';
      doc.getElementById('fontSize').value = '15';
      const writesBeforeGlobalTabs = getWriteCount(STORAGE_KEY);
      const writesBeforeGlobalTheme = getWriteCount(STORAGE_GLOBAL);
      doc.getElementById('applyGlobal').click();
      assert(getWriteCount(STORAGE_KEY) > writesBeforeGlobalTabs, 'Apply global triggers tab-state autosave');
      assert(getWriteCount(STORAGE_GLOBAL) > writesBeforeGlobalTheme, 'Apply global triggers global-theme autosave');

      // Test 16: Autosave on rename tab (Enter)
      const tabTitleEl = doc.getElementById('tabTitle');
      if (tabTitleEl) {
        const renameWritesBefore = getWriteCount(STORAGE_KEY);
        tabTitleEl.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
        const renameInput = tabTitleEl.querySelector('input');
        if (renameInput) {
          renameInput.value = 'Renamed via Enter';
          renameInput.dispatchEvent(new w.KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
        }
        assert(getWriteCount(STORAGE_KEY) > renameWritesBefore, 'Rename via Enter triggers autosave');
      }

      // Test 17: Autosave on rename tab (blur)
      const tabTitleBlurEl = doc.getElementById('tabTitle');
      if (tabTitleBlurEl) {
        const renameWritesBeforeBlur = getWriteCount(STORAGE_KEY);
        tabTitleBlurEl.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
        const renameInputBlur = tabTitleBlurEl.querySelector('input');
        if (renameInputBlur) {
          renameInputBlur.value = 'Renamed via Blur';
          renameInputBlur.dispatchEvent(new w.FocusEvent('blur', { bubbles: true }));
        }
        assert(getWriteCount(STORAGE_KEY) > renameWritesBeforeBlur, 'Rename via blur triggers autosave');
      }

      // Test 18: Autosave on notepad edit
      w.__textgerbil.newTab('notepad');
      const noteAutosaveTabId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(noteAutosaveTabId);
      const addNoteBtn = doc.getElementById('addNoteBtn');
      addNoteBtn.click();
      const noteForSave = doc.querySelector('#notesContainer textarea');
      const writesBeforeNoteEdit = getWriteCount(STORAGE_KEY);
      if (noteForSave) {
        noteForSave.value = 'autosave note content';
        noteForSave.dispatchEvent(new w.Event('input'));
      }
      assert(getWriteCount(STORAGE_KEY) > writesBeforeNoteEdit, 'Notepad edit triggers autosave');

      // Test 19: Tab switching
      const tabs = doc.querySelectorAll('.tab');
      assert(tabs.length >= 1, `Tabs exist (found ${tabs.length})`);
      if (tabs.length >= 1) {
        tabs[0].click();
        assert(true, 'Tab switched without error');
      }

      // Test 20: Preview defaults off and is remembered per tab
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

      // Test 21: Export function
      assert(typeof w.__textgerbil.exportCurrent === 'function', 'Export function exposed');

      // Test 22: Global state accessible
      assert(Array.isArray(w.__textgerbil.tabs), 'Tabs array accessible');
      assert(typeof w.__textgerbil.save === 'function', 'Save function accessible');
      assert(typeof w.__textgerbil.load === 'function', 'Load function accessible');

      // Test 23: Keyboard shortcut simulation
      const keydownEvent = new w.KeyboardEvent('keydown', { key: 't', ctrlKey: true });
      doc.dispatchEvent(keydownEvent);
      assert(true, 'Keyboard shortcut handler runs without error');

      // Test 24: Tab title double-click replacement in UI (main title)
      const titleToTest = doc.getElementById('tabTitle');
      if (titleToTest) {
        const dblClickEvent = new w.MouseEvent('dblclick', { bubbles: true });
        titleToTest.dispatchEvent(dblClickEvent);
        // After double-click, title should contain an input
        const input = titleToTest.querySelector('input');
        assert(!!input, 'Main title becomes editable input on double-click');
        if (input) {
          input.value = 'UI Edited Title';
          input.dispatchEvent(new w.KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
          assert(true, 'Tab renamed via UI executed without error');
        }
      } else {
        assert(false, 'No #tabTitle found for UI rename test');
      }

      // Test 25: Emoji picker inserts emoji into active edit input
      const emojiBtn = doc.getElementById('emojiBtn');
      const titleForEmoji = doc.getElementById('tabTitle');
      if (emojiBtn && titleForEmoji) {
        titleForEmoji.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
        const emojiInput = titleForEmoji.querySelector('input');
        assert(!!emojiInput, 'Title input available for emoji insertion');
        if (emojiInput) {
          emojiInput.value = 'Hello';
          emojiInput.focus();
          emojiInput.setSelectionRange(emojiInput.value.length, emojiInput.value.length);
          emojiBtn.click();
          const firstEmoji = doc.querySelector('#emojiPicker .emoji-item');
          if (firstEmoji) firstEmoji.click();
          assert(emojiInput.value.length > 'Hello'.length, 'Emoji picker appends emoji into active input');
          emojiInput.dispatchEvent(new w.KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
        }
      } else {
        assert(false, 'Emoji button or tab title missing for emoji test');
      }

      // Test 26: Tab in tab bar should NOT be editable on double-click
      const firstTabEl = doc.querySelector('.tab');
      if (firstTabEl) {
        const titleSpan = firstTabEl.querySelector('span:first-child');
        if (titleSpan) {
          titleSpan.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
          const input = firstTabEl.querySelector('input');
          assert(!input, 'Tab in tab bar is NOT editable on double-click');
        }
      }

      // Prior to closing, focus editor if available
      const currentTabId = w.__textgerbil.tabs[0] && w.__textgerbil.tabs[0].id;
      if (currentTabId) {
        const edInst = w.__textgerbil.editors[currentTabId];
        if (edInst && edInst.cm && typeof edInst.cm.focus === 'function') {
          edInst.cm.focus();
        }
      }
      const editorsBefore = Object.keys(w.__textgerbil.editors).length;

      // Test 27: Close tab via UI button
      const closeBtn = doc.querySelector('.tab .close');
      if (closeBtn) {
        const closeTabEl = closeBtn.closest('.tab');
        const closeTabId = closeTabEl ? closeTabEl.dataset.tabId : null;
        const hadEditor = !!(closeTabId && w.__textgerbil.editors[closeTabId]);
        closeBtn.click();
        doc.getElementById('dialogConfirm').click();
        const tabCountAfterClose = doc.querySelectorAll('.tab').length;
        assert(tabCountAfterClose >= 1, 'At least one tab remains after clicking close');
        const editorsAfter = Object.keys(w.__textgerbil.editors).length;
        const expectedDelta = hadEditor ? 1 : 0;
        assert(editorsAfter === editorsBefore - expectedDelta, 'Editor instance removed after closing tab');
        assert(true, 'Close button click executed without exception');
      } else {
        assert(false, 'No close button found for close test');
      }

      // Test 28: Initialize tabs and per-tab settings from localStorage (full settings)
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
          assert(sw.__textgerbil.tabs.find(x=>x.id==='tab-beta').mode === 'notepad', 'Init from storage restores active tab mode');
          const restoredActive = sw.__textgerbil.tabs.find(x => x.id === 'tab-beta');
          assert(restoredActive && restoredActive.theme && restoredActive.theme.fontFamily === 'monospace', 'Init keeps per-tab theme from storage');
          assert(restoredActive && restoredActive.previewWidth === 300, 'Init restores per-tab preview width from storage');
          assert(sw.__textgerbil.globalTheme && sw.__textgerbil.globalTheme.fontFamily === 'cursive', 'Init restores global theme from storage');
          assert(sdoc.getElementById('notesContainer').style.fontFamily === 'monospace', 'Init applies restored active tab theme');
          sw.__textgerbil.selectTab('tab-alpha');
          const restoredPreview = sdoc.getElementById('preview');
          assert(restoredPreview && restoredPreview.style.width === '480px', 'Selecting stored tab applies saved preview width style');
        }
      );

      // Test 29: Initialize with empty saved tabs should still create one tab
      await runLocalStorageInitScenario(
        'init-empty-tabs',
        { [STORAGE_KEY]: JSON.stringify({ tabs: [], activeId: null }) },
        (sw, sdoc) => {
          assert(sw.__textgerbil.tabs.length === 1, 'Init with empty tabs creates a default tab');
          assert(sdoc.querySelectorAll('.tab').length === 1, 'Init with empty tabs renders one tab');
        }
      );

      // Test 30: Initialize with invalid activeId should select first available tab
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

      // Test 31: Initialize defaults for missing tab fields
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

      // Test 32: Initialize text content and text cursor from localStorage
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

      // Test 33: Initialize rich content from localStorage
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

      // Test 34: Switch tab restores text cursor and focuses editor
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

      // Test 35: Switch tab restores rich selection and focuses editor
      w.__textgerbil.newTab('rich');
      const richFocusSourceId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(richFocusSourceId);
      const richSourceEd = w.__textgerbil.editors[richFocusSourceId] && w.__textgerbil.editors[richFocusSourceId].quill;
      if (richSourceEd && richSourceEd.root) {
        richSourceEd.root.innerHTML = '<p>rich cursor restore</p>';
        if (typeof richSourceEd.setSelection === 'function') richSourceEd.setSelection(4, 2);
      }
      w.__textgerbil.newTab('text');
      const richFocusTargetId = w.__textgerbil.tabs[w.__textgerbil.tabs.length - 1].id;
      w.__textgerbil.selectTab(richFocusTargetId);
      w.__textgerbil.selectTab(richFocusSourceId);
      await new Promise(resolve => setTimeout(resolve, 90));
      const restoredRichEd = w.__textgerbil.editors[richFocusSourceId] && w.__textgerbil.editors[richFocusSourceId].quill;
      const restoredRichSelection = restoredRichEd && typeof restoredRichEd.getSelection === 'function' ? restoredRichEd.getSelection() : null;
      assert(
        restoredRichSelection && restoredRichSelection.index === 4 && restoredRichSelection.length === 2,
        'Tab switch restores previous rich selection'
      );
      assert(
        w.__TEXTGERBIL_HEADLESS_LAST_FOCUS &&
          w.__TEXTGERBIL_HEADLESS_LAST_FOCUS.tabId === richFocusSourceId &&
          w.__TEXTGERBIL_HEADLESS_LAST_FOCUS.mode === 'rich',
        'Tab switch focuses rich editor area'
      );

      // Test 36: Preview security behavior and availability by language
      const previewToggle = doc.getElementById('togglePreview');
      const previewPanel = doc.getElementById('preview');
      const previewContent = doc.getElementById('previewContent');
      const previewTabId = focusSourceId;
      w.__textgerbil.selectTab(previewTabId);
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
      w.__textgerbil.updatePreview();
      const markdownIframe2 = previewContent.querySelector('iframe');
      assert(markdownIframe === markdownIframe2, 'Preview does not re-render iframe when content is unchanged');

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
      w.__textgerbil.setActiveTabPreviewWidth(420);
      previewTab.content = `<div>${'a'.repeat(5000)}</div>`;
      w.__textgerbil.updatePreview();
      assert(previewPanel.style.width === '420px', 'Preview width remains fixed with long HTML line');

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
      const hasJSON5 = !!(w.JSON5 && typeof w.JSON5.parse === 'function');
      previewToggle.click();
      if (hasFormatter) {
        assert(previewTab.previewVisible === true, 'Preview toggle works for JSON when formatter is available');
        assert(!!previewContent.querySelector('.json-formatter-row') || /Object/.test(previewContent.textContent || ''), 'JSON preview renders tree view');
        if (hasJSON5) {
          previewTab.content = '{\n  // comment\n  \"name\": \"textgerbil\",\n  \"items\": [1, 2,],\n}\n';
          w.__textgerbil.updatePreview();
          const errText = (previewContent.textContent || '').toLowerCase();
          assert(!/invalid json/.test(errText), 'JSON5 content parses without error when JSON5 is available');
        }
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

      // Test 42: Language dropdown order
      const langOptions = Array.from(doc.getElementById('languageSelect').options).map(o => o.text);
      const expectedOrder = ['Detect', 'Plain', 'CSS', 'HTML', 'Java', 'JavaScript', 'JSON', 'Markdown', 'Python', 'Shell', 'SQL', 'XML', 'YAML'];
      assert(JSON.stringify(langOptions) === JSON.stringify(expectedOrder), 'Language dropdown order is correct (Detect, Plain, then Alphabetical)');

      // Test 43: Tab drag reordering via pointer events
      w.__textgerbil.newTab('text');
      w.__textgerbil.newTab('text');
      const startCount = w.__textgerbil.tabs.length;
      if (startCount >= 2) {
        const dTabs = doc.querySelectorAll('.tab.group');
        const tab0Id = w.__textgerbil.tabs[0].id;
        const tab1Id = w.__textgerbil.tabs[1].id;

        const tabsBar = doc.getElementById('tabs');
        tabsBar.getBoundingClientRect = () => ({ left: 0, right: 480, top: 0, bottom: 34, width: 480, height: 34 });
        dTabs.forEach((tab, idx) => {
          const left = idx * 110;
          tab.getBoundingClientRect = () => ({ left, right: left + 100, top: 0, bottom: 34, width: 100, height: 34 });
        });

        dTabs[0].dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 10 }));
        doc.dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 30, clientY: 10 }));
        doc.dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 220, clientY: 10 }));
        doc.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 220, clientY: 10 }));

        assert(w.__textgerbil.tabs[1].id === tab0Id, 'Tab 0 was dragged to index 1');
        assert(w.__textgerbil.tabs[0].id === tab1Id, 'Tab 1 shifted to index 0');
      }

    } catch (e) {
      console.error('test error', e);
      testsFailed++;
    } finally {
      console.log(`\n=== Test Summary ===\nPassed: ${testsPassed}\nFailed: ${testsFailed}\n`);
      process.exit(testsFailed ? 1 : 0);
    }
  });
})();
