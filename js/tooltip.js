/* Shared tooltip: instant, styled, replaces the slow native title="" tooltip.
   Markup: any element with data-tooltip="Text" (make it focusable with tabindex="0" if it isn't already,
   so keyboard users get it too). Shows on hover / focus straight away, above the element (below if there's
   no room), kept inside the window. Hides on leave / blur / scroll / Esc. One tooltip at a time.
   Styles: css/components.css (.tooltip). */
(() => {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.id = 'app-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  let owner = null;

  function show(el) {
    const text = el.dataset.tooltip;
    if (!text) return;
    if (!tip.isConnected) document.body.append(tip);
    owner = el;
    tip.textContent = text;
    tip.hidden = false;
    tip.classList.remove('below');
    el.setAttribute('aria-describedby', tip.id);
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 8;
    let top = r.top - h - gap;
    if (top < 8) { top = r.bottom + gap; tip.classList.add('below'); }
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    // the arrow points at the element's centre even when the box was pushed in from the edge
    tip.style.setProperty('--arrow-x', `${Math.min(Math.max(10, r.left + r.width / 2 - left), w - 10)}px`);
  }
  function hide() {
    if (!owner) return;
    owner.removeAttribute('aria-describedby');
    owner = null;
    tip.hidden = true;
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-tooltip]');
    if (el === owner) return;
    el ? show(el) : hide();
  });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tooltip]'); el ? show(el) : hide(); });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', hide, true);
  addEventListener('resize', hide);
  // the element went away (list re-rendered)
  new MutationObserver(() => { if (owner && !owner.isConnected) hide(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
