Bloom — Social & media assets
=============================

This folder contains logo and intro animation assets exported for social media and marketing use.

--- LOGO ---

Original logo source:
  frontend/src/components/LotusLogo.js
  (Inline SVG, viewBox 0 0 120 120, React component.)

Exported successfully:
  logo-transparent.png   — High-resolution (1080px) transparent background
  logo-white.png        — White logo for dark backgrounds (1080px)
  logo-dark.png         — Dark (#2F3441) logo for light backgrounds (1080px)
  logo-square.png       — 1080×1080 transparent, for profile images
  logo-story.png        — 1080×1920 transparent, logo centered (story/reel cover)

Source SVGs (for editing or re-export):
  logo-source-transparent.svg
  logo-source-white.svg
  logo-source-dark.svg

To regenerate PNGs from the SVGs, run from project root:
  node Bloom/social-site/export-logos.js
  (Requires Node.js; script will install "sharp" if missing.)

--- INTRO ANIMATION ---

Original intro source:
  frontend/src/components/LotusIntro.jsx  — React component (full-screen overlay, lotus + "Bloom" text)
  frontend/src/index.css                 — Keyframes: petalBloom, introFadeOut, introWordFade

Implementation: React + CSS keyframes. Shown once per session (sessionStorage 'bloom_intro_shown'). Not a video file.

Exported:
  Intro was NOT exported as a real MP4 file. The app does not ship or generate bloom-intro.mp4.

Source copy saved here (for reference or to record manually):
  intro-source/LotusIntro.jsx   — Component source
  intro-source/intro-keyframes.css — Keyframes used by the intro

How to get bloom-intro.mp4:
  - Option A: Run the web app, clear sessionStorage for the site, reload to show the intro, then record the screen (e.g. OBS, browser DevTools record, or OS screen capture) and export as MP4.
  - Option B: Use a headless browser (e.g. Playwright or Puppeteer) to open the app, trigger the intro (e.g. clear storage and reload), and record the viewport to video. No such script is included in this repo.

--- SUMMARY ---

  Exported successfully: logo PNGs (5) and logo SVG sources (3), intro source copy (2 files).
  Not exported: bloom-intro.mp4 (intro is code-only; use screen capture or a custom recording pipeline to create MP4).
