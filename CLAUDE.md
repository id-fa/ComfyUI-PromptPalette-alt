# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyUI-PromptPalette-F is a custom node for ComfyUI that provides an interactive prompt editing interface with checkbox-based phrase toggling and weight adjustment controls.

## Architecture

The project follows ComfyUI's custom node structure:

- **`__init__.py`**: Standard ComfyUI entry point that imports and exports node mappings and web directory
- **`nodes.py`**: Backend Python logic containing the `PromptPalette_F` class that processes text input
- **`web/index.js`**: Frontend JavaScript extension that registers with ComfyUI's app system to provide custom UI

### Core Components

1. **PromptPalette_F Node** (`nodes.py:4-77`):
   - Processes multiline text input by filtering commented lines (lines starting with `//` or `#`)
   - Handles inline comments by splitting on `//` and keeping only the content before
   - Uses custom separator (default: `, `) to join non-commented lines
   - Supports empty separator for no spacing/newlines between phrases
   - Combines result with optional prefix input using the same separator
   - Supports adding newline at end of output (`add_newline` parameter)
   - Supports adding newline after separator (`separator_newline` parameter)
   - **Group tag filtering**: Removes group tags `[group]` from output using `remove_group_tags_with_escape()` method
   - **Escape character support**: Preserves literal brackets using `\[` and `\]` escape sequences
   - Returns formatted string output with group tags removed

2. **Web Extension** (`web/index.js:21-62`):
   - Registers as ComfyUI extension named "PromptPalette_F"
   - Hooks into `beforeRegisterNodeDef` to modify PromptPalette_F node behavior
   - Sets up node creation callback and drawing callback
   - Manages edit/display mode toggling

3. **UI System**:
   - **Edit mode**: Shows standard multiline text widget, separator input, and newline options for direct editing
   - **Display mode**: Custom-drawn interface with checkboxes, phrase text, weight controls, and group controls
   - **Interactive elements**: Checkboxes for toggling comments, +/- buttons for weight adjustment, group toggle buttons
   - **Visual feedback**: Different colors for active/inactive text, bold text for weighted phrases
   - **Text wrapping**: Long phrases automatically wrap within node boundaries
   - **Description comments**: `#` comments display as italic explanatory text above phrases
   - **Group controls**: Horizontal row of group buttons for batch phrase control

### Advanced Features

4. **Custom Separator System** (`nodes.py:26-60`):
   - Configurable separator input parameter (default: `, `)
   - Empty separator support for no spacing between phrases
   - Consistent separator usage for prefix concatenation
   - Backend filtering of both `//` (toggle) and `#` (description) comments
   - Optional newline addition after separators (`separator_newline` parameter)
   - Optional newline addition at end of output (`add_newline` parameter)

5. **Text Wrapping System** (`web/index.js:203-232`):
   - `wrapText()` function for word-based text wrapping
   - `calculateAvailableTextWidth()` for dynamic width calculation
   - Automatic node height adjustment based on wrapped content
   - Font-aware measurement for accurate wrapping

6. **Description Comment System** (`web/index.js:343-357`):
   - `#` comments display as italic explanatory text above phrases
   - `isDescriptionComment()` and `findDescriptionForLine()` helper functions
   - Separate handling from toggle comments (`//`)
   - Integrated with text wrapping for long descriptions

7. **Weight System** (`web/index.js:425-480`):
   - Supports weight notation format: `(phrase:1.5)` 
   - Weight range: 0.1 to 2.0 with 0.1 increments
   - Visual indicators: Bold text for non-1.0 weights, weight value display
   - Interactive +/- buttons for weight adjustment

8. **Theme Integration** (`web/index.js:481-525`):
   - Dynamically reads ComfyUI CSS variables for theme colors
   - Supports both light and dark themes
   - Color caching for performance
   - Handles 3-digit hex color expansion

9. **Group Toggle System** (`web/index.js:31-102`, `web/index.js:620-708`):
   - **Group tag parsing**: Extracts multiple `[group]` tags from each line
   - **Escape character support**: Handles `\[` and `\]` for literal brackets
   - **Group status tracking**: Monitors all/partial/none states for each group
   - **Batch operations**: Toggle entire groups while preserving individual settings
   - **UI integration**: Group buttons displayed above phrase list with visual status indicators
   - **Smart toggling**: Groups with partial activation get fully activated; fully active groups get deactivated

