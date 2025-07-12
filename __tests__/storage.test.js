const { saveSnippetMeta } = require('../modules/storage');

describe('saveSnippetMeta', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, cb) => cb({ [global.location.pathname]: [] })),
          set: jest.fn()
        }
      }
    };
  });

  test('stores snippet metadata', () => {
    const meta = { snippetId: '1' };
    saveSnippetMeta(meta);
    expect(chrome.storage.sync.get).toHaveBeenCalled();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [global.location.pathname]: [meta] });
  });
});
