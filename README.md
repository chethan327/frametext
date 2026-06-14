# FrameText - Chrome Extension

FrameText is a powerful Chrome browser extension that allows you to instantly capture any video frame on your screen, extract text from it using OCR, and perform actions like copy, translate, or Google search. You can also download the captured frames.

## 📦 Installation

To load this extension locally in Chrome for development or testing:

1. Open Chrome and navigate to `chrome://extensions/`.
2. Turn on **"Developer mode"** in the top right corner.
3. Click the **"Load unpacked"** button.
4. Select the `Fram2text` directory containing this extension's files (specifically where the `manifest.json` is located).
5. Pin the FrameText extension icon to your browser toolbar for quick access.

## 🚀 How to Use

1. **Play a Video**: Go to any webpage with an HTML5 video (e.g., YouTube, News websites).
2. **Trigger Capture**: Click the FrameText extension icon in the toolbar, then click the **"📸 Capture Frame"** button.
3. **Crop & Extract**: 
   - A full-screen overlay will appear containing the captured video frame.
   - Click and drag with your mouse over the image to select a specific region containing the text you want to extract.
   - In the sidebar, select your target language (English, Hindi, etc.) and click **"🔍 Extract Text"**.
   - You can copy the extracted text, search it on Google, or translate it instantly.
4. **Download Image**: 
   - Switch to the "Image Mode" tab.
   - Click the download buttons to save the selected crop (or the full frame if no selection was made) as a JPG or PNG.

## 🧪 Testing Checklist

Follow this checklist to verify all functionalities are working properly:

- [ ] **YouTube video**: Play a YouTube video, capture a frame, select a region, and verify OCR works.
- [ ] **News website video**: Test the capture feature on a generic news site HTML5 player (e.g., BBC, CNN).
- [ ] **Plain HTML5 video**: Test on a simple webpage with a `<video>` tag.
- [ ] **Paused video**: Ensure capturing works perfectly even if the video is paused (as long as it has started playing at least once).
- [ ] **Text Overlay/Subtitles**: Test OCR specifically on a frame with subtitles or text overlay to verify the Tesseract.js engine extracts the text correctly.
- [ ] **DRM Video Validation**: Attempt to capture a video on a site with DRM protection (e.g., Netflix, Hulu). You should receive a capture error or an entirely blank/black frame due to standard browser CORS and DRM restrictions.
- [ ] **Multiple Languages**: Test OCR extraction on Spanish or Hindi text using the language dropdown.
- [ ] **Image Downloading**: Verify both PNG and JPG download buttons correctly save the image locally.

## 🛠 Tech Stack

- **Platform**: Chrome Extension (Manifest V3)
- **Languages**: HTML5, CSS3, Vanilla JavaScript
- **OCR Engine**: Tesseract.js v5 (via CDN, loaded in sandboxed iframe)
- **Architecture**: Injects a sandboxed iframe overlay into the active page to bypass host CSS conflicts and CSP constraints while loading external CDN scripts.
