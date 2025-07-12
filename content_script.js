// content_script.js
// One-Click Snippets: selection → wrap → persist → reload

console.log('One-Click Snippets content script loaded.');

let hotkeyMap = {};
loadAppearance(() => {
    document.querySelectorAll('.oneclick-snippet').forEach(applyAppearanceToSpan);
});

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            if (changes.appearance) {
                appearance = Object.assign({}, DEFAULT_APPEARANCE, changes.appearance.newValue);
                injectAppearanceStyle();
                document.querySelectorAll('.oneclick-snippet').forEach(applyAppearanceToSpan);
            }
            if (changes[DOC_KEY]) {
                const arr = changes[DOC_KEY].newValue || [];
                arr.forEach(meta => {
                    const span = document.querySelector(`.oneclick-snippet[data-snippet-id="${meta.snippetId}"]`);
                    if (span) {
                        span.dataset.alias = meta.alias;
                        span.dataset.hotkey = meta.hotkey || '';
                        const badge = span.querySelector('.snippet-badge');
                        if (badge) badge.textContent = meta.alias;
                    }
                });
                updateHotkeyMap();
            }
        }
    });
}

function handleSnippetButtonClick() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        removeSnippetButton();
        return;
    }

    const range = sel.getRangeAt(0);
    const alias = window.prompt('Snippet name:', 'Snippet');
    if (!alias) {
        removeSnippetButton();
        return;
    }

    // Wrap the selection
    const snippetId = Date.now().toString();
    const meta = {
        snippetId,
        alias,
        rangeInfo: serializeRange(range)
    };
    wrapRangeWithSnippet(range, meta);
    saveSnippetMeta(meta);

    updateHotkeyMap();

    removeSnippetButton();
    sel.removeAllRanges();
}

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

function updateHotkeyMap() {
    hotkeyMap = {};
    document.querySelectorAll('.oneclick-snippet').forEach(span => {
        const hk = span.dataset.hotkey;
        if (hk) {
            hotkeyMap[hk] = span;
        }
    });
}

// —— EVENT WIRES ——

// 1) Selection detection → show button
if (typeof document !== 'undefined') {
    document.addEventListener('mouseup', () => {
        if (typeof location !== 'undefined' && location.hostname.includes('docs.google.com')) {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                removeSnippetButton();
                return;
            }
            const rect = sel.getRangeAt(0).getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                removeSnippetButton();
                return;
            }
            showSnippetButton(rect);
        }
    });

    // 2) Delegate button clicks
    document.addEventListener('click', (e) => {
        if (e.target.id === SNIPPET_BTN_ID) {
            handleSnippetButtonClick();
        } else if (e.target.classList.contains('copy-pill')) {
            const span = e.target.closest('.oneclick-snippet');
            copySnippetText(span);
        }
    });

    // 3) On-load rehydrate snippets
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof chrome !== 'undefined') {
                loadSavedSnippets();
            }
            document.querySelectorAll('.oneclick-snippet').forEach(injectCopyPill);
        });
    } else {
        if (typeof chrome !== 'undefined') {
            loadSavedSnippets();
        }
        document.querySelectorAll('.oneclick-snippet').forEach(injectCopyPill);
    }
}

// —— LEADER KEY OVERLAY ——
let overlayEl = null;
let resultsEl = null;
let results = [];
let selectedIdx = 0;
let handleOverlayKey = null;

function fuzzyScore(text, query) {
    if (!query) return 0;
    text = (text || '').toLowerCase();
    query = query.toLowerCase();
    let score = 0;
    let ti = 0;
    for (const qc of query) {
        const idx = text.indexOf(qc, ti);
        if (idx === -1) return 0;
        score += (text.length - idx);
        ti = idx + 1;
    }
    return score;
}

