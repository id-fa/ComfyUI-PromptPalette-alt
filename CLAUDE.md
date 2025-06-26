# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyUI-PromptPalette is a custom node for ComfyUI that provides an interactive prompt editing interface with checkbox-based phrase toggling. This is a self-contained ComfyUI extension with no external dependencies beyond ComfyUI itself.

## Architecture

The project follows ComfyUI's custom node structure:

- **`__init__.py`**: Standard ComfyUI entry point that exports node mappings and web directory
- **`nodes.py`**: Backend Python logic containing the `PromptPalette` class that processes text input
- **`web/index.js`**: Frontend JavaScript extension that registers with ComfyUI's app system to provide custom UI
- **`pyproject.toml`**: Project metadata for Comfy Registry publishing

### Core Components

1. **PromptPalette Node** (`nodes.py:4-43`):
   - Processes multiline text input by filtering commented lines (lines starting with `//`)
   - Adds comma separators and combines with optional prefix
   - Returns formatted string output

2. **Web Extension** (`web/index.js:3-52`):
   - Registers as ComfyUI extension named "PromptPalette"
   - Extends node creation and drawing callbacks to provide custom UI
   - Handles edit mode toggling and checkbox interactions

3. **UI System**:
   - Edit mode: Shows standard multiline text widget
   - Display mode: Custom-drawn interface with checkboxes for each line
   - Click handling for toggling line comments (which controls phrase inclusion)

## Development Notes

- No build process required - this is a pure ComfyUI extension
- Testing requires ComfyUI installation and manual verification through the UI
- The extension uses ComfyUI's app registration system (`app.registerExtension`)
- UI constants are defined in `UI_CONFIG` object (`web/index.js:8-15`)

## Key Patterns

- Comments (`//`) are used to disable phrases - they're filtered out in backend processing
- The web extension hooks into ComfyUI's node lifecycle (`onNodeCreated`, `onDrawForeground`)
- Mouse click coordinates are translated to line numbers for checkbox interaction
- Canvas redrawing is triggered via `app.graph.setDirtyCanvas(true)`

## Installation & Usage

Standard ComfyUI custom node installation - clone into `custom_nodes` directory and restart ComfyUI. No additional setup or dependencies required.