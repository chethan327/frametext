# FrameText — Video Frame Text Extractor

> A Chrome browser extension that captures any video frame on any website, extracts text from it using on-device OCR, and lets you copy, translate, search, or download — all without leaving your browser.

---

## The Problem It Solves

You are watching a tutorial, a lecture recording, or a news video. The presenter shows a slide, a code snippet, a diagram, or a chart — and you want to copy that text into your notes. Your options right now:

- Pause → screenshot → open Google Lens → wait → copy → switch back. (5+ steps, breaks your flow)
- Write it down by hand (slow, error-prone)
- Rewind the video and pause-copy-type (painful for dense content)

**FrameText does it in 2 clicks.** Click the extension icon, click Capture Frame, drag over the text — done. The text is on your clipboard.

---

## Demo

> Play a video → click the extension icon → Capture Frame → drag to select → Extract Text → Copy

![FrameText Demo](https://img.shields.io/badge/Demo-Coming%20Soon-blue?style=for-the-badge)

---

## Features

- **One-click frame capture** — works on any HTML5 video on any website (YouTube, news sites, course platforms, Vimeo, etc.)
- **Drag-to-select crop tool** — pick only the region you care about, with live pixel dimensions shown
- **On-device OCR** — text extraction using Tesseract.js; no data ever leaves your browser
- **Multi-language OCR** — English, Hindi, Kannada, Telugu, Tamil, Spanish, French, German, Chinese
- **Copy to clipboard** — one click, instant
- **Google Translate** — opens the extracted text directly in Google Translate in a new tab
- **Google Search** — search any extracted text instantly
- **Image download** — save the captured frame or cropped region as JPG or PNG
- **Draggable overlay** — reposition the capture panel anywhere on screen
- **DRM detection** — shows a clear error for protected videos (Netflix, Hulu) instead of crashing silently
- **Zero backend** — no server, no API key, no cost, no data uploaded anywhere

---

## Installation (Developer Mode)

This extension is not yet published on the Chrome Web Store. Load it locally in under a minute:

1. Download or clone this repository
   ```bash
   git clone https://github.com/your-username/frametext.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Toggle on **Developer mode** (top-right corner)
4. Click **Load unpacked**
5. Select the `Fram2text` folder (the one containing `manifest.json`)
6. Pin the FrameText icon to your Chrome toolbar

---

## How to Use

1. **Play any video** on any website — YouTube, a news site, an online course
2. **Click the FrameText icon** in the Chrome toolbar
3. **Click "📸 Capture Frame"** — the overlay appears with the current video frame
4. **Drag to select** a region on the frame (or double-click to select the full frame)
5. Choose your language in the sidebar, then click **"🔍 Extract Text"**
6. The extracted text appears in an editable box — **Copy**, **Translate**, or **Google Search** it
7. Switch to **Image Mode** to download the frame as JPG or PNG
8. Press **X** or click the close button to dismiss the overlay

---

## Tech Stack

### Platform
| Technology | Version | Purpose |
|---|---|---|
| Chrome Extension | Manifest V3 | Extension platform and packaging |
| HTML5 | — | Popup and overlay UI structure |
| CSS3 | — | Styling, animations, dark theme |
| Vanilla JavaScript | ES2020+ | All logic — no frameworks, no build step |

### Core Browser APIs
| API | Where Used | What It Does |
|---|---|---|
| `Canvas API` | `content.js` | Draws the current video frame onto an invisible canvas using `ctx.drawImage(video)` — this is the frame capture mechanism |
| `canvas.toDataURL()` | `content.js` | Converts the canvas drawing into a base64-encoded PNG string that can be passed around in messages |
| `ctx.getImageData()` | `content.js` | Samples pixel data to detect blank/black frames from DRM-protected videos before showing an error |
| `document.querySelectorAll('video')` | `content.js` | Finds all video elements on the page to pick the best candidate |
| `navigator.clipboard.writeText()` | `content.js` | Writes extracted text to the system clipboard on behalf of the sandboxed overlay |
| `window.postMessage()` | `content.js` ↔ `overlay.js` | Cross-frame message passing between the injected iframe and the host page |
| `chrome.runtime.sendMessage()` | `popup.js`, `content.js` | Extension messaging between popup, content script, and background service worker |
| `chrome.tabs.sendMessage()` | `popup.js` | Sends the capture trigger to the content script running in the active tab |
| `chrome.tabs.create()` | `background.js` | Opens Google Translate or Google Search in a new tab on behalf of the sandboxed iframe |

### OCR Engine
| Technology | Details |
|---|---|
| **Tesseract.js v5** | Open-source OCR engine compiled to WebAssembly. Loaded from jsDelivr CDN. Runs entirely inside the browser — no image data is sent to any server. |
| **WebAssembly (WASM)** | Tesseract's core image processing runs as WASM for near-native speed in the browser |
| Multi-language support | Language models loaded on demand: `eng` (English), `hin` (Hindi), `kan` (Kannada), `tel` (Telugu), `tam` (Tamil), `spa` (Spanish), `fra` (French), `deu` (German), `chi_sim` (Chinese Simplified) |

### Architecture Decisions

#### Why a sandboxed iframe for the overlay?
Chrome Manifest V3 enforces a strict Content Security Policy on extension pages that **blocks loading external scripts** (like Tesseract.js from a CDN). A sandboxed iframe is listed in `manifest.json` under `sandbox.pages`, which gives it a relaxed CSP — allowing CDN scripts to load while keeping the extension compliant.

The tradeoff: sandboxed pages cannot use Chrome APIs (`chrome.tabs`, `navigator.clipboard`, etc.). This is solved by delegating those actions to `content.js` via `postMessage`.

#### Why postMessage instead of direct calls?
The overlay runs in a separate iframe — a completely isolated browser context. JavaScript cannot call functions across iframe boundaries directly. `window.postMessage()` is the browser-standard way to safely pass data between frames. Every user action in the overlay (copy, translate, download, close) is sent as a message to `content.js`, which performs the action using its direct page access.

#### Why no framework (React/Vue)?
A browser extension runs in a highly constrained environment with no build pipeline by default. Vanilla JS keeps the extension lightweight (< 50KB of custom code), avoids bundling complexity, and keeps the Chrome Web Store submission straightforward. The project demonstrates that complex UI (drag-to-crop, tab switching, progress bars) is achievable without any framework.

---

## Project Structure

```
Fram2text/
├── manifest.json              # Extension configuration — permissions, CSP, file declarations
├── background.js              # Service worker — opens tabs on behalf of the sandboxed iframe
├── content.js                 # Injected into every page — video detection, frame capture, iframe injection
│
├── popup/
│   ├── popup.html             # 320px popup UI — capture button, status area, instructions
│   ├── popup.css              # Dark theme (#1a1a2e background, #4fc3f7 accent)
│   └── popup.js              # Sends CAPTURE_FRAME message to content.js, handles response
│
├── overlay/
│   ├── overlay.html           # Full-screen sandboxed iframe — main interactive UI
│   ├── overlay.css            # Overlay styles — crop box, tabs, progress bar, download buttons
│   └── overlay.js            # Crop tool, Tesseract OCR, tab switching, postMessage bridge
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Message Flow

```
User clicks "Capture Frame"
        │
        ▼
  popup.js  ──── chrome.tabs.sendMessage(CAPTURE_FRAME) ────►  content.js
                                                                     │
                                                         findBestVideo() → captureVideoFrame()
                                                                     │
                                                             injectOverlay(base64PNG)
                                                                     │
                                                         iframe (overlay.html) loads
                                                                     │
  content.js  ◄──── postMessage({ action: 'READY' }) ────  overlay.js
       │
       └──── postMessage({ action: 'INIT_FRAME', imageData }) ────► overlay.js
                                                                          │
                                                                   User drags crop
                                                                   Tesseract.recognize()
                                                                          │
       ┌── postMessage(COPY_TEXT) ──────────────────────────────── overlay.js
       ├── postMessage(DOWNLOAD)
       └── postMessage(OPEN_URL) ──► background.js ──► chrome.tabs.create()
```

---

## Permissions Explained

| Permission | Why It's Needed |
|---|---|
| `activeTab` | Read the current tab to access its video elements and inject scripts |
| `scripting` | Programmatically inject `content.js` and the overlay into the active tab |
| `storage` | Pass the captured frame data between the popup and overlay contexts |
| `clipboardWrite` | Allow `content.js` to write the extracted OCR text to the system clipboard |
| `host_permissions: <all_urls>` | The extension must work on any website — not just YouTube |

---

## Known Limitations

| Limitation | Reason |
|---|---|
| Does not work on Netflix, Disney+, Prime Video | Widevine DRM tells the browser to block canvas access to protected video frames — this is a browser-enforced security boundary, not a bug |
| OCR accuracy varies | Tesseract.js performs best on high-contrast, clear fonts. Stylized text, low-resolution video, or overlapping elements reduce accuracy |
| Cross-origin videos may fail | Some websites serve video from a different domain with CORS restrictions that prevent canvas capture |
| First OCR run is slower | Tesseract language models (~4MB per language) are downloaded from CDN on first use and cached after |

---

## Planned Improvements

- [ ] Publish to the Chrome Web Store
- [ ] Firefox support (Manifest V2 compatible version)
- [ ] Keyboard shortcut trigger (no need to open the popup)
- [ ] Optional Google Cloud Vision API integration for higher OCR accuracy
- [ ] History panel — keep a log of captured frames and extracted text
- [ ] Auto-detect text regions (no manual selection needed)
- [ ] Dark/light theme toggle in overlay

---

## Testing Checklist

- [ ] YouTube video — capture frame, select region, verify OCR
- [ ] News website video (BBC, CNN) — verify HTML5 video detection
- [ ] Plain `<video>` tag on a static page
- [ ] Paused video (must have `currentTime > 0`)
- [ ] Video with subtitles or text overlay — test OCR accuracy
- [ ] DRM video (Netflix) — verify friendly error message appears
- [ ] Multi-language — test Hindi or Kannada text extraction
- [ ] Image download — verify JPG and PNG save correctly with timestamp filename

---

## Resume Highlights

- Built a **Chrome Manifest V3 browser extension** from scratch with zero dependencies outside of Tesseract.js
- Implemented **real-time video frame capture** using the HTML5 Canvas API (`ctx.drawImage(video)`)
- Integrated **Tesseract.js WebAssembly OCR** supporting 9 languages, running entirely on-device with no backend
- Designed a **sandboxed iframe architecture** to load CDN scripts within Manifest V3's strict Content Security Policy
- Built a **cross-frame postMessage communication system** to bridge the sandboxed overlay with Chrome APIs
- Implemented **DRM detection** by sampling canvas pixel data to identify blank frames before user-facing errors

---

## Tech Used at a Glance

`Chrome Extension` · `Manifest V3` · `Vanilla JavaScript` · `HTML5 Canvas API` · `Tesseract.js` · `WebAssembly` · `postMessage API` · `Clipboard API` · `Chrome Extensions API` · `CSS3 Animations`

---

## License

MIT License — free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

---

## Author

**Your Name**
- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)

---

*Built to solve a real problem — getting text off a video screen without breaking your workflow.*
