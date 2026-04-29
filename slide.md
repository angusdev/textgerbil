# TextGerbil

**A Single-File, Browser-Based Text Editor**

Everything saves to localStorage. No server. No installation.

---

# What is TextGerbil?

TextGerbil is a lightweight, single-file web editor that runs entirely in your browser.

- Open `index.html` anywhere
- Works fully offline
- All data stored locally in `localStorage`
- No external server required

Perfect for quick note-taking, coding, and documentation.

---

# Key Features

✨ **Multi-Tab Support**
- Create unlimited tabs
- Switch between them instantly
- Each tab maintains its own state

🎨 **Multiple Editing Modes**
- Text Editor
- Rich Text (WYSIWYG)
- Notepad (quick notes)
- Slides (Markdown deck)

---

# Editing Modes Explained

**Text Mode**: Code or plain text with syntax highlighting (JavaScript, Python, HTML, CSS, JSON, SQL, YAML, etc.)

**Rich Mode**: WYSIWYG editing with formatting (bold, italic, lists, links)

**Notepad Mode**: Multiple short notes in one tab

**Slides Mode**: Markdown becomes a presentation deck. Each `#` heading starts a new slide.

---

# Live Preview

- **Text & Markdown**: See formatted output in a live preview panel
- **HTML**: Preview your markup in a sandboxed iframe
- **JSON**: Validate and format JSON (or JSON5 with comments)
- **Slides**: Preview entire deck as vertical slide list or present mode

All preview panels are draggable—resize them to your preference.

---

# Themes & Customization

Customize per-tab or globally:
- Font family (serif, monospace, sans-serif)
- Font size
- Background color
- Foreground color

Settings persist across sessions.

---

# Save & Export

📥 **Save Current Tab**
- Text tab → `.txt` file
- Rich tab → `.html` file
- Slides tab → `.md` file

💾 **Export All Data**
- Save entire TextGerbil state to `.json`
- Import `.json` to restore everything

---

# Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + T | New tab |
| Ctrl/Cmd + W | Close tab |
| Ctrl/Cmd + S | Export data |
| Ctrl/Cmd + O | Import data |

Double-click tab title to rename inline.

---

# Presentation Mode

When viewing Slides:

1. Click the **Preview** button (eye icon) to see the deck
2. Click the **Present** button (projector icon) for slide-by-slide view
3. Navigate with Previous/Next buttons
4. Each slide renders in its own sandboxed iframe

Perfect for presentations, tutorials, or slide decks.

---

# Security First

🔒 HTML and Markdown previews run in sandboxed iframes

🔒 Strict Content-Security-Policy prevents scripts and unwanted content

🔒 Raw HTML is escaped, not executed

🔒 Slide images support `data:`, `https:`, and `http:` URLs safely

---

# Getting Started

1. Download or clone the repository
2. Open `index.html` in any modern browser
3. Click the **+** button to create a new tab
4. Choose your editing mode (Text, Rich, Notes, or Slides)
5. Start editing—everything saves automatically

No dependencies. No build process. Just open and code.

---

# Built with TextGerbil

This very slide deck was created in TextGerbil's Slides mode!

Each `#` heading becomes a new slide. Edit the Markdown, see the deck update instantly. Present it with the Present button.

Simple. Fast. Effective.

---

# Learn More

📖 **Live Demo**: https://angusdev.github.io/textgerbil

📚 **GitHub**: Full documentation and source code available

🚀 Download the single `index.html` file and start editing today.

**Everything you need in one file.**
