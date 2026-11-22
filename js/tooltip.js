/* Shared tooltip: instant, styled, replaces the slow native title="" tooltip.
   Markup: any element with data-tooltip="Text" (make it focusable with tabindex="0" if it isn't already,
   so keyboard users get it too). Shows on hover / focus straight away (short fade), above the element (below if
   there's no room), kept inside the window. Hides on leave / blur / press / scroll / Esc. One tooltip at a time.
   - A key hint at the end in brackets, e.g. "Previous file (↑)" or "Search (Enter)", shows as a key cap.
   - Long unbroken values (file names, IDs) get a wider box and wrap anywhere instead of at every hyphen.
   - data-tooltip-if-icon: only while the element's own text label is hidden (a button that turns icon-only on a
     narrow screen); text in .filters-count (a count badge) doesn't count as a label.
   Styles: css/components.css (.tooltip). */
(() => {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.id = 'app-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  let owner = null, muted = null;   // muted: the element just pressed — no tooltip again until the pointer leaves it
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function fill(text) {
    const key = text.match(/^(.+?)\s+\(([^()\s]{1,12}(?:\s?\/\s?[^()\s]{1,12})?)\)$/);   // "Label (↑)" · "Label (Ctrl+F)"
    tip.classList.toggle('is-long', !/\s/.test(text) && text.length > 32);
    tip.innerHTML = key ? `<span>${esc(key[1])}</span><kbd>${esc(key[2])}</kbd>` : esc(text);
  }
  // is any of the element's label text actually on screen? (hidden span / font-size 0 → width 0)
  function labelShown(el) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      if (!n.data.trim() || n.parentElement.closest('.filters-count')) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      if (r.getBoundingClientRect().width > 0) return true;
    }
    return false;
  }
  function show(el) {
    const text = el.dataset.tooltip;
    if (!text || (el.hasAttribute('data-tooltip-if-icon') && labelShown(el))) return;
    if (!tip.isConnected) document.body.append(tip);
    owner = el;
    fill(text);
    tip.hidden = false;
    tip.classList.remove('below', 'is-in');
    el.setAttribute('aria-describedby', tip.id);
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 8;
    let top = r.top - h - gap;
    if (top < 8) { top = r.bottom + gap; tip.classList.add('below'); }
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    // the arrow points at the element's centre even when the box was pushed in from the edge
    tip.style.setProperty('--arrow-x', `${Math.min(Math.max(12, r.left + r.width / 2 - left), w - 12)}px`);
    void tip.offsetWidth;            // restart the fade-in for each element
    tip.classList.add('is-in');
  }
  function hide() {
    if (!owner) return;
    owner.removeAttribute('aria-describedby');
    owner = null;
    tip.hidden = true;
    tip.classList.remove('is-in');
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-tooltip]');
    if (el === owner || (el && el === muted)) return;
    muted = null;
    el ? show(el) : hide();
  });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tooltip]'); el ? show(el) : hide(); });
  document.addEventListener('focusout', hide);
  // pressing a button: the tooltip gets out of the way and stays away while the pointer is on it
  document.addEventListener('pointerdown', e => { muted = e.target.closest?.('[data-tooltip]') || null; hide(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', hide, true);
  addEventListener('resize', hide);
  // the element went away (list re-rendered)
  new MutationObserver(() => { if (owner && !owner.isConnected) hide(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
