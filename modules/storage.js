(function(global){
    const DOC_KEY = (typeof location !== 'undefined' ? location.pathname : '');
    const DEFAULT_APPEARANCE = {
        borderColor: '#4A90E2',
        borderStyle: '2px dashed',
        bgTint: 0.08,
        animDuration: 0.4,
    };
    global.DEFAULT_APPEARANCE = DEFAULT_APPEARANCE;
    let appearance = { ...DEFAULT_APPEARANCE };
    global.appearance = appearance;

    function loadAppearance(cb) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            cb && cb();
            return;
        }
        chrome.storage.sync.get({ appearance: DEFAULT_APPEARANCE }, data => {
            appearance = Object.assign({}, DEFAULT_APPEARANCE, data.appearance);
            global.appearance = appearance;
            if (typeof injectAppearanceStyle === 'function') injectAppearanceStyle();
            cb && cb();
        });
    }

    function saveSnippetMeta(meta) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            return;
        }
        chrome.storage.sync.get([DOC_KEY], data => {
            const arr = data[DOC_KEY] || [];
            arr.push(meta);
            chrome.storage.sync.set({ [DOC_KEY]: arr });
        });
    }

    function loadSavedSnippets() {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            return;
        }
        chrome.storage.sync.get([DOC_KEY], data => {
            const arr = data[DOC_KEY] || [];
            let failed = 0;
            arr.forEach(meta => {
                const range = typeof deserializeRange === 'function' ? deserializeRange(meta.rangeInfo) : null;
                if (!range) {
                    console.warn('One-Click Snippets: could not restore snippet', meta);
                    failed++;
                    return;
                }
                if (typeof wrapRangeWithSnippet === 'function') wrapRangeWithSnippet(range, meta);
            });
            document.querySelectorAll('.oneclick-snippet').forEach(span => {
                if (typeof injectCopyPill === 'function') injectCopyPill(span);
                if (typeof enableBadgeEditing === 'function') enableBadgeEditing(span);
            });
            if (typeof updateHotkeyMap === 'function') updateHotkeyMap();
            if (failed > 0 && typeof showMessage === 'function') {
                showMessage(`${failed} snippet${failed === 1 ? '' : 's'} could not be restored. They may have been edited or removed.`);
            }
        });
    }

    function updateSnippetAlias(snippetId, alias) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            return;
        }
        chrome.storage.sync.get([DOC_KEY], data => {
            const arr = data[DOC_KEY] || [];
            const idx = arr.findIndex(m => m.snippetId === snippetId);
            if (idx !== -1) {
                arr[idx].alias = alias;
                chrome.storage.sync.set({ [DOC_KEY]: arr });
            }
        });
    }

    global.DOC_KEY = DOC_KEY;
    global.loadAppearance = loadAppearance;
    global.saveSnippetMeta = saveSnippetMeta;
    global.loadSavedSnippets = loadSavedSnippets;
    global.updateSnippetAlias = updateSnippetAlias;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            loadAppearance,
            saveSnippetMeta,
            loadSavedSnippets,
            updateSnippetAlias,
            DEFAULT_APPEARANCE,
        };
    }
})(typeof window !== 'undefined' ? window : global);
