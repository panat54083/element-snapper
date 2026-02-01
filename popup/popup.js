/**
 * Element Screenshot Capture - Popup Controller
 * Manages popup UI state and communicates with content script
 */

// DOM elements
const captureBtn = document.getElementById('captureBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const formatSelect = document.getElementById('formatSelect');
const qualityInput = document.getElementById('qualityInput');
const qualityValue = document.getElementById('qualityValue');
const fullCaptureCheckbox = document.getElementById('fullCaptureCheckbox');

// Current state
let currentState = 'idle';

/**
 * Update UI to reflect current state
 * @param {string} state - One of: idle, selecting, capturing, success, error
 * @param {string} message - Status message to display
 */
function updateUI(state, message) {
  currentState = state;

  // Update button
  captureBtn.setAttribute('data-state', state);
  const btnText = captureBtn.querySelector('.btn-text');

  switch (state) {
    case 'idle':
      btnText.textContent = 'Capture';
      captureBtn.disabled = false;
      break;
    case 'selecting':
      btnText.textContent = 'Cancel';
      captureBtn.disabled = false;
      break;
    case 'capturing':
      btnText.textContent = 'Capturing...';
      captureBtn.disabled = true;
      break;
    case 'success':
      btnText.textContent = 'Captured';
      captureBtn.disabled = false;
      // Auto-reset to idle after 2 seconds
      setTimeout(() => updateUI('idle', 'Ready'), 2000);
      break;
    case 'error':
      btnText.textContent = 'Retry';
      captureBtn.disabled = false;
      // Auto-reset to idle after 3 seconds
      setTimeout(() => updateUI('idle', 'Ready'), 3000);
      break;
  }

  // Update status
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = message;
}

/**
 * Send message to content script
 * @param {object} message - Message object
 * @returns {Promise<any>} Response from content script
 */
async function sendToContentScript(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error('Failed to send message:', error);
    throw new Error('Please refresh the page');
  }
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
  const settings = await chrome.storage.local.get(['format', 'quality', 'fullCapture']);

  if (settings.format) {
    formatSelect.value = settings.format;
  }

  if (settings.quality) {
    qualityInput.value = settings.quality;
    qualityValue.textContent = settings.quality;
  }

  if (settings.fullCapture !== undefined) {
    fullCaptureCheckbox.checked = settings.fullCapture;
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  await chrome.storage.local.set({
    format: formatSelect.value,
    quality: parseInt(qualityInput.value),
    fullCapture: fullCaptureCheckbox.checked
  });
}

// Initialize popup
(async () => {
  // Load settings
  await loadSettings();

  // Get initial state from content script
  try {
    const response = await sendToContentScript({ action: 'getState' });

    if (response.isSelecting) {
      updateUI('selecting', 'Click element');
    } else {
      updateUI('idle', 'Ready');
    }
  } catch (error) {
    updateUI('error', error.message);
  }
})();

// Capture button click handler
captureBtn.addEventListener('click', async () => {
  if (currentState === 'idle' || currentState === 'success' || currentState === 'error') {
    // Start selection
    try {
      updateUI('selecting', 'Click element');
      await sendToContentScript({ action: 'startSelection' });
      // Close popup after starting selection
      window.close();
    } catch (error) {
      updateUI('error', error.message);
    }
  } else if (currentState === 'selecting') {
    // Cancel selection
    try {
      await sendToContentScript({ action: 'cancelSelection' });
      updateUI('idle', 'Ready');
    } catch (error) {
      updateUI('error', error.message);
    }
  }
});

// Format/quality/fullCapture change handlers
formatSelect.addEventListener('change', saveSettings);

qualityInput.addEventListener('input', () => {
  qualityValue.textContent = qualityInput.value;
});

qualityInput.addEventListener('change', saveSettings);
fullCaptureCheckbox.addEventListener('change', saveSettings);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureStarted') {
    updateUI('capturing', 'Processing');
  } else if (message.action === 'captureSuccess') {
    updateUI('success', 'Saved');
  } else if (message.action === 'captureError') {
    updateUI('error', message.error || 'Failed');
  }

  return true;
});
