document.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('color');
  const borderInput = document.getElementById('border');
  const status = document.getElementById('status');

  chrome.storage.sync.get({ appearance: { color: '#4A90E2', border: '2px dashed' } }, data => {
    const ap = data.appearance;
    colorInput.value = ap.color;
    borderInput.value = ap.border;
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
});
