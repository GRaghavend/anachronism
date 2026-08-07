# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Y2K/retro (Windows 98 / early-web) styled personal portfolio site. Pure static HTML/CSS/vanilla JS — no build step, no bundler, no package manager, no test framework. Two HTML entry points share the same look and JS conventions:

- `index.html` — the SPA shell (banner, nav, footer, social links). "Home", "About Me", and "Projects" are all sections swapped into `#main-content-area` via JS, no page reload. The "Arcade" nav button is different: it doesn't swap `#main-content-area` — see "The Arcade game" below.
- `archives.html` — a separate standalone page (its own `<html>` document), linked to from the home page's "Archives →" button. Has no nav bar of its own; only a "← Home" link, since it's not part of the SPA shell.

## Running locally

There's no dev server or CLI tooling in this repo. `fetch()` calls (used to load the Markdown content files) are blocked by CORS when a page is opened directly via `file://`, so serve the directory over HTTP, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/index.html`. There is no lint, build, or test command — verify changes by loading the page in a browser.

## Folder layout

```
index.html, archives.html   entry points (root only has these two HTML files)
css/                         see "Styling" below
js/                          see "Architecture" below
contents/                    Markdown content, see "Architecture" below
assets/                      images/video referenced by index.html/about.js/projects.js/archives.css
dino-game/                   the Arcade game, see "The Arcade game" below
```

## Architecture: content-driven sections

`js/about.js` and `js/projects.js` follow the same pattern as `js/archives.js`:

1. A nav button click (or, for archives, direct page load) injects a static HTML "skeleton" for that section into the DOM.
2. The skeleton is then populated asynchronously by `fetch()`-ing a Markdown file from `contents/` and parsing it with a hand-rolled parser (no Markdown library).
3. The number of rendered items (project cards, about sections, sticky notes) is never hardcoded — it's however many blocks the parser finds.

Content files and their consumers:
- `contents/me.md` → parsed by `parseHeadingSections()` in `js/about.js` (`## Heading` + paragraph blocks) → About Me box.
- `contents/projs.md` → parsed by `parseProjectSections()` in `js/projects.js` (`## Title` + optional `-flag` lines + summary + `Link:`) → Projects grid, **and** reused by `js/script.js`'s `initCurrentProjectWidget()` on the homepage to find whichever project is flagged `-curr`.
- `contents/archives.md` → parsed by `parseDiscoveries()` in `js/archives.js` → sticky notes on `archives.html`.

**Project entry flags** (in `projs.md`, one `-flag` per line under the heading): `-curr` marks the project shown in the homepage "Current Project" widget; `-research` / `-corporate` (or `-corp`) set the card's icon category. Flag lines are always stripped from the rendered summary regardless of where they appear in the block.

Because `js/script.js` depends on `parseProjectSections` (defined in `js/projects.js`), `js/projects.js` must be loaded before `js/script.js`'s `initCurrentProjectWidget()` runs — check script order in `index.html` if the homepage widget stops populating.

## The Arcade game

Clicking "Arcade" in the nav only works from the Home view. `initArcadeNav()` in `js/script.js` looks up `#dino-box-container` (present only in the default Home markup, below the three boxes) and, if found, builds a fourth Win98 window into it — `dino.exe`, with a **green** titlebar (`.dino-panel-titlebar` in `css/home.css`) instead of the site's usual blue, so it reads as visually distinct — embedding `dino-game/index.html` via `<iframe>`. Closing that window's ✕ removes it, restoring the original three boxes.

If `#dino-box-container` isn't found (i.e. the visitor is on About Me or Projects, since those replace `#main-content-area`'s contents), `initArcadeNav()` shows the `#arcade-notice-backdrop` popup ("Open the Arcade from the Home page.") instead. The container is looked up fresh on every click rather than cached, since it can be destroyed and recreated as the visitor navigates.

`dino-game/` is a self-contained game (its own `index.html`/`script.js`/`style.css`/`images/`) embedded unmodified via iframe — not first-party code. It used to be its own git repository (pushed to `github.com/GRaghavend/fossilized-Dinos`); that history is preserved there, but locally it's now just a plain folder inside this repo. Its `script.js` listens for `Space` on `window` to jump, which is why `initArcadeNav()` focuses the iframe once it loads.

## Styling

`css/` is split by what a stylesheet is responsible for, not by page — most files carry a "Used in:" note at the top of the file stating which HTML page(s) load them:

- `css/base.css` — reset, `#page-wrap`, table defaults, Win95/98 bevel helpers, `.win-button`. Loaded by both `index.html` and `archives.html`.
- `css/banner.css` — the top banner. Loaded by both pages (`archives.html` reuses `.banner-table`/`.banner-cell` as a wrapper around its own look in `css/archives.css`).
- `css/nav.css` — the nav bar. `index.html` only.
- `css/window.css` — the generic Win98 "app window" chrome (`.content-panel`, `.panel-titlebar`, `.tb-btn`, `.panel-body`, etc.) reused by every panel on the homepage, the About page's music box, the Projects window, and the Arcade game/notice windows. `index.html` only.
- `css/home.css` — everything specific to the default Home view: the Notepad's video/text content, the two-column main row, and the Arcade game box + notice dialog. `index.html` only.
- `css/social.css`, `css/footer.css` — `index.html` only.
- `css/about.css`, `css/projects.css`, `css/archives.css` — per-section styles for their respective JS-driven content, loaded alongside the files above.

When adding new shared chrome, prefer extending `base.css`/`window.css` over duplicating rules in a page-specific file.

## Editing content vs. editing code

For text/project/discovery changes, prefer editing the relevant file in `contents/*.md` — the JS parsers pick up new entries automatically with no HTML/JS changes needed. Only touch `js/about.js`/`js/projects.js`/`js/archives.js` when changing *how* content renders, not the content itself.

Placeholder/config values worth knowing about:
- `js/about.js`: `YOUTUBE_VIDEO_URL` — the "what am I listening to" embed.
- `js/script.js`: `CONTACT_EMAIL` — copied to clipboard by the footer email icon.
