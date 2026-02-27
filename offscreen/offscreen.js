// DefiWord — Offscreen Document
// Provides DOMParser access for HTML parsing (not available in service workers)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PARSE_HTML') {
    const result = parseHtml(message.html, message.slug);
    sendResponse(result);
  }
});

function parseHtml(html, slug) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Check if we actually have a dictionary entry
  const entryBody = doc.querySelector('.entry-body__el');
  if (!entryBody) {
    return { found: false, error: 'No entry found', query: slug };
  }

  const headword = getText(doc, '.hw.dhw') || slug.replace(/-/g, ' ');
  const entries = [];

  const entryBlocks = doc.querySelectorAll('.entry-body__el');
  for (const block of entryBlocks) {
    const pos = getText(block, '.pos.dpos') || '';
    const cefr = getText(block, '.epp-xref') || '';

    // Pronunciation
    const ukPronEl = block.querySelector('.uk.dpron-i .pron.dpron');
    const usPronEl = block.querySelector('.us.dpron-i .pron.dpron');
    const ukIPA = ukPronEl ? ukPronEl.textContent.trim() : '';
    const usIPA = usPronEl ? usPronEl.textContent.trim() : '';

    const ukAudioEl = block.querySelector('.uk.dpron-i .daud source[type="audio/mpeg"]');
    const usAudioEl = block.querySelector('.us.dpron-i .daud source[type="audio/mpeg"]');
    const ukAudio = ukAudioEl ? 'https://dictionary.cambridge.org' + ukAudioEl.getAttribute('src') : '';
    const usAudio = usAudioEl ? 'https://dictionary.cambridge.org' + usAudioEl.getAttribute('src') : '';

    // Definitions and examples within this entry block
    const senses = [];
    const senseBlocks = block.querySelectorAll('.def-block.ddef_block');
    for (const sb of senseBlocks) {
      const defEl = sb.querySelector('.def.ddef_d.db');
      const definition = defEl ? defEl.textContent.trim().replace(/:$/, '') : '';

      const examples = [];
      const exampleEls = sb.querySelectorAll('.examp.dexamp .eg.deg');
      for (const ex of exampleEls) {
        examples.push(ex.textContent.trim());
      }

      if (definition) {
        senses.push({ definition, examples });
      }
    }

    if (senses.length > 0) {
      entries.push({ pos, cefr, ukIPA, usIPA, ukAudio, usAudio, senses });
    }
  }

  if (entries.length === 0) {
    return { found: false, error: 'No definitions parsed', query: slug };
  }

  // Merge entries that share the same POS — Cambridge often has separate
  // English / American / Business sections with duplicate definitions.
  const merged = [];
  for (const entry of entries) {
    const existing = merged.find(m => m.pos === entry.pos);
    if (!existing) {
      merged.push(entry);
      continue;
    }
    // Fill in missing pronunciation from the new block
    if (!existing.ukIPA && entry.ukIPA) existing.ukIPA = entry.ukIPA;
    if (!existing.usIPA && entry.usIPA) existing.usIPA = entry.usIPA;
    if (!existing.ukAudio && entry.ukAudio) existing.ukAudio = entry.ukAudio;
    if (!existing.usAudio && entry.usAudio) existing.usAudio = entry.usAudio;
    // Keep the higher CEFR badge if one is missing
    if (!existing.cefr && entry.cefr) existing.cefr = entry.cefr;
    // Add only definitions that aren't similar to ones we already have
    for (const sense of entry.senses) {
      const isDuplicate = existing.senses.some(s => defsSimilar(s.definition, sense.definition));
      if (!isDuplicate) {
        existing.senses.push(sense);
      }
    }
  }

  return { found: true, headword, entries: merged };
}

// Extract significant words (drop short filler words)
function defWords(text) {
  const stop = new Set(['a','an','the','of','or','in','to','is','and','for','that','it','as','on','by','be','at','with','from','this','not']);
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0 && !stop.has(w));
}

function defsSimilar(a, b) {
  const wordsA = defWords(a);
  const wordsB = defWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return a === b;
  const setB = new Set(wordsB);
  const shared = wordsA.filter(w => setB.has(w)).length;
  const shorter = Math.min(wordsA.length, wordsB.length);
  // If 60%+ of the shorter definition's words overlap, treat as duplicate
  return shared / shorter >= 0.6;
}

function getText(root, selector) {
  const el = root.querySelector(selector);
  return el ? el.textContent.trim() : '';
}
