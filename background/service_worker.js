/**
 * Element Screenshot Capture - Service Worker
 * Handles screenshot capture, cropping, and download
 * Uses capture+crop technique with DPR-aware math
 */

/**
 * Message handler
 * Processes capture requests from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureElement') {
    // Handle async capture
    handleElementCapture(message.data, sender.tab.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }
});

/**
 * Main capture handler
 * Orchestrates screenshot capture, crop, and download
 * @param {object} data - Capture data from content script
 * @param {number} tabId - Tab ID for capturing
 * @returns {Promise<object>} Result object with success status
 */
async function handleElementCapture(data, tabId) {
  try {
    // Step 1: Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });

    // Step 2: Load settings
    const settings = await chrome.storage.local.get(['format', 'quality']);
    const outputFormat = settings.format || 'png';
    const outputQuality = settings.quality || 95;

    // Step 3: Crop to element bounds
    const croppedBlob = await cropImageToElement(dataUrl, data, outputFormat, outputQuality);

    // Step 4: Save to downloads
    const filename = generateFilename(data.elementInfo, outputFormat);
    await downloadImage(croppedBlob, filename);

    return { success: true };
  } catch (error) {
    console.error('Capture failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Crop captured screenshot to element bounds
 * Handles DPR scaling and coordinate conversion
 *
 * DPR Math Explanation:
 * - captureVisibleTab captures at physical resolution (CSS pixels × DPR)
 * - Element rect is in CSS pixels relative to viewport
 * - Canvas operations need physical pixels
 *
 * Coordinate Conversion:
 * - Element is at (rect.x, rect.y) in viewport (CSS pixels)
 * - In captured image, this is at (rect.x × DPR, rect.y × DPR) (physical pixels)
 * - Source region: (sx, sy, sWidth, sHeight) all in physical pixels
 * - Destination: (0, 0, rect.width × DPR, rect.height × DPR)
 *
 * @param {string} dataUrl - Full screenshot data URL
 * @param {object} data - Capture data with rect, scroll, DPR
 * @param {string} format - Output format (png/jpg)
 * @param {number} quality - Output quality (1-100)
 * @returns {Promise<Blob>} Cropped image blob
 */
async function cropImageToElement(dataUrl, data, format, quality) {
  try {
    const { rect, devicePixelRatio: dpr } = data;

    // Validate element dimensions
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error('Element has zero dimensions');
    }

    // Calculate physical pixel dimensions
    const physicalWidth = Math.round(rect.width * dpr);
    const physicalHeight = Math.round(rect.height * dpr);

    // Validate canvas size limits
    const MAX_DIMENSION = 16384;
    if (physicalWidth > MAX_DIMENSION || physicalHeight > MAX_DIMENSION) {
      throw new Error(`Element too large (max ${MAX_DIMENSION}px)`);
    }

    // Convert dataURL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create ImageBitmap from blob (works in service worker)
    const imageBitmap = await createImageBitmap(blob);

    // Create canvas sized to element (physical pixels)
    const canvas = new OffscreenCanvas(physicalWidth, physicalHeight);
    const ctx = canvas.getContext('2d');

    // Source coordinates in captured image (physical pixels)
    // Element is at (rect.x, rect.y) in viewport
    // No need to account for scroll since captureVisibleTab only captures viewport
    const sx = Math.round(rect.x * dpr);
    const sy = Math.round(rect.y * dpr);
    const sWidth = physicalWidth;
    const sHeight = physicalHeight;

    // Validate source region is within image bounds
    if (sx < 0 || sy < 0 ||
        sx + sWidth > imageBitmap.width ||
        sy + sHeight > imageBitmap.height) {
      console.warn('Element partially outside viewport, clamping coordinates');

      // Clamp to image bounds
      const clampedSX = Math.max(0, sx);
      const clampedSY = Math.max(0, sy);
      const clampedWidth = Math.min(sWidth, imageBitmap.width - clampedSX);
      const clampedHeight = Math.min(sHeight, imageBitmap.height - clampedSY);

      if (clampedWidth <= 0 || clampedHeight <= 0) {
        throw new Error('Element is completely outside viewport');
      }
    }

    // Draw cropped region to canvas
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
      imageBitmap,
      sx, sy, sWidth, sHeight,           // Source region (physical pixels)
      0, 0, physicalWidth, physicalHeight // Destination (full canvas)
    );

    // Convert canvas to blob
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const qualityParam = format === 'jpg' ? quality / 100 : undefined;

    const croppedBlob = await canvas.convertToBlob({
      type: mimeType,
      quality: qualityParam
    });

    // Cleanup
    imageBitmap.close();
    canvas.width = 0;
    canvas.height = 0;

    return croppedBlob;

  } catch (error) {
    throw new Error(`Crop failed: ${error.message}`);
  }
}

/**
 * Generate filename for screenshot
 * Format: screenshot_[element]_[timestamp].[ext]
 * @param {object} elementInfo - Element metadata
 * @param {string} format - File format
 * @returns {string} Filename
 */
function generateFilename(elementInfo, format) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);

  // Use element ID or tag name for filename
  const elementName = elementInfo.id ||
                     elementInfo.tagName.toLowerCase() ||
                     'element';

  // Sanitize element name
  const safeName = elementName
    .replace(/[^a-z0-9_-]/gi, '_')
    .substring(0, 30);

  const ext = format === 'jpg' ? 'jpg' : 'png';

  return `screenshot_${safeName}_${timestamp}.${ext}`;
}

/**
 * Download image blob
 * Uses chrome.downloads API to save without prompt
 * @param {Blob} blob - Image blob
 * @param {string} filename - Download filename
 * @returns {Promise<void>}
 */
async function downloadImage(blob, filename) {
  return new Promise((resolve, reject) => {
    // Convert blob to object URL
    const url = URL.createObjectURL(blob);

    // Start download
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false  // Auto-save to default downloads folder
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      // Wait for download to complete, then revoke object URL
      chrome.downloads.onChanged.addListener(function listener(delta) {
        if (delta.id === downloadId && delta.state?.current === 'complete') {
          chrome.downloads.onChanged.removeListener(listener);
          URL.revokeObjectURL(url);
          resolve();
        }
      });
    });
  });
}
