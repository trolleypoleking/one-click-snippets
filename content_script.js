// content_script.js
// One-Click Snippets: selection → wrap → persist → reload

console.log('One-Click Snippets content script loaded.');

// CONFIG
const SNIPPET_BTN_ID = 'ocs-snippet-button';
const DOC_KEY = (typeof location !== 'undefined' ? location.pathname : ''); // e.g. "/document/d/…"
const DEFAULT_APPEARANCE = { color: '#4A90E2', border: '2px dashed' };
let appearance = { ...DEFAULT_APPEARANCE };
let hotkeyMap = {};
loadAppearance(() => {
    document.querySelectorAll('.oneclick-snippet').forEach(applyAppearanceToSpan);
});

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            if (changes.appearance) {
                appearance = changes.appearance.newValue || DEFAULT_APPEARANCE;
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

function loadAppearance(cb) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        cb && cb();
        return;
    }
    chrome.storage.sync.get({ appearance: DEFAULT_APPEARANCE }, data => {
        appearance = data.appearance || DEFAULT_APPEARANCE;
        cb && cb();
    });
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#','');
    if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } else if (hex.length === 6) {
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(0,0,0,${alpha})`;
}

function applyAppearanceToSpan(span) {
    if (!span) return;
    span.style.border = `${appearance.border} ${appearance.color}`;
    span.style.background = hexToRgba(appearance.color, 0.08);
}

// —— HELPERS ——

// Remove any existing “+ Snippet” button
function removeSnippetButton() {
    const btn = document.getElementById(SNIPPET_BTN_ID);
    if (btn) btn.remove();
}

// Serialize a node’s path (array of child-indices from document)
function serializeNodePath(node) {
    const path = [];
    let cur = node;
    while (cur && cur !== document) {
        const parent = cur.parentNode;
        if (!parent) break;
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
        cur = parent;
    }
    return path;
}

// Deserialize that path back to a DOM node
function deserializeNodePath(path) {
    let cur = document;
    for (const idx of path) {
        if (!cur.childNodes[idx]) return null;
        cur = cur.childNodes[idx];
    }
    return cur;
}

// Convert a Range → JSON-friendly info
function serializeRange(range) {
    return {
        startPath: serializeNodePath(range.startContainer),
        startOffset: range.startOffset,
        endPath: serializeNodePath(range.endContainer),
        endOffset: range.endOffset
    };
}

// Convert that info back to a Range
function deserializeRange(info) {
    const startNode = deserializeNodePath(info.startPath);
    const endNode   = deserializeNodePath(info.endPath);
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, info.startOffset);
    range.setEnd(endNode, info.endOffset);
    return range;
}

// Inject a copy pill for a snippet span
function updatePillPosition(span, pill) {
    const rect = span.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight &&
                         rect.left >= 0 && rect.right <= window.innerWidth;

    if (fullyVisible) {
        pill.classList.remove('fixed');
        if (pill.parentNode !== span) {
            span.appendChild(pill);
        }
    } else {
        pill.classList.add('fixed');
        if (pill.parentNode !== document.body) {
            document.body.appendChild(pill);
        }
    }
}

function injectCopyPill(span) {
    if (!span || span.querySelector('.copy-pill')) return;

    const pill = document.createElement('button');
    pill.className = 'copy-pill';
    pill.textContent = '⎘';

    const handler = () => updatePillPosition(span, pill);
    window.addEventListener('scroll', handler);
    window.addEventListener('resize', handler);

    updatePillPosition(span, pill);
}

// Copy snippet text to clipboard and trigger flash animation
function copySnippetText(span) {
    if (!span) return;
    const text = span.innerText || span.textContent || '';
    const doCopy = navigator.clipboard && navigator.clipboard.writeText ?
        navigator.clipboard.writeText(text) :
        new Promise(resolve => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); } catch (e) { /* noop */ }
            document.body.removeChild(ta);
            resolve();
        });

    doCopy.then(() => {
        span.classList.add('copy-anim');
        span.addEventListener('animationend', () => {
            span.classList.remove('copy-anim');
        }, { once: true });
    });
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

// Update a snippet's alias in chrome.storage.sync
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

// Enable inline renaming of a snippet badge
function enableBadgeEditing(span) {
    const badge = span.querySelector('.snippet-badge');
    if (!badge) return;
    badge.addEventListener('dblclick', () => {
        const current = badge.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = current;
        input.style.minWidth = '40px';
        badge.replaceWith(input);
        input.focus();
        input.select();

        const finish = (save) => {
            if (save) {
                const alias = input.value.trim() || current;
                badge.textContent = alias;
                span.dataset.alias = alias;
                updateSnippetAlias(span.dataset.snippetId, alias);
            }
            input.replaceWith(badge);
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finish(true);
            } else if (e.key === 'Escape') {
                finish(false);
            }
        });
    });
}

// Wrap a Range in a span + inject its badge
function wrapRangeWithSnippet(range, meta) {
    if (!range) return;
    const span = document.createElement('span');
    span.className = 'oneclick-snippet';
    span.dataset.snippetId = meta.snippetId;
    span.dataset.alias     = meta.alias;
    span.dataset.hotkey    = meta.hotkey || '';
    span.style.position    = 'relative';
    applyAppearanceToSpan(span);

    try {
        range.surroundContents(span);
    } catch (e) {
        console.error('Could not surround contents:', e);
        return;
    }

    // Badge
    const badge = document.createElement('div');
    badge.className = 'snippet-badge';
    badge.textContent = meta.alias;
    span.insertBefore(badge, span.firstChild);

    injectCopyPill(span);
    enableBadgeEditing(span);
}

// Save a snippet’s metadata to chrome.storage.sync
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

// Load & rehydrate all snippets for this doc
function loadSavedSnippets() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        return;
    }
    chrome.storage.sync.get([DOC_KEY], data => {
        const arr = data[DOC_KEY] || [];
        arr.forEach(meta => {
            const range = deserializeRange(meta.rangeInfo);
            wrapRangeWithSnippet(range, meta);
        });
        document.querySelectorAll('.oneclick-snippet').forEach(span => {
            injectCopyPill(span);
            enableBadgeEditing(span);
        });
        updateHotkeyMap();
    });
}

// Position and show the “+ Snippet” pill
function showSnippetButton(rect) {
    removeSnippetButton();

    const btn = document.createElement('button');
    btn.id = SNIPPET_BTN_ID;
    btn.textContent = '+ Snippet';
    Object.assign(btn.style, {
        position: 'absolute',
        zIndex: '9999',
        padding: '4px 8px',
        background: '#4A90E2',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer'
    });

    const top  = rect.top  + window.scrollY - 30;
    const left = rect.left + window.scrollX;
    btn.style.top  = `${top}px`;
    btn.style.left = `${left}px`;

    document.body.appendChild(btn);
}

// Handle click on the “+ Snippet” button
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
    module.exports = { serializeRange, deserializeRange, wrapRangeWithSnippet, copySnippetText };
}
