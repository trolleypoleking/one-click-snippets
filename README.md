# One-Click Snippets

One-Click Snippets is a Chrome extension that lets you mark passages in Google Docs and copy them later with a single click.

![highlight screenshot](docs/screenshots/highlight.png)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the unit tests:
   ```bash
   npm test
   ```
3. Load the extension in Chrome:
   - Open `chrome://extensions` and enable **Developer mode**.
   - Click **Load unpacked** and select this project directory.
4. Ensure host permissions include both Google Docs URLs:
   - `https://docs.google.com/document/*`
   - `https://docs.googleusercontent.com/*`

This extension runs entirely from its content and popup scripts, so there is no
background service worker to configure or reload.

## Features

- **Add snippets easily** – highlight text in Google Docs and press the `+ Snippet` button that appears.
- **Persistent storage** – snippets are saved with Chrome sync storage and restored on reload.
- **Quick copy** – click the small copy pill on each snippet or use custom hotkeys.
- **Search overlay** – press `Ctrl+K` to search snippets with fuzzy matching.
- **Customizable appearance** – change border color, style and animation on the options page.
- **Assign hotkeys** – manage hotkeys for each snippet from the options page.
- **Popup list** – the extension popup shows snippets for the current document.
- **Editable labels** – double click a snippet’s badge to rename it in place.
- **No background script** – the extension has no background service worker.

![overlay screenshot](docs/screenshots/overlay.png)

![popup screenshot](docs/screenshots/popup.png)

## License

MIT