function searchSnippets(query) {
    const spans = Array.from(document.querySelectorAll('.oneclick-snippet'));
    return spans
        .map(span => {
            const alias = span.dataset.alias || '';
            const id = span.dataset.snippetId || '';
            const score = Math.max(fuzzyScore(alias, query), fuzzyScore(id, query));
            return { span, alias, id, score };
        })
        .filter(r => r.score > 0 || !query)
        .sort((a, b) => b.score - a.score);
}

function renderResults() {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    results.forEach((r, idx) => {
        const li = document.createElement('li');
        li.textContent = r.alias || r.id;
        li.setAttribute('role', 'option');
        li.id = `ocs-result-${idx}`;
        if (idx === selectedIdx) {
            li.classList.add('highlight');
            li.setAttribute('aria-selected', 'true');
            if (resultsEl && resultsEl.previousSibling && resultsEl.previousSibling.getAttribute) {
                resultsEl.previousSibling.setAttribute('aria-activedescendant', li.id);
            }
        } else {
            li.removeAttribute('aria-selected');
        }
        li.addEventListener('mouseenter', () => {
            selectedIdx = idx;
            renderResults();
        });
        li.addEventListener('click', () => {
            copySnippetText(r.span);
            closeLeaderOverlay();
        });
        resultsEl.appendChild(li);
    });
}

function closeLeaderOverlay() {
    if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
        if (handleOverlayKey) {
            document.removeEventListener('keydown', handleOverlayKey);
            handleOverlayKey = null;
        }
        resultsEl = null;
        results = [];
        selectedIdx = 0;
    }
}

function openLeaderOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'ocs-overlay';

    const modal = document.createElement('div');
    modal.className = 'ocs-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-controls', 'ocs-results');
    input.setAttribute('aria-activedescendant', '');
    input.setAttribute('aria-haspopup', 'listbox');
    modal.appendChild(input);
    resultsEl = document.createElement('ul');
    resultsEl.className = 'ocs-results';
    resultsEl.id = 'ocs-results';
    resultsEl.setAttribute('role', 'listbox');
    modal.appendChild(resultsEl);
    overlayEl.appendChild(modal);

    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) closeLeaderOverlay();
    });

    handleOverlayKey = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLeaderOverlay();
        }
    };
    document.addEventListener('keydown', handleOverlayKey);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLeaderOverlay();
        } else if (e.key === 'ArrowDown') {
            if (results.length > 0) {
                selectedIdx = (selectedIdx + 1) % results.length;
                renderResults();
                e.preventDefault();
            }
        } else if (e.key === 'ArrowUp') {
            if (results.length > 0) {
                selectedIdx = (selectedIdx - 1 + results.length) % results.length;
                renderResults();
                e.preventDefault();
            }
        } else if (e.key === 'Enter') {
            const r = results[selectedIdx];
            if (r) {
                e.preventDefault();
                copySnippetText(r.span);
                closeLeaderOverlay();
            }
        }
    });

    input.addEventListener('input', () => {
        results = searchSnippets(input.value.trim());
        selectedIdx = 0;
        renderResults();
    });

    document.body.appendChild(overlayEl);
    results = searchSnippets('');
    renderResults();
    input.focus();
}

function isEditableElement(el) {
    if (!el) return false;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const mod = isMac ? e.metaKey : e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
            if (isEditableElement(e.target)) return;
            e.preventDefault();
            openLeaderOverlay();
        } else {
            if (isEditableElement(e.target)) return;
            const hk = hotkeyFromEvent(e);
            const span = hotkeyMap[hk];
            if (span) {
                e.preventDefault();
                copySnippetText(span);
            }
        }
    });
}

// Export functions for testing in Node environments
if (typeof module !== 'undefined' && module.exports) {
    const dom = require('./modules/dom');
    const selection = require('./modules/selection');
    const storage = require('./modules/storage');
    module.exports = {
        ...dom,
        ...selection,
        ...storage,
        updateHotkeyMap,
        hotkeyFromEvent,
        openLeaderOverlay,
        closeLeaderOverlay,
        searchSnippets,
        fuzzyScore,
    };
}
