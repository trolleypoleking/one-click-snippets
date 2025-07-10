const { serializeRange, deserializeRange } = require('../content_script');

describe('range serialization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('round trip preserves range', () => {
    document.body.innerHTML = '<p>Hello <em>World</em>!</p>';
    const p = document.querySelector('p');
    const text1 = p.firstChild; // "Hello "
    const text2 = p.querySelector('em').firstChild; // "World"
    const range = document.createRange();
    range.setStart(text1, 1);
    range.setEnd(text2, 3);

    const info = serializeRange(range);
    const restored = deserializeRange(info);

    expect(restored.toString()).toBe(range.toString());
    expect(restored.startContainer).toBe(text1);
    expect(restored.startOffset).toBe(1);
    expect(restored.endContainer).toBe(text2);
    expect(restored.endOffset).toBe(3);
  });

  test('deserializeRange returns null for invalid path', () => {
    document.body.innerHTML = '<p>Hello</p>';
    const p = document.querySelector('p');
    const text = p.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.textContent.length);

    const info = serializeRange(range);
    info.startPath.push(99); // create bad path
    const invalid = deserializeRange(info);
    expect(invalid).toBeNull();
  });
});
