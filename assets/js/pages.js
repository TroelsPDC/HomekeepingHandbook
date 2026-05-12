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
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var animationDuration = 650;
  var minStackHeight = 1;
  var cleanupTimer = null;
  var currentIndex = 0;
  var isAnimating = false;

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
    nodes.forEach(function (n) { div.appendChild(n); });
    return div;
  });

  var stage = document.createElement('div');
  stage.className = 'author-page-stage';

  var stack = document.createElement('div');
  stack.className = 'author-page-stack';
  stage.appendChild(stack);
  pages.forEach(function (div) { stack.appendChild(div); });

  // Rebuild the article: title nodes, then page stage
  article.innerHTML = '';
  titleNodes.forEach(function (n) { article.appendChild(n); });
  article.appendChild(stage);

  // Navigation bar
  var nav = document.createElement('nav');
  nav.className = 'author-page-nav';
  nav.setAttribute('aria-label', 'Author page navigation');
  article.appendChild(nav);

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

  function clearCleanupTimer() {
    if (!cleanupTimer) return;
    window.clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  function updateStageHeight(indices) {
    var height = 0;
    indices.forEach(function (index) {
      if (index < 0 || index >= pages.length) return;
      height = Math.max(height, pages[index].offsetHeight);
    });
    stack.style.height = (height || minStackHeight) + 'px';
  }

  function setPageState(page, state, active) {
    page.dataset.state = state;
    page.setAttribute('aria-hidden', active ? 'false' : 'true');
    page.inert = !active;
  }

  function syncPages() {
    pages.forEach(function (page, index) {
      var state = 'after';
      if (index < currentIndex) state = 'before';
      if (index === currentIndex) state = 'current';
      setPageState(page, state, index === currentIndex);
    });
    updateStageHeight([currentIndex]);
    isAnimating = false;
  }

  function scrollArticleIntoView() {
    article.scrollIntoView({
      behavior: reduceMotionQuery.matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function goTo(index) {
    var previousIndex = currentIndex;
    var direction;
    var currentPage;
    var targetPage;

    if (index < 0 || index >= pages.length || index === currentIndex || isAnimating) return;

    direction = index > previousIndex ? 'next' : 'prev';
    currentPage = pages[previousIndex];
    targetPage = pages[index];

    clearCleanupTimer();
    updateStageHeight([previousIndex, index]);

    if (reduceMotionQuery.matches) {
      currentIndex = index;
      syncPages();
      render();
      scrollArticleIntoView();
      return;
    }

    isAnimating = true;
    setPageState(currentPage, 'current', false);
    setPageState(targetPage, direction === 'next' ? 'after' : 'before', false);
    // Force reflow so the browser applies the setup states before the flip starts.
    // `void` makes it explicit that we intentionally discard the layout value.
    void stack.offsetHeight;

    currentPage.dataset.state = direction === 'next' ? 'leaving-next' : 'leaving-prev';
    targetPage.dataset.state = 'current';
    currentIndex = index;
    render();
    scrollArticleIntoView();

    cleanupTimer = window.setTimeout(function () {
      syncPages();
      render();
      cleanupTimer = null;
    }, animationDuration);
  }

  function refreshLayout() {
    if (isAnimating) {
      updateStageHeight([currentIndex]);
      return;
    }
    syncPages();
  }

  // Arrow-key navigation (only when not focused on a text input)
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  window.addEventListener('resize', refreshLayout);
  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', refreshLayout);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(refreshLayout);
  }
  window.addEventListener('pagehide', clearCleanupTimer);

  syncPages();
  render();
}());
