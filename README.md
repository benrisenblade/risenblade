# Risenblade — risenblade.com

Static site. Upload everything in this folder to the root of risenblade.com.

## What is here

    index.html          the whole site; settings (playlist, password verifier) at the top of the script
    tools/lock.html     encrypts files for the password-protected items (runs offline, in your browser)
    robots.txt, sitemap.xml, site.webmanifest
    og-image.png, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png   (all from the logo)
    img/brand/          sword.png, wordmark.png, mark.png cut from the logo with real transparency
    img/icons/          spotify.png, apple-music.png as alpha masks; the page colours them with the text colour
    img/art/…           every artwork as name.jpg plus a name.t.jpg thumbnail
    img/writing/        the poem posters
    img/music/          album art and the artist photo
    music/              electric-heartbeat.mp3, straight-up.mp3
    docs/               PDFs and locked .enc files

## Still to add

    docs/climaxin.pdf
    docs/self-circumscription.pdf.enc                locked   (On Self-Circumscription…)
    docs/social-disillusionment-of-the-lottery.pdf.enc locked
    docs/gamification-of-pursuit.pdf.enc             locked
    docs/event-triggers-and-attachment.pdf.enc       locked
    docs/isa.pdf.enc                                 locked   (the fifth essay; the file name is kept coded too)
    docs/the-ill-loom-and-naughty.pdf.enc            locked
    the Fern and Rye book PDF: add it and point that tile's data-src at it

Tapping a tile whose file is missing shows "Not added yet" with the expected path.

## Adding things

Artwork: put name.jpg and a thumbnail name.t.jpg (about 900 px wide) in the group's folder and add one figure
to that group's gallery, copying a neighbour. The figure carries data-ar (width divided by height); the page uses
it to lay the columns out before the images load. The caption is the piece's name; a second part is optional.

A writing: copy a jacket tile (the CSS "book cover") or a poster tile in the matching shelf. data-src decides the
reader: .pdf, an image, or .txt; add .enc for a locked file. 
A site card: copy one; the whole card is the link.

Music: drop the MP3 in music/ and add its path and name to PLAYLIST and TRACK_NAMES at the top of the script.

## Locking a file

1. Open tools/lock.html in a browser (double-click it; no server needed).
2. Choose the files, type the password, press Lock files. A name.enc downloads for each.
3. Put the .enc files in docs/. The tile's data-src must end in .enc.

Locked files are AES-GCM ciphertext on the server; the page derives the key from the password in the browser
(PBKDF2, 200,000 rounds). Nothing readable sits on the server for locked items. Someone with the password can still
screenshot, and a short password can in principle be brute-forced offline by anyone who downloads a .enc, so treat it
as "keeps out anyone who was not given the password". Unlocking lasts for the browser session. The page needs https
for the crypto, which the live domain has.

To change the password: in tools/lock.html type the new one, press Show verifier, paste the two lines over `salt:`
and `verifier:` in GATE at the top of the script, then re-lock every protected file.

## Behaviour notes

The speaker is on by default and remembers on/off, the track, and the position. Browsers refuse audio before the
first tap, so on a first visit it starts at the first tap anywhere. Images can't be dragged, right-clicked, or
long-pressed to save. The nav pill sweeps from one tab to the next as a section boundary crosses the screen and settles on a tab when scrolling stops; tab clicks glide rather than jump.
