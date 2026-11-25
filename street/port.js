(() => {
/* ================= SETTINGS ================= */
const PLAYLIST = ['../music/where-the-warm-tide-turns-boom-bap-duet.mp3', '../music/where-the-warm-tide-turns-edm-classical.mp3'];
const TRACK_NAMES = ['Where the Warm Tide Turns (Boom Bap Duet)', 'Where the Warm Tide Turns (EDM Classical)'];
const GATE = { salt: '5c74ac35616daa03aa0b7e8c72862248', verifier: '5a4ebfdbe3564a34207befb4bb7e7e460c5b0def23e055a11fb160add94cee86', iterations: 200000 };
const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* text inputs lose focus on a tap anywhere outside */
const blurOutside = e => { const a = document.activeElement; if (a && a.matches('input,textarea') && !a.contains(e.target)) a.blur(); };
document.addEventListener('mousedown', blurOutside, true);
document.addEventListener('touchstart', blurOutside, { capture: true, passive: true });

/* no pull-to-refresh: there is nothing here to refresh, and a reload only stops the music. A one-finger pull downward that starts at the very top is refused; every other gesture is left alone */
let pullY = null;
const pullable = () => scrollY <= 0 && !document.body.classList.contains('locked') && !(window.visualViewport && visualViewport.scale > 1.01);
document.addEventListener('touchstart', e => { pullY = e.touches.length === 1 && pullable() ? e.touches[0].clientY : null; }, { passive: true });
document.addEventListener('touchmove', e => {
  if (pullY === null) return;
  if (e.touches.length === 1 && e.touches[0].clientY > pullY && pullable()) { if (e.cancelable) e.preventDefault(); }
  else pullY = null;   // the finger went up, or a second finger joined: an ordinary scroll or pinch from here on
}, { passive: false });

/* no saving images by long press or right click */
document.addEventListener('contextmenu', e => { if (e.target.closest('.work,.shot,.tile,.viewer')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.closest('img,.work,.shot,.tile')) e.preventDefault(); });


/* ================= music ================= */
const audio = $('#bgm'), spk = $('#spk'), MKEY = 'rb_music';
let m = { i: 0, t: 0, on: true };
try { m = Object.assign(m, JSON.parse(localStorage.getItem(MKEY) || '{}')); } catch (e) {}
m.i = 0; m.t = 0; m.list = PLAYLIST.join('|');   // every visit starts with the first song from its beginning; only the choice of on or off is kept
let seekTo = 0, armed = false, lastSave = 0;
const missing = new Set();   // slots with no file behind them; skipped for the rest of the visit
const nextTrack = () => { for (let k = 1; k <= PLAYLIST.length; k++) { const j = (m.i + k) % PLAYLIST.length; if (!missing.has(j)) return j; } return -1; };
const advance = () => { const j = nextTrack(); if (j < 0) { spk.title = 'No music files found in /music'; return; } m.i = j; m.t = 0; seekTo = 0; saveMusic(); loadTrack(); if (m.on) tryPlay(); };
const saveMusic = () => { m.t = audio.currentTime || 0; try { localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) {} };
const label = () => { const name = TRACK_NAMES[m.i]; spk.title = m.on ? (name ? 'Playing: ' + name : 'Music on') : 'Music off'; spk.setAttribute('aria-pressed', String(m.on)); };
const loadTrack = () => { audio.src = PLAYLIST[m.i]; audio.preload = 'auto'; audio.load(); label(); };
const armGesture = () => {
  if (armed) return; armed = true;
  const go = () => { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); armed = false; if (m.on) audio.play().catch(() => {}); };
  document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
};
const tryPlay = () => audio.play().catch(armGesture);
audio.addEventListener('loadedmetadata', () => { if (seekTo > 0 && isFinite(audio.duration) && seekTo < audio.duration - 1) audio.currentTime = seekTo; seekTo = 0; });
audio.addEventListener('timeupdate', () => { const now = Date.now(); if (now - lastSave > 2000) { lastSave = now; saveMusic(); } });
audio.addEventListener('ended', advance);
audio.addEventListener('error', () => { missing.add(m.i); advance(); });
spk.addEventListener('click', () => { m.on = !m.on; label(); saveMusic(); if (m.on) { if (!audio.src) loadTrack(); tryPlay(); } else audio.pause(); });
addEventListener('pagehide', saveMusic);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveMusic(); });
label(); if (m.on && PLAYLIST.length) { loadTrack(); tryPlay(); }

