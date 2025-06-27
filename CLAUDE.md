# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyUI-PromptPalette is a custom node for ComfyUI that provides an interactive prompt editing interface with checkbox-based phrase toggling and weight adjustment controls.

## Architecture

The project follows ComfyUI's custom node structure:

- **`__init__.py`**: Standard ComfyUI entry point that imports and exports node mappings and web directory
- **`nodes.py`**: Backend Python logic containing the `PromptPalette` class that processes text input
- **`web/index.js`**: Frontend JavaScript extension that registers with ComfyUI's app system to provide custom UI
- **`pyproject.toml`**: Project metadata for Comfy Registry publishing

### Core Components

1. **PromptPalette Node** (`nodes.py:4-48`):
   - Processes multiline text input by filtering commented lines (lines starting with `//`)
   - Handles inline comments by splitting on `//` and keeping only the content before
   - Adds comma separators to non-commented lines
   - Combines result with optional prefix input
   - Returns formatted string output

2. **Web Extension** (`web/index.js:21-62`):
   - Registers as ComfyUI extension named "PromptPalette"
   - Hooks into `beforeRegisterNodeDef` to modify PromptPalette node behavior
   - Sets up node creation callback and drawing callback
   - Manages edit/display mode toggling

3. **UI System**:
   - **Edit mode**: Shows standard multiline text widget for direct text editing
   - **Display mode**: Custom-drawn interface with checkboxes, phrase text, and weight controls
   - **Interactive elements**: Checkboxes for toggling comments, +/- buttons for weight adjustment
   - **Visual feedback**: Different colors for active/inactive text, bold text for weighted phrases

### Advanced Features

4. **Weight System** (`web/index.js:425-480`):
   - Supports weight notation format: `(phrase:1.5)` 
   - Weight range: 0.1 to 2.0 with 0.1 increments
   - Visual indicators: Bold text for non-1.0 weights, weight value display
   - Interactive +/- buttons for weight adjustment

5. **Theme Integration** (`web/index.js:481-525`):
   - Dynamically reads ComfyUI CSS variables for theme colors
   - Supports both light and dark themes
   - Color caching for performance
   - Handles 3-digit hex color expansion

## Development Notes

- No build process required - this is a pure ComfyUI extension
- Testing requires ComfyUI installation and manual verification through the UI
- The extension uses ComfyUI's app registration system (`app.registerExtension`)
- UI constants are defined in `CONFIG` object (`web/index.js:3-15`)
- Click handling uses coordinate-based area detection system

## Key Patterns

- **Comment toggling**: Lines starting with `//` are filtered out in backend, toggled via checkbox clicks
- **Weight adjustment**: Uses regex parsing to handle `(text:weight)` notation
- **Canvas interaction**: Mouse clicks are mapped to clickable areas (checkboxes, weight buttons)
- **State management**: Node tracks edit mode, clickable areas, and widget visibility
- **Canvas redrawing**: Triggered via `app.graph.setDirtyCanvas(true)` after state changes

## Code Organization

- **Extension Registration**: Lines 21-62
- **UI Control Functions**: Lines 68-179 (widget management, click handling)
- **Drawing Functions**: Lines 185-422 (canvas rendering, visual elements)
- **Weight System**: Lines 425-480 (parsing, adjustment, formatting)
- **Theme/Color System**: Lines 481-525 (dynamic theme integration)

## Installation & Usage

Standard ComfyUI custom node installation - clone into `custom_nodes` directory and restart ComfyUI. No additional setup or dependencies required.