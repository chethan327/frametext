// overlay.js

let imageDataUrl = null;
let img = new Image();
let selection = null; // {x, y, w, h} in natural image coordinates
let isDragging = false;
let startPos = { x: 0, y: 0, clientX: 0, clientY: 0 };
let currentRect = null;

const elements = {
  closeBtn: document.getElementById('closeBtn'),
  imageCanvas: document.getElementById('imageCanvas'),
  cropCanvas: document.getElementById('cropCanvas'), // We will hide this and draw everything on imageCanvas
  wrapper: document.querySelector('.canvas-wrapper'),
  selectionBox: document.getElementById('selectionBox'),
  selectionDim: document.querySelector('.selection-dimensions'),
  
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Text Mode
  ocrLang: document.getElementById('ocrLang'),
  extractBtn: document.getElementById('extractBtn'),
  ocrLoading: document.getElementById('ocrLoading'),
  ocrProgressText: document.getElementById('ocrProgressText'),
  ocrProgressBar: document.getElementById('ocrProgressBar'),
  resultText: document.getElementById('resultText'),
  copyBtn: document.getElementById('copyBtn'),
  translateBtn: document.getElementById('translateBtn'),
  searchBtn: document.getElementById('searchBtn'),
  
  // Image Mode
  previewCanvas: document.getElementById('previewCanvas'),
  downloadJpgBtn: document.getElementById('downloadJpgBtn'),
  downloadPngBtn: document.getElementById('downloadPngBtn')
};

// Window Dragging Logic
const topBar = document.querySelector('.top-bar');
const container = document.querySelector('.overlay-container');
let isWindowDragging = false;
let windowDragOffset = { x: 0, y: 0 };

topBar.addEventListener('mousedown', (e) => {
  if (e.target.closest('.icon-btn')) return; // Ignore close button clicks
  isWindowDragging = true;
  const rect = container.getBoundingClientRect();
  windowDragOffset.x = e.clientX - rect.left;
  windowDragOffset.y = e.clientY - rect.top;
});

window.addEventListener('mousemove', (e) => {
  if (!isWindowDragging) return;
  container.style.left = `${e.clientX - windowDragOffset.x}px`;
  container.style.top = `${e.clientY - windowDragOffset.y}px`;
});

window.addEventListener('mouseup', () => {
  isWindowDragging = false;
});

// Hide the old crop canvas to avoid interference
if (elements.cropCanvas) elements.cropCanvas.style.display = 'none';

// Messaging with parent (content script)
window.addEventListener('message', (event) => {
  if (event.data.action === 'INIT_FRAME') {
    imageDataUrl = event.data.imageData;
    loadImage(imageDataUrl);
  }
});

// Tell parent we are ready
window.parent.postMessage({ action: 'READY' }, '*');

// Close
elements.closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ action: 'CLOSE' }, '*');
});

function openUrl(url) {
  window.parent.postMessage({ action: 'OPEN_URL', url }, '*');
}

// Load Image
function loadImage(src) {
  img.onload = () => {
    elements.imageCanvas.width = img.naturalWidth;
    elements.imageCanvas.height = img.naturalHeight;
    selection = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    drawMainCanvas();
    updatePreview();
  };
  img.src = src;
}

function drawMainCanvas() {
  const ctx = elements.imageCanvas.getContext('2d');
  // Just draw the clean image. The selectionBox DOM element handles the border and transparency.
  ctx.drawImage(img, 0, 0);
}

// Tabs Logic
elements.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    elements.tabBtns.forEach(b => b.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
  });
});

// Mouse Selection Logic
function getMousePos(evt) {
  const rect = elements.imageCanvas.getBoundingClientRect();
  const scaleX = elements.imageCanvas.width / rect.width;
  const scaleY = elements.imageCanvas.height / rect.height;

  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
    clientX: evt.clientX,
    clientY: evt.clientY
  };
}

elements.wrapper.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // Only left clicks
  
  isDragging = true;
  const pos = getMousePos(e);
  startPos = pos;
  currentRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
  
  const wrapperRect = elements.wrapper.getBoundingClientRect();
  elements.selectionBox.style.display = 'block';
  elements.selectionBox.style.left = `${pos.clientX - wrapperRect.left}px`;
  elements.selectionBox.style.top = `${pos.clientY - wrapperRect.top}px`;
  elements.selectionBox.style.width = `0px`;
  elements.selectionBox.style.height = `0px`;
  
  drawMainCanvas();
});

