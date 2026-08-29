# CLAUDE.md

Local, offline-first Canva-like carousel editor for a set of Instagram page
templates. Never publishes anywhere — everything runs on the user's machine
(with a planned but not-yet-executed move to a private Oracle Cloud VM).

## Running it

```
npm run install:all   # root + server + web, once
npm run dev            # backend :4310 + frontend :5173 (Vite proxies /api, /uploads, /editor-runtime.js to :4310)
```

The backend (`server/src/index.js`) is started with plain `node`, **not**
nodemon — editing any file under `server/src/` requires killing and
restarting that process before the change takes effect. The frontend is
Vite, which does hot-reload on save.

## Architecture

- `server/`: Express + cheerio (HTML manipulation) + Playwright (PNG export)
  + ffmpeg (MP4 export/compositing).
- `web/`: Vite + React. The live editor is an `<iframe>` (`EditorCanvas.jsx`)
  showing server-rendered slide HTML, talking to the parent via
  `postMessage`. The injected client-side logic lives in
  `server/src/public/editor-runtime.js` (drag, 8-handle resize, crop
  pan/zoom, select, apply-style) — it is a plain script served statically,
  not part of the Vite/React bundle.
- **Templates are read-only.** `templates/pages/<pageId>/` holds the
  original slide HTML/theme — imported once via the zip importer
  (`templateImport.js`) and never mutated by editing.
- **Projects are topic-scoped overlays.** Each page can have multiple named
  topics; edits are saved to `data/projects/<pageId>--<topicSlug>.json` as
  overrides (text/images/videos/styles per slide) and merged onto the
  template at render/export time (`renderEngine.js`'s `mergeOverrides`).
  This is how "don't modify the main template" is enforced — the override
  file is the only thing editing ever writes to.
- **`data-edit`/`data-key` HTML attributes** on template elements are the
  entire editability contract: `data-edit` is `text`/`image`/`video`,
  `data-key` is the stable id used in override JSON and postMessage
  payloads. An element without these is inert chrome (logos, swipe cues)
  and is never touched.
- Uploads/exports follow a structured hierarchy:
  `<page name>/<date>/<topic>/` (`naming.js`).
- `server/src/lib/colors.js` extracts a page's real brand palette (theme
  CSS + layout CSS + slide HTML, ranked by frequency) for the text-color
  toolbar's swatches.

## Known gotchas (found the hard way — don't re-debug these)

- **A script tag placed after a `<link rel="stylesheet">` (e.g. the
  Google Fonts links templates bring in) will not execute until that
  stylesheet finishes loading, successfully or not** — per the HTML spec,
  this holds even for scripts at the very end of `<body>`, and even blocks
  deferred scripts and `DOMContentLoaded`. If a font CDN is slow or
  unreachable, the whole editor silently stops responding (no click,
  drag, or resize) with no console error. Fix: `editor-runtime.js` is
  served with the `async` attribute (`renderEngine.js`), which is exempt
  from that stylesheet-blocking rule. Don't remove it.
- Resize/crop use absolute `top`/`left`/`width`/`height`, never
  `transform: translate`, because CSS ignores `bottom`/`right` once
  `top`/`left` and a size are all set — this is what lets resize work
  regardless of which edge a template originally anchored a slot from.
- `<img>` elements are natively draggable; without
  `e.preventDefault()` on `dragstart`, a resize/crop drag over an image
  gets hijacked into HTML5 drag-and-drop after the first few pixels.
- Playwright clicks through the app's `transform: scale()`'d iframe are
  flaky as a test-tooling artifact, not a product bug — when verifying a
  fix, prefer dispatching `PointerEvent`s directly inside the iframe's own
  context (`frame.evaluate`) or navigating straight to
  `/api/render/<pageId>/<slideId>?mode=editor` instead of clicking through
  the scaled parent page.
- Clicking a toolbar button outside the iframe blurs whatever's
  `contenteditable` inside it, which collapses the text selection — so a
  color swatch that's meant to act on a highlighted word (not the whole
  block) must call `e.preventDefault()` in `onMouseDown` (not `onClick`) to
  stop the browser's default focus-steal before it happens. `onClick` still
  fires normally afterward.
- In cheerio/htmlparser2, `<script>` and `<style>` nodes get their own
  `node.type` (`'script'`/`'style'`), not the generic `'tag'` — a sanitizer
  that walks the tree checking `node.type !== 'tag'` to skip non-elements
  will silently let scripts through untouched. Check for those two types
  explicitly and remove them outright (`renderEngine.js`'s
  `sanitizeInlineHtml`).

## Conventions

- No font-family control, ever — explicitly out of scope per the user.
- Images/videos are resizable + replaceable but never freely draggable
  (keeps layouts from drifting slide to slide); text is draggable.
- Never sacrifice export quality — ffmpeg is run at `crf 16`, `preset slow`.
