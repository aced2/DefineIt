document.addEventListener('DOMContentLoaded', () => {
  const wordList = document.getElementById('word-list');
  const emptyState = document.getElementById('empty-state');
  const clearAllBtn = document.getElementById('clear-all');
  const statusEl = document.getElementById('settings-status');

  // --- Tab switching ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
    });
  });

  // --- Words tab ---
  loadWords();

  clearAllBtn.addEventListener('click', () => {
    if (confirm('Delete all saved words?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_ALL_WORDS' }, () => loadWords());
    }
  });

  function loadWords() {
    chrome.runtime.sendMessage({ type: 'GET_SAVED_WORDS' }, (words) => {
      wordList.innerHTML = '';
      if (!words || words.length === 0) {
        emptyState.style.display = 'block';
        clearAllBtn.style.display = 'none';
        return;
      }
      emptyState.style.display = 'none';
      clearAllBtn.style.display = 'inline-block';

      words.forEach((word) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
          <div class="word-card-top">
            <div class="word-card-left">
              <span class="word-name">${escapeHtml(word.headword)}</span>
              ${word.pos ? `<span class="word-pos">${escapeHtml(word.pos)}</span>` : ''}
              ${word.cefr ? `<span class="word-cefr">${escapeHtml(word.cefr)}</span>` : ''}
            </div>
            <button class="word-delete-btn" data-word="${escapeHtml(word.headword)}" title="Delete">&#10005;</button>
          </div>
          ${word.definition ? `<div class="word-def">${escapeHtml(word.definition)}</div>` : ''}
          ${word.url ? `<a class="word-link" href="${escapeHtml(word.url)}" target="_blank">Open in Cambridge &rarr;</a>` : ''}
        `;

        const defEl = card.querySelector('.word-def');
        if (defEl) {
          card.addEventListener('click', (e) => {
            if (e.target.closest('.word-delete-btn') || e.target.closest('.word-link')) return;
            defEl.classList.toggle('expanded');
          });
        }

        card.querySelector('.word-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'DELETE_WORD', word: word.headword }, () => loadWords());
        });

        wordList.appendChild(card);
      });
    });
  }

  // --- Settings tab ---
  const defaults = { triggerMode: 'contextmenu', accent: 'uk', maxExamples: 2 };

  chrome.storage.sync.get(defaults, (settings) => {
    setRadio('triggerMode', settings.triggerMode);
    setRadio('accent', settings.accent);
    setRadio('maxExamples', String(settings.maxExamples));
  });

  document.querySelectorAll('.settings-body input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const triggerMode = getRadio('triggerMode');
      const accent = getRadio('accent');
      const maxExamples = parseInt(getRadio('maxExamples'), 10);
      chrome.storage.sync.set({ triggerMode, accent, maxExamples }, () => {
        statusEl.textContent = 'Saved';
        setTimeout(() => { statusEl.textContent = ''; }, 1200);
      });
    });
  });

  function setRadio(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
});
