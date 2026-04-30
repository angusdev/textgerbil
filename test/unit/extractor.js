const fs = require('fs');
const path = require('path');

function getFunctions() {
  const htmlPath = path.resolve(__dirname, '../../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const functionNames = [
    'uid',
    'detectLanguageFromTitle',
    'normalizeCodeMirrorMode',
    'normalizeLoadedTab',
    'getDefaultTitleForMode',
    'getDefaultLanguageForMode',
    'getNextModeTabTitle',
    'isMeaningfulRichContent',
    'ensureExtension',
    'hasExtension',
    'isEditableTarget',
    'clampPreviewWidthForTab',
    'createTabState',
    'parseComment',
    'getSlideParts'
  ];
  const context = {
    MIN_PREVIEW_WIDTH: 260,
    DEFAULT_PREVIEW_WIDTH: 360,
    MIN_EDITOR_WIDTH: 320,
    Math,
    Date,
    Object,
    Number,
    Array,
    String,
    RegExp,
    parseInt: Number.parseInt,
    globalTheme: null,
    document: { querySelector: () => null }
  };
  
  functionNames.forEach(name => {
    const searchStr = `function ${name}(`;
    const startIdx = html.indexOf(searchStr);
    if (startIdx === -1) return;
    
    // Find matching brace
    let braceCount = 0;
    let started = false;
    let endIdx = -1;
    for (let i = startIdx; i < html.length; i++) {
      if (html[i] === '{') {
        braceCount++;
        started = true;
      } else if (html[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx !== -1) {
      const fnCode = html.substring(startIdx, endIdx + 1);
      // Provide already-extracted functions as available in scope
      const fn = new Function(...Object.keys(context), `return (${fnCode})`);
      context[name] = fn(...Object.values(context));
    }
  });

  return context;
}

module.exports = { getFunctions };
