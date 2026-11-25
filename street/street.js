/* ===================================================================================================
   STREET  —  the small script behind the look. Every piece is optional and stands alone.
   Street.lights()                      the one light, if the markup is not already on the page
   Street.press(root)                   one press per tap on .mark-btn / .press, pointer events only (no double press)
   Street.reveal(selector)              rows fade up as they scroll in, 75 ms apart, both directions
   Street.fold(button, panel, ms)       a panel glides open and shut (the credits), the page never jumps
   Street.field(input, options)         a bare field: blurs on a tap anywhere else, letters left behind fade away, the scrim dims the page while a menu is up
   Street.tabs(nav, panes)              tabs cross-fade their panes
   Street.relight(cuts, rootSelector)   one light on the words: every word in a lit root takes the sweep's colour where it sits
   =================================================================================================== */
(function () {
  'use strict';
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Street = {};

  /* ---- the light: first in <body>, under everything ---- */
  Street.lights = function () {
    if (document.querySelector('.lights')) return;
    const d = document.createElement('div'); d.className = 'lights'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<i class="lt-broad"></i><i class="lt-near"></i>';
    document.body.insertBefore(d, document.body.firstChild);
  };

  /* ---- one press per tap. The look is driven by pointer events alone (down → is-down, up/cancel → release); the click
     does the work. A tap never presses twice. ---- */
  Street.press = function (root) {
    root = root || document;
    const SEL = '.mark-btn, .press';
    root.addEventListener('pointerdown', e => { const b = e.target.closest(SEL); if (b && !b.disabled) b.classList.add('is-down'); });
    const up = e => { root.querySelectorAll(SEL + '.is-down').forEach(b => b.classList.remove('is-down')); };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); window.addEventListener('blur', up);
  };

  /* ---- reveal on scroll: hidden 28 px low; arriving from above, 28 px high. Siblings arrive 75 ms apart, at most six steps. ---- */
  Street.reveal = function (selector) {
    const els = [...document.querySelectorAll(selector || '.rv')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce()) { els.forEach(el => el.classList.add('in')); return; }
    let lastY = window.scrollY;
    const io = new IntersectionObserver(entries => {
      const down = window.scrollY >= lastY; lastY = window.scrollY;
      let i = 0;
      entries.forEach(en => {
        const el = en.target;
        if (en.isIntersecting) { el.style.setProperty('--d', (Math.min(i++, 6) * 75) + 'ms'); el.classList.add('in'); el.classList.remove('above'); }
        else { el.style.setProperty('--d', '0ms'); el.classList.remove('in'); el.classList.toggle('above', !down && en.boundingClientRect.top < 0); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
  };

  /* ---- a panel folds open and shut by height and opacity together, from wherever it is, so it can turn round mid-way without a jump.
     While it opens with the page at its end, the end is kept in view (until a finger takes the page). ---- */
  Street.fold = function (button, panel, ms) {
    ms = ms || 3000;
    const inner = panel.firstElementChild || panel;
    let open = false, anim = null, pin = 0;
    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const unpin = () => { pin++; };
    window.addEventListener('touchstart', unpin, { capture: true, passive: true });
    window.addEventListener('wheel', unpin, { capture: true, passive: true });
    const go = to => {
      open = to; button.setAttribute('aria-expanded', open ? 'true' : 'false');
      const dur = reduce() ? 0 : ms, my = anim = {}, H = inner.scrollHeight, atEnd = window.scrollY >= maxScroll() - 1;
      panel.style.transition = 'none';
      panel.style.height = (open ? 0 : panel.getBoundingClientRect().height) + 'px';
      void panel.offsetHeight;
      panel.style.transition = dur ? 'height ' + dur + 'ms cubic-bezier(.65,0,.35,1), opacity ' + dur + 'ms cubic-bezier(.65,0,.35,1)' : 'none';
      panel.style.height = (open ? H : 0) + 'px';
      panel.style.opacity = open ? '1' : '0';
      const p = ++pin, t0 = performance.now();
      const keep = () => {
        if (anim !== my) return;
        if (open && atEnd && pin === p) window.scrollTo(0, maxScroll());
        if (performance.now() - t0 < dur + 60) { requestAnimationFrame(keep); return; }
        if (open) panel.style.height = 'auto';
        panel.dispatchEvent(new CustomEvent('folded', { detail: { open } }));
      };
      requestAnimationFrame(keep);
    };
    button.addEventListener('click', () => go(!open));
    return { open: () => go(true), close: () => go(false), get isOpen() { return open; } };
  };

  /* ---- a bare field. A tap or click anywhere outside it takes the focus away (capture phase, so nothing can swallow it); letters
     left in it then fade and go, unless options.keep says to keep them. While options.menu is shown, options.scrim dims the page.
     options.onClear is called once the letters have gone. ---- */
  Street.field = function (input, options) {
    options = options || {};
    const form = input.closest('.field') || input.parentElement, scrim = options.scrim, menu = options.menu;
    const dim = on => { if (scrim) scrim.classList.toggle('on', !!on); };
    const typed = () => form.classList.toggle('typed', !!input.value);
    input.addEventListener('input', typed); typed();
    const clear = () => {
      if (!input.value || options.keep) return;
      input.classList.add('clearing');
      setTimeout(() => { input.value = ''; input.classList.remove('clearing'); typed(); if (options.onClear) options.onClear(); }, reduce() ? 0 : 600);
    };
    const away = e => {
      if (form.contains(e.target)) return;
      if (document.activeElement === input) input.blur();
      clear(); dim(false);
      if (menu && !menu.hidden) { menu.style.opacity = '0'; setTimeout(() => { menu.hidden = true; menu.style.opacity = ''; }, reduce() ? 0 : 1300); }
    };
    document.addEventListener('touchstart', away, { capture: true, passive: true });
    document.addEventListener('mousedown', away, true);
    input.addEventListener('focus', () => { if (menu && !menu.hidden) dim(true); });
    return { dim, clear };
  };

  /* ---- tabs: the live word takes the ivory bar; the panes cross-fade, out then in, on the slow clock ---- */
  Street.tabs = function (nav, panes) {
    const tabs = [...nav.querySelectorAll('[role="tab"]')];
    const ms = () => reduce() ? 0 : 1100;
    let busy = false;
    const show = i => {
      if (busy) return; busy = true;
      tabs.forEach((t, j) => t.setAttribute('aria-selected', j === i ? 'true' : 'false'));
      const cur = panes.find(p => !p.hidden), next = panes[i];
      if (cur === next) { busy = false; return; }
      if (cur) cur.classList.add('out');
      setTimeout(() => {
        if (cur) { cur.hidden = true; cur.classList.remove('out'); }
        next.classList.add('out'); next.hidden = false; void next.offsetHeight; next.classList.remove('out');
        setTimeout(() => { busy = false; }, ms());
      }, cur ? ms() : 0);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    return { show };
  };

  /* ---- one light on the words. A lit root (data-lit) is lit by one sweep from its top left to its bottom right, and every word in
     it takes the colour of the light where it sits: each word gets a short gradient of the sweep's colours at its own two corners.
     cuts: [[selector, [topLeft, middle, bottomRight]], …]; the defaults are the four cuts of the look. ---- */
  const DEFAULT_CUTS = [
    ['.name', ['#f4f0e6', '#ece7db', '#e2dccd']],
    ['.words, .menu li .t, .credits dd', ['#e9e4d8', '#e1dbcd', '#d6cfbf']],
    ['.hint', ['#dfe3ea', '#d8dce4', '#cfd3dc']],
    ['.detail, .label, .row .y, .credits dt, .lit-dim', ['#a3a8b6', '#979daa', '#8a909e']]
  ];
  Street.relight = function (cuts, rootSelector) {
    cuts = cuts || DEFAULT_CUTS; rootSelector = rootSelector || '[data-lit]';
    const placeOf = el => { let x = 0, y = 0; for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x, y }; };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
    const shade = (stops, t) => { t = Math.max(0, Math.min(1, t)); const [a, m, b] = stops.map(hex); const c = t < 0.52 ? mix(a, m, t / 0.52) : mix(m, b, (t - 0.52) / 0.48); return 'rgb(' + c.join(',') + ')'; };
    let queued = null;
    const run = () => {
      queued = null;
      const roots = new Map();
      cuts.forEach(([sel, stops]) => document.querySelectorAll(sel).forEach(el => {
        const root = el.closest(rootSelector); if (!root) return;
        let r = roots.get(root); if (!r) { r = Object.assign(placeOf(root), { w: root.offsetWidth, h: root.offsetHeight }); roots.set(root, r); }
        if (!r.w || !r.h || !el.offsetWidth) return;
        const at = placeOf(el), span = r.w + r.h;
        const t0 = (at.x - r.x + at.y - r.y) / span, t1 = (at.x - r.x + el.offsetWidth + at.y - r.y + el.offsetHeight) / span;
        el.style.backgroundImage = 'linear-gradient(135deg,' + shade(stops, t0) + ',' + shade(stops, t1) + ')';
      }));
    };
    const soon = () => { if (!queued) queued = requestAnimationFrame(run); };
    window.addEventListener('resize', soon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
    if (window.ResizeObserver) { const ro = new ResizeObserver(soon); document.querySelectorAll(rootSelector).forEach(el => ro.observe(el)); }
    if (window.MutationObserver) { const mo = new MutationObserver(soon); document.querySelectorAll(rootSelector).forEach(el => mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })); }
    soon();
    return soon;
  };

  window.Street = Street;
})();
