'use strict';

/**
 * Tests for assets/js/home-flipbook.js
 *
 * The script is an IIFE that runs immediately when evaluated.  We set up the
 * required DOM, mock matchMedia to enable prefers-reduced-motion (so all page
 * transitions are synchronous), then eval the script and assert on the
 * resulting DOM state.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../assets/js/home-flipbook.js'),
  'utf8'
);

/** Build the two-page homepage DOM used by the real index.md. */
function buildDOM() {
  document.body.innerHTML = `
    <div class="author-page-stage home-flipbook-stage" data-home-flipbook>
      <div class="author-page-stack home-flipbook-stack">
        <section class="chapter-page home-cover-page" data-state="current">
          <img src="cover.jpg" alt="cover">
        </section>
        <section class="chapter-page home-toc-page" data-state="after" aria-hidden="true">
          <h1>Table of Contents</h1>
          <p>Chapter list goes here.</p>
        </section>
      </div>
    </div>
    <nav class="author-page-nav home-flipbook-nav" aria-label="Front page navigation"></nav>
  `;
}

/** Mock matchMedia so prefers-reduced-motion: reduce always matches (= no animation timers). */
function mockReducedMotion() {
  window.matchMedia = jest.fn((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
}

function loadScript() {
  // eslint-disable-next-line no-eval
  eval(SCRIPT);
}

function page(index) {
  return document.querySelectorAll('.chapter-page')[index];
}

function nextBtn() {
  return document.querySelector('.page-btn-next');
}

function stage() {
  return document.querySelector('[data-home-flipbook]');
}

function swipe(startClientX, startClientY, endClientX, endClientY) {
  var startEvent = new Event('touchstart', { bubbles: true });
  Object.defineProperty(startEvent, 'touches', {
    value: [{ clientX: startClientX, clientY: startClientY }],
  });

  var endEvent = new Event('touchend', { bubbles: true });
  Object.defineProperty(endEvent, 'changedTouches', {
    value: [{ clientX: endClientX, clientY: endClientY }],
  });

  stage().dispatchEvent(startEvent);
  stage().dispatchEvent(endEvent);
}

beforeEach(() => {
  buildDOM();
  mockReducedMotion();
  loadScript();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Initial state ────────────────────────────────────────────────────────────

test('cover page starts as current', () => {
  expect(page(0).dataset.state).toBe('current');
});

test('TOC page starts as after (not yet visible)', () => {
  expect(page(1).dataset.state).toBe('after');
});

test('only a Next button is rendered in front-page nav', () => {
  expect(nextBtn()).not.toBeNull();
  expect(document.querySelector('.page-btn-prev')).toBeNull();
  expect(document.querySelector('.page-dots')).toBeNull();
});

test('Next button is enabled on the cover page', () => {
  expect(nextBtn().disabled).toBe(false);
});

// ── Clicking Next (cover → TOC) ──────────────────────────────────────────────

test('clicking Next advances to the TOC page', () => {
  nextBtn().click();
  expect(page(1).dataset.state).toBe('current');
});

test('clicking Next sets cover page state to before', () => {
  nextBtn().click();
  expect(page(0).dataset.state).toBe('before');
});

test('Next button becomes disabled on TOC page', () => {
  nextBtn().click();
  expect(nextBtn().disabled).toBe(true);
});

// ── Swipe navigation ─────────────────────────────────────────────────────────

test('swipe right-to-left on cover advances to TOC', () => {
  swipe(200, 100, 120, 100);
  expect(page(1).dataset.state).toBe('current');
});

test('swipe top-to-down on cover advances to TOC', () => {
  swipe(100, 100, 100, 200);
  expect(page(1).dataset.state).toBe('current');
});

test('swipe bottom-to-up on TOC returns to cover', () => {
  nextBtn().click();
  swipe(100, 200, 100, 120);
  expect(page(0).dataset.state).toBe('current');
});

test('swipe top-to-down on TOC does not return to cover', () => {
  nextBtn().click();
  swipe(100, 100, 100, 200);
  expect(page(1).dataset.state).toBe('current');
});

test('swipe left-to-right on TOC does not return to cover', () => {
  nextBtn().click();
  swipe(100, 100, 200, 100);
  expect(page(1).dataset.state).toBe('current');
});

// ── Boundary / edge cases ─────────────────────────────────────────────────────

test('TOC page is not inert when it is the current page', () => {
  nextBtn().click();
  expect(page(1).inert).toBe(false);
});

test('cover page is inert when the TOC page is current', () => {
  nextBtn().click();
  expect(page(0).inert).toBe(true);
});

test('nav aria-hidden is false for the current page', () => {
  expect(page(0).getAttribute('aria-hidden')).toBe('false');
  nextBtn().click();
  expect(page(1).getAttribute('aria-hidden')).toBe('false');
});
