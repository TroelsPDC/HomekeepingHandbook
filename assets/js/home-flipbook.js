/**
 * Homepage flipbook
 *
 * Shows the cover as page 1 and requires flipping to page 2 for the TOC.
 */
(function () {
  'use strict';

  var stage = document.querySelector('[data-home-flipbook]');
  if (!stage) return;

  var stack = stage.querySelector('.home-flipbook-stack');
  var pages = Array.from(stage.querySelectorAll('.chapter-page'));
  var nav = document.querySelector('.home-flipbook-nav');
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var currentIndex = 0;
  var cleanupTimer = null;
  var animationDuration = 650;
  var isAnimating = false;
  var removeReduceMotionListener = function () {};

  if (!stack || !nav || pages.length < 2) return;

  function clearCleanupTimer() {
    if (!cleanupTimer) return;
    window.clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  function setPageState(page, state, active) {
    page.dataset.state = state;
    page.setAttribute('aria-hidden', active ? 'false' : 'true');
    page.inert = !active;
  }

  function updateStageHeight(indices) {
    var height = 0;
    indices.forEach(function (index) {
      if (index < 0 || index >= pages.length) return;
      height = Math.max(height, pages[index].offsetHeight);
    });
    stack.style.height = (height || 1) + 'px';
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

  function renderNav() {
    var total = pages.length;
    nav.innerHTML = '';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn page-btn-prev';
    prevBtn.innerHTML = '&#8592; Prev';
    prevBtn.disabled = currentIndex === 0;
    prevBtn.setAttribute('aria-label', 'Previous page');
    prevBtn.addEventListener('click', function () { goTo(currentIndex - 1); });

    var dots = document.createElement('span');
    dots.className = 'page-dots';
    dots.setAttribute('role', 'list');
    for (var i = 0; i < total; i++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.className = 'page-dot' + (idx === currentIndex ? ' active' : '');
        dot.setAttribute('aria-label', 'Page ' + (idx + 1) + ' of ' + total);
        dot.setAttribute('role', 'listitem');
        dot.addEventListener('click', function () { goTo(idx); });
        dots.appendChild(dot);
      }(i));
    }

    var nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn page-btn-next';
    nextBtn.innerHTML = 'Next &#8594;';
    nextBtn.disabled = currentIndex === total - 1;
    nextBtn.setAttribute('aria-label', 'Next page');
    nextBtn.addEventListener('click', function () { goTo(currentIndex + 1); });

    nav.appendChild(prevBtn);
    nav.appendChild(dots);
    nav.appendChild(nextBtn);
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
      renderNav();
      return;
    }

    isAnimating = true;
    setPageState(currentPage, 'current', false);
    setPageState(targetPage, direction === 'next' ? 'after' : 'before', false);
    void stack.offsetHeight;

    currentPage.dataset.state = direction === 'next' ? 'leaving-next' : 'leaving-prev';
    targetPage.dataset.state = 'current';
    currentIndex = index;
    renderNav();

    cleanupTimer = window.setTimeout(function () {
      syncPages();
      renderNav();
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

  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  window.addEventListener('resize', refreshLayout);
  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', refreshLayout);
    removeReduceMotionListener = function () {
      reduceMotionQuery.removeEventListener('change', refreshLayout);
    };
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(refreshLayout);
    removeReduceMotionListener = function () {
      reduceMotionQuery.removeListener(refreshLayout);
    };
  }
  window.addEventListener('pagehide', function () {
    clearCleanupTimer();
    removeReduceMotionListener();
  });

  syncPages();
  renderNav();
}());
