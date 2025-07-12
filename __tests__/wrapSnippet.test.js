const { wrapRangeWithSnippet } = require('../modules/selection');

describe('wrapRangeWithSnippet', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="p">Hello World</p>';
  });

  test('wraps selection with span and badge', () => {
    const p = document.getElementById('p');
    const textNode = p.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5); // "Hello"

    const meta = { snippetId: '123', alias: 'Greet' };
    wrapRangeWithSnippet(range, meta);

    const span = p.querySelector('span.oneclick-snippet');
    expect(span).not.toBeNull();
    expect(span.dataset.snippetId).toBe('123');
    expect(span.dataset.alias).toBe('Greet');

    const badge = span.querySelector('.snippet-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Greet');
  });
});
