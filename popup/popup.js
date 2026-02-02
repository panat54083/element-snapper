/**
 * Element Snapper - Popup Controller
 * Manages popup UI state and communicates with content script
 */

// DOM elements
const captureBtn = document.getElementById('captureBtn');
const btnLabel = document.getElementById('btnLabel');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const captureViewportBtn = document.getElementById('captureViewportBtn');
const captureFullPageBtn = document.getElementById('captureFullPageBtn');

// Settings elements
const qualityInput = document.getElementById('qualityInput');
const qualityValue = document.getElementById('qualityValue');
const delayInput = document.getElementById('delayInput');
const delayValue = document.getElementById('delayValue');
const fullCaptureCheckbox = document.getElementById('fullCaptureCheckbox');
const debugModeCheckbox = document.getElementById('debugModeCheckbox');
const clipboardCheckbox = document.getElementById('clipboardCheckbox');
const formatRadios = document.querySelectorAll('input[name="format"]');

// Current state
let currentState = 'idle';

// Mapping for UI text
const STATE_CONFIG = {
  idle: { btn: 'Select Element', pill: 'idle', msg: 'Ready' },
  selecting: { btn: 'Cancel Selection', pill: 'selecting', msg: 'Selecting' },
  capturing: { btn: 'Capturing...', pill: 'capturing', msg: 'Processing' },
  success: { btn: 'Captured!', pill: 'success', msg: 'Saved' },
  error: { btn: 'Retry', pill: 'error', msg: 'Error' }
};

/**
 * Update UI to reflect current state
 * @param {string} state - One of: idle, selecting, capturing, success, error
 * @param {string} message - Optional override for status message
 */
function updateUI(state, message) {
  currentState = state;
  const config = STATE_CONFIG[state];

  // Update button state (for CSS styling)
  captureBtn.setAttribute('data-state', state);

  // Update button text if not capturing (capturing shows spinner)
  if (state !== 'capturing') {
    btnLabel.textContent = config.btn;
  }

  // Update disabled state
  captureBtn.disabled = (state === 'capturing');

  // Update status pill
  // Remove old state classes
  statusPill.classList.remove('idle', 'selecting', 'capturing', 'success', 'error');
  statusPill.classList.add(config.pill);

  // Update status text
  statusText.textContent = message || config.msg;

  // Auto-reset for success/error
  if (state === 'success') {
    setTimeout(() => updateUI('idle'), 2000);
  } else if (state === 'error') {
    setTimeout(() => updateUI('idle'), 3000);
  }
}

/**
 * Send message to content script
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
  const settings = await chrome.storage.local.get(['format', 'quality', 'delay', 'fullCapture', 'debugMode', 'copyToClipboard']);

  // Format (Radio buttons)
  if (settings.format) {
    const radio = document.querySelector(`input[name="format"][value="${settings.format}"]`);
    if (radio) radio.checked = true;
  }

  // Quality (Slider)
  if (settings.quality) {
    qualityInput.value = settings.quality;
    updateQualityDisplay(settings.quality);
  }

  // Delay (Slider)
  if (settings.delay !== undefined) {
    delayInput.value = settings.delay;
    updateDelayDisplay(settings.delay);
  }

  // Checkboxes
  if (settings.fullCapture !== undefined) {
    fullCaptureCheckbox.checked = settings.fullCapture;
  }

  if (settings.debugMode !== undefined) {
    debugModeCheckbox.checked = settings.debugMode;
  }

  if (settings.copyToClipboard !== undefined) {
    clipboardCheckbox.checked = settings.copyToClipboard;
  }
}

/**
 * Update slider visual value and text
 */
function updateQualityDisplay(value) {
  qualityValue.textContent = `${value}%`;
  qualityInput.style.setProperty('--val', `${value}%`);
}

/**
 * Update delay slider visual value and text
 */
