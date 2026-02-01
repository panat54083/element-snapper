# Element Snapper

A professional Chrome extension that captures pixel-perfect screenshots of any webpage element using advanced capture+crop technique with device pixel ratio support.

## Features

- **Pixel-Perfect Capture**: Accurate element screenshots with DPR-aware cropping
- **Full Element Capture**: Multi-tile stitching for elements larger than viewport
- **Professional UI**: Clean, minimal design with consistent visual language
- **Format Options**: Save as PNG (lossless) or JPEG (with quality control)
- **Smart Scrolling**: Automatically scrolls elements into view before capture (full mode only)
- **Debug Mode**: Visual borders showing capture process in real-time
- **Edge Case Handling**: Handles fixed elements, scrollable containers, and cross-origin iframes
- **One-Click Download**: Screenshots saved directly to downloads folder

## Installation

### Load as Unpacked Extension

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `element-snapper` directory
6. Extension icon should appear in toolbar

## Usage

1. Click the extension icon to open popup
2. Click "Capture" button
3. Hover over elements on the page (highlighted with blue outline)
4. Click on desired element to capture
5. Screenshot automatically downloads to your default downloads folder

### Settings

- **Format**: Choose PNG (lossless, larger file) or JPEG (lossy, smaller file)
- **Quality**: Adjust JPEG compression quality (1-100, default 95)
- **Capture full element**: Enable multi-tile stitching for elements larger than viewport
- **Debug mode**: Show red and green borders during capture process

Settings are automatically saved and persist between sessions.

## Technical Details

### Architecture

```
Popup ──> Content Script ──> Service Worker ──> Download
  ↑            ↓                    ↓
  └────────────┴────────────────────┘
```

**Message Flow:**

1. Popup sends "startSelection" to content script
2. Content script enables element highlighting
3. User clicks element
4. Content script sends element rect + metadata to service worker
5. Service worker captures viewport, crops to element, downloads

### DPR-Aware Cropping

The extension handles high-DPI displays correctly:

```javascript
// Element position in CSS pixels
const rect = element.getBoundingClientRect();

// Convert to physical pixels
const dpr = window.devicePixelRatio;
const sx = rect.x * dpr;
const sy = rect.y * dpr;
const sWidth = rect.width * dpr;
const sHeight = rect.height * dpr;

// Crop from captured screenshot (already in physical pixels)
ctx.drawImage(screenshot, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
```

### Full Element Capture (Multi-Tile Stitching)

For elements larger than the viewport, the extension uses a sophisticated multi-tile capture and stitching algorithm:

#### Algorithm Overview

1. **Tile Grid Calculation**: Divide element into viewport-sized tiles

   ```javascript
   const tilesX = Math.ceil(elementWidth / viewportWidth);
   const tilesY = Math.ceil(elementHeight / viewportHeight);
   ```

2. **Sequential Tile Capture**: For each tile:
   - Scroll to position the tile in viewport
   - Capture the visible viewport
   - Extract the correct portion from the capture
   - Draw onto final canvas at correct position

3. **Coordinate Conversion**: Handle document boundaries correctly

   ```javascript
   // Target scroll position for this tile
   const targetScrollX = elementAbsX + tileX * viewportWidth;

   // Actual scroll (may differ at document boundaries)
   const actualScrollX = getActualScrollPosition();

   // Calculate where element region appears in viewport
   const viewportOffsetX = regionAbsX - actualScrollX;

   // Extract from correct position (not always 0!)
   const sx = viewportOffsetX * dpr;
   ```

#### Handling Document Boundaries

**The Problem:**
When capturing near page edges, the browser can't scroll to the target position, causing potential overlap if not handled correctly.

**Example:**

```
Element: 2400px wide, Page: 1700px wide, Viewport: 1000px
Max scroll: 700px (1700 - 1000)

Tile 0: Scroll to x=0    → Actual x=0   ✓
Tile 1: Scroll to x=1000 → Actual x=700 ✗ (boundary!)
Tile 2: Scroll to x=2000 → Actual x=700 ✗ (boundary!)
```

**The Solution:**
Use actual scroll position to calculate viewport offset:

```javascript
// Tile 1 example:
targetScrollX = 1000;
actualScrollX = 700;  // Hit boundary!

// Region we want is at page position 1000-2000
regionAbsX = 1000;

// Calculate where this region appears in viewport
viewportOffsetX = regionAbsX - actualScrollX;
              = 1000 - 700
              = 300;  // Extract from x=300, not x=0!

// Extract correct portion
ctx.drawImage(capture, 300*dpr, 0, ...);  // ✓ No overlap!
```

This ensures each tile extracts a unique portion of the element, even when scrolling hits document boundaries.

#### Debug Mode Visualization

When debug mode is enabled:

