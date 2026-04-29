# TextGerbil Specification

This document is intended to give AI agents (and humans) a clear specification
and architectural overview of the TextGerbil project so that further
features or modifications can be added in a spec-driven way.

## Purpose

TextGerbil is a single-page, browser-only text editor implemented entirely in
`index.html`. It is designed to run offline and store its state in
`localStorage`. It supports multiple tabs and several editing modes. Live
preview is available for Markdown/HTML text tabs, and for JSON when the
JSON formatter library is available. JSON parsing prefers JSON5 when
available (comments, trailing commas), with a JSON.parse fallback.

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
  mode: string,        // one of: text, rich, notepad, slide
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
- `getActiveTab()` - return the currently active tab object (`tabs.find(x=>x.id===activeId)`); use this instead of repeating the find pattern.
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
- Save/load handlers (file-based), drag-and-drop loading, and import/export handlers plus keyboard shortcuts.

### Pure Functions (no DOM dependency — unit-testable)

These functions take only plain values and return plain values, making them independently testable:

| Function | Signature |
|----------|-----------|
| `uid()` | `() → string` |
| `getDefaultTitleForMode(mode)` | `(string) → string` |
| `getDefaultLanguageForMode(mode)` | `(string) → string` |
| `getNextModeTabTitle(tabsList, mode, baseTitle)` | `(Tab[], string, string) → string` |
| `normalizeCodeMirrorMode(lang)` | `(string) → string\|object` |
| `normalizeLoadedTab(rawTab)` | `(object) → Tab\|null` |
| `isMeaningfulRichContent(html)` | `(string) → boolean` |
| `ensureExtension(title, ext)` | `(string, string) → string` |
| `hasExtension(title)` | `(string) → boolean` |
| `isEditableTarget(el)` | `(Element\|null) → boolean` |
| `clampPreviewWidthForTab(tab, width)` | `(Tab\|null, number) → number` |
| `createTabState(mode, title)` | `(string, string) → Tab` |

## Editing Modes

- **text**: CodeMirror-based text editor. Syntax behavior is determined by the
  `language` field. If set to `detect` (default), the language is inferred from the
  tab title's filename extension. explicit modes are also supported.
  - `javascript`, `python`, `css`, `htmlmixed`, `markdown`, `sql`, `json`, `shell`, `xml`, `java`, `yaml`.
  - `markdown`: preview rendered with `markdown-it` (`html: false`) and displayed in a sandboxed iframe.
  - `htmlmixed`: preview rendered in a sandboxed iframe.
  - `json`: preview rendered as a tree view via `json-formatter-js` when available.
    Parsing prefers JSON5 (`window.JSON5.parse`) when present, otherwise `JSON.parse`.
  - other languages: preview unavailable.
- **rich**: Quill editor with toolbar.
- **notepad**: custom notes list, each note an independent textarea with a Markdown H1 as the title.
- **slide**: CodeMirror-backed Markdown slide deck. The mode only uses Markdown (`language: "markdown"`), and each level-one heading (`#`) starts a new slide. The preview button renders the deck as a vertical scroll list of sandboxed slide iframes. The present button opens a focused presentation overlay that advances one slide at a time with buttons or keyboard arrows. Slide headings keep a fixed font size, while the remaining slide body receives a deterministic zoom scale based on the amount of Markdown content so dense slides fit the 16:9 page. Slide iframes keep `sandbox=""`; their CSP allows `data:`, `https:`, and `http:` images for Markdown image support, while scripts and active content remain blocked.
- **Confirmation dialogs**: implemented via `confirmAction(title, message, onConfirm, targetEl)` using the native `<dialog>` API. When a `targetEl` is provided, the dialog dynamically positions itself intuitively just below the clicked element (e.g., under the close tab button, delete note button, or mode toggle) instead of defaulting to the center of the screen.

