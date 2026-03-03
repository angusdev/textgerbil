# TextGerbil Specification

This document is intended to give AI agents (and humans) a clear specification
and architectural overview of the TextGerbil project so that further
features or modifications can be added in a spec-driven way.

## Purpose

TextGerbil is a single-page, browser-only text editor implemented entirely in
`index.html`. It is designed to run offline and store its state in
`localStorage`. It supports multiple tabs and several editing modes. Live
preview is available for Markdown/HTML text tabs, and for JSON when the
JSON formatter library is available.

## High-Level Architecture

- **HTML structure**: A header with logo, tabs, and an "add tab" button, an experimental warning banner, a main content area
  with a toolbar and an editor container, an optional preview sidebar, and a settings
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
  mode: string,        // one of: text, rich, notepad
  language: string,    // text mode language (detect, plain, javascript, python, markdown, htmlmixed, css, json, sql, shell, xml, java, yaml)
  content: string,     // raw text/HTML stored
  theme: {             // optional styling overrides
    fontFamily?: string,
    fontSize?: number,
    bg?: string,
    fg?: string
  },
  previewVisible: boolean, // per-tab preview visibility state
  previewWidth: number, // per-tab preview sidebar width in px
  cursor?: any,        // mode-specific cursor/selection state
  notepadData?: Array, // used when mode === 'notepad'
  hasBeenNotepad: boolean // safety flag for mode transitions
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
  While dragging a tab, the tab bar shows a snap indicator for the prospective insert position (before/after) so the target slot is visible before drop.
- `selectTab(id)` - switch active tab, save previous state, restore cursor, and focus the editor area.
- `newTab(mode)` / `closeTab(id)` - manage tab lifecycle.  
  `newTab` saves current editor state before switching to a newly-created tab so prior tab state is preserved.
  `closeTab` and `removeNote` trigger a premium native `<dialog>` for user confirmation before deletion.
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

- **text**: CodeMirror-based text editor. Syntax behavior is determined by the
  `language` field. If set to `detect` (default), the language is inferred from the
  tab title's filename extension. explicit modes are also supported.
  - `javascript`, `python`, `css`, `htmlmixed`, `markdown`, `sql`, `json`, `shell`, `xml`, `java`, `yaml`.
  - `markdown`: preview rendered with `markdown-it` (`html: false`) and displayed in a sandboxed iframe.
  - `htmlmixed`: preview rendered in a sandboxed iframe.
  - `json`: preview rendered as a tree view via `json-formatter-js` when available.
  - other languages: preview unavailable.
- **rich**: Quill editor with toolbar.
- **notepad**: custom notes list, each note an independent textarea with a Markdown H1 as the title.
- **Confirmation dialogs**: implemented via `confirmAction(title, message, onConfirm, targetEl)` using the native `<dialog>` API. When a `targetEl` is provided, the dialog dynamically positions itself intuitively just below the clicked element (e.g., under the close tab button, delete note button, or mode toggle) instead of defaulting to the center of the screen.

Mode switching is managed via **toggle buttons** in the toolbar. The transition from `notepad` to `rich` mode is guarded by a confirmation prompt to prevent unintentional data loss. The language dropdown is visible in all modes but disabled for `rich` and `notepad`. 
The preview toggle is enabled for `text` mode with `markdown`/`htmlmixed` only when secure iframe preview support is available (`HTMLIFrameElement` + `iframe.srcdoc` + `iframe.sandbox`), and for `json` only when `window.JSONFormatter` is available.
Dialogs feature **premium aesthetics**, including backdrop blur, smooth animations, and modern card styling.

### Notepad Serialization & Integrity

To preserve the multi-note structure when switching to **Text** mode or persisting to storage, the `notepadData` array is serialized into a single Markdown-compatible string:

- **Note Boundaries**: Each note is prefixed with a Level 1 Markdown header (`# `). If a note has no title, an **"Empty Header"** (`# ` followed by a newline) is used to ensure the delimiter exists.
- **Escape Mechanism**: If a line in a note's body starts with a `#` character, it is escaped by prepending a single space (e.g., `#` becomes ` #`). This prevents the parser from misidentifying body text as a new note boundary.
- **Unescaping**: During deserialization, the parser splits the content by `(?=^# )` and restores the original note bodies by removing the leading space from any line starting with ` #`.
- **Markdown Compatibility**: This approach ensures the resulting `content` is valid, readable Markdown while maintaining 100% data integrity for the Notepad UI.

### Preview Security Model

- HTML and Markdown previews are rendered only in `iframe srcdoc` with:
  - `sandbox=""` (no `allow-*` permissions)
  - `referrerPolicy="no-referrer"`
  - strict inline CSP (`default-src 'none'`, no script execution, no network)
- Raw Markdown HTML is disabled (`markdown-it` with `html: false`) to prevent
  untrusted raw HTML from being interpreted as active content.
- If required secure iframe capabilities are unavailable, HTML/Markdown preview
  is blocked and the preview panel renders a human-readable error message.

## Themes

Users can set font family, size, background and foreground colors via the
settings panel. Themes can apply to the current tab or globally. Applying
global settings updates existing tabs and future tabs; on startup restore,
existing per-tab themes from storage are preserved.

## Tab Renaming

Tabs can be renamed in two ways:

**1. Via UI (double-click to edit):**
Double-click on the main tab title element (`#tabTitle`, located above the editor
area) to make it editable. Type the new name and press Enter or click elsewhere
to confirm. Double-clicking tabs in the top tab bar has no effect.

**2. Via API:**
```js
window.__textgerbil.tabs[index].title = 'New Name';
window.__textgerbil.save();
window.__textgerbil.renderTabs(); // refresh tabs display
```

The UI rename feature is implemented by adding a double-click handler to the
`#tabTitle` element, which calls `enableTabRename()` / `renameTab()`.
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
to load `index.html` with a mocked `localStorage` and execute **130+ test cases**:

**Test Coverage:**
1. Tab management (create, switch, rename via API and UI double-click)
2. All editor modes (text, rich, notepad) and language switching in text mode
3. Content editing and storage per mode
4. Notepad operations (add/edit notes)
5. Theme settings (panel open, apply to current tab, apply globally)
6. Preview behavior (default off, per-tab persistence, Markdown/HTML/JSON-only enablement)
7. `localStorage` initialization restore matrix (active tab recovery, defaults, theme/notes/content/cursor restore)
8. Cursor/selection save and restore, including focus restore on tab switch
9. Export function and keyboard shortcuts
10. Global API accessibility (`window.__textgerbil`)

The suite is not a substitute for manual browser testing but effectively
catches syntax errors, runtime issues, and feature regressions.

To run:

```bash
nvm use
npm install
npm test
```

Expected output: `Failed: 0`

## Modification Guidelines for AI

**Important for AI Assistants:** You MUST run `npm run lint:fix` after EACH AND EVERY change you make to the code to ensure the compact style is maintained and all linting issues are resolved. Do not wait for multiple changes to accumulate before linting.
**CRITICAL LLM INSTRUCTION (DO NOT AUTO COMMIT):** You must NEVER automatically run `git commit` or auto-commit any code changes. ONLY execute a commit if the user EXPLICITLY asks you to do so (e.g., "commit").

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
