/**
 * Per-Author Page Turner
 *
 * Each chapter's author sections are separated by <hr> elements.
 * This script hides all but the first author section and provides
 * prev/next navigation and dot indicators so readers turn "pages"
 * through each author's contribution.
 *
 * The chapter title (first group before the first <hr>) stays
 * permanently visible at the top.
 */

(function () {
  'use strict';

  var article = document.querySelector('.chapter-content article');
  if (!article) return;

  // Group all child nodes by splitting on <hr> elements
  var groups = [];
  var current = [];
  Array.from(article.childNodes).forEach(function (node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'HR') {
      groups.push(current);
      current = [];
    } else {
      current.push(node);
    }
  });
  groups.push(current);

  // Drop groups that contain no meaningful content (whitespace-only text nodes)
  groups = groups.filter(function (g) {
    return g.some(function (n) {
      return n.nodeType === Node.ELEMENT_NODE ||
        (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '');
    });
  });

  // Require at least a title group plus two author groups to be worth paginating
  if (groups.length < 3) return;

  var titleNodes  = groups[0];
  var authorGroups = groups.slice(1);

  // Wrap each author group in a page <div>
  var pages = authorGroups.map(function (nodes, i) {
    var div = document.createElement('div');
    div.className = 'chapter-page';

    // Detect author from the first h2 in this group and apply a style class
    var authorClass = '';
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'H2') {
        var t = n.textContent.toLowerCase();
        if (t.indexOf('furlbrow') !== -1 || t.indexOf('master mason') !== -1) {
          authorClass = 'page-peasant';
        } else if (t.indexOf('soothumb') !== -1 || t.indexOf('senior peon') !== -1) {
          authorClass = 'page-peon';
        } else if (t.indexOf('vorun') !== -1 || t.indexOf('acolyte') !== -1) {
          authorClass = 'page-acolyte';
        } else if (t.indexOf('wisp') !== -1) {
          authorClass = 'page-wisp';
        }
        break;
      }
    }
    if (authorClass) div.classList.add(authorClass);

    div.setAttribute('aria-hidden', i > 0 ? 'true' : 'false');
    if (i > 0) div.hidden = true;
    nodes.forEach(function (n) { div.appendChild(n); });
    return div;
  });

  // Rebuild the article: title nodes, then page divs
  article.innerHTML = '';
  titleNodes.forEach(function (n) { article.appendChild(n); });
  pages.forEach(function (div) { article.appendChild(div); });

  // Navigation bar
  var nav = document.createElement('nav');
  nav.className = 'author-page-nav';
  nav.setAttribute('aria-label', 'Author page navigation');
  article.appendChild(nav);

  var currentIndex = 0;

  function render() {
    var total = pages.length;
    nav.innerHTML = '';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn page-btn-prev';
    prevBtn.innerHTML = '&#8592; Prev';
    prevBtn.disabled = currentIndex === 0;
    prevBtn.setAttribute('aria-label', 'Previous author');
    prevBtn.addEventListener('click', function () { goTo(currentIndex - 1); });

    var dots = document.createElement('span');
    dots.className = 'page-dots';
    dots.setAttribute('role', 'list');
    for (var i = 0; i < total; i++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.className = 'page-dot' + (idx === currentIndex ? ' active' : '');
        dot.setAttribute('aria-label', 'Author ' + (idx + 1) + ' of ' + total);
        dot.setAttribute('role', 'listitem');
        dot.addEventListener('click', function () { goTo(idx); });
        dots.appendChild(dot);
      }(i));
    }

    var nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn page-btn-next';
    nextBtn.innerHTML = 'Next &#8594;';
    nextBtn.disabled = currentIndex === total - 1;
    nextBtn.setAttribute('aria-label', 'Next author');
    nextBtn.addEventListener('click', function () { goTo(currentIndex + 1); });

    nav.appendChild(prevBtn);
    nav.appendChild(dots);
    nav.appendChild(nextBtn);
  }

  function goTo(index) {
    if (index < 0 || index >= pages.length) return;
    pages[currentIndex].hidden = true;
    pages[currentIndex].setAttribute('aria-hidden', 'true');
    currentIndex = index;
    pages[currentIndex].hidden = false;
    pages[currentIndex].setAttribute('aria-hidden', 'false');
    article.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    });
    render();
  }

  // Arrow-key navigation (only when not focused on a text input)
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  render();
}());