elements.wrapper.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const pos = getMousePos(e);
  
  const x = Math.min(startPos.x, pos.x);
  const y = Math.min(startPos.y, pos.y);
  const w = Math.abs(pos.x - startPos.x);
  const h = Math.abs(pos.y - startPos.y);
  
  // Clamp to image bounds
  currentRect = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.min(img.naturalWidth - Math.max(0, x), w),
    h: Math.min(img.naturalHeight - Math.max(0, y), h)
  };

  // Update visual DOM box
  const wrapperRect = elements.wrapper.getBoundingClientRect();
  const boxX = Math.min(startPos.clientX, pos.clientX) - wrapperRect.left;
  const boxY = Math.min(startPos.clientY, pos.clientY) - wrapperRect.top;
  const boxW = Math.abs(pos.clientX - startPos.clientX);
  const boxH = Math.abs(pos.clientY - startPos.clientY);
  
  elements.selectionBox.style.left = `${boxX}px`;
  elements.selectionBox.style.top = `${boxY}px`;
  elements.selectionBox.style.width = `${boxW}px`;
  elements.selectionBox.style.height = `${boxH}px`;
  
  elements.selectionDim.textContent = `${Math.round(currentRect.w)} × ${Math.round(currentRect.h)} px`;
  
  drawMainCanvas();
});

elements.wrapper.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  
  if (currentRect && currentRect.w > 10 && currentRect.h > 10) {
    selection = currentRect;
  } else {
    // Reset to full frame if click or tiny drag
    selection = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    elements.selectionBox.style.display = 'none';
  }
  
  drawMainCanvas();
  updatePreview();
});

elements.wrapper.addEventListener('dblclick', () => {
  selection = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  elements.selectionBox.style.display = 'none';
  drawMainCanvas();
  updatePreview();
});

function getSelectedImageData() {
  const canvas = document.createElement('canvas');
  canvas.width = selection.w;
  canvas.height = selection.h;
  const ctx = canvas.getContext('2d');
  // Always read from the pristine 'img', never from the darkened imageCanvas
  ctx.drawImage(img, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
  return canvas;
}

function updatePreview() {
  const selCanvas = getSelectedImageData();
  elements.previewCanvas.width = selCanvas.width;
  elements.previewCanvas.height = selCanvas.height;
  const pCtx = elements.previewCanvas.getContext('2d');
  pCtx.drawImage(selCanvas, 0, 0);
}

// Text Mode Actions
elements.extractBtn.addEventListener('click', async () => {
  if (!window.Tesseract) {
    elements.resultText.value = 'Error: Tesseract.js failed to load from CDN. Please check your internet connection.';
    return;
  }

  const checkedBoxes = document.querySelectorAll('#ocrLangGroup input:checked');
  const langs = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (langs.length === 0) {
    elements.resultText.value = 'Please select at least one language.';
    return;
  }
  
  const langStr = langs.join('+'); // e.g. 'eng+hin'

  const selCanvas = getSelectedImageData();
  const dataUrl = selCanvas.toDataURL('image/png');

  elements.extractBtn.disabled = true;
  elements.ocrLoading.classList.remove('hidden');
  elements.resultText.value = '';
  
  elements.copyBtn.disabled = true;
  elements.translateBtn.disabled = true;
  elements.searchBtn.disabled = true;

  try {
    const worker = await Tesseract.createWorker(langStr, 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          elements.ocrProgressText.textContent = `Reading text: ${Math.round(m.progress * 100)}%`;
          elements.ocrProgressBar.style.width = `${m.progress * 100}%`;
        } else {
          elements.ocrProgressText.textContent = m.status;
        }
      }
    });

    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();

    elements.resultText.value = text.trim() || 'No text detected. Try selecting a clearer region.';
    
    if (text.trim()) {
      elements.copyBtn.disabled = false;
      elements.translateBtn.disabled = false;
      elements.searchBtn.disabled = false;
    }

  } catch (err) {
    console.error('OCR Error:', err);
    elements.resultText.value = 'An error occurred during text extraction: ' + err.message;
  } finally {
    elements.extractBtn.disabled = false;
    elements.ocrLoading.classList.add('hidden');
  }
});

elements.copyBtn.addEventListener('click', () => {
  // Delegate copy action to parent content script to avoid iframe Clipboard API restrictions
  window.parent.postMessage({ action: 'COPY_TEXT', text: elements.resultText.value }, '*');
  const origText = elements.copyBtn.textContent;
  elements.copyBtn.textContent = '✅ Copied!';
  setTimeout(() => elements.copyBtn.textContent = origText, 2000);
});

elements.translateBtn.addEventListener('click', () => {
  const text = encodeURIComponent(elements.resultText.value);
  openUrl(`https://translate.google.com/?text=${text}`);
});

elements.searchBtn.addEventListener('click', () => {
  const text = encodeURIComponent(elements.resultText.value);
  openUrl(`https://www.google.com/search?q=${text}`);
});

// Image Mode Actions
function downloadImage(format) {
  const selCanvas = getSelectedImageData();
  const dataUrl = selCanvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.9 : undefined);
  // Delegate download action to parent content script to bypass iframe sandbox restrictions
  window.parent.postMessage({
    action: 'DOWNLOAD',
    dataUrl: dataUrl,
    filename: `frametext_capture_${new Date().getTime()}.${format}`
  }, '*');
}

elements.downloadJpgBtn.addEventListener('click', () => downloadImage('jpeg'));
elements.downloadPngBtn.addEventListener('click', () => downloadImage('png'));
