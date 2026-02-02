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
      outline: 2px solid #3b82f6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1) !important;
      border-radius: 2px !important;
      transition: all 0.1s ease !important;
    }

    /* Minimal capture overlay - dark glass effect */
    .element-screenshot-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      transition: opacity 0.3s ease;
    }

    /* Modern spinner */
    .element-screenshot-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: element-screenshot-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      margin-bottom: 16px;
    }

    .element-screenshot-text {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        opacity: 0.9;
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

  const text = document.createElement('div');
  text.className = 'element-screenshot-text';
  text.textContent = 'Processing Capture...';

  overlay.appendChild(spinner);
  overlay.appendChild(text);
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

/**
 * Show debug border overlay for tile capture
 * @param {number} x - X position in viewport (CSS pixels)
 * @param {number} y - Y position in viewport (CSS pixels)
 * @param {number} width - Width (CSS pixels)
 * @param {number} height - Height (CSS pixels)
 * @returns {HTMLElement} Debug border element
 */
function showDebugBorder(x, y, width, height) {
  // Remove any existing debug border
  const existing = document.getElementById('element-screenshot-debug-border');
  if (existing) existing.remove();

  const border = document.createElement('div');
  border.id = 'element-screenshot-debug-border';
  border.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    border: 3px solid red;
    box-shadow: 0 0 0 1px rgba(255, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 0, 0, 0.3);
    pointer-events: none;
    z-index: 2147483646;
    background: rgba(255, 0, 0, 0.05);
  `;

  document.body.appendChild(border);
  return border;
}

/**
 * Remove debug border overlay
 */
function hideDebugBorder() {
  const border = document.getElementById('element-screenshot-debug-border');
  if (border) border.remove();
}

/**
 * Show countdown overlay before capture
 * @param {number} seconds - Number of seconds to count down
 * @returns {Promise<void>} Resolves when countdown completes
 */
function showCountdownOverlay(seconds) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'element-screenshot-countdown-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: element-screenshot-fade-in 0.2s ease;
    `;

    // Create countdown number
    const countdownNumber = document.createElement('div');
    countdownNumber.style.cssText = `
      font-size: 120px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 24px;
      color: #3b82f6;
      text-shadow: 0 0 40px rgba(59, 130, 246, 0.5);
      animation: element-screenshot-pulse 1s ease infinite;
    `;
    countdownNumber.textContent = seconds;

    // Create message
    const message = document.createElement('div');
    message.style.cssText = `
      font-size: 18px;
      font-weight: 500;
      opacity: 0.9;
      letter-spacing: 0.02em;
    `;
    message.textContent = 'Preparing to capture...';

    overlay.appendChild(countdownNumber);
    overlay.appendChild(message);
    document.body.appendChild(overlay);

    // Countdown logic
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownNumber.textContent = remaining;
      } else {
        clearInterval(interval);
        // Fade out
        overlay.style.animation = 'element-screenshot-fade-out 0.2s ease';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 200);
      }
    }, 1000);
  });
}

/**
 * Add countdown animation styles if not already present
 */
function injectCountdownStyles() {
  if (document.getElementById('element-screenshot-countdown-styles')) return;

  const style = document.createElement('style');
  style.id = 'element-screenshot-countdown-styles';
  style.textContent = `
    @keyframes element-screenshot-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes element-screenshot-fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes element-screenshot-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }
  `;

  document.head.appendChild(style);
}
/**
 * Show toast notification
 * @param {string} message - Notification message
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.getElementById('element-screenshot-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'element-screenshot-notification';

  // Icon based on type
  const icon = type === 'success'
    ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6023 18.3333 10 18.3333C5.39762 18.3333 1.66666 14.6024 1.66666 10C1.66666 5.39763 5.39762 1.66667 10 1.66667C14.6023 1.66667 18.3333 5.39763 18.3333 10Z" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transform: translateY(-20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  `;

  notification.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  });

  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
