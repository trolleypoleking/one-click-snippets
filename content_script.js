// content_script.js
// One-Click Snippets: selection → wrap → persist → reload

console.log('One-Click Snippets content script loaded.');

// CONFIG
const SNIPPET_BTN_ID = 'ocs-snippet-button';
const DOC_KEY = (typeof location !== 'undefined' ? location.pathname : ''); // e.g. "/document/d/…"

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
function injectCopyPill(span) {
    if (!span || span.querySelector('.copy-pill')) return;

    const pill = document.createElement('button');
    pill.className = 'copy-pill';
    pill.textContent = '⎘';

    const rect = span.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight &&
                         rect.left >= 0 && rect.right <= window.innerWidth;

    if (fullyVisible) {
        span.appendChild(pill);
    } else {
        pill.style.position = 'fixed';
        pill.style.top = '10px';
        pill.style.right = '10px';
        document.body.appendChild(pill);
    }
}

// Wrap a Range in a span + inject its badge
function wrapRangeWithSnippet(range, meta) {
    if (!range) return;
    const span = document.createElement('span');
    span.className = 'oneclick-snippet';
    span.dataset.snippetId = meta.snippetId;
    span.dataset.alias     = meta.alias;
    span.style.position    = 'relative';

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
        document.querySelectorAll('.oneclick-snippet').forEach(injectCopyPill);
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

// Export functions for testing in Node environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { serializeRange, deserializeRange, wrapRangeWithSnippet };
}
