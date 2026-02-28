document.addEventListener('DOMContentLoaded', () => {
  // ===== Translation system =====
  const translations = {
    en: {
      // Consent
      consentIntro: "Before you start, please review how Define It handles your data:",
      consentBullet1: "Lookups are sent to the Cambridge Dictionary API — no personal data is collected",
      consentBullet2: "Saved words are stored locally in your browser",
      consentBullet3: "Settings sync via Chrome's built-in storage",
      consentReadFull: "Read the full ",
      consentPrivacyPolicy: "Privacy Policy",
      consentAgreeLabel: "I have read and agree to the Privacy Policy",
      consentContinue: "Continue",
      // Header tabs
      tabSettings: "Settings",
      tabWords: "Words",
      // Settings
      settTrigger: "Trigger mode",
      settRightClick: "Right-click menu",
      settAutoPopup: "Auto popup",
      settAutoPopupSuffix: " on highlight",
      settAccent: "Preferred accent",
      settUK: "UK (British)",
      settUS: "US (American)",
      settMaxExamples: "Max examples",
      settLanguage: "Language",
      settSaved: "Saved",
      // Words tab
      quizBtn: "Quiz",
      quizBtnTitle: "Quiz your saved words",
      clearAll: "Clear all",
      clearAllTitle: "Clear all saved words",
      clearConfirm: "Delete all saved words?",
      emptyTitle: "No saved words yet",
      emptyHint: "Select a word on any page and save it here.",
      wordDelete: "Delete",
      wordOpenCambridge: "Open in Cambridge →",
      // Quiz - mode picker
      quizChooseMode: "Choose a mode",
      quizFlashcard: "Flashcard",
      quizFlashcardDesc: "Flip to reveal",
      quizMC: "Multiple Choice",
      quizMCDesc: "Pick the right word",
      quizTypeIt: "Type It",
      quizTypeItDesc: "Spell it out",
      quizBackToWords: "← Back to Words",
      quizNeedWords: "Need 4+ words",
      // Quiz - play
      quizTapFlip: "Tap to flip",
      quizBack: "← Back",
      quizNext: "Next →",
      quizTypePlaceholder: "Type the word...",
      quizCheck: "Check",
      quizCorrect: "Correct!",
      quizAnswerWas: "The answer was: ",
      // Quiz - results
      quizDone: "Done!",
      quizReviewed: "Reviewed {n} word",
      quizReviewedPlural: "Reviewed {n} words",
      quizResults: "Results",
      quizPlayAgain: "Play Again",
      // Footer
      footerContact: "If you have any problems or questions, please contact us — "
    },
    ru: {
      consentIntro: "Перед началом работы ознакомьтесь с тем, как Define It обрабатывает ваши данные:",
      consentBullet1: "Запросы отправляются в Cambridge Dictionary API — личные данные не собираются",
      consentBullet2: "Сохранённые слова хранятся локально в вашем браузере",
      consentBullet3: "Настройки синхронизируются через встроенное хранилище Chrome",
      consentReadFull: "Прочитайте полную ",
      consentPrivacyPolicy: "Политику конфиденциальности",
      consentAgreeLabel: "Я прочитал(а) и согласен(а) с Политикой конфиденциальности",
      consentContinue: "Продолжить",
      tabSettings: "Настройки",
      tabWords: "Слова",
      settTrigger: "Режим запуска",
      settRightClick: "Контекстное меню",
      settAutoPopup: "Авто-всплытие",
      settAutoPopupSuffix: " при выделении",
      settAccent: "Предпочитаемый акцент",
      settUK: "UK (Британский)",
      settUS: "US (Американский)",
      settMaxExamples: "Макс. примеров",
      settLanguage: "Язык",
      settSaved: "Сохранено",
      quizBtn: "Квиз",
      quizBtnTitle: "Тест по сохранённым словам",
      clearAll: "Очистить",
      clearAllTitle: "Удалить все сохранённые слова",
      clearConfirm: "Удалить все сохранённые слова?",
      emptyTitle: "Сохранённых слов пока нет",
      emptyHint: "Выделите слово на любой странице и сохраните его здесь.",
      wordDelete: "Удалить",
      wordOpenCambridge: "Открыть в Cambridge →",
      quizChooseMode: "Выберите режим",
      quizFlashcard: "Карточки",
      quizFlashcardDesc: "Нажмите, чтобы открыть",
      quizMC: "Выбор ответа",
      quizMCDesc: "Выберите правильное слово",
      quizTypeIt: "Напечатай",
      quizTypeItDesc: "Введите слово",
      quizBackToWords: "← Назад к словам",
      quizNeedWords: "Нужно 4+ слова",
      quizTapFlip: "Нажмите, чтобы перевернуть",
      quizBack: "← Назад",
      quizNext: "Далее →",
      quizTypePlaceholder: "Введите слово...",
      quizCheck: "Проверить",
      quizCorrect: "Правильно!",
      quizAnswerWas: "Правильный ответ: ",
      quizDone: "Готово!",
      quizReviewed: "Повторено: {n} слово",
      quizReviewedPlural: "Повторено: {n} слов",
      quizResults: "Результаты",
      quizPlayAgain: "Ещё раз",
      footerContact: "Если у вас есть вопросы или проблемы, свяжитесь с нами — "
    }
  };

  let currentLang = 'en';

  function t(key) {
    return translations[currentLang]?.[key] || translations.en[key] || key;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  // ===== Consent =====
  const consentScreen = document.getElementById('consent-screen');
  const mainApp = document.querySelector('.main-app');
  const consentAgree = document.getElementById('consent-agree');
  const consentContinue = document.getElementById('consent-continue');

  chrome.storage.local.get({ consentGiven: false }, (result) => {
    if (result.consentGiven) {
      showMainApp();
    } else {
      showConsentScreen();
    }
  });

  function showConsentScreen() {
    consentScreen.style.display = 'block';
    mainApp.style.display = 'none';
  }

  function showMainApp() {
    consentScreen.style.display = 'none';
    mainApp.style.display = 'block';
  }

  consentAgree.addEventListener('change', () => {
    consentContinue.disabled = !consentAgree.checked;
  });

  consentContinue.addEventListener('click', () => {
    chrome.storage.local.set({ consentGiven: true }, () => {
      showMainApp();
    });
  });

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
    if (confirm(t('clearConfirm'))) {
      chrome.runtime.sendMessage({ type: 'CLEAR_ALL_WORDS' }, () => loadWords());
    }
  });

  function loadWords() {
    chrome.runtime.sendMessage({ type: 'GET_SAVED_WORDS' }, (words) => {
      wordList.innerHTML = '';
      if (!words || words.length === 0) {
        emptyState.style.display = 'block';
        clearAllBtn.style.display = 'none';
        document.getElementById('start-quiz').style.display = 'none';
        return;
      }
      emptyState.style.display = 'none';
      clearAllBtn.style.display = 'inline-block';
      document.getElementById('start-quiz').style.display = 'inline-block';

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
            <button class="word-delete-btn" data-word="${escapeHtml(word.headword)}" title="${escapeHtml(t('wordDelete'))}">&#10005;</button>
          </div>
          ${word.definition ? `<div class="word-def">${escapeHtml(word.definition)}</div>` : ''}
          ${word.url ? `<a class="word-link" href="${escapeHtml(word.url)}" target="_blank">${escapeHtml(t('wordOpenCambridge'))}</a>` : ''}
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
  const defaults = { triggerMode: 'contextmenu', accent: 'uk', maxExamples: 2, language: 'en' };

  chrome.storage.sync.get(defaults, (settings) => {
    setRadio('triggerMode', settings.triggerMode);
    setRadio('accent', settings.accent);
    setRadio('maxExamples', String(settings.maxExamples));
    setRadio('language', settings.language);
    applyLanguage(settings.language);
  });

  document.querySelectorAll('.settings-body input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const triggerMode = getRadio('triggerMode');
      const accent = getRadio('accent');
      const maxExamples = parseInt(getRadio('maxExamples'), 10);
      const language = getRadio('language');

      chrome.storage.sync.set({ triggerMode, accent, maxExamples, language }, () => {
        applyLanguage(language);
        statusEl.textContent = t('settSaved');
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

  // ===== Quiz =====
  const quizScreen = document.getElementById('quiz-screen');
  const quizModePicker = document.getElementById('quiz-mode-picker');
  const quizPlay = document.getElementById('quiz-play');
  const quizResults = document.getElementById('quiz-results');
  const startQuizBtn = document.getElementById('start-quiz');
  const tabToolbar = document.querySelector('.tab-toolbar');

  let quizState = {
    mode: null,
    words: [],
    allWords: [],
    current: 0,
    score: 0,
    answered: false
  };

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startQuiz() {
    chrome.runtime.sendMessage({ type: 'GET_SAVED_WORDS' }, (words) => {
      if (!words || words.length === 0) return;
      quizState.allWords = words;

      // Show quiz screen, hide words list & toolbar
      quizScreen.style.display = 'block';
      wordList.style.display = 'none';
      emptyState.style.display = 'none';
      tabToolbar.style.display = 'none';

      // Show mode picker, hide play & results
      quizModePicker.style.display = 'block';
      quizPlay.style.display = 'none';
      quizResults.style.display = 'none';

      // Disable MC if < 4 words
      const mcBtn = quizModePicker.querySelector('[data-mode="mc"]');
      if (words.length < 4) {
        mcBtn.disabled = true;
        if (!mcBtn.querySelector('.quiz-mode-hint')) {
          const hint = document.createElement('span');
          hint.className = 'quiz-mode-hint';
          hint.textContent = t('quizNeedWords');
          mcBtn.querySelector('.quiz-mode-name').after(hint);
        }
      } else {
        mcBtn.disabled = false;
        const hint = mcBtn.querySelector('.quiz-mode-hint');
        if (hint) hint.remove();
      }
    });
  }

  function exitQuiz() {
    quizScreen.style.display = 'none';
    tabToolbar.style.display = 'flex';
    wordList.style.display = '';
    loadWords();
  }

  function selectMode(mode) {
    quizState.mode = mode;
    quizState.words = shuffleArray(quizState.allWords);
    quizState.current = 0;
    quizState.score = 0;
    quizState.answered = false;

    quizModePicker.style.display = 'none';
    quizResults.style.display = 'none';
    quizPlay.style.display = 'block';

    // Hide all card areas, show the one for this mode
    document.querySelectorAll('.quiz-card-area').forEach(el => el.style.display = 'none');
    if (mode === 'flashcard') document.getElementById('quiz-flashcard').style.display = 'block';
    else if (mode === 'mc') document.getElementById('quiz-mc').style.display = 'block';
    else if (mode === 'typeit') document.getElementById('quiz-typeit').style.display = 'block';

    showCard();
  }

  function showCard() {
    const total = quizState.words.length;
    const idx = quizState.current;
    quizState.answered = false;

    // Progress
    const pct = ((idx + 1) / total) * 100;
    document.querySelector('.quiz-progress-fill').style.width = pct + '%';
    document.querySelector('.quiz-progress-text').textContent = (idx + 1) + ' / ' + total;

    const word = quizState.words[idx];

    if (quizState.mode === 'flashcard') {
      const card = document.getElementById('flashcard');
      card.classList.remove('flipped');
      card.querySelector('.flashcard-word').textContent = word.headword;
      card.querySelector('.flashcard-pos').textContent = word.pos || '';
      card.querySelector('.flashcard-def').textContent = word.definition || 'No definition';
      document.getElementById('flashcard-prev').disabled = idx === 0;
    } else if (quizState.mode === 'mc') {
      document.querySelector('#quiz-mc .quiz-prompt').textContent = word.definition || 'No definition';
      const optionsEl = document.querySelector('.mc-options');
      optionsEl.innerHTML = '';

      // Pick 3 random wrong words
      const others = quizState.allWords.filter(w => w.headword !== word.headword);
      const wrong = shuffleArray(others).slice(0, 3);
      const options = shuffleArray([word, ...wrong]);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mc-option-btn';
        btn.textContent = opt.headword;
        btn.dataset.word = opt.headword;
        optionsEl.appendChild(btn);
      });
    } else if (quizState.mode === 'typeit') {
      document.querySelector('#quiz-typeit .quiz-prompt').textContent = word.definition || 'No definition';
      const input = document.getElementById('typeit-input');
      input.value = '';
      input.disabled = false;
      document.getElementById('typeit-submit').disabled = false;
      document.querySelector('.typeit-feedback').textContent = '';
      document.querySelector('.typeit-feedback').className = 'typeit-feedback';
      input.focus();
    }
  }

  function handleMcAnswer(selectedWord) {
    if (quizState.answered) return;
    quizState.answered = true;

    const correctWord = quizState.words[quizState.current].headword;
    const buttons = document.querySelectorAll('.mc-option-btn');

    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.word === correctWord) {
        btn.classList.add('correct');
      } else if (btn.dataset.word === selectedWord && selectedWord !== correctWord) {
        btn.classList.add('wrong');
      }
    });

    if (selectedWord === correctWord) quizState.score++;

    setTimeout(() => nextCard(), 800);
  }

  function handleTypeitAnswer() {
    if (quizState.answered) return;
    quizState.answered = true;

    const input = document.getElementById('typeit-input');
    const feedback = document.querySelector('.typeit-feedback');
    const correctWord = quizState.words[quizState.current].headword;
    const answer = input.value.trim();

    input.disabled = true;
    document.getElementById('typeit-submit').disabled = true;

    if (answer.toLowerCase() === correctWord.toLowerCase()) {
      quizState.score++;
      feedback.textContent = t('quizCorrect');
      feedback.className = 'typeit-feedback correct';
    } else {
      feedback.textContent = t('quizAnswerWas') + correctWord;
      feedback.className = 'typeit-feedback wrong';
    }

    setTimeout(() => nextCard(), 1000);
  }

  function flashcardFlip() {
    document.getElementById('flashcard').classList.toggle('flipped');
  }

  function prevCard() {
    if (quizState.current > 0) {
      quizState.current--;
      showCard();
    }
  }

  function nextCard() {
    quizState.current++;
    if (quizState.current >= quizState.words.length) {
      showResults();
    } else {
      showCard();
    }
  }

  function showResults() {
    quizPlay.style.display = 'none';
    quizResults.style.display = 'block';

    const total = quizState.words.length;
    const titleEl = document.getElementById('quiz-results-title');
    const scoreEl = document.getElementById('quiz-results-score');

    if (quizState.mode === 'flashcard') {
      titleEl.textContent = t('quizDone');
      const key = total !== 1 ? 'quizReviewedPlural' : 'quizReviewed';
      scoreEl.textContent = t(key).replace('{n}', total);
    } else {
      titleEl.textContent = t('quizResults');
      scoreEl.textContent = quizState.score + ' / ' + total;
    }
  }

  // --- Quiz event listeners ---
  startQuizBtn.addEventListener('click', startQuiz);

  document.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) selectMode(btn.dataset.mode);
    });
  });

  document.getElementById('flashcard').addEventListener('click', flashcardFlip);

  document.getElementById('flashcard-prev').addEventListener('click', prevCard);

  document.querySelector('.quiz-next-btn').addEventListener('click', nextCard);

  document.querySelector('.mc-options').addEventListener('click', (e) => {
    const btn = e.target.closest('.mc-option-btn');
    if (btn) handleMcAnswer(btn.dataset.word);
  });

  document.getElementById('typeit-submit').addEventListener('click', handleTypeitAnswer);

  document.getElementById('typeit-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTypeitAnswer();
  });

  document.getElementById('quiz-back-modes').addEventListener('click', exitQuiz);
  document.getElementById('quiz-exit').addEventListener('click', exitQuiz);

  document.getElementById('quiz-again').addEventListener('click', () => {
    selectMode(quizState.mode);
  });
});
