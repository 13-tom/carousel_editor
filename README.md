# Carousel Editor

A local, browser-based Canva-like editor for your Instagram carousel templates.
Pick a page, edit its slides (text, images, looping video backgrounds, font
color, alignment, position), then export as PNG/MP4 — optionally straight
into your Dropbox folder. Runs entirely on your own machine; nothing is
published anywhere.

## How it's organized

```
templates/
  themes/<theme-id>/theme.css      colors + typography, swappable per page
  pages/<page-id>/
    page.json                      page name, theme, canvas size, slide list
    layout.css                     where things sit on this page's slides
    slides/*.html                  slide structure + editable hooks

server/     Express backend — renders slides, saves your edits, exports
web/        Vite + React editor UI
data/       your saved edits per page (gitignored)
uploads/    images/videos you add from your computer (gitignored)
exports/    exported PNG/MP4 output (gitignored)
config/     config.json — Dropbox path, export mode, ffmpeg path
```

## Setup

Requirements: Node.js 18+, and for video export, **ffmpeg** on your PATH
(`brew install ffmpeg` on Mac, `apt install ffmpeg` on Linux/WSL, or
download a build for Windows and add it to PATH).

```bash
npm run install:all   # installs root + server + web dependencies, and
                       # downloads the headless Chromium PNG export uses
npm run dev            # starts backend (port 4310) + editor UI (port 5173)
```

Open http://localhost:5173.

## Deploying to a server (e.g. a cloud VM)

Local dev runs two processes (Vite dev server + backend) on two ports.
For a real server, build the frontend once and let the backend serve
everything as a single process on one port:

```bash
npm run install:all
AUTH_USERNAME=youruser AUTH_PASSWORD=your-strong-password npm start
```

`npm start` builds the frontend (`web/dist`) and starts the backend, which
serves both the UI and the API on `config.server.port` (4310 by default).
Put this behind a process manager (`pm2 start npm -- start`, or a systemd
unit) so it survives reboots and restarts on crash.