Mode switching is managed via **toggle buttons** in the toolbar. The transition from `notepad` to `rich` mode is guarded by a confirmation prompt to prevent unintentional data loss. The language dropdown is visible in all modes but disabled for `rich` and `notepad`. 
The preview toggle is enabled for `text` mode with `markdown`/`htmlmixed` only when secure iframe preview support is available (`HTMLIFrameElement` + `iframe.srcdoc` + `iframe.sandbox`), for `slide` mode when the same secure iframe support is available, and for `json` only when `window.JSONFormatter` is available (JSON5 parsing is optional if `window.JSON5` is present).
Preview updates are debounced during typing to reduce iframe flicker.
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

The project has two complementary test layers:

### Unit Tests (`test/unit/`, 13 files)

Pure-function tests that run in Node with no DOM or JSDOM required. Each file
extracts one or more functions directly from `index.html` via `test/unit/extractor.js`
and runs assertions with Node's built-in `assert` module.

```bash
npm run test:unit
```

Functions covered:
`uid`, `detectLanguageFromTitle`, `normalizeCodeMirrorMode`, `normalizeLoadedTab`,
`getDefaultTitleForMode`, `getDefaultLanguageForMode`, `getNextModeTabTitle`,
`isMeaningfulRichContent`, `ensureExtension`, `hasExtension`,
`createTabState`, `clampPreviewWidthForTab`, `isEditableTarget`

### Headless Integration Tests (`test/run_headless_test.js`, **169 assertions**)

Loads `index.html` in `jsdom` with a mocked `localStorage`. A shared
`applyJsdomPolyfills()` helper stubs `getBoundingClientRect`, `execCommand`,
`requestAnimationFrame`, and the native `<dialog>` API.

```bash
npm run test:headless
```

**Test Coverage:**
1. Tab management (create, switch, rename via API and UI double-click)
2. Tab drag-and-drop reordering
3. All editor modes (text, rich, notepad) and language switching
4. Content editing and storage per mode
5. Close-confirm behavior for all three modes
6. Notepad operations (add/edit/delete notes)
7. Theme settings (panel open, apply to current tab, apply globally)
8. Autosave on edits, tab switches, language/theme changes, and rename
9. Preview behavior (default off, per-tab persistence, Markdown/HTML/JSON enablement, iframe sandboxing, CSP validation)
10. `localStorage` initialization restore matrix (active tab recovery, defaults, theme/notes/content/cursor restore)
11. Cursor/selection save and restore, focus restore on tab switch
12. Save/load file flows, export/import data, and keyboard shortcuts
13. Global `window.__textgerbil` API accessibility

To run all tests:

```bash
nvm use
npm install
npm test
```

Expected output: `Failed: 0`
w## Modification Guidelines for AI

**Important for AI Assistants:** You MUST run `npm run lint:fix` after EACH AND EVERY change you make to the code to ensure the compact style is maintained and all linting issues are resolved. Do not wait for multiple changes to accumulate before linting.
**CRITICAL LLM INSTRUCTION (DO NOT AUTO COMMIT):** You must NEVER automatically run `git commit` or auto-commit any code changes. ONLY execute a commit if the user EXPLICITLY asks you to do so (e.g., "commit").

1. **Read the spec**: Use this document to understand state shapes and
   function responsibilities.
2. **Avoid reordering or rewriting structure**: keep `index.html` as one file
   unless explicitly instructed to split.
3. **Prefer `getActiveTab()`**: use the helper instead of repeating
   `tabs.find(x=>x.id===activeId)` inline.
4. **Keep pure functions pure**: functions in the "Pure Functions" table above
   must not reference DOM globals (`document`, `window`). Pass any required
   state as parameters so they remain unit-testable.
5. **When adding features**:
   - Define new state fields with defaults in `newTab()` or when loading.
   - Add corresponding UI elements in the HTML near existing analogous
     controls.
   - Update `save()`/`load()` if new state must persist.
   - Write helper functions for new behaviour and register event listeners
     in the UI wiring section.
   - Add a unit test if the new logic is a pure function.
6. **Keep CDNs alive**: if you add new libraries, use `<script>` tags with
   `src` attributes; no local module bundling.
7. **Use existing patterns**: theme application, cursor storage, and editor
   initialization are good templates to follow.

This specification should help any AI understand the current implementation
and make targeted modifications without needing to parse the messy original.
