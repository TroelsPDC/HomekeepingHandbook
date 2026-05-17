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

  // Resolve base URL from this script's src (e.g. /HomekeepingHandbook)
  var pageScripts = document.querySelectorAll('script[src*="pages.js"]');
  var baseUrl = pageScripts.length ? pageScripts[0].src.replace(/\/assets\/js\/pages\.js.*$/, '') : '';

  // Map author CSS class suffix to GIF filenames
  var gifMap = {
    'peasant': {
      idle: baseUrl + '/assets/peasantIddle.gif',
      talking: baseUrl + '/assets/peasantTalking.gif'
    },
    'peon': {
      idle: baseUrl + '/assets/peonIddle.gif',
      talking: baseUrl + '/assets/peonTalking.gif'
    },
    'acolyte': {
      idle: baseUrl + '/assets/AcolyteIddle.gif',
      talking: baseUrl + '/assets/AcolyteTalking.gif'
    },
    'wisp': {
      idle: baseUrl + '/assets/wisp.gif',
      talking: baseUrl + '/assets/wisp.gif'
    }
  };

  // Create the character GIF element
  var charGif = document.createElement('img');
  charGif.className = 'character-gif hidden';
  charGif.setAttribute('alt', '');
  charGif.setAttribute('role', 'button');
  charGif.setAttribute('tabindex', '0');
  charGif.setAttribute('aria-label', 'Click to play sound');
  charGif.setAttribute('aria-pressed', 'false');
  document.body.appendChild(charGif);

  var chapterAudio = document.createElement('audio');
  chapterAudio.className = 'avatar-audio-controls hidden';
  chapterAudio.setAttribute('controls', '');
  chapterAudio.setAttribute('aria-label', 'Character chapter audio player');
  chapterAudio.preload = 'metadata';
  document.body.appendChild(chapterAudio);

  var BASE_GIF_SIZE = 80;
  var MOBILE_GIF_SIZE = BASE_GIF_SIZE * 2;
  var MOBILE_BREAKPOINT = 600;
  var DESKTOP_RIGHT_PADDING = 16;
  var mobileQuery = window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)');
  var resizeFrame = null;
  var activeCharacter = null;
  var isTalking = false;
  var currentAudioCharacter = null;
  var isResolvingAudio = false;
  var chapterSlug = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';
  var audioSourceCache = {};
  var AUTOPLAY_STORAGE_KEY = 'hh-autoplay-book';
  // Let the page switch complete before chaining autoplay to the next item.
  var AUTOPLAY_ADVANCE_DELAY_MS = 250;
  var autoplayEnabled = false;
  var audioDirByCharacter = {
    peasant: 'Peasant',
    peon: 'Peon',
    acolyte: 'Acolyte',
    wisp: 'Wisp'
  };
  var chapterAudioOverrides = {
    peasant: {
      'ancestor-shrines': 'Ancestor-Shrine',
      'fungus-cultivation': 'Fungus-cultivator',
      'banner-placement': 'Banner-placemennt',
      'scourge-contamination': 'Source-contamination'
    },
    peon: {
      'ancestor-shrines': 'Anscestor-shrines',
      'moonwell-etiquette': 'Moonwell-etiquet'
    },
    acolyte: {
      'scourge-contamination': 'Source-contamination'
    }
  };

  function readAutoplayPreference() {
    var searchParams = new URLSearchParams(window.location.search || '');
    var hasQueryPreference = searchParams.has('autoplay');
    if (hasQueryPreference) {
      var fromQuery = searchParams.get('autoplay');
      autoplayEnabled = fromQuery === '1' || fromQuery === 'true';
      try {
        if (autoplayEnabled) {
          window.sessionStorage.setItem(AUTOPLAY_STORAGE_KEY, '1');
        } else {
          window.sessionStorage.removeItem(AUTOPLAY_STORAGE_KEY);
        }
      } catch (e) {}
      return;
    }

    try {
      autoplayEnabled = window.sessionStorage.getItem(AUTOPLAY_STORAGE_KEY) === '1';
    } catch (e) {
      autoplayEnabled = false;
    }
  }

  readAutoplayPreference();

  function autoplayUrlForChapter(rawUrl) {
    var nextUrl = new URL(rawUrl, window.location.origin);
    nextUrl.searchParams.set('autoplay', '1');
    return nextUrl.toString();
  }

  function goToNextChapter() {
    var nextChapterLink = document.querySelector('.chapter-nav .nav-next');
    if (!nextChapterLink || !nextChapterLink.href) {
      autoplayEnabled = false;
      try {
        window.sessionStorage.removeItem(AUTOPLAY_STORAGE_KEY);
      } catch (e) {}
      return;
    }
    window.location.assign(autoplayUrlForChapter(nextChapterLink.href));
  }

  function queueAutoplayAdvance() {
    if (!autoplayEnabled) return;
    window.setTimeout(function () {
      advanceAutoplay();
    }, AUTOPLAY_ADVANCE_DELAY_MS);
  }

  function stopChapterAudio(hideControls) {
    if (!chapterAudio.paused) chapterAudio.pause();
    chapterAudio.currentTime = 0;
    if (hideControls) {
      chapterAudio.classList.add('hidden');
      currentAudioCharacter = null;
    }
    isTalking = false;
    if (activeCharacter) renderGif(activeCharacter, false);
  }

  function chapterAudioNameFromSlug(slug) {
    if (!slug) return '';
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  function audioCandidatesForCharacter(character) {
    var dirName = audioDirByCharacter[character];
    if (!dirName || !chapterSlug) return [];
    var prefix = dirName;
    var overrideMap = chapterAudioOverrides[character] || {};
    var overriddenName = overrideMap[chapterSlug];
    var defaultName = chapterAudioNameFromSlug(chapterSlug);
    var names = [];
    if (overriddenName) names.push(overriddenName);
    if (defaultName) names.push(defaultName);
    return names.map(function (name) {
      return baseUrl + '/assets/audio/' + dirName + '/' + prefix + name + '.mp3';
    });
  }

  function resolvePlayableAudio(candidates, callback, index) {
    var position = typeof index === 'number' ? index : 0;
    if (position >= candidates.length) {
      callback(null);
      return;
    }

    var probeAudio = new Audio();
    probeAudio.preload = 'metadata';
    var settled = false;
    var listenersBound = false;

    function cleanupProbe() {
      if (listenersBound) {
      probeAudio.removeEventListener('canplay', onPlayable);
      probeAudio.removeEventListener('canplaythrough', onPlayable);
      probeAudio.removeEventListener('loadedmetadata', onPlayable);
      probeAudio.removeEventListener('error', onError);
      listenersBound = false;
      }
      probeAudio.pause();
      probeAudio.removeAttribute('src');
      probeAudio.load();
    }

    function onPlayable() {
      if (settled) return;
      settled = true;
      cleanupProbe();
      callback(candidates[position]);
    }

    function onError() {
      if (settled) return;
      settled = true;
      cleanupProbe();
      resolvePlayableAudio(candidates, callback, position + 1);
    }

    probeAudio.addEventListener('canplay', onPlayable);
    probeAudio.addEventListener('canplaythrough', onPlayable);
    probeAudio.addEventListener('loadedmetadata', onPlayable);
    probeAudio.addEventListener('error', onError);
    listenersBound = true;
    probeAudio.src = candidates[position];
    probeAudio.load();
  }

  function playCharacterAudio(character, options) {
    var opts = options || {};
    if (!character || isResolvingAudio) return;

    function requestPlayback() {
      var playRequest = chapterAudio.play();
      if (playRequest && typeof playRequest.catch === 'function') {
        playRequest.catch(function () {
          if (!opts.autoplayRequested) return;
          autoplayEnabled = false;
          try {
            window.sessionStorage.removeItem(AUTOPLAY_STORAGE_KEY);
          } catch (e) {}
        });
      }
    }

    if (currentAudioCharacter === character && chapterAudio.classList.contains('hidden') === false) {
      requestPlayback();
      return;
    }

    var cachedSource = audioSourceCache[character];
    if (typeof cachedSource === 'string') {
      if (chapterAudio.src !== cachedSource) {
        chapterAudio.src = cachedSource;
      }
      chapterAudio.classList.remove('hidden');
      currentAudioCharacter = character;
      requestPlayback();
      return;
    }

    if (cachedSource === null) {
      if (opts.autoplayAdvanceOnMissing) queueAutoplayAdvance();
      return;
    }

    var candidates = audioCandidatesForCharacter(character);
    if (!candidates.length) {
      audioSourceCache[character] = null;
      if (opts.autoplayAdvanceOnMissing) queueAutoplayAdvance();
      return;
    }

    isResolvingAudio = true;
    resolvePlayableAudio(candidates, function (resolvedSrc) {
      isResolvingAudio = false;
      audioSourceCache[character] = resolvedSrc;
      if (!resolvedSrc) {
        if (opts.autoplayAdvanceOnMissing) queueAutoplayAdvance();
        return;
      }
      chapterAudio.src = resolvedSrc;
      chapterAudio.classList.remove('hidden');
      currentAudioCharacter = character;
      requestPlayback();
    });
  }

  function sizeCharacterGif() {
    var isPhone = mobileQuery.matches;
    if (isPhone) {
      charGif.style.width = MOBILE_GIF_SIZE + 'px';
      charGif.style.right = '1rem';
      return;
    }

    var content = document.querySelector('.chapter-content') || document.body;
    var rect = content.getBoundingClientRect();
    var gutterRight = Math.max(0, window.innerWidth - rect.right);
    var maxWithoutOverlay = Math.max(0, gutterRight - DESKTOP_RIGHT_PADDING);
    var size = Math.max(BASE_GIF_SIZE, Math.floor(maxWithoutOverlay));

    charGif.style.width = size + 'px';
    charGif.style.right = DESKTOP_RIGHT_PADDING + 'px';
  }

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

  // Map author name fragments to CSS class suffixes
  var authorClasses = [
    { match: 'Morgum',   cls: 'peon'    },
    { match: 'Theodore', cls: 'peasant' },
    { match: 'Vorun',    cls: 'acolyte' },
    { match: 'Wisps',    cls: 'wisp'   },
  ];

  function authorClassForNodes(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'H2') {
        var text = n.textContent || '';
        for (var j = 0; j < authorClasses.length; j++) {
          if (text.indexOf(authorClasses[j].match) !== -1) {
            return 'page-author-' + authorClasses[j].cls;
          }
        }
      }
    }
    return '';
  }

  // Wrap each author group in a page <div>
  var pages = authorGroups.map(function (nodes, i) {
    var div = document.createElement('div');
    div.className = 'chapter-page';

    // Detect author from the first h2 in this group and apply a style class
    var authorClass = '';
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      var node = nodes[nodeIndex];
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H2') {
        var headingText = node.textContent.toLowerCase();
        if (headingText.indexOf('furlbrow') !== -1 || headingText.indexOf('master mason') !== -1) {
          authorClass = 'page-peasant';
        } else if (headingText.indexOf('soothumb') !== -1 || headingText.indexOf('senior peon') !== -1) {
          authorClass = 'page-peon';
        } else if (headingText.indexOf('vorun') !== -1 || headingText.indexOf('acolyte') !== -1) {
          authorClass = 'page-acolyte';
        } else if (headingText.indexOf('wisp') !== -1) {
          authorClass = 'page-wisp';
        }
        break;
      }
    }
    var authorCls = authorClassForNodes(nodes);
    div.className = 'chapter-page'
      + (authorClass ? ' ' + authorClass : '')
      + (authorCls ? ' ' + authorCls : '');
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
    var hasNextChapter = !!document.querySelector('.chapter-nav .nav-next');

    var prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn page-btn-prev';
    prevBtn.innerHTML = '&#8592; Prev Author';
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
    var atLastAuthor = currentIndex === total - 1;
    nextBtn.innerHTML = atLastAuthor && hasNextChapter ? 'Next Chapter &#8594;' : 'Next Author &#8594;';
    nextBtn.disabled = atLastAuthor && !hasNextChapter;
    nextBtn.setAttribute('aria-label', atLastAuthor && hasNextChapter ? 'Next chapter' : 'Next author');
    nextBtn.addEventListener('click', function () {
      if (!atLastAuthor) {
        goTo(currentIndex + 1);
        return;
      }
      goToNextChapter();
    });

    nav.appendChild(prevBtn);
    nav.appendChild(dots);
    nav.appendChild(nextBtn);
  }

  function authorKeyForPage(page) {
    var classes = page.className.split(' ');
    for (var i = 0; i < classes.length; i++) {
      var match = classes[i].match(/^page-author-(\w+)$/);
      if (match && gifMap[match[1]]) {
        return match[1];
      }
    }
    return null;
  }

  function renderGif(character, talking) {
    var animation = gifMap[character];
    if (!animation) return;

    var nextSrc = talking ? animation.talking : animation.idle;
    charGif.src = nextSrc + '?t=' + Date.now();
    charGif.setAttribute('aria-pressed', talking ? 'true' : 'false');
  }

  function updateGif(index) {
    var page = pages[index];
    var character = authorKeyForPage(page);
    if (character) {
      activeCharacter = character;
      isTalking = false;
      renderGif(character, isTalking);
      charGif.classList.remove('hidden');
      sizeCharacterGif();
    } else {
      activeCharacter = null;
      isTalking = false;
      charGif.removeAttribute('src');
      charGif.setAttribute('aria-pressed', 'false');
      charGif.classList.add('hidden');
    }
  }

  function toggleGif() {
    if (!activeCharacter) return;

    if (currentAudioCharacter === activeCharacter && !chapterAudio.classList.contains('hidden')) {
      stopChapterAudio(true);
      return;
    }

    playCharacterAudio(activeCharacter);
  }

  function advanceAutoplay() {
    if (!autoplayEnabled) return;
    if (currentIndex < pages.length - 1) {
      goTo(currentIndex + 1, { autoplayNarration: true });
      return;
    }
    goToNextChapter();
  }

  function updateBodyBackground(index) {
    var body = document.body;
    var bodyClasses = [
      'chapter-author-peasant',
      'chapter-author-peon',
      'chapter-author-acolyte',
      'chapter-author-wisp'
    ];
    bodyClasses.forEach(function (cls) {
      body.classList.remove(cls);
    });

    var page = pages[index];
    var classes = page.className.split(' ');
    for (var i = 0; i < classes.length; i++) {
      var match = classes[i].match(/^page-author-(\w+)$/);
      if (match) {
        body.classList.add('chapter-author-' + match[1]);
        break;
      }
    }
  }

  function goTo(index, options) {
    var opts = options || {};
    if (index < 0 || index >= pages.length) return;
    stopChapterAudio(true);
    pages[currentIndex].hidden = true;
    pages[currentIndex].setAttribute('aria-hidden', 'true');
    currentIndex = index;
    pages[currentIndex].hidden = false;
    pages[currentIndex].setAttribute('aria-hidden', 'false');
    updateBodyBackground(currentIndex);
    updateGif(currentIndex);
    article.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    });
    render();
    if (opts.autoplayNarration && activeCharacter) {
      playCharacterAudio(activeCharacter, {
        autoplayAdvanceOnMissing: true,
        autoplayRequested: true
      });
    }
  }

  // Arrow-key navigation (only when not focused on a text input)
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  charGif.addEventListener('click', toggleGif);
  charGif.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleGif();
  });

  chapterAudio.addEventListener('play', function () {
    if (!activeCharacter || activeCharacter !== currentAudioCharacter) return;
    isTalking = true;
    renderGif(activeCharacter, true);
  });

  chapterAudio.addEventListener('pause', function () {
    if (!activeCharacter || activeCharacter !== currentAudioCharacter) return;
    isTalking = false;
    renderGif(activeCharacter, false);
  });

  chapterAudio.addEventListener('ended', function () {
    if (!activeCharacter || activeCharacter !== currentAudioCharacter) return;
    isTalking = false;
    renderGif(activeCharacter, false);
    if (autoplayEnabled) advanceAutoplay();
  });

  render();
  updateBodyBackground(0);
  updateGif(0);
  sizeCharacterGif();
  if (autoplayEnabled && activeCharacter) {
    playCharacterAudio(activeCharacter, {
      autoplayAdvanceOnMissing: true,
      autoplayRequested: true
    });
  }
  window.addEventListener('resize', function () {
    if (resizeFrame !== null) return;
    resizeFrame = window.requestAnimationFrame(function () {
      resizeFrame = null;
      sizeCharacterGif();
    });
  });
}());
