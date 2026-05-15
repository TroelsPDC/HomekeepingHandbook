/**
 * Audio infrastructure for The Essential Guide
 *
 * Supports:
 *  - Per-chapter ambient audio (place files in /assets/audio/ named by chapter slug)
 *  - Author annotation sounds (optional)
 *  - Play/pause toggle button
 *
 * HOW TO ADD SOUNDS:
 *  1. Place .mp3 files in /assets/audio/
 *  2. Name them to match chapter slugs, e.g.:
 *       - ambient-chapter.mp3       (default ambient for all chapters)
 *       - pest-control.mp3          (chapter-specific ambient)
 *       - annotation-peasant.mp3    (sound when peasant annotation appears)
 *       - annotation-peon.mp3
 *       - annotation-acolyte.mp3
 *       - annotation-wisp.mp3
 *  3. The script auto-detects and plays them. No code changes needed.
 */

(function () {
  'use strict';

  // ---- Determine base URL from the <script> tag or a known path ----
  var scripts = document.querySelectorAll('script[src*="audio.js"]');
  var baseUrl = '';
  if (scripts.length) {
    // e.g. /HomekeepingHandbook/assets/js/audio.js -> /HomekeepingHandbook
    baseUrl = scripts[0].src.replace(/\/assets\/js\/audio\.js.*$/, '');
  }

  // ---- Colorize annotation blockquotes ----
  document.querySelectorAll('blockquote').forEach(function (bq) {
    var text = bq.textContent.toLowerCase();
    if (text.indexOf('peasant annotation') !== -1) {
      bq.classList.add('annotation-peasant');
    } else if (text.indexOf('peon annotation') !== -1) {
      bq.classList.add('annotation-peon');
    } else if (text.indexOf('acolyte annotation') !== -1) {
      bq.classList.add('annotation-acolyte');
    } else if (text.indexOf('wisp annotation') !== -1) {
      bq.classList.add('annotation-wisp');
    }
  });

  // ---- Audio player ----
  var audioBtn = document.createElement('button');
  audioBtn.className = 'audio-toggle hidden';
  audioBtn.setAttribute('aria-label', 'Toggle ambient audio');
  audioBtn.textContent = '🔇';
  document.body.appendChild(audioBtn);

  var audio = null;
  var isPlaying = false;

  // Try to find an audio file for this page
  var slug = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .pop();

  var audioSources = [];
  if (slug && slug !== '' && slug !== 'HomekeepingHandbook') {
    audioSources.push(baseUrl + '/assets/audio/' + slug + '.mp3');
  }
  audioSources.push(baseUrl + '/assets/audio/ambient-chapter.mp3');

  function tryLoadAudio(sources, index) {
    if (index >= sources.length) return; // no audio available

    var testAudio = new Audio();
    testAudio.preload = 'metadata';
    var settled = false;

    function cleanup() {
      testAudio.removeEventListener('canplay', onPlayable);
      testAudio.removeEventListener('canplaythrough', onPlayable);
      testAudio.removeEventListener('loadedmetadata', onPlayable);
      testAudio.removeEventListener('error', onError);
    }

    function onPlayable() {
      if (settled) return;
      settled = true;
      cleanup();
      audio = testAudio;
      audio.loop = true;
      audio.volume = 0.3;
      audioBtn.classList.remove('hidden');
    }

    function onError() {
      if (settled) return;
      settled = true;
      cleanup();
      tryLoadAudio(sources, index + 1);
    }

    testAudio.addEventListener('canplay', onPlayable);
    testAudio.addEventListener('canplaythrough', onPlayable);
    testAudio.addEventListener('loadedmetadata', onPlayable);
    testAudio.addEventListener('error', onError);

    testAudio.src = sources[index];
    testAudio.load();
  }

  tryLoadAudio(audioSources, 0);

  audioBtn.addEventListener('click', function () {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      audioBtn.textContent = '🔇';
    } else {
      audio.play().catch(function () { /* browser blocked autoplay */ });
      audioBtn.textContent = '🔊';
    }
    isPlaying = !isPlaying;
  });
})();