/* ================= password gate + AES-GCM ================= */
const gate = $('#gate'), gateForm = $('#gate-form'), gateInput = $('#gate-input'), gateErr = $('#gate-err'), gateGo = $('#gate-go'), gateStatus = $('#gate-status');
const enc = new TextEncoder();
const hex2buf = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const buf2hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
let aesKey = null, afterUnlock = null;
async function deriveBits(pw) { const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']); return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hex2buf(GATE.salt), iterations: GATE.iterations, hash: 'SHA-256' }, base, 256); }
const importKey = bits => crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
async function decryptBytes(buf) { const u = new Uint8Array(buf); if (String.fromCharCode(...u.slice(0, 4)) !== 'RBL1') throw new Error('Not a locked file'); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(4, 16) }, aesKey, u.slice(16)); }
function unlockUI() {
  $$('[data-locked]').forEach(el => {
    el.classList.remove('is-locked'); el.classList.add('unlocked');
    $$('.lock use', el).forEach(u => u.setAttribute('href', '#i-unlock'));
    $$('.lock', el).forEach(l => { l.title = 'Unlocked'; });
    const b = $('.btn', el); if (b && b.textContent === 'Unlock') b.textContent = 'Open';
  });
  gateStatus.hidden = false;
}
function openGate(then) { afterUnlock = then || null; gateErr.textContent = ''; gateInput.value = ''; gate.classList.add('open'); lockScroll(); setTimeout(() => gateInput.focus(), 30); }
function closeGate() { gate.classList.remove('open'); if (!viewer.classList.contains('open')) unlockScroll(); }
$('#gate-cancel').addEventListener('click', () => { afterUnlock = null; closeGate(); });
gate.addEventListener('click', e => { if (e.target === gate) { afterUnlock = null; closeGate(); } });
gateForm.addEventListener('submit', async e => {
  e.preventDefault();
  const pw = gateInput.value; if (!pw) return;
  gateGo.classList.add('pressed'); gateGo.textContent = 'Checking'; gateErr.textContent = '';
  try {
    if (!crypto.subtle) throw new Error('This browser cannot unlock files here. Open the site over https.');
    const bits = await deriveBits(pw);
    if (buf2hex(await crypto.subtle.digest('SHA-256', bits)) !== GATE.verifier) { gateErr.textContent = 'That is not the password.'; gateInput.select(); return; }
    aesKey = await importKey(bits);
    try { sessionStorage.setItem('rb_key', buf2hex(bits)); } catch (err) {}
    unlockUI(); closeGate();
    const fn = afterUnlock; afterUnlock = null; if (fn) fn();
  } catch (err) { gateErr.textContent = err.message || 'Something went wrong.'; }
  finally { gateGo.classList.remove('pressed'); gateGo.textContent = 'Unlock'; }
});
(async () => { try { const h = sessionStorage.getItem('rb_key'); if (h && crypto.subtle) { aesKey = await importKey(hex2buf(h)); unlockUI(); } } catch (e) {} })();
const isUnlocked = () => !!aesKey;

