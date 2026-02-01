/**
 * Element Screenshot Capture - Main Content Script
 * Entry point for content script functionality
 * Manages global state and message handling
 */

// Initialize on page load
console.log('Element Screenshot Capture: Content script loaded');

/**
 * Message handler
 * Routes messages from popup and service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getState':
      // Return current selection state
      sendResponse({ isSelecting: elementSelector.isSelecting() });
      break;

    case 'startSelection':
      // Start element selection mode
      elementSelector.start();
      sendResponse({ success: true });
      break;

    case 'cancelSelection':
      // Cancel element selection mode
      elementSelector.stop();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return true; // Keep message channel open for async responses
});
