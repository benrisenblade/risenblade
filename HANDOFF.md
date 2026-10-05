# Risenblade — handoff (state as of 4 Oct 2026)

Single-page site, risenblade.com. Everything lives in `index.html` (CSS + JS inline). Password `cezanne7` (PBKDF2 200k → verifier in SETTINGS; AES-GCM `.enc` files made with `tools/lock.html`).

## Files
- `index.html` — the site. Sections: Websites & games, Visual art, Music, Writings; footer.
- `tools/lock.html` — offline encryptor for any file → `*.enc`.
- `img/brand/` — `sword.png` (logo cutout, 350×1075), `wordmark.png` (910×135), `blade.png` (sword without sun or baked glow; face of the hero solid), `halo.png` (2×, dithered glow, drawn beneath), `diamonds.png` (mask of the two internal diamonds that dissolve), `tip.png` (blade tip for the rule marks), `mark.png` (old rule mark, kept for no-JS), `crossed.png` (crossed blades for text jackets).
- `img/icons/` — spotify.png, apple-music.png (alpha masks, coloured by currentColor).
- `img/art/**`, `img/writing/`, `img/music/`, `img/sites/` — artwork, `.t.jpg` thumbnails for galleries; poem prints use full files.
- `music/` — electric-heartbeat.mp3, straight-up.mp3.
- `docs/` — PDFs / `.enc`. Present: te-aa-o-te-toea.pdf, dm2.pdf.enc, the-slide.pdf.enc. Still to add: climaxin.pdf, fern-and-rye.pdf, self-circumscription.pdf.enc, social-disillusionment-of-the-lottery.pdf.enc, gamification-of-pursuit.pdf.enc, event-triggers-and-attachment.pdf.enc, isa.pdf.enc, the-ill-loom-and-naughty.pdf.enc.
- robots.txt, sitemap.xml, site.webmanifest, og-image.png, favicons.

## How the hero works
Canvas renderer (`attachSword`) draws: the halo, the sword drawing as the face of a thin solid (swaying ±5° over 26 s with a dark far edge), a travelling sheen, and the sun as solids (ball, tube ring, eight equal-length rays: four long cardinals, four short diagonals) in a small tidally-locked orbit round the tip. Scroll-driven: progress 0 at the top of the page → 1 when the sun's lowest point leaves the top edge. Easing is stubborn at the top (τ 1.6 s) and quick by the end (0.15 s); the revolution wraps so 360°=0° never spins back. Per revolution: dial turns 90° and the bank goes 180° over the top (both on a smoothstep of the same progress). The two internal diamonds dissolve on a longer clock (0 when the foot of the sword leaves the top edge). The plate with the wordmark + tagline tips with Marco's goodbye camera (52° back, 18% shrink, 4% drift up) on an un-wrapped copy of the same easing. Wordmark is drawn strip-by-strip in true perspective.

## Rules and gems
Section rules carry the tip + sun mark (30 px): sun does one revolution, a 90° dial, a 180° bank from the bottom edge of the screen to the top (logo at the bottom edge; eased, τ 0.45). Soft rules carry six-faced gems doing the same in miniature.

## Scroll behaviours
Two-way reveals (enter from the side you're coming from; stagger runs in the direction of travel; reset 12% past either edge), heading rules draw in, tab pill sweeps across the 420 px before a boundary and settles after 160 ms, custom glide on tab clicks (1.1–2.6 s, cancelled by wheel/touch), hero parallax at 0.22 with fade, in-frame drift (galleries −16 px, album covers −14, crossed-blades −8, prints none), footer opacity tracks its visible fraction (τ 1.1 s). Page always opens at the top (scrollRestoration manual, hash stripped). Hover lifts only under `(hover:hover)`; `.pressed` mirrors them while a finger is down. Tab row trims itself to fit real fonts. Resize handlers ignore pinch-zoom. Viewer: drag the picture up/down to dismiss (snaps back under ~22% of the screen), pinches ignored, page pinned behind.

## Content notes
Galleries number tiles in reading order as laid out. Faces look inward in masonry. Solo tiles centre on phones (`data-solo`). Fonts: Cinzel display, Cormorant Garamond body. Palette: ground #190000, gold #d6aa6a.

## Preview build
`build_preview.py` (kept outside the site) inlines all images into one HTML under 16 MB for the claude.ai artifact; the brand images the renderer loads must stay full-size in it.
