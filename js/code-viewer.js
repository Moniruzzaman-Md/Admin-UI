/* Shared read-only file viewer on Monaco (the VS Code editor), loaded from cdnjs the first time a viewer is shown.
   CodeViewer.create(host) -> { show(raw) -> { format, ext, text }, setWrap(on), find(), get text }
     host: an empty element that the editor fills (give it a height, e.g. flex: 1).
   setFormat('JSON'|'XML'|'HTML'|'Text'): shows the same file as that format (the user's correction of the guess).
   show(raw): detects the format from the content and pretty-prints it —
     JSON  (starts with { or [ and parses)            → indented 2 spaces
     XML   (<?xml … or a tag that isn't an HTML page)   → indented
     HTML  (<!doctype html / <html)                     → as is
     plain text (anything else)                         → as is
   loading(): skeleton over the editor while the file is being fetched (also shown while Monaco itself loads).
   error(message, onRetry): message + "Try again" in place of the content.
   Read-only, folding, no minimap, VS Code find (Ctrl+F or find()), word wrap via setWrap().
   collapseAll() folds every block but the outermost; expandAll() unfolds everything. */
(function () {
  const VS = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs';
  let loading = null;
  function loadMonaco() {
    if (window.monaco) return Promise.resolve(window.monaco);
    if (loading) return loading;
    // workers come from another origin: start them through a small same-origin data: script
    window.MonacoEnvironment = { getWorkerUrl: () => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
      `self.MonacoEnvironment={baseUrl:'${VS.replace(/\/vs$/, '')}/'};importScripts('${VS}/base/worker/workerMain.js');`) };
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = VS + '/loader.min.js';
      s.onload = () => { window.require.config({ paths: { vs: VS } }); window.require(['vs/editor/editor.main'], () => resolve(window.monaco)); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return loading;
  }

  /* ---------- format detection + pretty print ---------- */
  function prettyXml(xml) {
    const parts = xml.replace(/>\s*</g, '><').replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n');
    let pad = 0;
    return parts.map(p => {
      let indent = 0;
      if (/^<\/\w/.test(p)) pad = Math.max(pad - 1, 0);
      else if (/^<\w[^>]*[^/]>.*$/.test(p) && !/<\/\w[^>]*>$/.test(p) && !/^<\?/.test(p) && !/^<!/.test(p)) indent = 1;
      const line = '  '.repeat(pad) + p;
      pad += indent;
      return line;
    }).join('\n');
  }
  const FORMATS = { JSON: { lang: 'json', ext: 'json' }, XML: { lang: 'xml', ext: 'xml' }, HTML: { lang: 'html', ext: 'html' }, Text: { lang: 'plaintext', ext: 'txt' } };
  // the content shown for a given format: JSON / one-line XML are laid out; if JSON doesn't parse it's shown as is
  function render(raw, format) {
    const s = String(raw == null ? '' : raw), t = s.trim();
    let text = s;
    if (format === 'JSON') { try { text = JSON.stringify(JSON.parse(t), null, 2); } catch (e) { /* invalid JSON: show as is, still coloured */ } }
    if (format === 'XML' && t.startsWith('<') && !/\n\s*</.test(t)) text = prettyXml(t);
    return Object.assign({ format, text }, FORMATS[format]);
  }
  // best guess from the content (the viewer's format dropdown lets people correct it)
  function guess(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (/^[{[]/.test(t)) { try { JSON.parse(t); return 'JSON'; } catch (e) { /* not JSON after all */ } }
    if (/^<!doctype html|^<html[\s>]/i.test(t)) return 'HTML';
    if (/^<\?xml|^<[A-Za-z_][\w:.-]*[\s>/]/.test(t)) return 'XML';
    return 'Text';
  }
  const detect = raw => render(raw, guess(raw));

  // skeleton code lines: a line-number gutter + indented bars, shaped like a laid-out JSON file
  const SKEL = [[0, 6], [1, 30], [1, 44], [2, 26], [2, 50], [2, 38], [1, 20], [1, 56], [2, 34], [3, 42], [3, 28], [2, 46], [1, 18],
    [1, 40], [2, 52], [2, 30], [2, 44], [1, 24], [1, 48], [2, 36], [2, 58], [1, 16], [0, 6]];
  const skeleton = () => `<div class="cv-state is-loading" role="status" aria-label="Loading file">${SKEL.map(([lvl, w], i) =>
    `<div class="cv-skel-line"><span class="cv-skel-no">${i + 1}</span><span class="skeleton-bar" style="margin-left:${lvl * 24}px;width:${w}%"></span></div>`).join('')}</div>`;
  const ICON_WARN = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/></svg>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function create(host) {
    let editor = null, model = null, wrap = false, pending = null, current = { text: '' }, raw = '';
    let mode = 'loading', err = null, overlay = null;   // mode: 'loading' | 'error' | null (content showing)
    host.classList.add('cv-host');
    // the overlay sits on top of the editor: skeleton while loading (file or Monaco), message on error
    function paint() {
      const want = mode === 'error' ? 'error' : (mode === 'loading' || !editor) ? 'loading' : null;
      if (overlay && overlay.dataset.mode === want) return;
      if (overlay) { overlay.remove(); overlay = null; }
      if (!want) return;
      const box = document.createElement('div');
      box.innerHTML = want === 'error'
        ? `<div class="cv-state is-error" role="alert">${ICON_WARN}<b>Couldn’t load this file</b><span>${esc(err.message)}</span><button type="button" class="btn btn-secondary">Try again</button></div>`
        : skeleton();
      overlay = box.firstElementChild; overlay.dataset.mode = want;
      if (want === 'error') overlay.querySelector('button').addEventListener('click', () => err.onRetry && err.onRetry());
      host.appendChild(overlay);
    }
    paint();
    function apply() {
      if (!editor || !pending) return;
      const { text, lang } = pending; pending = null;
      if (model) model.dispose();
      model = window.monaco.editor.createModel(text, lang);
      editor.setModel(model);
      editor.setScrollTop(0);
    }
    function ensure() {
      return loadMonaco().then(monaco => {
        if (editor) return;
        editor = monaco.editor.create(host, {
          readOnly: true, domReadOnly: true, theme: 'vs', automaticLayout: true,
          // VS Code's own defaults (font stack, 14px); css/components.css protects this font from the portal's *{font-family}
          fontFamily: "Consolas, 'Courier New', Menlo, Monaco, 'Droid Sans Mono', monospace", fontSize: 14, lineNumbersMinChars: 4, scrollBeyondLastLine: false, renderLineHighlight: 'none',
          minimap: { enabled: false }, folding: true, showFoldingControls: 'always',
          wordWrap: wrap ? 'on' : 'off', stickyScroll: { enabled: true }, contextmenu: false,
          overviewRulerBorder: false, padding: { top: 8 },
        });
        monaco.editor.remeasureFonts();   // measure again now that the code font applies
        apply(); paint();
      });
    }
    return {
      show(content) {
        raw = content; current = detect(raw);
        mode = null; err = null;
        pending = current; apply(); paint(); ensure();
        return current;
      },
      loading() { mode = 'loading'; err = null; paint(); ensure(); },
      error(message, onRetry) { mode = 'error'; err = { message, onRetry }; paint(); },
      // show the same file as another format (JSON / XML / HTML / Text) when the guess was wrong
      setFormat(format) {
        current = render(raw, format);
        pending = current; apply();
        return current;
      },
      get format() { return current.format; },
      get ext() { return current.ext; },
      setWrap(on) { wrap = on; if (editor) editor.updateOptions({ wordWrap: on ? 'on' : 'off' }); },
      find() { if (editor) { editor.focus(); editor.getAction('actions.find').run(); } },
      // collapse every block except the outermost one (so the top-level keys / elements stay visible); expand all again
      collapseAll() {
        if (!editor || !model) return Promise.resolve();
        const root = Math.max(0, model.getLinesContent().findIndex(l => l.trim() && !/^<\?xml|^<!/i.test(l.trim())));
        return editor.getAction('editor.foldAll').run().then(() => editor.trigger('cv', 'editor.unfold', { levels: 1, selectionLines: [root] }));
      },
      expandAll() { return editor ? editor.getAction('editor.unfoldAll').run() : Promise.resolve(); },
      focus() { if (editor) editor.focus(); },
      // true while Monaco's own find box is open (Esc should close that, not the drawer)
      findOpen() { return !!host.querySelector('.find-widget.visible'); },
      get text() { return current.text; },
    };
  }
  window.CodeViewer = { create, detect, guess, formats: Object.keys(FORMATS) };
})();
