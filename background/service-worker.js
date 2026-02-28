// DefiWord — Background Service Worker
// Handles context menu, keyboard shortcut, Cambridge Dictionary fetch & parse

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'wordpeek-lookup',
    title: 'Look up "%s" in Cambridge Dictionary',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'wordpeek-lookup' && info.selectionText) {
    handleLookup(info.selectionText.trim(), tab.id);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOOKUP_WORD') {
    lookupWord(message.word).then(sendResponse);
    return true; // keep channel open for async response
  }
  if (message.type === 'SAVE_WORD') {
    saveWord(message.data).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_SAVED_WORDS') {
    getSavedWords().then(sendResponse);
    return true;
  }
  if (message.type === 'DELETE_WORD') {
    deleteWord(message.word).then(sendResponse);
    return true;
  }
  if (message.type === 'CLEAR_ALL_WORDS') {
    chrome.storage.local.set({ savedWords: [] }, () => sendResponse({ ok: true }));
    return true;
  }
});

async function handleLookup(text, tabId) {
  const send = (msg) => chrome.tabs.sendMessage(tabId, msg).catch(() => {});
  send({ type: 'SHOW_LOADING' });
  const result = await lookupWord(text);
  send({ type: 'SHOW_RESULT', data: result });
}

function toSlug(word) {
  return word.trim().toLowerCase().replace(/\s+/g, '-');
}

async function lookupWord(word) {
  // Easter egg
  if (word.trim().toLowerCase() === 'defiword') {
    return {
      found: true,
      headword: 'DefiWord',
      url: 'https://github.com/aced2/DefineIt',
      entries: [{
        pos: '', cefr: '', ukIPA: '', usIPA: '', ukAudio: '', usAudio: '',
        senses: [{ definition: 'Your assistant in learning English, happy to serve :)', examples: [] }]
      }]
    };
  }

  const slug = toSlug(word);
  try {
    let result = await fetchAndParse(slug);
    // If not found and multi-word, retry with first word only
    if (!result.found && slug.includes('-')) {
      const firstWord = slug.split('-')[0];
      result = await fetchAndParse(firstWord);
    }
    // If still not found, fetch search suggestions
    if (!result.found) {
      result.suggestions = await fetchSuggestions(word);
    }
    return result;
  } catch (err) {
    return { found: false, error: err.message, query: word };
  }
}

async function fetchSuggestions(word) {
  try {
    const url = `https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=8`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map(item => item.word).filter(w => w.toLowerCase() !== word.toLowerCase());
  } catch {
    return [];
  }
}

// Ensure the offscreen document exists for HTML parsing.
// Always check hasDocument() — Chrome can evict offscreen docs to save memory.
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Parse Cambridge Dictionary HTML responses'
    });
  }
}

async function fetchAndParse(slug) {
  const url = `https://dictionary.cambridge.org/dictionary/english/${slug}`;

  // Timeout after 8 seconds to avoid infinite spinner
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { found: false, error: 'Request timed out', query: slug };
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    return { found: false, error: `HTTP ${response.status}`, query: slug };
  }

  const html = await response.text();

  // Delegate HTML parsing to offscreen document (service workers have no DOMParser)
  await ensureOffscreen();
  const result = await chrome.runtime.sendMessage({ type: 'PARSE_HTML', html, slug });

  if (!result || !result.found) {
    return result || { found: false, error: 'Parse failed', query: slug };
  }

  result.url = url;
  return result;
}

async function saveWord(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ savedWords: [] }, (result) => {
      const words = result.savedWords;
      // Avoid duplicates by headword
      const exists = words.findIndex(w => w.headword === data.headword);
      if (exists !== -1) {
        words[exists] = data; // update
      } else {
        words.unshift(data); // add to beginning
      }
      chrome.storage.local.set({ savedWords: words }, () => resolve({ ok: true }));
    });
  });
}

async function getSavedWords() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ savedWords: [] }, (result) => {
      resolve(result.savedWords);
    });
  });
}

async function deleteWord(headword) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ savedWords: [] }, (result) => {
      const words = result.savedWords.filter(w => w.headword !== headword);
      chrome.storage.local.set({ savedWords: words }, () => resolve({ ok: true }));
    });
  });
}
