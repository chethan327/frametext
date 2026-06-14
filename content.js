// content.js

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CAPTURE_FRAME') {
    handleCaptureRequest().then(sendResponse);
    return true; // Keep the message channel open for async response
  }
});

async function handleCaptureRequest() {
  try {
    const video = findBestVideo();
    if (!video) {
      return { error: 'No playing video found on this page.' };
    }

    const frameDataUrl = captureVideoFrame(video);
    if (!frameDataUrl) {
      return { error: 'Failed to capture frame. The video might be DRM-protected.' };
    }

    injectOverlay(frameDataUrl);
    return { success: true };
  } catch (err) {
    console.error('FrameText Capture Error:', err);
    return { error: err.message || 'An unknown error occurred.' };
  }
}

function findBestVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  
  // For YouTube, prefer the main movie player video
  const ytVideo = document.querySelector('#movie_player video');
  if (ytVideo && videos.includes(ytVideo)) {
    return ytVideo;
  }

  // Filter for visible/meaningful videos
  const validVideos = videos.filter(v => {
    // Check if it has dimensions
    if (v.videoWidth < 100 || v.videoHeight < 100) return false;
    // Check if it's currently playing or recently paused (has progressed)
    if (v.currentTime === 0) return false;
    return true;
  });

  if (validVideos.length === 0) return null;

  // Pick the largest one
  return validVideos.reduce((largest, current) => {
    const currentArea = current.videoWidth * current.videoHeight;
    const largestArea = largest.videoWidth * largest.videoHeight;
    return currentArea > largestArea ? current : largest;
  });
}

function captureVideoFrame(video) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Check if the canvas is blank (all black/transparent) due to CORS/DRM
    // We check a few random pixels in the middle
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let isBlank = true;
    // Check every 100th pixel to be fast
    for (let i = 0; i < imageData.length; i += 400) {
      if (imageData[i] !== 0 || imageData[i+1] !== 0 || imageData[i+2] !== 0 || imageData[i+3] !== 0) {
        isBlank = false;
        break;
      }
    }
    
    if (isBlank) {
      // It might be genuinely black, but often means DRM/CORS
      // Let's just return the data URL anyway, but it's likely useless. 
      // We could throw an error, but let's let the user see it's blank.
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Canvas capture failed:', e);
    // Usually a SecurityError if tainted by CORS
    return null;
  }
}

function injectOverlay(frameDataUrl) {
  // Check if overlay already exists
  let iframe = document.getElementById('frametext-overlay-iframe');
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement('iframe');
  iframe.id = 'frametext-overlay-iframe';
  
  // Use the extension's sandboxed page
  iframe.src = chrome.runtime.getURL('overlay/overlay.html');
  
  // Styling to make it full screen and overlaying everything
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '999999999',
    border: 'none',
    backgroundColor: 'transparent',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  document.body.appendChild(iframe);

  // Fade in
  setTimeout(() => {
    iframe.style.opacity = '1';
  }, 50);

  // Listen for the iframe to load so we can send the image data
  // Also listen for messages from the iframe (like closing or translating)
  const messageListener = (event) => {
    // Only accept messages from our iframe
    if (event.source !== iframe.contentWindow) return;

    if (event.data.action === 'READY') {
      iframe.contentWindow.postMessage({
        action: 'INIT_FRAME',
        imageData: frameDataUrl
      }, '*');
    } else if (event.data.action === 'CLOSE') {
      iframe.style.opacity = '0';
      setTimeout(() => {
        iframe.remove();
        window.removeEventListener('message', messageListener);
      }, 300);
    } else if (event.data.action === 'OPEN_URL') {
      chrome.runtime.sendMessage({ action: 'open_url', url: event.data.url });
    } else if (event.data.action === 'COPY_TEXT') {
      navigator.clipboard.writeText(event.data.text).catch(err => console.error('Clipboard copy failed:', err));
    } else if (event.data.action === 'DOWNLOAD') {
      const a = document.createElement('a');
      a.href = event.data.dataUrl;
      a.download = event.data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  window.addEventListener('message', messageListener);
}
