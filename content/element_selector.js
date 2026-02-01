/**
 * Element selector module
 * Handles element hover highlighting and click capture
 */

class ElementSelector {
  constructor() {
    this.isActive = false;
    this.currentElement = null;
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
  }

  /**
   * Start selection mode
   * Enables hover highlighting and click capture
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    injectHighlightStyles();

    // Add event listeners using capture phase
    document.addEventListener('mousemove', this.boundMouseMove, true);
    document.addEventListener('click', this.boundClick, true);

    // Change cursor
    document.body.style.cursor = 'crosshair';
  }

  /**
   * Stop selection mode
   * Removes all event listeners and highlights
   */
  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    // Remove event listeners
    document.removeEventListener('mousemove', this.boundMouseMove, true);
    document.removeEventListener('click', this.boundClick, true);

    // Clear current highlight
    if (this.currentElement) {
      this.currentElement.classList.remove('element-screenshot-highlight');
      this.currentElement = null;
    }

    // Restore cursor
    document.body.style.cursor = '';
  }

  /**
   * Handle mouse move event
   * Updates highlight on hovered element
   * @param {MouseEvent} event - Mouse move event
   */
  handleMouseMove(event) {
    if (!this.isActive) return;

    // Get element under cursor
    const element = document.elementFromPoint(event.clientX, event.clientY);

    if (!element || element === this.currentElement) return;

    // Remove previous highlight
    if (this.currentElement) {
      this.currentElement.classList.remove('element-screenshot-highlight');
    }

    // Add new highlight
    this.currentElement = element;
    element.classList.add('element-screenshot-highlight');
  }

  /**
   * Handle click event
   * Captures clicked element and initiates screenshot
   * @param {MouseEvent} event - Click event
   */
  async handleClick(event) {
    if (!this.isActive) return;

    // Prevent default action and propagation
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const element = event.target;

    // Stop selection mode
    this.stop();

    // Scroll element into view
    await scrollIntoView(element);

    // Get element position data
    const rect = getElementRect(element);
    const scroll = getScrollOffsets();
    const docDims = getDocumentDimensions();
    const dpr = window.devicePixelRatio || 1;

    // Check for cross-origin iframe
    const isCrossOrigin = isCrossOriginIframe(element);

    // Prepare capture data
    const captureData = {
      rect: rect,
      scroll: scroll,
      documentDimensions: docDims,
      devicePixelRatio: dpr,
      isCrossOriginIframe: isCrossOrigin,
      elementInfo: {
        tagName: element.tagName,
        id: element.id || null,
        className: element.className || null,
        textContent: element.textContent?.substring(0, 50) || null
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    };

    // Show overlay
    const overlay = showCaptureOverlay();

    try {
      // Notify popup that capture started
      chrome.runtime.sendMessage({ action: 'captureStarted' });

      // Request screenshot from service worker
      const response = await chrome.runtime.sendMessage({
        action: 'captureElement',
        data: captureData
      });

      // Remove overlay
      removeCaptureOverlay(overlay);

      if (response.success) {
        chrome.runtime.sendMessage({ action: 'captureSuccess' });
      } else {
        chrome.runtime.sendMessage({
          action: 'captureError',
          error: response.error
        });
      }
    } catch (error) {
      // Remove overlay
      removeCaptureOverlay(overlay);

      console.error('Capture failed:', error);
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error.message
      });
    }
  }

  /**
   * Check if selection mode is active
   * @returns {boolean} True if active
   */
  isSelecting() {
    return this.isActive;
  }
}

// Create singleton instance
const elementSelector = new ElementSelector();
