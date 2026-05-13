'use strict';

/**
 * Tests for assets/js/pages.js
 *
 * The script is an IIFE that runs immediately when evaluated.  We set up the
 * required DOM (a .chapter-content article with author sections separated by
 * <hr> elements), mock matchMedia to enable prefers-reduced-motion (so all
 * transitions are synchronous), then eval the script and assert on the
 * resulting DOM state.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '../assets/js/pages.js'),
  'utf8'
);

/**
 * Build a chapter article DOM with a title group and the given number of
 * author sections, all separated by <hr> elements matching the real Markdown
 * output.
 */
function buildDOM(authorCount) {
  var authorSections = '';
  for (var i = 0; i < authorCount; i++) {
    authorSections += `
      <hr>
      <h2>Author ${i + 1}</h2>
      <p>Content from author ${i + 1}.</p>
    `;
  }

  document.body.innerHTML = `
    <main class="content chapter-content">
      <article>
        <h1>Chapter Title</h1>
        ${authorSections}
      </article>
    </main>
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

function pages() {
  return Array.from(document.querySelectorAll('.chapter-page'));
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

beforeAll(() => {
  // jsdom does not implement scrollIntoView; provide a no-op stub.
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── DOM construction ─────────────────────────────────────────────────────────

describe('DOM construction', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('creates one .chapter-page per author section', () => {
    expect(pages()).toHaveLength(4);
  });

  test('wraps pages in an .author-page-stack', () => {
    expect(document.querySelector('.author-page-stack')).not.toBeNull();
  });

  test('adds an .author-page-nav navigation bar', () => {
    expect(document.querySelector('.author-page-nav')).not.toBeNull();
  });

  test('chapter title h1 stays permanently visible (not inside a page)', () => {
    const h1 = document.querySelector('article > h1');
    expect(h1).not.toBeNull();
    expect(h1.closest('.chapter-page')).toBeNull();
  });
});

// ── No-op when there are fewer than 3 groups ─────────────────────────────────

describe('skips pagination for fewer than 3 groups', () => {
  test('does not create any .chapter-page with only one author section', () => {
    buildDOM(1);
    mockReducedMotion();
    loadScript();
    expect(pages()).toHaveLength(0);
  });

  test('does not create any .chapter-page with zero author sections', () => {
    buildDOM(0);
    mockReducedMotion();
    loadScript();
    expect(pages()).toHaveLength(0);
  });
});

// ── Initial state ────────────────────────────────────────────────────────────

describe('initial state (4 authors)', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('first author page is current', () => {
    expect(pages()[0].dataset.state).toBe('current');
  });

  test('remaining author pages are after', () => {
    pages().slice(1).forEach((p) => {
      expect(p.dataset.state).toBe('after');
    });
  });

  test('Prev button is disabled on the first page', () => {
    expect(prevBtn().disabled).toBe(true);
  });

  test('Next button is enabled on the first page', () => {
    expect(nextBtn().disabled).toBe(false);
  });

  test('correct number of dot indicators', () => {
    expect(dots()).toHaveLength(4);
  });

  test('first dot is active', () => {
    expect(dots()[0].classList.contains('active')).toBe(true);
  });
});

// ── Clicking Next ─────────────────────────────────────────────────────────────

describe('clicking Next', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('advances to the second author page', () => {
    nextBtn().click();
    expect(pages()[1].dataset.state).toBe('current');
  });

  test('sets the first page to before', () => {
    nextBtn().click();
    expect(pages()[0].dataset.state).toBe('before');
  });

  test('enables the Prev button', () => {
    nextBtn().click();
    expect(prevBtn().disabled).toBe(false);
  });

  test('second dot becomes active', () => {
    nextBtn().click();
    expect(dots()[1].classList.contains('active')).toBe(true);
    expect(dots()[0].classList.contains('active')).toBe(false);
  });

  test('clicking Next repeatedly walks through all pages', () => {
    var allPages = pages();
    for (var i = 1; i < allPages.length; i++) {
      nextBtn().click();
      expect(pages()[i].dataset.state).toBe('current');
    }
  });

  test('Next button is disabled when on the last page', () => {
    var allPages = pages();
    for (var i = 1; i < allPages.length; i++) {
      nextBtn().click();
    }
    expect(nextBtn().disabled).toBe(true);
  });
});

// ── Clicking Prev ─────────────────────────────────────────────────────────────

describe('clicking Prev', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
    // Navigate forward first
    nextBtn().click();
    nextBtn().click();
  });

  test('goes back one page', () => {
    prevBtn().click();
    expect(pages()[1].dataset.state).toBe('current');
  });

  test('sets previously-current page to after', () => {
    prevBtn().click();
    expect(pages()[2].dataset.state).toBe('after');
  });

  test('clicking Prev from page 2 returns to page 1 and disables Prev', () => {
    prevBtn().click();
    prevBtn().click();
    expect(pages()[0].dataset.state).toBe('current');
    expect(prevBtn().disabled).toBe(true);
  });
});

// ── Dot navigation ────────────────────────────────────────────────────────────

describe('dot navigation', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('clicking the third dot jumps to the third page', () => {
    dots()[2].click();
    expect(pages()[2].dataset.state).toBe('current');
  });

  test('clicking the last dot then first dot returns to the start', () => {
    dots()[3].click();
    dots()[0].click();
    expect(pages()[0].dataset.state).toBe('current');
  });

  test('clicked dot becomes active', () => {
    dots()[2].click();
    expect(dots()[2].classList.contains('active')).toBe(true);
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────────────

describe('keyboard navigation', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('ArrowRight advances to the next author page', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(pages()[1].dataset.state).toBe('current');
  });

  test('ArrowLeft returns to the previous page', () => {
    nextBtn().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(pages()[0].dataset.state).toBe('current');
  });

  test('ArrowLeft on the first page does nothing', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(pages()[0].dataset.state).toBe('current');
  });

  test('ArrowRight on the last page does nothing', () => {
    var allPages = pages();
    for (var i = 1; i < allPages.length; i++) {
      nextBtn().click();
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(pages()[allPages.length - 1].dataset.state).toBe('current');
  });
});

// ── Accessibility attributes ──────────────────────────────────────────────────

describe('accessibility attributes', () => {
  beforeEach(() => {
    buildDOM(4);
    mockReducedMotion();
    loadScript();
  });

  test('current page has aria-hidden="false"', () => {
    expect(pages()[0].getAttribute('aria-hidden')).toBe('false');
  });

  test('non-current pages have aria-hidden="true"', () => {
    pages().slice(1).forEach((p) => {
      expect(p.getAttribute('aria-hidden')).toBe('true');
    });
  });

  test('current page is not inert', () => {
    expect(pages()[0].inert).toBe(false);
  });

  test('non-current pages are inert', () => {
    pages().slice(1).forEach((p) => {
      expect(p.inert).toBe(true);
    });
  });

  test('after clicking Next, new current page loses inert', () => {
    nextBtn().click();
    expect(pages()[1].inert).toBe(false);
  });
});