/* ================= viewer ================= */
const viewer = $('#viewer'), stage = $('#stage'), inner = $('#stage-inner'), vTitle = $('#viewer-title'), vT1 = $('#viewer-title .cur'), vT2 = $('#viewer-title .nxt'), vN = $('#viewer-n'), vN1 = $('#viewer-n .cur'), vN2 = $('#viewer-n .nxt'), vPrev = $('#viewer-prev'), vNext = $('#viewer-next');
const setTitle = t => { vT1.textContent = t || ''; vT2.textContent = ''; vTitle.classList.remove('anim'); vT1.style.opacity = ''; vT2.style.opacity = ''; };
const setN = t => { vN1.textContent = t || ''; vN2.textContent = ''; vN.classList.remove('anim'); vN1.style.opacity = ''; vN2.style.opacity = ''; };
const countOf = i => ((i + gallery.length) % gallery.length + 1) + ' / ' + gallery.length;
let gallery = null, gIndex = 0, currentPdf = null, blobUrls = [];
const kindOf = src => { if (src.startsWith('#')) return 'text'; const ext = src.replace(/\.enc$/i, '').split('.').pop().toLowerCase(); if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) return 'image'; if (ext === 'pdf') return 'pdf'; return 'text'; };
const isEnc = src => /\.enc$/i.test(src);
function msg(title, body) { inner.innerHTML = ''; const d = document.createElement('div'); d.className = 'msg'; d.innerHTML = '<b></b><span></span>'; d.firstChild.textContent = title; d.lastChild.textContent = body || ''; inner.appendChild(d); }
function clearStage() { viewer.classList.remove('img', 'gal'); track = null; if (currentPdf) { try { currentPdf.destroy(); } catch (e) {} currentPdf = null; } blobUrls.forEach(u => URL.revokeObjectURL(u)); blobUrls = []; inner.innerHTML = ''; stage.scrollTop = 0; }
let lockedY = null;
function lockScroll() { if (lockedY !== null) return; lockedY = scrollY; document.body.style.top = -lockedY + 'px'; document.body.classList.add('locked'); }
function unlockScroll() { if (lockedY === null) return; document.body.classList.remove('locked'); document.body.style.top = ''; const y = lockedY; lockedY = null; scrollTo(0, y); }
function openViewer(title) { setTitle(title); setN(''); viewer.classList.add('open'); lockScroll(); viewer.focus({ preventScroll: true }); }
function closeViewer() { viewer.classList.remove('open'); clearStage(); gallery = null; preloads = []; pending = 0; sliding = false; vPrev.hidden = vNext.hidden = true; if (!gate.classList.contains('open')) unlockScroll(); }
$('#viewer-close').addEventListener('click', closeViewer);
stage.addEventListener('click', e => { if ((e.target === stage || e.target.classList.contains('slide')) && !zoomed() && Date.now() - lastMulti > 700) closeViewer(); });
document.addEventListener('keydown', e => {
  if (gate.classList.contains('open')) { if (e.key === 'Escape') { afterUnlock = null; closeGate(); } return; }
  if (!viewer.classList.contains('open')) return;
  if (e.key === 'Escape') closeViewer(); else if (e.key === 'ArrowLeft' && gallery) step(-1); else if (e.key === 'ArrowRight' && gallery) step(1);
});
let tx = null, ty = null, multi = false, lastMulti = 0;
const zoomed = () => window.visualViewport && window.visualViewport.scale > 1.02;
let drag = null, t0 = 0;
const canDrag = () => viewer.classList.contains('img');                    // pictures slide away; documents scroll instead
const setDrag = dy => { stage.style.transform = `translateY(${dy}px)`; viewer.style.setProperty('--dim', String(Math.max(0.12, 1 - Math.abs(dy) / 420))); };
const resetDrag = () => { viewer.classList.remove('dragging'); stage.style.transition = 'transform .32s ease'; viewer.style.transition = '--dim .32s ease'; stage.style.transform = ''; viewer.style.setProperty('--dim', '1'); setTimeout(() => { stage.style.transition = ''; viewer.style.transition = ''; }, 340); };
stage.addEventListener('touchstart', e => {
  if (e.touches.length > 1) { multi = true; lastMulti = Date.now(); drag = null; return; }
  multi = false; tx = e.touches[0].clientX; ty = e.touches[0].clientY; t0 = Date.now(); drag = { active: false, dy: 0 };
}, { passive: true });
stage.addEventListener('touchmove', e => {
  if (e.touches.length > 1) { multi = true; lastMulti = Date.now(); if (drag && drag.active === 'x') settleTrack(); else if (drag && drag.active) resetDrag(); drag = null; return; }
  if (!drag || multi || zoomed() || !canDrag()) return;
  const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
  if (!drag.active) {
    if (track && !sliding && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) drag.active = 'x';
    else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.active = 'y'; viewer.classList.add('dragging'); }
    else return;
  }
  e.preventDefault();
  if (drag.active === 'x') { drag.dx = dx; moveTrack(dx); } else { drag.dy = dy; setDrag(dy); }
}, { passive: false });
stage.addEventListener('touchend', e => {
  if (multi || tx === null || zoomed()) { if (multi) lastMulti = Date.now(); if (e.touches.length === 0) multi = false; tx = ty = null; drag = null; return; }
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty, dt = Math.max(1, Date.now() - t0); tx = ty = null;
  if (drag && drag.active === 'x') {                                             // let go sideways: far or fast enough and the next picture arrives, otherwise this one settles back
    const far = Math.abs(dx) > slideW * 0.28, fast = Math.abs(dx) > 40 && Math.abs(dx) / dt > 0.9;
    drag = null;
    if (far || fast) goTo(dx < 0 ? 1 : -1); else settleTrack();
    return;
  }
  if (drag && drag.active) {                                                    // let go: far or fast enough and it leaves, otherwise it settles back
    const far = Math.abs(dy) > Math.min(160, innerHeight * 0.22), fast = Math.abs(dy) > 60 && Math.abs(dy) / dt > 1.2;   // a real flick, not a slow half-drag
    drag = null;
    if (far || fast) {
      stage.style.transition = 'transform .26s ease-in'; viewer.style.transition = '--dim .26s ease-in'; stage.style.transform = `translateY(${dy < 0 ? -110 : 110}vh)`; viewer.style.setProperty('--dim', '0');
      setTimeout(() => { closeViewer(); viewer.classList.remove('dragging'); stage.style.transition = ''; stage.style.transform = ''; viewer.style.transition = ''; viewer.style.setProperty('--dim', '1'); }, 270);
    } else resetDrag();
    return;
  }
  drag = null;
  if (gallery && !track && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);    // swipe sideways: next or previous
}, { passive: true });

