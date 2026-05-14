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

  // Map author CSS class suffix to GIF filename
  var gifMap = {
    'peasant': baseUrl + '/assets/PeasantGIF.gif',
    'peon':    baseUrl + '/assets/PeonGIF.gif',
    'acolyte': baseUrl + '/assets/AcolyteGIF.gif',
    'wisp':    baseUrl + '/assets/WispGIF.gif',
  };

  // Create the character GIF element
  var charGif = document.createElement('img');
  charGif.className = 'character-gif hidden';
  charGif.setAttribute('alt', '');
  charGif.setAttribute('aria-hidden', 'true');
  document.body.appendChild(charGif);

  function sizeCharacterGif() {
    var isPhone = window.matchMedia('(max-width: 600px)').matches;
    if (isPhone) {
      charGif.style.width = '160px';
      charGif.style.right = '1rem';
      return;
    }

    var content = document.querySelector('.chapter-content') || document.body;
    var rect = content.getBoundingClientRect();
    var gutterRight = Math.max(0, window.innerWidth - rect.right);
    var safeRightPadding = 16;
    var maxWithoutOverlay = Math.max(0, gutterRight - safeRightPadding);
    var size = Math.max(80, Math.floor(maxWithoutOverlay));

    charGif.style.width = size + 'px';
    charGif.style.right = safeRightPadding + 'px';
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

  function updateGif(index) {
    var page = pages[index];
    var gif = null;
    var classes = page.className.split(' ');
    for (var i = 0; i < classes.length; i++) {
      var match = classes[i].match(/^page-author-(\w+)$/);
      if (match && gifMap[match[1]]) {
        gif = gifMap[match[1]];
        break;
      }
    }
    if (gif) {
      // Append a timestamp to force the GIF to restart from frame 1
      charGif.src = gif + '?t=' + Date.now();
      charGif.classList.remove('hidden');
      sizeCharacterGif();
    } else {
      charGif.classList.add('hidden');
    }
  }

  function goTo(index) {
    if (index < 0 || index >= pages.length) return;
    pages[currentIndex].hidden = true;
    pages[currentIndex].setAttribute('aria-hidden', 'true');
    currentIndex = index;
    pages[currentIndex].hidden = false;
    pages[currentIndex].setAttribute('aria-hidden', 'false');
    updateGif(currentIndex);
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
  updateGif(0);
  sizeCharacterGif();
  window.addEventListener('resize', sizeCharacterGif);
}());
