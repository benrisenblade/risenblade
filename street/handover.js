/* ===================================================================================================
   HANDOVER  —  the masthead's hand-over, in its own time. The kit's script, taught one more thing for this page:
   a page with several headings. The masthead carries whichever heading passed under it last; when the next one
   passes under, the name goes, a beat, and the next name arrives. Everything else is as the kit has it.
   Handover.attach({ top, headings, scroller, tapToTop, times })  →  { refresh, destroy }
   =================================================================================================== */
(function () {
  'use strict';
  const Handover = {};
  Handover.attach = function (o) {
    const top = o.top, headings = o.headings || [o.heading], scroller = o.scroller || window, isWin = scroller === window;
    const layer = top.querySelector('.brand-name'), h = layer.querySelector('.h');
    const T = Object.assign({ out: 1100, in: 1100, hold: 350, rest: 900 }, o.times || {});
    top.style.setProperty('--ho-out', T.out + 'ms'); top.style.setProperty('--ho-in', T.in + 'ms'); top.style.setProperty('--ho-name-out', Math.round(T.in * 0.73) + 'ms');
    headings.forEach(el => el.classList.add('hush'));
    const scrollTop = () => isWin ? (window.scrollY || document.documentElement.scrollTop) : scroller.scrollTop;
    const maxScroll = () => isWin ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight) : Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* the words: the heading's own; a long name is set a little smaller rather than cut short (down to 6 px less) */
    let shown = -1;
    const words = k => {
      if (k < 0) return;
      h.textContent = headings[k].textContent.trim();
      h.style.fontSize = '';
      let size = parseFloat(getComputedStyle(h).fontSize) || 20; const floor = size - 6;
      while (h.scrollWidth > h.clientWidth + 0.5 && size > floor) { size -= 1; h.style.fontSize = size + 'px'; }
    };

    let mastT = null, restT = null, awayAt = 0, namedAt = 0, rested = false;
    const setHush = k => headings.forEach((el, i) => el.classList.toggle('hushed', i === k));
    const morph = () => {
      clearTimeout(mastT);
      const s = scrollTop(), now = performance.now();
      const hb = top.getBoundingClientRect().bottom;
      let k = -1, reachable = false;
      headings.forEach((el, i) => { if (el.offsetParent !== null && el.getBoundingClientRect().bottom <= hb + 1) k = i; });   // the last heading to have passed under
      if (headings[0].offsetParent !== null) reachable = maxScroll() >= s + headings[0].getBoundingClientRect().bottom - hb + 4;   // can the page be scrolled that far at all?
      const under = k >= 0;
      const away = top.classList.contains('away');
      if (s <= 24 || under) rested = false;
      const wantAway = reachable && (under || (!rested && s > (away ? 24 : 56)));   // a little hysteresis, so the edge never flickers
      const unname = () => { top.classList.remove('named'); setHush(-1); namedAt = now; };
      if (reduce()) {   // no fades: the states switch at once
        const on = !!(reachable && under); if (on) { words(k); shown = k; }
        top.classList.toggle('away', on); top.classList.toggle('named', on); setHush(on ? k : -1); return;
      }
      if (wantAway && !away) { top.classList.add('away'); awayAt = now; }
      else if (!wantAway && away) {
        if (top.classList.contains('named')) unname();
        const wait = namedAt + T.in * 0.7 + T.hold - now;   // the name goes first, then a beat, then the wordmark returns
        if (wait > 0) { mastT = setTimeout(morph, wait + 20); return; }
        top.classList.remove('away');
      }
      if (under && reachable) {
        if (top.classList.contains('named') && shown !== k) unname();   // the next heading has passed under (or the last has come back): the name goes first
        if (!top.classList.contains('named')) {
          const wait = Math.max(awayAt + T.out + T.hold, namedAt + T.in * 0.73 + T.hold) - now;   // whatever is leaving finishes, then a beat, then the name arrives
          if (wait > 0) { mastT = setTimeout(morph, wait + 20); return; }
          words(k); shown = k; top.classList.add('named'); setHush(k);
        }
      } else if (!under && top.classList.contains('named')) unname();
      clearTimeout(restT);
      if (top.classList.contains('away') && !top.classList.contains('named') && !under && reachable) restT = setTimeout(() => { rested = true; morph(); }, T.rest);
    };
    let tick = false;
    const soon = () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; morph(); }); } };
    const onTap = e => {
      if (o.tapToTop === false) return;
      if (!top.classList.contains('named') && !top.classList.contains('away')) return;
      e.preventDefault();
      try { (isWin ? window : scroller).scrollTo({ top: 0, behavior: 'smooth' }); } catch (x) { if (isWin) window.scrollTo(0, 0); else scroller.scrollTop = 0; }
    };
    const again = () => { words(shown); soon(); };
    scroller.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', again);
    top.addEventListener('click', onTap);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
    soon();
    return {
      refresh: again,
      destroy: () => { scroller.removeEventListener('scroll', soon); top.removeEventListener('click', onTap); clearTimeout(mastT); clearTimeout(restT); top.classList.remove('away', 'named'); setHush(-1); }
    };
  };
  window.Handover = Handover;
})();
