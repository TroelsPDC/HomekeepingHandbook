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
  var swipeStartX = null;
  var swipeStartY = null;
  var swipeThreshold = 40;

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
    nav.innerHTML = '';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn page-btn-next';
    nextBtn.innerHTML = 'Next &#8594;';
    nextBtn.disabled = currentIndex !== 0;
    nextBtn.setAttribute('aria-label', 'Go to table of contents');
    nextBtn.addEventListener('click', function () { goTo(1); });
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

  function handleSwipeEnd(endX, endY) {
    var deltaX;
    var deltaY;
    var absX;
    var absY;

    if (swipeStartX === null || swipeStartY === null || isAnimating) return;

    deltaX = endX - swipeStartX;
    deltaY = endY - swipeStartY;
    absX = Math.abs(deltaX);
    absY = Math.abs(deltaY);

    // Cover -> TOC: swipe right-to-left OR top-to-down.
    if (currentIndex === 0) {
      if (absX > absY && deltaX <= -swipeThreshold) {
        goTo(1);
      } else if (absY > absX && deltaY >= swipeThreshold) {
        goTo(1);
      }
    }

    // TOC -> Cover: only swipe bottom-to-up.
    if (currentIndex === 1 && absY > absX && deltaY <= -swipeThreshold) {
      goTo(0);
    }
  }

  stage.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length === 0) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    handleSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    swipeStartX = null;
    swipeStartY = null;
  }, { passive: true });

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

  // The cover image loads asynchronously.  Until it loads the page has no
  // natural height, so the stack height cannot be measured correctly on the
  // first syncPages() call above.  Re-run layout as soon as the image is
  // ready (or errors out) so the stack is sized to the image height.
  var coverImg = stage.querySelector('.home-cover-image');
  if (coverImg && (!coverImg.complete || coverImg.naturalHeight === 0)) {
    function onCoverImageReady() {
      coverImg.removeEventListener('load', onCoverImageReady);
      coverImg.removeEventListener('error', onCoverImageReady);
      refreshLayout();
    }
    coverImg.addEventListener('load', onCoverImageReady);
    coverImg.addEventListener('error', onCoverImageReady);
  }
}());
