(function(global){
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

    function deserializeNodePath(path) {
        let cur = document;
        for (const idx of path) {
            if (!cur.childNodes[idx]) return null;
            cur = cur.childNodes[idx];
        }
        return cur;
    }

    function serializeRange(range) {
        return {
            startPath: serializeNodePath(range.startContainer),
            startOffset: range.startOffset,
            endPath: serializeNodePath(range.endContainer),
            endOffset: range.endOffset
        };
    }

    function deserializeRange(info) {
        const startNode = deserializeNodePath(info.startPath);
        const endNode   = deserializeNodePath(info.endPath);
        if (!startNode || !endNode) return null;
        const range = document.createRange();
        range.setStart(startNode, info.startOffset);
        range.setEnd(endNode, info.endOffset);
        return range;
    }

    function wrapRangeWithSnippet(range, meta) {
        if (!range) return;
        const span = document.createElement('span');
        span.className = 'oneclick-snippet';
        span.dataset.snippetId = meta.snippetId;
        span.dataset.alias     = meta.alias;
        span.dataset.hotkey    = meta.hotkey || '';
        span.style.position    = 'relative';
        if (typeof applyAppearanceToSpan === 'function') applyAppearanceToSpan(span);
        try {
            range.surroundContents(span);
        } catch (e) {
            console.error('Could not surround contents:', e);
            return;
        }
        const badge = document.createElement('div');
        badge.className = 'snippet-badge';
        badge.textContent = meta.alias;
        span.insertBefore(badge, span.firstChild);
        if (typeof injectCopyPill === 'function') injectCopyPill(span);
        if (typeof enableBadgeEditing === 'function') enableBadgeEditing(span);
    }

    global.serializeNodePath = serializeNodePath;
    global.deserializeNodePath = deserializeNodePath;
    global.serializeRange = serializeRange;
    global.deserializeRange = deserializeRange;
    global.wrapRangeWithSnippet = wrapRangeWithSnippet;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            serializeNodePath,
            deserializeNodePath,
            serializeRange,
            deserializeRange,
            wrapRangeWithSnippet,
        };
    }
})(typeof window !== 'undefined' ? window : global);