async function fetchBytes(src) { const r = await fetch(src, { cache: 'no-store' }); if (!r.ok) throw Object.assign(new Error('missing'), { code: r.status }); let buf = await r.arrayBuffer(); if (isEnc(src)) buf = await decryptBytes(buf); return buf; }
const notYet = src => msg('Not added yet', 'This piece is listed, but its file is not on the site yet. It is expected at ' + src.replace(/^#/, '') + '.');
async function showImage(src, title) {
  clearStage(); viewer.classList.add('img');
  const img = document.createElement('img'); img.alt = title || '';
  if (isEnc(src)) {
    msg('Unlocking');
    try { const buf = await fetchBytes(src); const url = URL.createObjectURL(new Blob([buf])); blobUrls.push(url); inner.innerHTML = ''; img.src = url; inner.appendChild(img); }
    catch (e) { e.code === 404 ? notYet(src) : msg('Could not open', e.message); }
  } else { img.onerror = () => notYet(src); img.src = src; inner.appendChild(img); }
}
async function showText(src, title) {
  clearStage(); let text;
  if (src.startsWith('#')) { const t = document.getElementById(src.slice(1)); if (!t) return notYet(src); text = t.content ? t.content.textContent : t.textContent; }
  else { try { text = new TextDecoder().decode(await fetchBytes(src)); } catch (e) { return e.code === 404 ? notYet(src) : msg('Could not open', e.message); } }
  const d = document.createElement('div'); d.className = 'text'; const h = document.createElement('h2'); h.textContent = title || ''; d.appendChild(h); d.appendChild(document.createTextNode(text.trim())); inner.appendChild(d);
}
function pdfReady() { return new Promise((res, rej) => { const t0 = Date.now(); (function w() { if (window.pdfjsLib) return res(window.pdfjsLib); if (Date.now() - t0 > 12000) return rej(new Error('The PDF reader did not load. Check the connection and try again.')); setTimeout(w, 60); })(); }); }
async function showPdf(src, title) {
  clearStage(); msg('Opening');
  try {
    const [pdfjs, data] = await Promise.all([pdfReady(), fetchBytes(src)]);
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    const pdf = await pdfjs.getDocument({ data }).promise; currentPdf = pdf;
    inner.innerHTML = ''; const pages = document.createElement('div'); pages.className = 'pages'; inner.appendChild(pages);
    setN(pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages'));
    const first = await pdf.getPage(1), vp0 = first.getViewport({ scale: 1 });
    const cssW = Math.min(stage.clientWidth - 36, 980), ratio = vp0.height / vp0.width, dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 900 ? 1.5 : 2);
    const holders = [];
    for (let i = 1; i <= pdf.numPages; i++) { const d = document.createElement('div'); d.className = 'pg'; d.style.width = cssW + 'px'; d.style.height = (cssW * ratio) + 'px'; d.dataset.page = i; pages.appendChild(d); holders.push(d); }
    const render = async d => {
      if (d.dataset.done || pdf !== currentPdf) return; d.dataset.done = '1';
      const page = await pdf.getPage(+d.dataset.page); if (pdf !== currentPdf) return;
      const vp = page.getViewport({ scale: (cssW * dpr) / page.getViewport({ scale: 1 }).width });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = cssW + 'px'; c.style.height = (vp.height / dpr) + 'px';
      d.style.height = (vp.height / dpr) + 'px'; d.replaceChildren(c);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    };
    const release = d => { if (!d.dataset.done) return; delete d.dataset.done; const c = d.firstChild; if (c) { c.width = c.height = 0; d.replaceChildren(); } };
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) render(en.target); else if (en.target.dataset.done && Math.abs(en.boundingClientRect.top) > 4000) release(en.target); }), { root: stage, rootMargin: '1200px 0px' });
    holders.forEach(d => io.observe(d)); holders.slice(0, 2).forEach(render);
  } catch (e) { if (e.code === 404) notYet(src); else if (e.name === 'OperationError') msg('Could not unlock', 'The file did not decrypt with this password.'); else msg('Could not open', e.message || String(e)); }
}
function show(src, title) { const k = kindOf(src); if (k === 'image') showImage(src, title); else if (k === 'pdf') showPdf(src, title); else showText(src, title); }
function open(src, title) { const go = () => { openViewer(title); show(src, title); }; if (isEnc(src) && !isUnlocked()) openGate(go); else go(); }

