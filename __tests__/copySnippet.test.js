const { copySnippetText } = require('../content_script');

describe('copySnippetText', () => {
  beforeEach(() => {
    document.body.innerHTML = '<span id="s">Hello</span>';
    global.navigator.clipboard = { writeText: jest.fn(() => Promise.resolve()) };
  });

  test('adds copy-anim class after copying', async () => {
    const span = document.getElementById('s');
    await copySnippetText(span);
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('Hello');
    expect(span.classList.contains('copy-anim')).toBe(true);
  });
});