- **Red border**: Shows the full element being captured (static)
- **Green border**: Shows the current tile being captured (moves with each tile)
- Helps visualize the multi-tile stitching process

### File Structure

```
element-snapper/
├── manifest.json              # Manifest V3 configuration
├── popup/
│   ├── popup.html            # Popup UI structure
│   ├── popup.js              # Popup logic and messaging
│   └── popup.css             # Professional styling
├── content/
│   ├── utils.js              # Utility functions
│   ├── element_selector.js   # Element selection logic
│   └── content-main.js       # Message routing
├── background/
│   └── service_worker.js     # Screenshot capture & download
├── icons/                    # Extension icons
├── test.html                 # Test page with various elements
└── README.md                 # This file
```

## Edge Cases

### Cross-Origin Iframes

- Cannot access iframe internals due to browser security
- Extension captures the iframe element itself
- Console warning is logged

### Fixed/Sticky Elements

- Element is scrolled into view before capture
- Works correctly with `position: fixed` and `position: sticky`

### Elements Outside Viewport

- Automatically scrolled into view with smooth behavior
- Small delay ensures scroll completes before capture

### High DPR Displays

- Correctly handles Retina (2x), 4K (3x+) displays
- Canvas operations use physical pixels throughout
- Screenshots are high resolution, never blurry

## Limitations

1. **Multi-Capture Performance**: Full element capture uses multiple viewport captures which takes time (Chrome API rate limit: ~2 captures/second)
2. **Cross-Origin Content**: Cannot capture content from different domains (e.g., inside iframes from other sites)
3. **Dynamic Content**: Some animations or video elements may not capture correctly
4. **Restricted Pages**: Cannot capture on `chrome://`, `file://`, or Chrome Web Store pages
5. **Max Canvas Size**: Element dimensions cannot exceed 16,384px (browser canvas limitation)

## Browser Compatibility

- Chrome 88+ (Manifest V3 requirement)
- Chromium-based browsers (Edge, Brave, Opera)

## Privacy

- **No Data Collection**: Extension does not collect, store, or transmit any user data
- **Local Only**: All processing happens locally in browser
- **No Network Requests**: Extension does not make any external network calls
- **Minimal Permissions**: Only requests necessary permissions (activeTab, downloads, storage)

## Testing

### Using the Test Page

1. Load the extension in Chrome
2. Open `test.html` in your browser
3. Test capturing various element types:
   - Basic div elements
   - Small inline elements
   - Elements in scrollable containers
   - Fixed position elements
   - Images and tables
   - Cross-origin iframes
   - Complex nested structures
   - Elements requiring scroll

### Debugging

**Content Script Console:**

```
1. Open page where extension is active
2. Press F12 to open DevTools
3. Check Console tab for content script logs
```

**Service Worker Console:**

```
1. Navigate to chrome://extensions
2. Find "Element Snapper"
3. Click "service worker" link
4. Service worker console opens in new window
```

**Popup Console:**

```
1. Right-click extension icon
2. Select "Inspect popup"
3. Popup DevTools opens
```

## Development

### Project Structure

The extension follows a modular architecture:

- **popup/**: UI components for extension popup
- **content/**: Scripts injected into web pages
- **background/**: Service worker for capture logic
- **icons/**: Extension icons (replace placeholders with custom icons)

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions`
3. Click refresh icon for "Element Snapper"
4. Test changes

### Color System

The extension uses a consistent professional color palette:

- **Primary**: #2563eb (blue)
- **Success**: #10b981 (green)
- **Error**: #ef4444 (red)
- **Neutral**: #6b7280 (gray)

## Troubleshooting

### Extension Icon Not Showing

- Ensure extension is enabled in `chrome://extensions`
- Check for manifest errors in extension details

### "Please refresh the page" Error

- The page was loaded before the extension
- Refresh the page (F5) and try again

### Screenshots Are Blurry

- This should not happen with DPR-aware cropping
- If it does, please report as a bug

### Element Not Capturing

- Ensure element is visible in viewport
- Check browser console for errors
- Try clicking element again

### Download Fails

- Check Chrome download permissions
- Ensure sufficient disk space
- Check Downloads folder for saved file

## Contributing

Contributions are welcome! Please:

1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - feel free to use this extension for any purpose.

## Changelog

### v1.1.0 (2026-02-01)

- Add full element capture with multi-tile stitching
- Fix tile overlap bug at document boundaries
- Add debug mode with visual tile borders (red/green)
- Remove auto-scroll in regular mode (capture exactly what user sees)
- Improve logging for multi-capture process

### v1.0.0 (2026-02-01)

- Initial release
- Basic element capture functionality
- PNG/JPEG format support
- DPR-aware cropping
- Professional minimal UI
- Cross-origin iframe detection
- Comprehensive test page

## Credits

Built with Chrome Extension Manifest V3 APIs. No external libraries used.
