
document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('list');
  const guide = document.getElementById('guide');
  const closeGuideBtn = document.getElementById('close-guide');

  function renderSnippets(docKey) {
    chrome.storage.sync.get([docKey], data => {
      const arr = data[docKey] || [];
      listEl.innerHTML = '';
      arr.forEach(meta => {
        const row = document.createElement('div');
        row.className = 'snippet-row';
        const name = document.createElement('span');
        name.textContent = meta.alias;
        row.appendChild(name);
        if (meta.hotkey) {
          const hk = document.createElement('span');
          hk.className = 'hotkey';
          hk.textContent = meta.hotkey;
          row.appendChild(hk);
        }
        listEl.appendChild(row);
      });
    });
  }

  function loadForActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab) return;
      try {
        const docKey = new URL(tab.url).pathname;
        renderSnippets(docKey);
      } catch (e) {}
    });
  }

  chrome.storage.sync.get({ hasSeenGuide: false }, result => {
    if (!result.hasSeenGuide) {
      guide.style.display = 'block';
      closeGuideBtn.addEventListener('click', () => {
        guide.style.display = 'none';
        chrome.storage.sync.set({ hasSeenGuide: true });
        loadForActiveTab();
      });
    } else {
      loadForActiveTab();
    }
  });
});