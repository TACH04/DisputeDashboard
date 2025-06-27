# Zoom Functionality Documentation

## Overview
The Response Letter Editor supports zoom functionality for the letter preview panel, allowing users to zoom in and out to better view and edit their documents using intuitive mouse and keyboard controls.

## Features

### Zoom Controls
- **CTRL + Scroll Wheel** : Primary zoom method - scroll up to zoom in, scroll down to zoom out
- **Reset Zoom (100%)** : Returns to 100% zoom level
- **Zoom Level Display** : Shows current zoom percentage
- **Keyboard Shortcuts** : CTRL + +, CTRL + -, CTRL + 0 for quick adjustments

### Zoom Range
- **Minimum Zoom** : 30% (0.3x scale)
- **Maximum Zoom** : 300% (3.0x scale)
- **Default Zoom** : 100% (1.0x scale)
- **Zoom Increment** : 10% per step

### Input Methods

#### Primary Method - Mouse Controls
- **CTRL + Scroll Wheel** : Zoom in/out while hovering over the preview panel
  - Scroll up = Zoom in
  - Scroll down = Zoom out

#### Keyboard Shortcuts (Alternative)
- **CTRL + +** : Zoom in
- **CTRL + -** : Zoom out
- **CTRL + 0** : Reset zoom to 100%

## Usage

### In the Response Letter Editor
1. Navigate to a case and select a request letter
2. Click "Build Response Letter" to generate content
3. **Primary Method**: Hold CTRL and scroll your mouse wheel while hovering over the preview
4. **Alternative**: Use keyboard shortcuts (CTRL + +, CTRL + -, CTRL + 0)
5. Click the **100%** button to quickly reset zoom
6. The current zoom level is displayed next to the controls

### Visual Feedback
- The zoom level is displayed next to the controls
- Smooth transitions between zoom levels
- The preview content scales from the top-center origin
- Scroll bars appear when content exceeds the viewport
- Helpful tooltip shows "CTRL + Scroll to zoom"

## Technical Implementation

### Frontend (Renderer Process)
- **Mouse Wheel Handler**: Intercepts CTRL + scroll wheel events
- **Keyboard Handler**: Processes CTRL + key combinations
- **Transform CSS**: Uses CSS transform scale for zooming
- **State Management**: Tracks current zoom level

### CSS Implementation
```css
#letter-preview-content {
    transform-origin: top center;
    transition: transform 0.2s ease;
}
```

### Event Handling
- **Mouse Events**: CTRL + wheel with passive: false
- **Keyboard Events**: CTRL + key combinations
- **Reset Button**: `data-action="zoom-reset"`

## File Structure
```
src/renderer/js/handlers/eventHandlers.js  # Zoom handlers
src/renderer/css/styles.css                # Zoom styling
index.html                                 # Zoom controls
```

## User Experience Benefits
- **Intuitive**: CTRL + scroll wheel is a familiar pattern from many applications
- **Precise**: Smooth zoom increments allow fine control
- **Accessible**: Keyboard shortcuts available for users who cannot use mouse
- **Visual**: Clear indication of current zoom level and available controls
- **Reliable**: Removed problematic button implementation in favor of proven scroll wheel method

## Browser Compatibility
- **Chrome/Edge**: Full support for all zoom methods
- **Firefox**: Full support for all zoom methods
- **Safari**: Full support for all zoom methods

## Accessibility
- Keyboard shortcuts for users who cannot use mouse
- Clear visual indicators of current zoom level
- Smooth transitions for users with motion sensitivity
- Proper focus management for screen readers
- Helpful tooltips explain functionality

## Future Enhancements
- Zoom to fit page width/height
- Zoom to specific percentages
- Zoom memory per document
- Zoom presets (50%, 75%, 125%, 150%, 200%)
- Zoom with mouse drag selection
- Zoom animation preferences 