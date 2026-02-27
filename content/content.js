// DefiWord — Content Script
// Selection detection, Shadow DOM tooltip, audio playback, save/dismiss

(function () {
  if (window.__wordpeekLoaded) return;
  window.__wordpeekLoaded = true;

  let shadowHost = null;
  let shadowRoot = null;
  let tooltipEl = null;
  let triggerIconEl = null;
  let currentData = null;
  let settings = { triggerMode: 'contextmenu', accent: 'uk', maxExamples: 2 };

  // Load settings
  chrome.storage.sync.get({ triggerMode: 'contextmenu', accent: 'uk', maxExamples: 2 }, (s) => {
    settings = s;
    if (settings.triggerMode === 'auto') {
      document.addEventListener('mouseup', onMouseUp);
    }
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.triggerMode) {
        // Remove old listener
        document.removeEventListener('mouseup', onMouseUp);
        settings.triggerMode = changes.triggerMode.newValue;
        if (settings.triggerMode === 'auto') {
          document.addEventListener('mouseup', onMouseUp);
        }
      }
      if (changes.accent) settings.accent = changes.accent.newValue;
      if (changes.maxExamples) settings.maxExamples = changes.maxExamples.newValue;
    }
  });

  // --- Overlay parent: use fullscreen element when in fullscreen, otherwise body ---
  function getOverlayParent() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }

  // --- Shadow DOM setup ---
  function ensureShadow() {
    const parent = getOverlayParent();
    if (shadowHost) {
      // Re-parent if needed (e.g. entering/exiting fullscreen)
      if (shadowHost.parentElement !== parent) {
        parent.appendChild(shadowHost);
      }
      return;
    }
    shadowHost = document.createElement('div');
    shadowHost.id = 'wordpeek-host';
    parent.appendChild(shadowHost);
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // Inject styles — use <link> to the web-accessible CSS file
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/content.css');
    shadowRoot.appendChild(link);
  }

  // --- Tooltip position ---
  let anchorRect = null; // set by subtitle hover or null for selection-based

  function computePosition() {
    let rect;
    if (anchorRect) {
      rect = anchorRect;
    } else {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return { top: 100, left: 100 };
      rect = sel.getRangeAt(0).getBoundingClientRect();
    }

    const tooltipWidth = 340;
    let left = rect.left;
    // Initial estimate — place below; snapTooltipPosition() refines after render
    let top = rect.bottom + 8;

    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    return { top, left };
  }

  // Reposition tooltip based on its actual rendered height
  function snapTooltipPosition() {
    if (!tooltipEl || !anchorRect) return;
    const h = tooltipEl.offsetHeight;
    const rect = anchorRect;
    let top;
    if (rect.top > h + 16) {
      // Place tooltip so its bottom edge is just above the word
      top = rect.top - h - 8;
    } else {
      top = rect.bottom + 8;
    }
    if (top < 10) top = 10;
    tooltipEl.style.top = top + 'px';
  }

  // --- Remove tooltip ---
  function removeTooltip() {
    anchorRect = null;
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (triggerIconEl) { triggerIconEl.remove(); triggerIconEl = null; }
    currentData = null;
    // Rebuild subtitle hover zones now that the tooltip is gone
    scheduleZoneRebuild();
  }

  // --- Show loading state ---
  function showLoading() {
    ensureShadow();
    const savedAnchor = anchorRect;
    removeTooltip();
    anchorRect = savedAnchor;
    const pos = computePosition();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'wordpeek-tooltip';
    tooltipEl.style.top = pos.top + 'px';
    tooltipEl.style.left = pos.left + 'px';
    tooltipEl.innerHTML = `
      <div class="wordpeek-header">
        <div class="wordpeek-header-left">
          <img class="wordpeek-book-icon" src="${chrome.runtime.getURL('content/book-icon.png')}">
          <span class="wordpeek-headword">DefiWord</span>
        </div>
        <div class="wordpeek-header-actions">
          <button class="wordpeek-btn wordpeek-close-btn" title="Close">&#10005;</button>
        </div>
      </div>
      <div class="wordpeek-loading">
        <div class="wordpeek-spinner"></div>
        Looking up&hellip;
      </div>`;
    tooltipEl.querySelector('.wordpeek-close-btn').addEventListener('click', removeTooltip);
    shadowRoot.appendChild(tooltipEl);
    snapTooltipPosition();
    makeDraggable();
  }

  // --- Show result ---
  function showResult(data) {
    if (!data) {
      // Service worker unavailable (extension reloaded, etc.)
      removeTooltip();
      return;
    }
    ensureShadow();
    // Remove existing but keep position context
    const wasVisible = !!tooltipEl;
    if (tooltipEl) tooltipEl.remove();
    if (triggerIconEl) { triggerIconEl.remove(); triggerIconEl = null; }

    currentData = data;
    const pos = computePosition();

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'wordpeek-tooltip';
    if (wasVisible) tooltipEl.style.animation = 'none'; // no flicker on replace
    tooltipEl.style.top = pos.top + 'px';
    tooltipEl.style.left = pos.left + 'px';

    if (!data.found) {
      const searchUrl = `https://dictionary.cambridge.org/search/english/?q=${encodeURIComponent(data.query || '')}`;
      let suggestionsHtml = '';
      if (data.suggestions && data.suggestions.length > 0) {
        suggestionsHtml = `
          <div class="wordpeek-suggestions">
            <div class="wordpeek-suggestions-title">Did you mean?</div>
            <div class="wordpeek-suggestions-list">
              ${data.suggestions.map(w => `<span class="wordpeek-suggestion" data-word="${escapeHtml(w)}">${escapeHtml(w)}</span>`).join('')}
            </div>
          </div>`;
      }
      tooltipEl.innerHTML = `
        <div class="wordpeek-header">
          <div class="wordpeek-header-left">
            <img class="wordpeek-book-icon" src="${chrome.runtime.getURL('content/book-icon.png')}">
            <span class="wordpeek-headword">${escapeHtml(data.query || 'Unknown')}</span>
          </div>
          <div class="wordpeek-header-actions">
            <button class="wordpeek-btn wordpeek-close-btn" title="Close">&#10005;</button>
          </div>
        </div>
        <div class="wordpeek-error">
          Word not found
          <br>
          <a class="wordpeek-error-link" href="${searchUrl}" target="_blank" rel="noopener">
            Search on Cambridge Dictionary &rarr;
          </a>
        </div>
        ${suggestionsHtml}`;
      tooltipEl.querySelector('.wordpeek-close-btn').addEventListener('click', removeTooltip);
      // Make suggestion words clickable — look up that word
      tooltipEl.querySelectorAll('.wordpeek-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          const word = btn.getAttribute('data-word');
          showLoading();
          chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word }, (result) => {
            showResult(result);
          });
        });
      });
      shadowRoot.appendChild(tooltipEl);
      snapTooltipPosition();
      makeDraggable();
      return;
    }

    // Build full tooltip
    let bodyHtml = '';
    const accentFirst = settings.accent || 'uk';
    const maxEx = settings.maxExamples || 2;

    data.entries.forEach((entry, ei) => {
      if (ei > 0) bodyHtml += '<hr class="wordpeek-divider">';
      bodyHtml += '<div class="wordpeek-entry">';

      // POS + CEFR
      if (entry.pos || entry.cefr) {
        bodyHtml += '<div class="wordpeek-meta">';
        if (entry.pos) bodyHtml += `<span class="wordpeek-pos">${escapeHtml(entry.pos)}</span>`;
        if (entry.cefr) bodyHtml += `<span class="wordpeek-cefr">${escapeHtml(entry.cefr)}</span>`;
        bodyHtml += '</div>';
      }

      // Pronunciation — preferred accent first
      const prons = accentFirst === 'us'
        ? [{ label: 'US', ipa: entry.usIPA, audio: entry.usAudio }, { label: 'UK', ipa: entry.ukIPA, audio: entry.ukAudio }]
        : [{ label: 'UK', ipa: entry.ukIPA, audio: entry.ukAudio }, { label: 'US', ipa: entry.usIPA, audio: entry.usAudio }];

      prons.forEach(p => {
        if (p.ipa) {
          bodyHtml += `<div class="wordpeek-pron-row">
            <span class="wordpeek-pron-label">${p.label}</span>
            <span class="wordpeek-ipa">${escapeHtml(p.ipa)}</span>
            ${p.audio ? `<button class="wordpeek-audio-btn" data-audio="${escapeHtml(p.audio)}" title="Play ${p.label} pronunciation">&#128266;</button>` : ''}
          </div>`;
        }
      });

      // Senses
      const showNumbers = entry.senses.length > 1;
      entry.senses.forEach((sense, si) => {
        const hidden = si > 0 ? ' wordpeek-hidden wordpeek-extra-sense' : '';
        bodyHtml += `<div class="wordpeek-sense${hidden}" data-entry="${ei}">`;
        const numBadge = showNumbers ? `<span class="wordpeek-sense-number">${si + 1}</span>` : '';
        bodyHtml += `<div class="wordpeek-definition">${numBadge}${escapeHtml(sense.definition)}</div>`;
        sense.examples.slice(0, maxEx).forEach(ex => {
          bodyHtml += `<div class="wordpeek-example">${escapeHtml(ex)}</div>`;
        });
        bodyHtml += '</div>';
      });

      if (entry.senses.length > 1) {
        bodyHtml += `<button class="wordpeek-more-toggle" data-entry="${ei}" data-expanded="false">&#9654; More definitions (${entry.senses.length - 1})</button>`;
      }

      bodyHtml += '</div>';
    });

    tooltipEl.innerHTML = `
      <div class="wordpeek-header">
        <div class="wordpeek-header-left">
          <img class="wordpeek-book-icon" src="${chrome.runtime.getURL('content/book-icon.png')}">
          <span class="wordpeek-headword">${escapeHtml(data.headword)}</span>
        </div>
        <div class="wordpeek-header-actions">
          <button class="wordpeek-btn wordpeek-save-btn" data-tooltip="Save word"><svg class="wordpeek-save-svg" viewBox="0 0 24 24"><path class="wordpeek-save-path" d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z"/></svg></button>
          <button class="wordpeek-btn wordpeek-close-btn" data-tooltip="Close">&#10005;</button>
        </div>
      </div>
      <div class="wordpeek-body">${bodyHtml}</div>`;

    // Event listeners
    tooltipEl.querySelector('.wordpeek-close-btn').addEventListener('click', removeTooltip);
    tooltipEl.querySelector('.wordpeek-save-btn').addEventListener('click', onSave);

    // Check if word is already saved and show filled bookmark
    chrome.runtime.sendMessage({ type: 'GET_SAVED_WORDS' }, (words) => {
      if (!words || !tooltipEl) return;
      const already = words.some(w => w.headword === data.headword);
      if (already) {
        const saveBtn = tooltipEl.querySelector('.wordpeek-save-btn');
        if (saveBtn) {
          saveBtn.classList.add('saved');
          saveBtn.setAttribute('data-tooltip', 'Unsave word');
        }
      }
    });

    tooltipEl.querySelectorAll('.wordpeek-audio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-audio');
        if (url) new Audio(url).play();
      });
    });

    tooltipEl.querySelectorAll('.wordpeek-more-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const entryIdx = btn.getAttribute('data-entry');
        const expanded = btn.getAttribute('data-expanded') === 'true';
        const senses = tooltipEl.querySelectorAll(`.wordpeek-extra-sense[data-entry="${entryIdx}"]`);
        senses.forEach(s => s.classList.toggle('wordpeek-hidden'));
        btn.setAttribute('data-expanded', !expanded);
        btn.innerHTML = expanded
          ? `&#9654; More definitions (${senses.length})`
          : `&#9660; Fewer definitions`;
      });
    });

    shadowRoot.appendChild(tooltipEl);
    snapTooltipPosition();
    makeDraggable();
  }

  // --- Save / unsave word ---
  function onSave() {
    if (!currentData || !currentData.found) return;
    const saveBtn = tooltipEl.querySelector('.wordpeek-save-btn');
    const isSaved = saveBtn.classList.contains('saved');

    if (isSaved) {
      // Unsave
      chrome.runtime.sendMessage({ type: 'DELETE_WORD', word: currentData.headword }, () => {
        if (saveBtn) {
          saveBtn.classList.remove('saved');
          saveBtn.setAttribute('data-tooltip', 'Save word');
        }
      });
    } else {
      // Save
      const first = currentData.entries[0] || {};
      const payload = {
        headword: currentData.headword,
        url: currentData.url,
        pos: first.pos || '',
        cefr: first.cefr || '',
        definition: first.senses[0] ? first.senses[0].definition : '',
        savedAt: Date.now()
      };
      chrome.runtime.sendMessage({ type: 'SAVE_WORD', data: payload }, () => {
        if (saveBtn) {
          saveBtn.classList.add('saved');
          saveBtn.setAttribute('data-tooltip', 'Unsave word');
        }
      });
    }
  }

  // --- Auto-popup trigger icon on text selection ---
  function onMouseUp(e) {
    // Ignore clicks inside our own UI
    if (shadowHost && shadowHost.contains(e.target)) return;

    // Small delay to let selection finalize
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';

      if (triggerIconEl) { triggerIconEl.remove(); triggerIconEl = null; }

      if (text.length > 0 && text.length < 80) {
        ensureShadow();
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        triggerIconEl = document.createElement('button');
        triggerIconEl.className = 'wordpeek-trigger-icon';
        triggerIconEl.innerHTML = `<img src="${chrome.runtime.getURL('content/book-icon.png')}" style="width:16px;height:16px;">`;
        triggerIconEl.style.top = (rect.top - 34) + 'px';
        triggerIconEl.style.left = (rect.left + rect.width / 2 - 14) + 'px';
        triggerIconEl.title = 'Look up with DefiWord';
        triggerIconEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word: text }, (result) => {
            showResult(result);
          });
          showLoading();
        });
        shadowRoot.appendChild(triggerIconEl);
      }
    }, 10);
  }

  // --- Message handlers from service worker ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SELECTION') {
      const sel = window.getSelection();
      sendResponse({ text: sel ? sel.toString().trim() : '' });
    }
    if (message.type === 'SHOW_LOADING') {
      showLoading();
    }
    if (message.type === 'SHOW_RESULT') {
      showResult(message.data);
    }
  });

  // --- Dismiss on click outside / Escape ---
  document.addEventListener('mousedown', (e) => {
    if (!tooltipEl) return;
    // Check if click is inside shadow host
    if (shadowHost && shadowHost === e.target) return;
    // If click is outside the shadow host entirely, dismiss
    if (shadowHost && !shadowHost.contains(e.target)) {
      removeTooltip();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeTooltip();
  });

  // --- Make tooltip draggable by its header ---
  function makeDraggable() {
    if (!tooltipEl) return;
    const header = tooltipEl.querySelector('.wordpeek-header');
    if (!header) return;

    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      // Ignore clicks on buttons inside header
      if (e.target.closest('.wordpeek-btn')) return;
      e.preventDefault();
      header.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(tooltipEl.style.left) || 0;
      startTop = parseInt(tooltipEl.style.top) || 0;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        tooltipEl.style.left = (startLeft + dx) + 'px';
        tooltipEl.style.top = (startTop + dy) + 'px';
      }

      function onUp() {
        header.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // --- Utility ---
  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // --- Subtitle word lookup (Netflix, YouTube, Disney+, Amazon Prime) ---
  // Strategy: use Range objects on the actual subtitle text nodes to get exact
  // word positions, then create invisible hover-target divs at those positions.
  // No DOM modification of subtitle elements, no caretRangeFromPoint.

  const SUBTITLE_SELS = [
    '.player-timedtext-text-container',
    '.player-timedtext',
    '.ytp-caption-window-container',
    '[class*="captions-text"]'
  ];
  const isVideoPlatform = /netflix\.com|youtube\.com|disneyplus\.com|primevideo\.com/i.test(location.hostname);

  let hoverZones = [];
  let activeSubContainer = null;
  let subtitleObserver = null;
  let zoneUpdatePending = false;

  function findSubContainer() {
    for (const sel of SUBTITLE_SELS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function clearHoverZones() {
    hoverZones.forEach(z => z.remove());
    hoverZones = [];
  }

  function rebuildHoverZones() {
    clearHoverZones();
    // Don't create new zones while tooltip is open — prevents re-triggering lookups
    if (tooltipEl) return;
    const container = findSubContainer();
    if (!container || !container.textContent.trim()) return;

    // Walk all text nodes inside the subtitle container
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      if (!text.trim()) continue;

      // Find each word in the text node
      const re = /[a-zA-Z'\u2019]+/g;
      let m;
      while ((m = re.exec(text))) {
        const word = m[0].replace(/^['\u2019]+|['\u2019]+$/g, '');
        if (word.length < 2) continue;

        // Use Range to get the exact pixel position of this word
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          makeWordZone(word, rect);
        }
      }
    }
  }

  function makeWordZone(word, rect) {
    const z = document.createElement('div');
    z.style.cssText =
      `position:fixed;top:${rect.top - 2}px;left:${rect.left - 2}px;` +
      `width:${rect.width + 4}px;height:${rect.height + 4}px;` +
      `z-index:2147483645;background:transparent;border-radius:3px;` +
      `cursor:pointer;transition:background 0.1s;`;

    let timer = null;

    z.addEventListener('mouseenter', () => {
      if (tooltipEl) return; // Don't start new lookup while tooltip is showing
      z.style.background = 'rgba(255,255,255,0.25)';
      timer = setTimeout(() => {
        anchorRect = rect;
        showLoading();
        chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word }, (result) => {
          anchorRect = rect;
          showResult(result);
        });
      }, 500);
    });

    z.addEventListener('mouseleave', () => {
      z.style.background = 'transparent';
      if (timer) { clearTimeout(timer); timer = null; }
    });

    // Let clicks pass through to Netflix player (pause/unpause)
    z.addEventListener('click', (e) => {
      z.style.pointerEvents = 'none';
      const below = document.elementFromPoint(e.clientX, e.clientY);
      z.style.pointerEvents = '';
      if (below && below !== z) below.click();
    });

    getOverlayParent().appendChild(z);
    hoverZones.push(z);
  }

  function scheduleZoneRebuild() {
    if (zoneUpdatePending) return;
    zoneUpdatePending = true;
    requestAnimationFrame(() => {
      zoneUpdatePending = false;
      rebuildHoverZones();
    });
  }

  if (isVideoPlatform) {
    // Poll for subtitle container (added dynamically by the video player)
    setInterval(() => {
      const c = findSubContainer();
      if (c && c !== activeSubContainer) {
        activeSubContainer = c;
        if (subtitleObserver) subtitleObserver.disconnect();
        subtitleObserver = new MutationObserver(scheduleZoneRebuild);
        subtitleObserver.observe(c, { childList: true, subtree: true, characterData: true });
        rebuildHoverZones();
      }
      // If container disappeared, clean up
      if (!c && activeSubContainer) {
        activeSubContainer = null;
        clearHoverZones();
      }
    }, 2000);
  }

  // --- Fullscreen change: re-parent shadow host & rebuild hover zones ---
  document.addEventListener('fullscreenchange', () => {
    if (shadowHost) {
      getOverlayParent().appendChild(shadowHost);
    }
    // Rebuild zones so they're inside the fullscreen element
    if (isVideoPlatform) {
      rebuildHoverZones();
    }
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (shadowHost) {
      getOverlayParent().appendChild(shadowHost);
    }
    if (isVideoPlatform) {
      rebuildHoverZones();
    }
  });

})();
