/**
 * Element Snapper - Main Content Script
 * Entry point for content script functionality
 * Manages global state and message handling
 */

// Initialize on page load
console.log('Element Snapper: Content script loaded');

// Store scrollbar state for multi-capture
let scrollbarState = null;

/**
 * Handle viewport capture
 * Captures the current visible viewport without element selection
 */
async function handleViewportCapture() {
  try {
    // Load delay setting
    const settings = await chrome.storage.local.get(['delay']);
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Notify popup that capture started
    chrome.runtime.sendMessage({ action: 'captureStarted' });

    // Get current viewport and scroll information
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Prepare capture data for viewport
    const captureData = {
      captureMode: 'viewport',
      scroll: scroll,
      documentDimensions: docDims,
      devicePixelRatio: dpr,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    // Request screenshot from service worker
    const response = await chrome.runtime.sendMessage({
      action: 'captureViewportOrPage',
      data: captureData
    });

    if (response.success) {
      if (response.action === 'download') {
        showNotification('Screenshot saved to downloads', 'success');
      }
      chrome.runtime.sendMessage({ action: 'captureSuccess' });
    } else {
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: response.error
      });
    }
  } catch (error) {
    console.error('Viewport capture failed:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  }
}

/**
 * Handle clipboard copy
 * Copies image data URL to clipboard
 * @param {string} dataUrl - Image data URL
 */
async function handleClipboardCopy(dataUrl) {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Use Clipboard API to write image
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);

    console.log('Image copied to clipboard successfully');
    showNotification('Copied to clipboard', 'success');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

/**
 * Handle full page capture
 * Captures the entire scrollable page with auto-scroll
 */
async function handleFullPageCapture() {
  try {
    // Load delay setting
    const settings = await chrome.storage.local.get(['delay']);
    const delay = settings.delay || 0;

    // Show countdown if delay is enabled
    if (delay > 0) {
      injectCountdownStyles();
      await showCountdownOverlay(delay);
    }

    // Notify popup that capture started
    chrome.runtime.sendMessage({ action: 'captureStarted' });

    // Scroll to top before starting
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get page dimensions
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Prepare capture data for full page
    const captureData = {
      captureMode: 'fullpage',
      scroll: scroll,
      documentDimensions: docDims,
      devicePixelRatio: dpr,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    // Request screenshot from service worker
    const response = await chrome.runtime.sendMessage({
      action: 'captureViewportOrPage',
      data: captureData
    });

    if (response.success) {
      if (response.action === 'download') {
        showNotification('Screenshot saved to downloads', 'success');
      }
      chrome.runtime.sendMessage({ action: 'captureSuccess' });
    } else {
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: response.error
      });
    }
  } catch (error) {
    console.error('Full page capture failed:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  }
}

/**
 * Message handler
 * Routes messages from popup and service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations with IIFE
  (async () => {
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

      case 'hideScrollbars':
        // Hide scrollbars for multi-capture (called before first tile)
        scrollbarState = hideScrollbars();
        sendResponse({ success: true });
        break;

      case 'showScrollbars':
        // Restore scrollbars after multi-capture (called after last tile)
        showScrollbars(scrollbarState);
        scrollbarState = null;
        sendResponse({ success: true });
        break;

      case 'scrollToPosition':
        // Service worker requests scroll to specific position
        window.scrollTo({
          left: message.x,
          top: message.y,
          behavior: 'instant'  // Instant scroll for precise positioning
        });

        // Wait for rendering to complete using multiple RAF cycles
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Double RAF ensures rendering is complete
              setTimeout(resolve, 100);
            });
          });
        });

        // Return actual scroll position (may differ from target if at document bounds)
        const actualScroll = getScrollOffsets();
        sendResponse({ scroll: actualScroll });
        break;

      case 'showDebugBorder':
        // Show debug border for tile capture visualization
        showDebugBorder(message.x, message.y, message.width, message.height);
        sendResponse({ success: true });
        break;

      case 'hideDebugBorder':
        // Hide debug border
        hideDebugBorder();
        sendResponse({ success: true });
        break;

      case 'captureViewport':
        // Capture visible viewport without element selection
        await handleViewportCapture();
        sendResponse({ success: true });
        break;

      case 'captureFullPage':
        // Capture full page with scrolling
        await handleFullPageCapture();
        sendResponse({ success: true });
        break;

      case 'copyToClipboard':
        // Copy image to clipboard
        await handleClipboardCopy(message.dataUrl);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();

  return true; // Keep message channel open for async responses
});
