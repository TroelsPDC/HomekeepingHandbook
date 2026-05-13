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

function prevBtn() {
  return document.querySelector('.page-btn-prev');
}

function dots() {
  return Array.from(document.querySelectorAll('.page-dot'));
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

test('Prev button is disabled on the first page', () => {
  expect(prevBtn().disabled).toBe(true);
});

test('Next button is enabled on the first page', () => {
  expect(nextBtn().disabled).toBe(false);
});

test('two dot indicators are rendered', () => {
  expect(dots()).toHaveLength(2);
});

test('first dot is active on the cover page', () => {
  expect(dots()[0].classList.contains('active')).toBe(true);
  expect(dots()[1].classList.contains('active')).toBe(false);
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

test('Prev button becomes enabled after clicking Next', () => {
  nextBtn().click();
  expect(prevBtn().disabled).toBe(false);
});

test('Next button becomes disabled when on the last page', () => {
  nextBtn().click();
  expect(nextBtn().disabled).toBe(true);
});

test('second dot is active after clicking Next', () => {
  nextBtn().click();
  expect(dots()[1].classList.contains('active')).toBe(true);
  expect(dots()[0].classList.contains('active')).toBe(false);
});

// ── Clicking Prev (TOC → cover) ──────────────────────────────────────────────

test('clicking Prev returns to the cover page', () => {
  nextBtn().click();
  prevBtn().click();
  expect(page(0).dataset.state).toBe('current');
});

test('clicking Prev sets TOC page state to after', () => {
  nextBtn().click();
  prevBtn().click();
  expect(page(1).dataset.state).toBe('after');
});

test('Prev button is disabled again after returning to cover', () => {
  nextBtn().click();
  prevBtn().click();
  expect(prevBtn().disabled).toBe(true);
});

// ── Dot navigation ───────────────────────────────────────────────────────────

test('clicking second dot navigates to the TOC page', () => {
  dots()[1].click();
  expect(page(1).dataset.state).toBe('current');
});

test('clicking first dot returns to the cover page', () => {
  dots()[1].click();
  dots()[0].click();
  expect(page(0).dataset.state).toBe('current');
});

// ── Keyboard navigation ──────────────────────────────────────────────────────

test('ArrowRight advances to the TOC page', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(page(1).dataset.state).toBe('current');
});

test('ArrowLeft returns to the cover page', () => {
  nextBtn().click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  expect(page(0).dataset.state).toBe('current');
});

test('ArrowLeft on the first page does nothing', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  expect(page(0).dataset.state).toBe('current');
});

test('ArrowRight on the last page does nothing', () => {
  nextBtn().click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
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
