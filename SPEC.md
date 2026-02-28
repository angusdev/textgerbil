# TextGerbil Specification

This document is intended to give AI agents (and humans) a clear specification
and architectural overview of the TextGerbil project so that further
features or modifications can be added in a spec-driven way.

## Purpose

TextGerbil is a single-page, browser-only text editor implemented entirely in
`index.html`. It is designed to run offline and store its state in
`localStorage`. It supports multiple tabs and several editing modes with live
preview features.

## High-Level Architecture

- **HTML structure**: A header with tabs and toolbar, a main content area
  with an editor container and an optional preview sidebar, and a settings
  pane at the bottom of the editor area.
- **CSS**: Minimal inline styles define layout, themes, and responsiveness.
- **JavaScript**: All logic is contained in a single `<script>` block. State
  is managed with plain objects stored in the `tabs` array and persisted to
  `localStorage` under a specific key. Editor instances are created on demand
  and cached in the `editors` object.

## State Model

Each tab object has the following shape:

```js
{
  id: string,          // unique identifier
  title: string,       // shown in tab label
  mode: string,        // one of: plain, code, markdown, rich, html, notepad
  content: string,     // raw text/HTML stored
  theme: {             // optional styling overrides
    fontFamily?: string,
    fontSize?: number,
    bg?: string,
    fg?: string
  },
  cursor?: any,        // mode-specific cursor/selection state
  notepadData?: Array, // used when mode === 'notepad'
}
```

Global configuration includes:

```js
{
  globalTheme: { ... } // same shape as tab.theme
}
```

## Key Functions

> **Note:** This spec lives in the GitHub repository alongside `index.html`,
> `README.md`, and the test suite. When editing the source or adding features,
> follow the usual GitHub workflow (branch, commit, PR) and keep `SPEC.md`
> synchronized with any API/state changes.


- `uid()` - generate unique identifiers.
- `save()` / `load()` - persist and restore state from `localStorage`.
- `renderTabs()` - redraw the tab bar.
- `selectTab(id)` - switch active tab, save previous state, restore cursor.
- `newTab(mode)` / `closeTab(id)` - manage tab lifecycle.  
  When closing a tab the implementation now also disposes any associated editor instance (e.g. CodeMirror or Quill) and removes it from the `editors` cache; this prevents errors when the DOM node is torn down.  
  In addition, `initCodeMirror()` and other locations guard against calling `toTextArea()` unless it is a function, avoiding exceptions if the cached editor reference is malformed.
- `getEditorContent()` / `setEditorContent(content)` - read/write current
  editor contents depending on mode.
- `applyThemeToEditor(theme)` - apply styles to currently visible editor
  element.
- Editor initialization: `initCodeMirror`, `initQuill`.
- Notepad helpers: `renderNotepad`, `addNote`, `removeNote`.
- Import/export handlers and keyboard shortcuts.

## Editing Modes

- **plain**: simple `<textarea>`.
- **code**: CodeMirror instance, default mode JavaScript, uses CDN.
- **markdown**: `<textarea>` editing with live preview via `markdown-it`.
- **rich**: Quill editor with toolbar.
- **html**: `<textarea>` with iframe preview.
- **notepad**: custom notes list, each note an independent textarea.

Mode switching shows/hides the appropriate `.editor-instance` div.

## Themes

Users can set font family, size, background and foreground colors via the
settings panel. Themes can apply to the current tab or globally; global
settings propagate to new and existing tabs.

## Tab Renaming

Tabs can be renamed in two ways:

**1. Via UI (double-click to edit):**
Double-click on any tab title to make it editable. Type the new name and press
Enter or click elsewhere to confirm.

**2. Via API:**
```js
window.__textgerbil.tabs[index].title = 'New Name';
window.__textgerbil.save();
window.__textgerbil.renderTabs(); // refresh tabs display
```

The UI rename feature is implemented in `renderTabs()` which adds double-click
handlers to tab titles and provides `enableTabRename()` / `renameTab()` functions
for inline editing.

## Extensibility Points / Future Work

- Additional editor modes (e.g. LaTeX, JSON with validation).
- Undo/redo and version history.
- Sync via cloud storage or server.
- More sophisticated import/export (e.g. HTML, Markdown).
- Accessibility improvements (ARIA roles, focus management, screen reader
  announcements).
- Mobile/touch optimizations.
- Plugin architecture (loadable scripts via URL).

## Testing

A comprehensive headless test suite (`test/run_headless_test.js`) uses `jsdom`
to load `index.html` with a mocked `localStorage` and execute 25 test cases:

**Test Coverage:**
1. Tab management (create, switch, rename via API and UI double-click)
2. All editor modes (plain, code, markdown, rich, html, notepad)
3. Content editing and storage per mode
4. Notepad operations (add/edit notes)
5. Theme settings (panel open, apply to current tab, apply globally)
6. Preview sidebar toggle
7. Export function and keyboard shortcuts
8. Global API accessibility (`window.__textgerbil`)

The suite is not a substitute for manual browser testing but effectively
catches syntax errors, runtime issues, and feature regressions.

To run:

```bash
npm install jsdom@21 --no-save
node test/run_headless_test.js
```

Expected output: `Passed: 25, Failed: 0`

## Modification Guidelines for AI

1. **Read the spec**: Use this document to understand state shapes and
   function responsibilities.
2. **Avoid reordering or rewriting structure**: keep `index.html` as one file
   unless explicitly instructed to split.
3. **When adding features**:
   - Define new state fields with defaults in `newTab()` or when loading.
   - Add corresponding UI elements in the HTML near existing analogous
     controls.
   - Update `save()`/`load()` if new state must persist.
   - Write helper functions for new behaviour and register event listeners
     in the UI wiring section.
4. **Keep CDNs alive**: if you add new libraries, use `<script>` tags with
   `src` attributes; no local module bundling.
5. **Use existing patterns**: theme application, cursor storage, and editor
   initialization are good templates to follow.

This specification should help any AI understand the current implementation
and make targeted modifications without needing to parse the messy original.