10. **Output Control System** (`nodes.py:17-19`, `web/index.js:106-153`):
   - `add_newline` parameter adds newline at end of final output
   - `separator_newline` parameter adds newline after each separator
   - `trailing_separator` parameter adds separator after the last phrase
   - All options available as checkboxes in edit mode
   - Provides flexible output formatting for different use cases

## Development Commands

This project requires no build process or package management - it's a pure ComfyUI extension.

### Testing
- **Manual testing**: Install in ComfyUI's `custom_nodes` directory and restart ComfyUI
- **UI verification**: Test through ComfyUI's interface - create node, toggle edit/display modes, test phrase toggling, weight adjustment, and group controls
- **Group testing**: Test with lines like `phrase1 [group1]`, `phrase2 [group1][group2]`, and escaped brackets `phrase \[literal\] [group1]`
- **No automated tests**: Testing is entirely manual through the ComfyUI interface

## Development Notes

- No dependencies beyond ComfyUI itself
- UI constants are defined in `CONFIG` object (`web/index.js:3-25`)
- Click handling uses coordinate-based area detection system
- All state changes trigger canvas redraws via `app.graph.setDirtyCanvas(true)`
- Group functionality requires no additional dependencies

## Key Patterns

- **Comment system**: `//` for toggle comments (filtered/unfiltered), `#` for description comments (display only)
- **Group system**: `[group]` tags for batch phrase control, support for multiple tags per line, escape with `\[` `\]`
- **Custom separator**: Configurable text joining with empty string support for no spacing
- **Output formatting options**: `add_newline` for end-of-output newline, `separator_newline` for separator newlines, `trailing_separator` for separator after last phrase
- **Text wrapping**: Word-based wrapping with dynamic width calculation and height adjustment
- **Weight adjustment**: Uses regex parsing to handle `(text:weight)` notation
- **Canvas interaction**: Mouse clicks are mapped to clickable areas (checkboxes, weight buttons, group buttons)
- **State management**: Node tracks edit mode, clickable areas, widget visibility, and text wrapping
- **Canvas redrawing**: Triggered via `app.graph.setDirtyCanvas(true)` after state changes

## Code Organization

- **Group Parsing Functions**: Lines 31-102 (group tag extraction, status tracking, toggle logic)
- **Extension Registration**: Lines 125-147
- **UI Control Functions**: Lines 148-363 (widget management, click handling)
- **Text Wrapping Utilities**: Lines 383-432 (text wrapping, width calculation)
- **Drawing Functions**: Lines 445-708 (canvas rendering, group controls, visual elements)
- **Comment Parsing**: Lines 608-632 (description comment handling)
- **Weight System**: Lines 735-790 (parsing, adjustment, formatting)
- **Theme/Color System**: Lines 791-835 (dynamic theme integration)

## Installation & Usage

Standard ComfyUI custom node installation - clone into `custom_nodes` directory and restart ComfyUI. No additional setup or dependencies required.

## Development Status
- Basic functionality: ✅ Working
- Preview functionality: ✅ Working (white screen bug resolved)
- Scroll functionality: ✅ Working (scroll bar visibility fixed)

## Fixed Issues

### Preview White Screen Bug (Resolved)
- **Issue**: Preview area showed white screen when weight feature was used (e.g., `(line:1.1)`)
- **Root Cause**: Canvas context state management issues with excessive `ctx.save()/ctx.restore()` calls
- **Solution**: Simplified Canvas state management and removed unnecessary context protection
- **Status**: ✅ Resolved

### Scroll Bar Visibility (Resolved)
- **Issue**: White blocks covering scroll buttons (▲ ▼) in preview area
- **Root Cause**: Scroll bar colors using theme values that appeared white in certain contexts
- **Solution**: Changed to fixed dark colors for scroll components:
  - Track background: `#2a2a2a` (dark gray)
  - Scroll thumb: `#555555` (medium gray) 
  - Scroll buttons: `#3a3a3a` (dark gray)
- **Status**: ✅ Resolved