function updateDelayDisplay(value) {
  delayValue.textContent = value === 0 ? 'Off' : `${value}s`;
  delayInput.style.setProperty('--val', `${(value / 10) * 100}%`);
}

/**
 * Update quality slider visibility based on format
 */
function updateQualityState() {
  const selectedFormat = document.querySelector('input[name="format"]:checked')?.value || 'png';
  const qualityGroup = qualityInput.closest('.setting-group');
  const qualityLabel = qualityGroup.querySelector('.setting-label');

  if (selectedFormat === 'png') {
    qualityGroup.classList.add('disabled');
    qualityInput.disabled = true;
    qualityLabel.textContent = 'Quality (JPG Only)';
  } else {
    qualityGroup.classList.remove('disabled');
    qualityInput.disabled = false;
    qualityLabel.textContent = 'Quality';
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  const selectedFormat = document.querySelector('input[name="format"]:checked').value;

  // Update UI state immediately
  updateQualityState();

  await chrome.storage.local.set({
    format: selectedFormat,
    quality: parseInt(qualityInput.value),
    delay: parseInt(delayInput.value),
    fullCapture: fullCaptureCheckbox.checked,
    debugMode: debugModeCheckbox.checked,
    copyToClipboard: clipboardCheckbox.checked
  });
}

// Initialize popup
// Wrap in async immediately invoked function
(async () => {
  await loadSettings();
  updateQualityState(); // Ensure correct initial state


  // Get initial state from content script
  try {
    const response = await sendToContentScript({ action: 'getState' });

    if (response && response.isSelecting) {
      updateUI('selecting');
    } else {
      updateUI('idle');
    }
  } catch (error) {
    // If content script is not ready (e.g. restricted page), just show idle or error
    // Don't show error immediately on simple popup open if just not injected yet
    console.log("Content script not ready:", error);
    updateUI('idle');
  }
})();

// Event Listeners

// Capture Button
captureBtn.addEventListener('click', async () => {
  if (currentState === 'idle' || currentState === 'success' || currentState === 'error') {
    try {
      updateUI('selecting');
      await sendToContentScript({ action: 'startSelection' });
      window.close(); // Close popup so user can select
    } catch (error) {
      updateUI('error', error.message);
    }
  } else if (currentState === 'selecting') {
    try {
      await sendToContentScript({ action: 'cancelSelection' });
      updateUI('idle');
    } catch (error) {
      updateUI('error', error.message);
    }
  }
});

// Settings - Format Radios
formatRadios.forEach(radio => {
  radio.addEventListener('change', saveSettings);
});

// Settings - Quality Slider
qualityInput.addEventListener('input', (e) => {
  updateQualityDisplay(e.target.value);
});
qualityInput.addEventListener('change', saveSettings);

// Settings - Delay Slider
delayInput.addEventListener('input', (e) => {
  updateDelayDisplay(e.target.value);
});
delayInput.addEventListener('change', saveSettings);

// Settings - Checkboxes
fullCaptureCheckbox.addEventListener('change', saveSettings);
debugModeCheckbox.addEventListener('change', saveSettings);
clipboardCheckbox.addEventListener('change', saveSettings);

// Action Buttons - Viewport Capture
captureViewportBtn.addEventListener('click', async () => {
  try {
    updateUI('capturing', 'Capturing viewport');
    await sendToContentScript({ action: 'captureViewport' });
    window.close();
  } catch (error) {
    updateUI('error', error.message);
  }
});

// Action Buttons - Full Page Capture
captureFullPageBtn.addEventListener('click', async () => {
  try {
    updateUI('capturing', 'Capturing full page');
    await sendToContentScript({ action: 'captureFullPage' });
    window.close();
  } catch (error) {
    updateUI('error', error.message);
  }
});

// Chrome Runtime Messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureStarted') {
    updateUI('capturing');
  } else if (message.action === 'captureSuccess') {
    updateUI('success');
  } else if (message.action === 'captureError') {
    updateUI('error', message.error);
  }
  return true;
});
