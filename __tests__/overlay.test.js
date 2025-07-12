// Tests for overlay open/close and fuzzy search
// load modules so globals exist before content_script
require('../modules/selection');
const { copySnippetText } = require('../modules/dom');
const storage = require('../modules/storage');
const {
  updateHotkeyMap,
  closeLeaderOverlay,
} = require('../content_script');

describe('leader overlay and hotkeys', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span class="oneclick-snippet" data-snippet-id="1" data-alias="Alpha" data-hotkey="Ctrl+Shift+A">Foo</span>
      <span class="oneclick-snippet" data-snippet-id="2" data-alias="Beta" data-hotkey="Ctrl+Shift+B">Bar</span>
    `;
    global.navigator.clipboard = { writeText: jest.fn(() => Promise.resolve()) };
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    updateHotkeyMap();
  });

  afterEach(() => {
    closeLeaderOverlay();
  });

  test('overlay opens with Ctrl+K and closes on Escape', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    document.dispatchEvent(event);
    expect(document.querySelector('.ocs-overlay')).not.toBeNull();

    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(esc);
    expect(document.querySelector('.ocs-overlay')).toBeNull();
  });

  test('fuzzy search ranks results and copies on Enter', () => {
    // open overlay
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    const input = document.querySelector('.ocs-overlay input');
    expect(input).not.toBeNull();
    // type query for Beta
    input.value = 'Bet';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const firstResult = document.querySelector('.ocs-results li');
    expect(firstResult.textContent).toBe('Beta');
    // press Enter should copy Beta span
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('Bar');
  });

  test('custom hotkey triggers copy', () => {
    const evt = new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true, bubbles: true });
    document.dispatchEvent(evt);
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('Foo');
  });
});
