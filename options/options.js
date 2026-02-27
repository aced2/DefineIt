document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const defaults = { triggerMode: 'contextmenu', accent: 'uk', maxExamples: 2 };

  // Load saved settings
  chrome.storage.sync.get(defaults, (settings) => {
    setRadio('triggerMode', settings.triggerMode);
    setRadio('accent', settings.accent);
    setRadio('maxExamples', String(settings.maxExamples));
  });

  // Auto-save on any change
  document.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', saveSettings);
  });

  function saveSettings() {
    const triggerMode = getRadio('triggerMode');
    const accent = getRadio('accent');
    const maxExamples = parseInt(getRadio('maxExamples'), 10);

    chrome.storage.sync.set({ triggerMode, accent, maxExamples }, () => {
      statusEl.textContent = 'Settings saved';
      setTimeout(() => { statusEl.textContent = ''; }, 1500);
    });
  }

  function setRadio(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  }
});
