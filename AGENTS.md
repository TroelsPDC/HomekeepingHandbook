# Agent Editing Guide

This repository has two chapter locations with different purposes:

- `/_chapters/*.md` → **source of truth for the Jekyll site**
- `/book/chapter_*.md` → reference/editorial source files (not built)

## Rules to avoid repeated mistakes

1. When changing website chapter content, edit `/_chapters/*.md` only.
2. Do not treat `/book/chapter_*.md` as the live website source.
3. Keep chapter ordering in `/_chapters` via front matter `order`.
4. Keep homepage chapter links in `/index.md` aligned with `/_chapters`.
5. Chapter pagination relies on `/assets/js/pages.js` and must stay loaded in `/_layouts/chapter.html`.
6. Homepage cover/TOC flipbook relies on `/assets/js/home-flipbook.js` and should stay limited to homepage layout usage.

## Before finishing any chapter/navigation change

- Verify chapter prev/next links still work.
- Verify chapter page-turning still works.
- Verify homepage cover → TOC flip still works.
- Run the repository tests (`npm test`).
