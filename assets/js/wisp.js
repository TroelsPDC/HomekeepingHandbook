/**
 * Wisp Translation Filter
 *
 * The Wisps speak in ambient moonlight. On page load, their text is rendered
 * as Elder Futhark runic symbols. A "Translate from Moonlight" button lets
 * the reader reveal — or re-obscure — what the Wisps actually said.
 *
 * Affects:
 *  - The ## Wisps main section in each chapter
 *  - All blockquote.annotation-wisp elements
 */

(function () {
  'use strict';

  // Elder Futhark rune map (case-insensitive substitution)
  var RUNE = {
    a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ',
    h: 'ᚺ', i: 'ᛁ', j: 'ᛃ', k: 'ᚲ', l: 'ᛚ', m: 'ᛗ', n: 'ᚾ',
    o: 'ᛟ', p: 'ᛈ', q: 'ᚦ', r: 'ᚱ', s: 'ᛊ', t: 'ᛏ', u: 'ᚢ',
    v: 'ᚠ', w: 'ᚹ', x: 'ᛉ', y: 'ᛇ', z: 'ᛉ'
  };

  function encodeChar(ch) {
    return RUNE[ch.toLowerCase()] || ch;
  }

  function encodeString(str) {
    return str.split('').map(encodeChar).join('');
  }

  // WeakMap to store original text for each text node
  var originalText = new WeakMap();

  // Walk all text nodes inside el and encode them, saving originals
  function encodeTextNodes(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    nodes.forEach(function (n) {
      originalText.set(n, n.textContent);
      n.textContent = encodeString(n.textContent);
    });
  }

  // Walk all text nodes inside el and restore saved originals
  function decodeTextNodes(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    nodes.forEach(function (n) {
      var orig = originalText.get(n);
      if (orig !== undefined) {
        n.textContent = orig;
      }
    });
  }

  // ---- Main Wisp section ----
  document.querySelectorAll('h2').forEach(function (h2) {
    if (h2.textContent.trim() !== 'Wisps') return;

    // Collect content elements between this h2 and the next <hr>
    var targets = [];
    var subtitle = null;
    var sibling = h2.nextElementSibling;
    while (sibling && sibling.tagName !== 'HR') {
      if (!subtitle && sibling.tagName === 'H3') {
        subtitle = sibling;
      } else if (sibling.tagName === 'P' || sibling.tagName === 'BLOCKQUOTE') {
        targets.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }

    if (!targets.length) return;

    // Wrap targets in a container div for styling
    var wrapper = document.createElement('div');
    wrapper.className = 'wisp-section wisp-encoded';

    var insertAfter = subtitle || h2;
    insertAfter.parentNode.insertBefore(wrapper, insertAfter.nextSibling);
    targets.forEach(function (el) {
      wrapper.appendChild(el);
    });

    // Encode text on page load
    targets.forEach(function (el) {
      encodeTextNodes(el);
    });

    // Translate button (inserted between subtitle and wrapper)
    var btn = document.createElement('button');
    btn.className = 'wisp-translate-btn';
    btn.textContent = '✦ Translate from Moonlight';
    btn.setAttribute('aria-pressed', 'false');

    var translated = false;
    btn.addEventListener('click', function () {
      translated = !translated;
      if (translated) {
        targets.forEach(function (el) { decodeTextNodes(el); });
        wrapper.classList.remove('wisp-encoded');
        wrapper.classList.add('wisp-translated');
        btn.textContent = '✦ Obscure again';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        targets.forEach(function (el) { encodeTextNodes(el); });
        wrapper.classList.remove('wisp-translated');
        wrapper.classList.add('wisp-encoded');
        btn.textContent = '✦ Translate from Moonlight';
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    insertAfter.parentNode.insertBefore(btn, wrapper);
  });

  // ---- Wisp annotation blockquotes ----
  document.querySelectorAll('blockquote.annotation-wisp').forEach(function (bq) {
    encodeTextNodes(bq);
    bq.classList.add('wisp-encoded');

    var btn = document.createElement('button');
    btn.className = 'wisp-translate-btn wisp-translate-inline';
    btn.textContent = '✦ translate';
    btn.setAttribute('aria-pressed', 'false');

    var translated = false;
    btn.addEventListener('click', function () {
      translated = !translated;
      if (translated) {
        decodeTextNodes(bq);
        bq.classList.remove('wisp-encoded');
        bq.classList.add('wisp-translated');
        btn.textContent = '✦ obscure';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        encodeTextNodes(bq);
        bq.classList.remove('wisp-translated');
        bq.classList.add('wisp-encoded');
        btn.textContent = '✦ translate';
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    bq.appendChild(btn);
  });
})();
