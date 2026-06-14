document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const statusArea = document.getElementById('statusArea');

  const setStatus = (msg, type = 'ready') => {
    statusArea.textContent = msg;
    statusArea.className = `status-${type}`;
  };

  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      setStatus('Capturing...', 'working');

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        setStatus('No active tab found', 'error');
        captureBtn.disabled = false;
        return;
      }

      // Ensure content script is injected (in case it wasn't statically loaded, though MV3 does it)
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'CAPTURE_FRAME' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('Cannot capture on this page', 'error');
          captureBtn.disabled = false;
          return;
        }

        if (response && response.error) {
          setStatus(response.error, 'error');
          captureBtn.disabled = false;
        } else if (response && response.success) {
          setStatus('Frame captured!', 'ready');
          setTimeout(() => window.close(), 1000); // Close popup after success
        } else {
          setStatus('Unknown error occurred', 'error');
          captureBtn.disabled = false;
        }
      });
    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
      captureBtn.disabled = false;
    }
  });
});