/* galleries: DOM order restored from the masonry index */
function galleryOf(fig) {
  const name = fig.closest('[data-gallery]').dataset.gallery;
  return $$('[data-gallery="' + name + '"] .gal[data-src]').map(f => ({ f, r: f.getBoundingClientRect() }))
    .sort((a, b) => (Math.round(a.r.top / 12) - Math.round(b.r.top / 12)) || (a.r.left - b.r.left)).map(o => o.f);   // reading order, as laid out
}
/* the pictures of a gallery sit on a strip three wide: the one before, this one, the one after. A sideways drag moves the strip; letting go far or fast enough brings the neighbour to the middle and the strip is re-centred without a visible change. The ends join, so the last picture follows the first. Every picture in the gallery is fetched as soon as the viewer opens, nearest first */
let track = null, slideW = 0, sliding = false, pending = 0, preloads = [];
const at = i => gallery[(i + gallery.length) % gallery.length];
function makeSlide(f) {
  const d = document.createElement('div'); d.className = 'slide';
  const src = f.dataset.src, img = document.createElement('img'); img.alt = f.dataset.title || '';
  const fail = () => { d.innerHTML = ''; const m = document.createElement('div'); m.className = 'msg'; m.innerHTML = '<b></b><span></span>'; m.firstChild.textContent = 'Not added yet'; m.lastChild.textContent = 'This piece is listed, but its file is not on the site yet. It is expected at ' + src + '.'; d.appendChild(m); };
  img.onerror = fail;
  if (isEnc(src)) fetchBytes(src).then(buf => { const url = URL.createObjectURL(new Blob([buf])); blobUrls.push(url); img.src = url; }).catch(fail); else img.src = src;
  d.appendChild(img); return d;
}
const placeTrack = (dx, anim) => { if (!track) return; track.classList.toggle('anim', !!anim); if (!anim) void track.offsetWidth; track.style.transform = 'translate3d(' + (dx - slideW) + 'px,0,0)'; };
function buildTrack() {
  clearStage(); viewer.classList.add('img', 'gal');
  track = document.createElement('div'); track.className = 'track';
  [-1, 0, 1].forEach(d => track.appendChild(makeSlide(at(gIndex + d))));
  inner.appendChild(track); slideW = stage.clientWidth; placeTrack(0, false);
}
function moveTrack(dx) {                                                       // under the finger: the strip follows, and the title gives way to the neighbour's in step with it
  placeTrack(dx, false);
  const p = Math.min(1, Math.abs(dx) / slideW), nf = at(gIndex + (dx < 0 ? 1 : -1));
  if (vT2.textContent !== (nf.dataset.title || '')) vT2.textContent = nf.dataset.title || '';
  const nc = countOf(gIndex + (dx < 0 ? 1 : -1)); if (vN2.textContent !== nc) vN2.textContent = nc;
  vTitle.classList.remove('anim'); vT1.style.opacity = String(1 - p); vT2.style.opacity = String(p);
  vN.classList.remove('anim'); vN1.style.opacity = String(1 - p); vN2.style.opacity = String(p);
}
function settleTrack() { placeTrack(0, true); vTitle.classList.add('anim'); vT1.style.opacity = '1'; vT2.style.opacity = '0'; vN.classList.add('anim'); vN1.style.opacity = '1'; vN2.style.opacity = '0'; setTimeout(() => { if (!sliding) { vTitle.classList.remove('anim'); vT1.style.opacity = ''; vT2.style.opacity = ''; vT2.textContent = ''; vN.classList.remove('anim'); vN1.style.opacity = ''; vN2.style.opacity = ''; vN2.textContent = ''; } }, 420); }
function goTo(d) {
  if (!track || gallery.length < 2) return;
  if (sliding) { pending += d; return; }                                        // pressed again mid-slide: taken in turn, one slide after the other
  sliding = true;
  const nf = at(gIndex + d);
  vT2.textContent = nf.dataset.title || ''; vTitle.classList.add('anim'); vT1.style.opacity = '0'; vT2.style.opacity = '1';
  vN2.textContent = countOf(gIndex + d); vN.classList.add('anim'); vN1.style.opacity = '0'; vN2.style.opacity = '1';
  placeTrack(-d * slideW, true);
  let tm; const done = () => {
    clearTimeout(tm); track.removeEventListener('transitionend', done);
    gIndex = (gIndex + d + gallery.length) % gallery.length;
    if (d > 0) { track.removeChild(track.firstElementChild); track.appendChild(makeSlide(at(gIndex + 1))); } else { track.removeChild(track.lastElementChild); track.insertBefore(makeSlide(at(gIndex - 1)), track.firstElementChild); }
    placeTrack(0, false);
    setTitle(nf.dataset.title); setN(countOf(gIndex)); sliding = false;
    if (pending) { const q = Math.sign(pending); pending -= q; goTo(q); }
  };
  track.addEventListener('transitionend', done); tm = setTimeout(done, reduced ? 0 : 520);
}
function step(d) { if (!gallery) return; if (track) return goTo(d); gIndex = (gIndex + d + gallery.length) % gallery.length; const f = gallery[gIndex]; setTitle(f.dataset.title); setN(countOf(gIndex)); showImage(f.dataset.src, f.dataset.title); }
function openGallery(fig) {
  gallery = galleryOf(fig); gIndex = gallery.indexOf(fig);
  openViewer(fig.dataset.title);
  const many = gallery.length > 1; vPrev.hidden = vNext.hidden = !many;
  if (many) setN(countOf(gIndex));
  if (many) {
    buildTrack();
    const order = gallery.map((f, i) => i).sort((a, b) => Math.min(Math.abs(a - gIndex), gallery.length - Math.abs(a - gIndex)) - Math.min(Math.abs(b - gIndex), gallery.length - Math.abs(b - gIndex)));
    preloads = order.filter(i => !isEnc(gallery[i].dataset.src)).map(i => { const im = new Image(); im.decoding = 'async'; im.src = gallery[i].dataset.src; return im; });
  } else showImage(fig.dataset.src, fig.dataset.title);
}
addEventListener('resize', () => { if (track) { slideW = stage.clientWidth; placeTrack(0, false); } });
vPrev.addEventListener('click', () => step(-1)); vNext.addEventListener('click', () => step(1));
$$('[data-gallery] .gal[data-src]').forEach(f => {
  f.addEventListener('click', () => openGallery(f));
  f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGallery(f); } });
});
/* jackets: the whole tile opens the piece */
$$('.piece[data-src]:not(.gal)').forEach(c => {
  const go = () => open(c.dataset.src, c.dataset.title);
  c.addEventListener('click', go);
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
$$('[data-locked] .lock').forEach(l => { l.style.cursor = 'pointer'; l.addEventListener('click', e => { if (!isUnlocked()) { e.preventDefault(); e.stopPropagation(); openGate(null); } }); });

})();
