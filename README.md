# TextGerbil

![TextGerbil](images/textgerbil.png)

**TextGerbil** is a single-file, web-based text editor that runs entirely
in the browser. Open `index.html` on any machine (no server required) and it
stores your tabs, contents and settings in `localStorage`.

## Demo

Live demo: https://angusdev.github.io/textgerbil

## Features

- Multi-tab editing with 3 modes per tab:
  - Text editing
  - Rich Text (Quill editor)
  - Notepad (multiple short notes in one tab)
- Themes (font family, size, background/foreground) per-tab or globally
- Live preview for Markdown and HTML text tabs in a strict sandboxed iframe, plus JSON/JSON5 (comments, trailing commas) when the JSON formatter library is available (preview button is disabled otherwise)
- Preview updates are debounced during typing to reduce flicker
- Draggable preview pane width, stored per tab
- Import and export files
- Keyboard shortcuts (desktop style)
- State persistence: tabs, contents, preview visibility, preview width, cursor/selection, themes, and mode-specific flags.
- Runs entirely in one `index.html` file using CDN libraries

> External libraries are loaded via `<script>` tags from CDNs – you
> don’t need to install anything to use the editor.

## Usage

1. Download or clone the repository and open `index.html` in any modern
   browser (Chrome, Firefox, Edge, Safari).
2. The first tab appears automatically; use the **New tab** button (plus icon) or
   `Ctrl/Cmd+T` to create additional tabs.
3. Change the editor mode (Text, Rich, or Notes) using the **toggle buttons** in the toolbar.
4. Toggle the preview sidebar with the **Preview** (Eye) button.
5. Edit text – changes are saved automatically in local storage.
6. **Rename a tab** by double-clicking the title area above the editor to edit inline.
   Press Enter or click elsewhere to confirm.
7. Use the **Export** button (download icon) or `Ctrl/Cmd+S` to save the current tab to a
   `.txt` file. Use the **Import** button (upload icon) or `Ctrl/Cmd+O` to open a local file in a new
   tab.
8. Click the **Settings** (Gear) button to adjust fonts and colors; you can apply the style to the current tab or globally.
9. Close tabs with the `×` icon or `Ctrl/Cmd+W`. A confirmation dialog will protect you from accidental closures.

The notepad mode lets you keep a list of mini-notes inside a single tab.

## Keyboard Shortcuts

| Shortcut           | Action                     |
|--------------------|----------------------------|
| Ctrl/Cmd + S       | Export current tab         |
| Ctrl/Cmd + O       | Import file (new tab)      |
| Ctrl/Cmd + T       | New tab                    |
| Ctrl/Cmd + W       | Close current tab          |

## Security

- HTML and Markdown previews run in a sandboxed `iframe` with no `allow-*` permissions.
- The preview document uses a strict `Content-Security-Policy` (`default-src 'none'`) to block scripts, network access, and active content by default.
- Markdown preview uses `markdown-it` with raw HTML disabled (`html: false`), so raw HTML is escaped instead of executed.
- If the browser does not support required secure iframe features (`sandbox` + `srcdoc`), HTML/Markdown preview is disabled and the UI shows a clear explanation (`Secure preview unavailable`).

## Development / Testing

1. The file is self-contained; to make edits, modify `index.html`.
2. Use Node.js 24 (`nvm use` reads `.nvmrc`).
3. Install dependencies and run the headless test suite:
   ```bash
   npm install
   npm test
   ```
   The test suite (`test/run_headless_test.js`) currently includes **120+ test cases** covering:
   - Tab creation, switching, and renaming (both API and UI double-click)
   - Tab switching restores focus and prior cursor/selection position
   - Initialization from `localStorage` across multiple saved-state combinations
   - All 3 editor modes (text editing, rich text, notepad)
   - Content editing and storage per mode
   - Notepad operations (adding and editing notes)
   - Theme settings (open, configure, apply to current or all tabs)
   - Preview sidebar behavior, including Markdown/HTML/JSON-only enablement
   - File export and keyboard shortcuts
   - Global API exposure for programmatic use
   
   All tests pass with a mocked `localStorage` for reliable JSDOM execution.

## Compatibility

Tested manually in Chrome, Firefox, and Safari (desktop).
Since the app uses widely‑supported web APIs and CDNs, it should run in any
recent browser and on both macOS and Windows. The built-in headless test
(with jsdom) can catch syntactic/runtime issues but does not render the UI.

## Accessibility

Basic accessibility improvements include ARIA labels on toolbar buttons and
keyboard focus support. Further enhancements (roles, tab indices, screen
reader announcements) can be added as needed.

## License

This project is licensed under the **MIT License** (see `LICENSE` file at the
root of the repo). You're welcome to fork, modify or reuse any part of it.

## Repository

Source is hosted on GitHub — clone or fork the repo:
```bash
git clone https://github.com/angusdev/textgerbil.git

> ⚠️ **Disclaimer:** this is a personal "vibe-coding" project—written in a
> stream-of-consciousness style. The source may look messy; instead of trying to
> understand every line, just hand the file to an AI assistant and ask it to
> make the changes you want.
