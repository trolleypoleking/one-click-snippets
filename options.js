document.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('color');
  const borderInput = document.getElementById('border');
  const status = document.getElementById('status');
  const snippetsDiv = document.getElementById('snippets');
  const hotkeyInputs = {};

  function hotkeyFromEvent(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.metaKey) parts.push('Meta');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);
    return parts.join('+');
  }

  chrome.storage.sync.get({ appearance: { color: '#4A90E2', border: '2px dashed' } }, data => {
    const ap = data.appearance;
    colorInput.value = ap.color;
    borderInput.value = ap.border;

    Object.keys(data).forEach(k => {
      if (k === 'appearance') return;
      const arr = Array.isArray(data[k]) ? data[k] : [];
      arr.forEach(meta => {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = `${meta.alias} (${k}) `;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = meta.hotkey || '';
        input.placeholder = 'Press shortcut';
        input.addEventListener('keydown', ev => {
          ev.preventDefault();
          input.value = hotkeyFromEvent(ev);
        });
        label.appendChild(input);
        row.appendChild(label);
        snippetsDiv.appendChild(row);
        hotkeyInputs[meta.snippetId] = { input, docKey: k };
      });
    });
  });

  document.getElementById('save').addEventListener('click', () => {
    const ap = {
      color: colorInput.value,
      border: borderInput.value
    };
    chrome.storage.sync.set({ appearance: ap }, () => {
      status.textContent = 'Saved';
      setTimeout(() => { status.textContent = ''; }, 1000);
    });
  });

  document.getElementById('save-hotkeys').addEventListener('click', () => {
    chrome.storage.sync.get(null, data => {
      Object.keys(hotkeyInputs).forEach(id => {
        const { input, docKey } = hotkeyInputs[id];
        const arr = Array.isArray(data[docKey]) ? data[docKey] : [];
        const idx = arr.findIndex(m => m.snippetId === id);
        if (idx !== -1) {
          arr[idx].hotkey = input.value.trim();
        }
        data[docKey] = arr;
      });
      chrome.storage.sync.set(data, () => {
        status.textContent = 'Saved';
        setTimeout(() => { status.textContent = ''; }, 1000);
      });
    });
  });
});