**Set `AUTH_USERNAME` and `AUTH_PASSWORD` any time this is reachable from
outside your own machine.** With both set, every request requires an HTTP
Basic Auth login (your browser will just prompt once); with either unset,
there's no login at all — fine on localhost, not fine on a public IP.
Never commit these to a file — set them as real environment variables (or
in your process manager's env config) on the server itself.

Also switch `export.mode` to `"dropbox-api"` in `config/config.json` (see
Export, below) once there's no local Dropbox desktop client to sync a
folder — that only works on your own machine.

## Importing a template from a zip (in the browser)

On the page picker, **+ Import template (.zip)** accepts a Claude Design
canvas export (a `.dc.html` file, optionally alongside its `.image-slots.state.json`
and `uploads/` folder, all zipped together). It automatically:

- creates `templates/pages/<slug-of-the-deck-name>/` with a `page.json`,
  one `slides/*.html` per artboard, and an `assets/` folder for any images
  that were already placed in the design;
- converts every `<image-slot>` into a click-to-upload image region, and any
  slide with a video toggle into a click-to-upload looping-video region
  (auto-marked `hasVideo` so it exports as MP4);
- makes every heading/paragraph and standalone text label independently
  clickable and draggable, while leaving inline accent-color spans (e.g. one
  colored word in a headline) intact until you actually edit that block —
  editing replaces it with plain text plus whatever single color you set
  from the toolbar;
- carries over the deck's Google Fonts automatically.

This only understands `.dc.html` exports today — Canva/Figma files aren't
supported (see below for why). If a design element already had an image
placed in it in the source file, that image ships as the slide's default —
check slide 1 (and any other image slots) after importing, since anything
that was a placeholder/test image in the original design comes along too.

## Adding templates by hand

This ships with one demo page (two slides + one video CTA slide) so you can
see the whole flow working immediately without importing anything. To add a
page by hand instead of importing:

1. Duplicate `templates/pages/demo-page` as `templates/pages/<your-page-id>`.
2. Edit `page.json` — set `name`, `theme` (`minimal` or `bold`, or a new
   theme you add under `templates/themes/`), canvas size, and the slide list.
3. Replace the files in `slides/` with your actual slide markup. Any element
   you want editable needs a `data-edit` + `data-key` attribute:
   - `data-edit="text" data-key="headline"` — click to edit text inline.
     Add `data-align="true"` / `data-color="true"` so the toolbar's
     alignment/color controls apply to it (cosmetic marker only — the
     toolbar currently applies to whatever text element is selected).
   - `data-edit="image" data-key="heroImage"` on a div — click to upload
     an image from your computer; it's applied as `background-image`.
   - `data-edit="video" data-key="bgVideo"` wrapping a `<video>` — click to
     upload a looping background video. Slides with a video background
     export as MP4 instead of PNG (mark them with `"hasVideo": true` in
     `page.json`).
4. Adjust `layout.css` for exact positions/sizes (this is separate from
   `theme.css` so the same layout can be reused across themes).

HTML/CSS is the native format for a browser-based editor, so it needs the
least translation — a Claude Design export (importable directly, see above)
or hand-coded HTML both map cleanly onto the `data-edit` structure. Canva
doesn't export editable layered source, so that's a dead end; Figma would
need an extra conversion step, which isn't built yet.

Adding a new **theme**: create `templates/themes/<id>/theme.css` (+ optional
`meta.json` with a display name) using the same class names your layouts
already reference (`.headline`, `.body`, `.eyebrow`, `.cta`, `.page-number`,
etc.). Any page can then switch to it by changing `theme` in its `page.json`.

## Topics: one page, many carousels

Picking a page doesn't drop you straight into the editor — it first asks
which **topic** (carousel) you're working on. A page like "Deliveries" can
have many topics over time ("OpenAI news roundup" today, something else
next week), each saved separately and switchable later; picking one loads
exactly where you left it, including whatever photos you'd uploaded for it.

Starting a new topic gives you an upfront **batch upload** — drop in all
the source photos for this carousel at once, before you touch a single
slide. They land immediately in the structured folder below, and show up
in a media library strip under the canvas: select an image slot, click a
photo there, done — no re-uploading the same photo per slide. You can still
upload one-off per slide the normal way too.

This is also the folder hierarchy uploads and exports both use, so
everything for one carousel ends up in the same place:

```
uploads/<Page Name>/<YYYY-MM-DD>/<Topic>/photo1.jpg
exports/<Page Name>/<YYYY-MM-DD>/<Topic>/slide-1.png
```

## Editing controls

This is deliberately not a full design tool — it only exposes what's needed
to reuse a template for a new post, nothing that would let you redesign it
by accident:

- Click any text and type — it edits in place. Enter adds a line break, not
  a new paragraph.
- Select a text element to get font-color and left/center/right alignment
  controls in the toolbar, and drag it to reposition it.
- Click an image or video area to pick a replacement file from your computer.
- Drag any of the 8 handles around an image/video (4 corners + 4 edges) to
  resize its frame from that side — the opposite side stays put, same as
  Canva. Images/videos themselves aren't freely draggable — only resizable
  and replaceable — so a layout can't drift out of place slide to slide.
- Select an image or video and click **Crop** to reposition/zoom the photo
  or video *within* its frame (drag to pan, slider to zoom) without
  changing the frame's size or position — for fixing a bad crop on an
  upload, not for moving the frame itself. Click **Done cropping** to exit.
- There's no font-family control anywhere, on purpose.
- Icon+label chrome the importer recognizes automatically — a "swipe for
  more" cue, an @handle lockup — is excluded from editing entirely, so it
  can't be nudged out of place by accident. (Anything else you want locked
  the same way: remove its `data-edit`/`data-key` attributes in the slide's
  HTML file.)

Edits autosave to `data/projects/<page-id>--<topic>.json` on every change —
**the original template files under `templates/pages/` are never modified**,
by editing or by exporting. Every render merges the template with that
separate override file on the fly, so re-editing a page always starts from
the same clean template, and a template can be reused by as many topics and
dated exports as you want without ever drifting.

## Export

Click **Export carousel**. Each slide renders as PNG, except slides with a
video background (marked `hasVideo` + one uploaded), which render as MP4 —
the looping video with your text/graphics burned in on top. PNG capture is
lossless by construction (a raw pixel buffer at the slide's exact
resolution). MP4 quality is set explicitly (`config.video.crf`/`preset`,
16/slow by default) rather than left at ffmpeg's default, since that
default is noticeably lower quality than what a real export should be.

By default (`export.mode: "local-folder"` in `config/config.json`) files are
written to `exports/<Page Name>/<YYYY-MM-DD>/<Topic>/`. If you also set
`export.localFolder.dropboxPath` to your local Dropbox folder (e.g.
`/Users/you/Dropbox`), exports are additionally copied to
`<dropboxPath>/<Page Name>/<YYYY-MM-DD>/<Topic>/` and your existing Dropbox
desktop app syncs them automatically — no API keys needed.

**Later, when hosting this on a VPS** (no Dropbox desktop client running),
switch `export.mode` to `"dropbox-api"`, set `export.dropboxApi.destinationRoot`,
create a Dropbox app at dropbox.com/developers to get an access token, and
set it as the `DROPBOX_ACCESS_TOKEN` environment variable. No code changes
needed — the export route already supports both paths.

## Notes on video export

MP4 export shells out to `ffmpeg` (path configurable via
`config.video.ffmpegPath`, default assumes it's on your PATH) to loop the
uploaded background video and overlay the slide's text/graphics for
`config.video.loopSeconds` (default 6s). If ffmpeg isn't installed, PNG
export still works fine — only video-background slides are affected.
