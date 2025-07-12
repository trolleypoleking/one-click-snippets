(function(global){
    const SNIPPET_BTN_ID = 'ocs-snippet-button';

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

    function injectAppearanceStyle() {
        if (typeof document === 'undefined') return;
        const id = 'ocs-appearance-style';
        let style = document.getElementById(id);
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            document.documentElement.appendChild(style);
        }
        const app = typeof appearance !== 'undefined' ? appearance : {};
        style.textContent = `:root {\n` +
            `  --ocs-border-style: ${app.borderStyle};\n` +
            `  --ocs-border-color: ${app.borderColor};\n` +
            `  --ocs-background-color: ${hexToRgba(app.borderColor, app.bgTint)};\n` +
            `  --ocs-anim-color-start: ${hexToRgba(app.borderColor, 0.2)};\n` +
            `  --ocs-anim-color-end: ${hexToRgba(app.borderColor, 0.5)};\n` +
            `  --ocs-anim-duration: ${app.animDuration}s;\n` +
            `}`;
    }

    function applyAppearanceToSpan(span) {
        if (!span) return;
        span.style.border = `var(--ocs-border-style) var(--ocs-border-color)`;
        span.style.background = `var(--ocs-background-color)`;
    }

    function removeSnippetButton() {
        const btn = document.getElementById(SNIPPET_BTN_ID);
        if (btn) btn.remove();
    }

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

    function showMessage(msg, timeout = 4000) {
        if (typeof document === 'undefined') return;
        const div = document.createElement('div');
        div.className = 'ocs-message';
        div.textContent = msg;
        Object.assign(div.style, {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: '#333',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '10000',
            opacity: '0.9'
        });
        document.body.appendChild(div);
        setTimeout(() => div.remove(), timeout);
    }

    function showSnippetButton(rect) {
        removeSnippetButton();
        const btn = document.createElement('button');
        btn.id = SNIPPET_BTN_ID;
        btn.textContent = '+ Snippet';
        Object.assign(btn.style, {
            position: 'absolute',
            zIndex: '9999',
            padding: '4px 8px',
            background: 'var(--ocs-border-color)',
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

    global.SNIPPET_BTN_ID = SNIPPET_BTN_ID;
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
                    if (typeof updateSnippetAlias === 'function') {
                        updateSnippetAlias(span.dataset.snippetId, alias);
                    }
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
    global.SNIPPET_BTN_ID = SNIPPET_BTN_ID;
    global.hexToRgba = hexToRgba;
    global.injectAppearanceStyle = injectAppearanceStyle;
    global.applyAppearanceToSpan = applyAppearanceToSpan;
    global.removeSnippetButton = removeSnippetButton;
    global.updatePillPosition = updatePillPosition;
    global.injectCopyPill = injectCopyPill;
    global.copySnippetText = copySnippetText;
    global.showMessage = showMessage;
    global.showSnippetButton = showSnippetButton;
    global.enableBadgeEditing = enableBadgeEditing;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            SNIPPET_BTN_ID,
            hexToRgba,
            injectAppearanceStyle,
            applyAppearanceToSpan,
            removeSnippetButton,
            updatePillPosition,
            injectCopyPill,
            copySnippetText,
            showMessage,
            showSnippetButton,
            enableBadgeEditing,
        };
    }
})(typeof window !== "undefined" ? window : global);
