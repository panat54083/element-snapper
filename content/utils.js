/**
 * Utility functions for element screenshot capture
 */

/**
 * Get viewport-relative bounding rect for an element
 * @param {HTMLElement} element - Target element
 * @returns {object} Bounding rect with x, y, width, height
 */
function getElementRect(element) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Get page scroll offsets
 * @returns {object} Scroll offsets with x and y
 */
function getScrollOffsets() {
  return {
    x: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
    y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop
  };
}

/**
 * Get document dimensions
 * @returns {object} Document dimensions with width and height
 */
function getDocumentDimensions() {
  return {
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    )
  };
}

/**
 * Scroll element into view smoothly
 * @param {HTMLElement} element - Element to scroll into view
 * @returns {Promise<void>} Resolves when scroll is complete
 */
function scrollIntoView(element) {
  return new Promise((resolve) => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Wait for scroll to complete
    setTimeout(resolve, 400);
  });
}

/**
 * Check if element is a cross-origin iframe
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if cross-origin iframe
 */
function isCrossOriginIframe(element) {
  if (element.tagName !== 'IFRAME') return false;

  try {
    // Try to access iframe's contentDocument
    // Will throw if cross-origin
    const doc = element.contentDocument;
    return false;
  } catch (e) {
    return true;
  }
}

/**
 * Inject professional highlight styles
 * Clean, minimal design with blue outline
 */
function injectHighlightStyles() {
  if (document.getElementById('element-screenshot-styles')) return;

  const style = document.createElement('style');
  style.id = 'element-screenshot-styles';
  style.textContent = `
    /* Hover highlight - professional blue outline */
    .element-screenshot-highlight {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
    }

    /* Minimal capture overlay */
    .element-screenshot-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.9);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Simple spinner */
    .element-screenshot-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: element-screenshot-spin 0.8s linear infinite;
    }

    @keyframes element-screenshot-spin {
      to { transform: rotate(360deg); }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Remove highlight styles
 */
function removeHighlightStyles() {
  const style = document.getElementById('element-screenshot-styles');
  if (style) style.remove();
}

/**
 * Show minimal capture overlay with spinner
 * @returns {HTMLElement} Overlay element
 */
function showCaptureOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'element-screenshot-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'element-screenshot-spinner';

  overlay.appendChild(spinner);
  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Remove capture overlay
 * @param {HTMLElement} overlay - Overlay element to remove
 */
function removeCaptureOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.remove();
  }
}

/**
 * Hide scrollbars temporarily (for clean multi-capture screenshots)
 * @returns {object} Object with restore function
 */
function hideScrollbars() {
  // Store original styles
  const originalHtmlOverflow = document.documentElement.style.overflow;
  const originalBodyOverflow = document.body.style.overflow;

  // Hide scrollbars
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  return {
    restore: () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    }
  };
}

/**
 * Show scrollbars (restore after hiding)
 * @param {object} scrollbarState - State object returned from hideScrollbars
 */
function showScrollbars(scrollbarState) {
  if (scrollbarState && scrollbarState.restore) {
    scrollbarState.restore();
  }
}
