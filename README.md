# TextGerbil

> ⚠️ **Disclaimer:** this is a personal "vibe-coding" project—written in a
> stream-of-consciousness style. The source may look messy; instead of trying to
> understand every line, just hand the file to an AI assistant and ask it to
> make the changes you want.

**TextGerbil** is a single-file, web-based text editor that runs entirely
in the browser. A live demo is available at https://<your-user>.github.io/textgerbil/ – just open
`index.html` on any machine (no server required) and it stores your tabs, contents and settings in `localStorage`.

## Features

- Multi-tab editing with mode per tab:
  - Plain text
  - Programming (CodeMirror syntax highlighting)
  - Markdown (with live preview)
  - Rich text (Quill editor)
  - HTML (previewed in sandboxed iframe)
  - Notepad (multiple short notes in one tab)
- Live preview sidebar for Markdown and HTML
- Themes (font family, size, background/foreground) per-tab or globally
- Import and export files
- Keyboard shortcuts (desktop style)
- State persistence: tabs, contents, cursor/selection, themes
- Runs entirely in one `index.html` file using CDN libraries

> External libraries are loaded via `<script>` tags from CDNs – you
> don’t need to install anything to use the editor.

## Usage

1. Download or clone the repository and open `index.html` in any modern
   browser (Chrome, Firefox, Edge, Safari).
2. The first tab appears automatically; use the **+ New** button or
   `Ctrl/Cmd+T` to create additional tabs.
3. Change the editor mode using the dropdown.
4. Toggle the preview sidebar with the **Preview** button.
5. Edit text – changes are saved automatically in local storage.
6. **Rename a tab** by double-clicking its title to edit inline. Press Enter
   or click elsewhere to confirm.
7. Use the **Export** button or `Ctrl/Cmd+S` to save the current tab to a
   `.txt` file. Use **Import** or `Ctrl/Cmd+O` to open a local file in a new
   tab.
8. Click the theme button to adjust fonts and colors; you can apply the
   style to the current tab or globally.
9. Close tabs with the `×` icon or `Ctrl/Cmd+W`.

The notepad mode lets you keep a list of mini-notes inside a single tab.

## Keyboard Shortcuts

| Shortcut           | Action                     |
|--------------------|----------------------------|
| Ctrl/Cmd + S       | Export current tab         |
| Ctrl/Cmd + O       | Import file (new tab)      |
| Ctrl/Cmd + T       | New tab                    |
| Ctrl/Cmd + W       | Close current tab          |

## Development / Testing

1. The file is self-contained; to make edits, modify `index.html`.
2. Use Node.js 24 (`nvm use` reads `.nvmrc`).
3. Install dependencies and run the headless test suite:
   ```bash
   npm install
   npm test
   ```
   The test suite (`test/run_headless_test.js`) includes **25+ test cases** covering:
   (recent additions include a case that closes a tab via the UI and ensures no JavaScript exception is thrown – this caught and fixed a bug where closing a CodeMirror tab could trigger errors.  Editor initialization now defensively checks `toTextArea()` before invoking it to prevent type errors when switching tabs.)
   - Tab creation, switching, and renaming (both API and UI double-click)
   - All 6 editor modes (plain, code, markdown, rich, html, notepad)
   - Content editing and storage per mode
   - Notepad operations (adding and editing notes)
   - Theme settings (open, configure, apply to current or all tabs)
   - Preview sidebar toggle
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
```
Issue reports and pull requests are welcome; the repository includes a
`.gitignore` and minimal `package.json` for running the headless tests.  
A GitHub Action (`.github/workflows/gh-pages.yml`) automatically runs the
suite and publishes the contents of the repo to the `gh-pages` branch so the
app can be hosted via GitHub Pages.
