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
          behavior: 'smooth'  // Smooth scroll animation
        });

        // Wait for smooth scroll animation to complete and layout to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

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

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();

  return true; // Keep message channel open for async responses
});
