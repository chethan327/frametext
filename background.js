chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'open_url') {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
  }
});
