import { app } from "../../scripts/app.js";

const CONFIG = {
    minNodeHeight: 80,
    topNodePadding: 40,
    sideNodePadding: 14,
    lineHeight: 24,
    fontSize: 14,
    checkboxSize: 16,
    spaceBetweenCheckboxAndText: 6,
    weightButtonSize: 16,
    weightLabelWidth: 24,
    minWeight: 0.1,
    maxWeight: 2.0,
    previewSeparator: 20,    // Space between main content and preview
    previewHeight: 110,      // Height for 5 lines + header + padding
    previewFontSize: 12,     // Smaller font for preview
    previewLineHeight: 16,   // Line height for preview text
    previewVisibleLines: 5,  // Number of visible lines in preview
    scrollBarWidth: 12,      // Width of scroll bar
    scrollButtonHeight: 16,  // Height of scroll up/down buttons
    groupButtonHeight: 20,   // Height of group toggle buttons
    groupButtonMargin: 4,    // Margin between group buttons
    groupAreaHeight: 28,     // Total height for group control area
};

// ========================================
// Group Parsing Functions
// ========================================

function parseGroupTags(line) {
    // Handle escaped brackets by temporarily replacing them
    const escaped = line.replace(/\\\[/g, '___ESC_OPEN___').replace(/\\\]/g, '___ESC_CLOSE___');
    const tagRegex = /\[([^\]]+)\]/g;
    const groups = [];
    let match;
    while ((match = tagRegex.exec(escaped)) !== null) {
        groups.push(match[1]);
    }
    return groups;
}

function removeGroupTags(line) {
    // Handle escaped brackets while removing group tags
    // 1. Replace escaped brackets with placeholders
    let processed = line.replace(/\\\[/g, '___ESC_OPEN___').replace(/\\\]/g, '___ESC_CLOSE___');

    // 2. Remove group tags
    processed = processed.replace(/\s*\[[^\]]+\]/g, '');

    // 3. Restore escaped brackets as literal brackets
    processed = processed.replace(/___ESC_OPEN___/g, '[').replace(/___ESC_CLOSE___/g, ']');

    return processed.trim();
}

function getAllGroups(text) {
    const allGroups = new Set();
    const lines = text.split('\n');

    for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#')) {
            const groups = parseGroupTags(line);
            groups.forEach(group => allGroups.add(group));
        }
    }

    return Array.from(allGroups).sort();
}

function getGroupStatus(text, groupName) {
    const lines = text.split('\n');
    let totalLines = 0;
    let activeLines = 0;

    for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#')) {
            const groups = parseGroupTags(line);
            if (groups.includes(groupName)) {
                totalLines++;
                if (!line.trim().startsWith('//')) {
                    activeLines++;
                }
            }
        }
    }

    if (totalLines === 0) return 'none';
    if (activeLines === totalLines) return 'all';
    if (activeLines === 0) return 'none';
    return 'partial';
}

function toggleGroup(text, groupName) {
    const lines = text.split('\n');
    const status = getGroupStatus(text, groupName);

    // Smart toggle behavior:
    // - If all lines are active (status='all'), deactivate all
    // - If some or none are active (status='partial' or 'none'), activate all
    const shouldActivate = status !== 'all';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && !line.trim().startsWith('#')) {
            const groups = parseGroupTags(line);
            if (groups.includes(groupName)) {
                if (shouldActivate && line.trim().startsWith('//')) {
                    // Activate: remove comment
                    lines[i] = line.replace(/^\s*\/\/\s*/, '');
                } else if (!shouldActivate && !line.trim().startsWith('//')) {
                    // Deactivate: add comment
                    lines[i] = '// ' + line;
                }
                // Note: Lines that are already in the desired state are left unchanged
                // This allows for individual toggling after group operations
            }
        }
    }

    return lines.join('\n');
}

// ========================================
// Extension Registration
// ========================================

app.registerExtension({
    name: "PromptPalette_F",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptPalette_F") {
            this.setupNodeCreatedCallback(nodeType, CONFIG, app);
            this.setupDrawForegroundCallback(nodeType, CONFIG, app);
        }
    },

    setupNodeCreatedCallback(nodeType, config, app) {
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        
        nodeType.prototype.onNodeCreated = function() {
            if (origOnNodeCreated) {
                origOnNodeCreated.apply(this, arguments);
            }
            this.isEditMode = false;
            const textWidget = findTextWidget(this);
            const separatorWidget = findSeparatorWidget(this);
            const newlineWidget = findNewlineWidget(this);
            const separatorNewlineWidget = findSeparatorNewlineWidget(this);
            const trailingSeparatorWidget = findTrailingSeparatorWidget(this);
            if (textWidget) {
                textWidget.hidden = true;
                if (separatorWidget) {
                    separatorWidget.hidden = true;
                }
                if (newlineWidget) {
                    newlineWidget.hidden = true;
                }
                if (separatorNewlineWidget) {
                    separatorNewlineWidget.hidden = true;
                }
                if (trailingSeparatorWidget) {
                    trailingSeparatorWidget.hidden = true;
                }
                addEditButton(this, textWidget, app);
                setupClickHandler(this, textWidget, app);
            }
        };
    },

    setupDrawForegroundCallback(nodeType, config, app) {
        const origOnDrawForeground = nodeType.prototype.onDrawForeground;
        
        nodeType.prototype.onDrawForeground = function(ctx) {
            if (origOnDrawForeground) {
                origOnDrawForeground.call(this, ctx);
            }
            // Draw text when not in edit mode
            const textWidget = findTextWidget(this);
            if (textWidget && !this.isEditMode) {
                drawCheckboxList(this, ctx, textWidget.value, app);
            }
        };
    }
});

// ========================================
// UI Control
// ========================================

function findTextWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "text") {
            return w;
        }
    }
    return null;
}

function findSeparatorWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "separator") {
            return w;
        }
    }
    return null;
}

function findNewlineWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "add_newline") {
            return w;
        }
    }
    return null;
}

function findSeparatorNewlineWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "separator_newline") {
            return w;
        }
    }
    return null;
}

function findTrailingSeparatorWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "trailing_separator") {
            return w;
        }
    }
    return null;
}

function addEditButton(node, textWidget, app) {
    const textButton = node.addWidget("button", "Edit", "edit_text", () => {
        node.isEditMode = !node.isEditMode;
        textWidget.hidden = !node.isEditMode;
        const separatorWidget = findSeparatorWidget(node);
        if (separatorWidget) {
            separatorWidget.hidden = !node.isEditMode;
        }
        const newlineWidget = findNewlineWidget(node);
        if (newlineWidget) {
            newlineWidget.hidden = !node.isEditMode;
        }
        const separatorNewlineWidget = findSeparatorNewlineWidget(node);
        if (separatorNewlineWidget) {
            separatorNewlineWidget.hidden = !node.isEditMode;
        }
        const trailingSeparatorWidget = findTrailingSeparatorWidget(node);
        if (trailingSeparatorWidget) {
            trailingSeparatorWidget.hidden = !node.isEditMode;
        }
        textButton.name = node.isEditMode ? "Save" : "Edit";
        app.graph.setDirtyCanvas(true); // Redraw canvas
    });
    
    // Add preview toggle button
    const previewButton = node.addWidget("button", "Hide Preview", "toggle_preview", () => {
        node.hidePreview = !node.hidePreview;
        previewButton.name = node.hidePreview ? "Show Preview" : "Hide Preview";
        // Trigger node size recalculation
        app.graph.setDirtyCanvas(true);
    });
    
    // Initialize preview toggle state
    node.hidePreview = false;
    
    // Initialize scroll state for preview
    node.previewScrollOffset = 0;
    node.lastPreviewText = "";
    
    // Add spacing below buttons
    const spacer = node.addWidget("text", "", "");
    spacer.hidden = true;
    spacer.computeSize = () => [0, 6];
}

function setupClickHandler(node, textWidget, app) {
    // Initialize clickableAreas if it doesn't exist
    if (!node.clickableAreas) {
        node.clickableAreas = [];
    }

    // Add helper methods to node
    node.findClickedArea = findClickedArea;
    node.handleClickableAreaAction = handleClickableAreaAction;
    node.isPositionInPreview = isPositionInPreview;
    
    node.onMouseDown = function(e, pos) {
        if (this.isEditMode) return;
        
        const clickedArea = this.findClickedArea(pos);
        if (clickedArea) {
            this.handleClickableAreaAction(clickedArea, textWidget, app);
        }
    };
    
    // Remove wheel handler - we'll use clickable scroll buttons instead
}

function findClickedArea(pos) {
    const [x, y] = pos;
    for (const area of this.clickableAreas || []) {
        if (x >= area.x && x <= area.x + area.w && 
            y >= area.y && y <= area.y + area.h) {
            return area;
        }
    }
    return null;
}

function isPositionInPreview(pos) {
    if (this.hidePreview) return false;
    
    const [x, y] = pos;
    const nodeHeight = this.size[1];
    const previewY = nodeHeight - CONFIG.previewHeight - 10;
    const previewX = CONFIG.sideNodePadding;
    const previewWidth = this.size[0] - CONFIG.sideNodePadding * 2;
    
    return x >= previewX && x <= previewX + previewWidth &&
           y >= previewY && y <= previewY + CONFIG.previewHeight;
}

function handleClickableAreaAction(area, textWidget, app) {
    switch (area.action) {
        case 'toggle':
            const textLines = textWidget.value.split('\n');
            if (area.lineIndex >= 0 && area.lineIndex < textLines.length) {
                toggleCommentOnLine(textLines, area.lineIndex);
                textWidget.value = textLines.join('\n');
                app.graph.setDirtyCanvas(true);
            }
            break;
        case 'weight_plus':
            adjustWeightInText(textWidget, area.lineIndex, 0.1, app);
            break;
        case 'weight_minus':
            adjustWeightInText(textWidget, area.lineIndex, -0.1, app);
            break;
        case 'scroll_up':
            this.previewScrollOffset = Math.max(0, this.previewScrollOffset - 1);
            app.graph.setDirtyCanvas(true);
            break;
        case 'scroll_down':
            // Max scroll will be calculated in drawPreview
            this.previewScrollOffset = this.previewScrollOffset + 1;
            app.graph.setDirtyCanvas(true);
            break;
        case 'group_toggle':
            if (textWidget && area.groupName) {
                textWidget.value = toggleGroup(textWidget.value, area.groupName);
                app.graph.setDirtyCanvas(true);
            }
            break;
    }
}

function toggleCommentOnLine(textLines, lineIndex) {
    const line = textLines[lineIndex];
    
    if (line.trim().startsWith("//")) {
        textLines[lineIndex] = line.replace(/^\s*\/\/\s*/, '');
    } else {
        textLines[lineIndex] = "// " + line;
    }
}

function adjustWeightInText(textWidget, lineIndex, delta, app) {
    const textLines = textWidget.value.split('\n');
    if (lineIndex >= 0 && lineIndex < textLines.length) {
        const line = textLines[lineIndex];
        
        // Check if line starts with comment
        if (line.trim().startsWith('//')) {
            const commentMatch = line.match(/^(\s*\/\/\s*)(.*)/);
            if (commentMatch && commentMatch[2].trim()) {
                const adjustedText = adjustWeight(commentMatch[2], delta);
                textLines[lineIndex] = commentMatch[1] + adjustedText;
            }
        } else if (line.includes('//')) {
            // Handle lines with inline comments like "abc // def"
            const commentIndex = line.indexOf('//');
            const beforeComment = line.substring(0, commentIndex).trim();
            const comment = line.substring(commentIndex);
            
            if (beforeComment) {
                const adjustedText = adjustWeight(beforeComment, delta);
                textLines[lineIndex] = adjustedText + ' ' + comment;
            }
        } else {
            // Regular line without comments
            textLines[lineIndex] = adjustWeight(line, delta);
        }
        textWidget.value = textLines.join('\n');
        app.graph.setDirtyCanvas(true);
    }
}

// ========================================
// Text Wrapping Utilities
// ========================================

function wrapText(ctx, text, maxWidth) {
    if (!text.trim()) return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth <= maxWidth || !currentLine) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
}

function calculateAvailableTextWidth(nodeWidth) {
    // Available width = node width - left padding - checkbox - spacing - weight controls - right padding
    return nodeWidth - CONFIG.sideNodePadding - CONFIG.checkboxSize - CONFIG.spaceBetweenCheckboxAndText - 120 - CONFIG.sideNodePadding;
}

// ========================================
// Drawing
// ========================================

function drawCheckboxList(node, ctx, text, app) {
    // Skip if node is collapsed
    if (node.flags && node.flags.collapsed) {
        return;
    }

    const lines = text.split('\n');
    const groups = getAllGroups(text);

    // Initialize clickable areas
    node.clickableAreas = [];

    // Draw group control area if groups exist
    let groupAreaHeight = 0;
    if (groups.length > 0) {
        groupAreaHeight = drawGroupControls(node, ctx, text, groups);
    }
    
    // Calculate total lines including wrapped lines
    let totalWrappedLines = 0;
    const availableWidth = calculateAvailableTextWidth(node.size[0]);
    
    lines.forEach((line, index) => {
        if (isEmptyLine(line) || isDescriptionComment(line)) return;
        
        // Check if this line has a description comment
        const description = findDescriptionForLine(lines, index);
        if (description) {
            ctx.font = `italic ${CONFIG.fontSize - 1}px monospace`;
            const descWrappedLines = wrapText(ctx, description, availableWidth + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText);
            totalWrappedLines += descWrappedLines.length;
        }
        
        const isCommented = line.trim().startsWith("//");
        const phraseText = getPhraseText(line, isCommented);
        
        // Set font for measurement (same as used in drawing)
        const textToCheck = isCommented ? 
            (line.match(/^(\s*\/\/\s*)(.*)/)?.[2] || '') : 
            line;
        const weight = parseWeight(textToCheck);
        const isBold = weight !== 1.0;
        ctx.font = isBold ? 
            `bold ${CONFIG.fontSize}px monospace` : 
            `${CONFIG.fontSize}px monospace`;
        
        const wrappedLines = wrapText(ctx, phraseText, availableWidth);
        totalWrappedLines += wrappedLines.length;
    });
    
    // Adjust node size to match wrapped text line count + preview area (if shown) + group area
    const baseTextHeight = Math.max(CONFIG.minNodeHeight, CONFIG.topNodePadding + groupAreaHeight + totalWrappedLines * CONFIG.lineHeight + 20);
    const widgetSpacing = 70; // Space for ComfyUI widgets (buttons)
    const previewHeight = node.hidePreview ? 0 : (CONFIG.previewSeparator + CONFIG.previewHeight);
    const totalHeight = baseTextHeight + widgetSpacing + previewHeight;
    
    if (node.size[1] !== totalHeight) {
        node.size[1] = totalHeight;
        app.graph.setDirtyCanvas(true);
    }

    // Text settings
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    if (text.trim() !== "") {
        drawCheckboxItems(ctx, lines, node);
    } else {
        // If text is empty
        ctx.fillStyle = getColors().inactiveTextColor;
        ctx.textAlign = "center";
        const widgetAndPreviewHeight = node.hidePreview ? 70 : (70 + CONFIG.previewHeight + CONFIG.previewSeparator);
        const textAreaHeight = node.size[1] - widgetAndPreviewHeight;
        ctx.fillText("No Text", node.size[0]/2, CONFIG.topNodePadding + textAreaHeight/2);
    }
    
    // Draw preview area
    drawPreview(node, ctx);
}

function drawCheckboxItems(ctx, lines, node) {
    // Get group area height to offset drawing position
    const groups = getAllGroups(lines.join('\n'));
    const groupAreaHeight = groups.length > 0 ? CONFIG.groupAreaHeight : 0;

    let currentY = CONFIG.topNodePadding + groupAreaHeight;
    const availableWidth = calculateAvailableTextWidth(node.size[0]);

    // Don't clear clickableAreas here - group controls have already been added
    
    lines.forEach((line, index) => {
        // Skip empty lines and description comments (# comments are not drawn directly)
        if (isEmptyLine(line) || isDescriptionComment(line)) return;
        
        const isCommented = line.trim().startsWith("//");
        
        // Check if this line has a description comment
        const description = findDescriptionForLine(lines, index);
        
        // Draw description comment if exists
        if (description) {
            ctx.font = `italic ${CONFIG.fontSize - 1}px monospace`;
            const descWrappedLines = wrapText(ctx, description, availableWidth + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText);
            
            const colors = getColors();
            ctx.fillStyle = colors.inactiveTextColor;
            ctx.textAlign = "left";
            
            descWrappedLines.forEach((descLine, wrapIndex) => {
                const descY = currentY + wrapIndex * CONFIG.lineHeight;
                const checkboxCenter = descY + CONFIG.checkboxSize / 2;
                const textBaseline = checkboxCenter + (CONFIG.fontSize - 1) * 0.35;
                ctx.fillText(descLine, CONFIG.sideNodePadding, textBaseline);
            });
            
            currentY += descWrappedLines.length * CONFIG.lineHeight;
        }
        
        // Get phrase text for wrapping
        const phraseText = getPhraseText(line, isCommented);
        
        // Set font for text measurement (same as used in drawPhraseText)
        const textToCheck = isCommented ? 
            (line.match(/^(\s*\/\/\s*)(.*)/)?.[2] || '') : 
            line;
        const weight = parseWeight(textToCheck);
        const isBold = weight !== 1.0;
        ctx.font = isBold ? 
            `bold ${CONFIG.fontSize}px monospace` : 
            `${CONFIG.fontSize}px monospace`;
        
        // Wrap text
        const wrappedLines = wrapText(ctx, phraseText, availableWidth);
        
        // Draw checkbox (only on first line)
        drawCheckbox(ctx, currentY, isCommented, node, index);
        
        // Draw wrapped text lines
        wrappedLines.forEach((wrappedLine, wrapIndex) => {
            const lineY = currentY + wrapIndex * CONFIG.lineHeight;
            drawPhraseTextLine(ctx, wrappedLine, lineY, isCommented, isBold);
        });
        
        // Draw weight controls (only on first line)
        drawWeightControls(ctx, currentY, line, isCommented, node, index);
        
        // Move to next position
        currentY += wrappedLines.length * CONFIG.lineHeight;
    });
}

function isEmptyLine(line) {
    return line.trim() === "";
}

function isDescriptionComment(line) {
    return line.trim().startsWith("#");
}

function getDescriptionFromComment(line) {
    return line.trim().replace(/^\s*#\s*/, '');
}

function findDescriptionForLine(lines, lineIndex) {
    // Look for # comment in the previous line
    if (lineIndex > 0 && isDescriptionComment(lines[lineIndex - 1])) {
        return getDescriptionFromComment(lines[lineIndex - 1]);
    }
    return null;
}

function getPhraseText(line, isCommented) {
    let phraseText = line;
    
    // Remove leading // for both commented and non-commented lines
    if (isCommented) {
        phraseText = line.trim().replace(/^\s*\/\/\s*/, '');
    }
    
    // Remove weight notation from all lines
    phraseText = phraseText.replace(/\(([^:]+):(\d+\.?\d*)\)/g, '$1');
    
    // Remove trailing comma
    if (phraseText.trim().endsWith(',')) {
        phraseText = phraseText.substring(0, phraseText.lastIndexOf(','));
    }

    // Remove group tags from display text
    phraseText = removeGroupTags(phraseText);

    return phraseText;
}

function drawGroupControls(node, ctx, text, groups) {
    if (groups.length === 0) return 0;

    const y = CONFIG.topNodePadding;
    const buttonHeight = CONFIG.groupButtonHeight;
    const margin = CONFIG.groupButtonMargin;
    let currentX = CONFIG.sideNodePadding;

    ctx.font = `${CONFIG.fontSize - 2}px monospace`;
    ctx.textAlign = "center";

    groups.forEach((groupName, index) => {
        const status = getGroupStatus(text, groupName);
        const buttonWidth = ctx.measureText(`[${groupName}]`).width + 16;

        // Determine button color based on status
        let fillColor, borderColor, textColor;
        const colors = getColors();

        switch (status) {
            case 'all':
                fillColor = colors.checkboxFillColor;
                textColor = colors.checkboxSymbolColor;
                borderColor = colors.checkboxFillColor;
                break;
            case 'partial':
                fillColor = colors.weightButtonFillColor;
                textColor = colors.defaultTextColor;
                borderColor = colors.checkboxFillColor;
                break;
            case 'none':
                fillColor = 'transparent';
                textColor = colors.inactiveTextColor;
                borderColor = colors.checkboxBorderColor;
                break;
        }

        // Draw button background
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(currentX, y, buttonWidth, buttonHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw button text
        ctx.fillStyle = textColor;
        const textX = currentX + buttonWidth / 2;
        const textY = y + buttonHeight / 2 + (CONFIG.fontSize - 2) * 0.35;
        ctx.fillText(`[${groupName}]`, textX, textY);

        // Add clickable area
        if (node) {
            node.clickableAreas.push({
                x: currentX,
                y: y,
                w: buttonWidth,
                h: buttonHeight,
                type: 'group_toggle',
                groupName: groupName,
                action: 'group_toggle'
            });
        }

        currentX += buttonWidth + margin;
    });

    ctx.textAlign = "left"; // Reset alignment
    return CONFIG.groupAreaHeight;
}

function drawCheckbox(ctx, y, isCommented, node, lineIndex) {
    const checkboxX = CONFIG.sideNodePadding;
    const checkboxY = y;
    const checkboxW = CONFIG.checkboxSize;
    const checkboxH = CONFIG.checkboxSize;
    
    // Add to clickableAreas
    if (node) {
        node.clickableAreas.push({
            x: checkboxX,
            y: checkboxY,
            w: checkboxW,
            h: checkboxH,
            type: 'checkbox',
            lineIndex: lineIndex,
            action: 'toggle'
        });
    }
    
    // Draw checkbox
    if (isCommented) {
        // Draw checkbox border
        ctx.strokeStyle = getColors().checkboxBorderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(checkboxX, checkboxY, checkboxW, checkboxH, 4);
        ctx.stroke();
    } else {
        // Fill checkbox
        ctx.fillStyle = getColors().checkboxFillColor;
        ctx.beginPath();
        ctx.roundRect(checkboxX, checkboxY, checkboxW, checkboxH, 4);
        ctx.fill();

        // Draw checkmark
        ctx.strokeStyle = getColors().checkboxSymbolColor;
        ctx.lineWidth = 2;
        const centerX = checkboxX + checkboxW / 2;
        const centerY = checkboxY + checkboxH / 2;
        const checkSize = checkboxW * 0.4;
        ctx.beginPath();
        // Start from left, go to bottom center, then to top right
        ctx.moveTo(centerX - checkSize * 0.7, centerY + checkSize * 0.0);
        ctx.lineTo(centerX - checkSize * 0.3, centerY + checkSize * 0.5);
        ctx.lineTo(centerX + checkSize * 0.7, centerY - checkSize * 0.5);
        ctx.stroke();
    }
}

function drawPhraseTextLine(ctx, wrappedLine, y, isCommented, isBold) {
    // Set text color based on comment status
    const colors = getColors();
    ctx.fillStyle = isCommented ? colors.inactiveTextColor : colors.defaultTextColor;
    ctx.textAlign = "left";
    
    // Set font with bold if weight is not 1.0
    ctx.font = isBold ? 
        `bold ${CONFIG.fontSize}px monospace` : 
        `${CONFIG.fontSize}px monospace`;
    
    // Calculate text baseline to align visual center with checkbox center
    const checkboxCenter = y + CONFIG.checkboxSize / 2;
    const textBaseline = checkboxCenter + CONFIG.fontSize * 0.35;
    
    ctx.fillText(wrappedLine, CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText, textBaseline);
}

function drawWeightControls(ctx, y, line, isCommented, node, lineIndex) {
    const nodeWidth = node.size[0];
    
    // Get the text to check for weight
    const textToCheck = isCommented ? 
        (line.match(/^(\s*\/\/\s*)(.*)/)?.[2] || '') : 
        line;
    
    // Skip if it's a comment-only line (no text after //)
    if (isCommented && !textToCheck.trim()) return;
    
    const weightText = getWeightText(textToCheck);
    const checkboxCenter = y + CONFIG.checkboxSize / 2;
    
    // Calculate positions from right to left
    let currentX = nodeWidth - CONFIG.sideNodePadding;
    
    // Draw plus button
    const plusButtonX = currentX - CONFIG.weightButtonSize;
    const plusButtonY = y;
    drawWeightButton(ctx, plusButtonX, plusButtonY, '+', node, lineIndex, 'weight_plus');
    currentX = plusButtonX - 4;
    
    // Draw minus button
    const minusButtonX = currentX - CONFIG.weightButtonSize;
    const minusButtonY = y;
    drawWeightButton(ctx, minusButtonX, minusButtonY, '-', node, lineIndex, 'weight_minus');
    currentX = minusButtonX - 4;
    
    // Draw weight label
    if (weightText) {
        const weightLabelX = currentX - CONFIG.weightLabelWidth;
        const textColors = getColors();
    ctx.fillStyle = isCommented ? textColors.inactiveTextColor : textColors.defaultTextColor;
        ctx.textAlign = "right";
        ctx.font = "12px monospace";
        const textBaseline = checkboxCenter + CONFIG.fontSize * 0.35;
        ctx.fillText(weightText, currentX - 2, textBaseline);
        ctx.textAlign = "left"; // Reset alignment
    }
}

function drawWeightButton(ctx, x, y, symbol, node, lineIndex, action) {
    const buttonSize = CONFIG.weightButtonSize;
    
    // Add to clickable areas
    if (node) {
        node.clickableAreas.push({
            x: x,
            y: y,
            w: buttonSize,
            h: buttonSize,
            type: 'weight_button',
            lineIndex: lineIndex,
            action: action,
            node: node
        });
    }
    
    // Draw button background
    ctx.fillStyle = getColors().weightButtonFillColor;
    ctx.beginPath();
    ctx.roundRect(x, y, buttonSize, buttonSize, 4);
    ctx.fill();
    
    // Draw symbol with lines
    ctx.strokeStyle = getColors().weightButtonSymbolColor;
    ctx.lineWidth = 2;
    const centerX = x + buttonSize / 2;
    const centerY = y + buttonSize / 2;
    const symbolSize = 6;
    
    ctx.beginPath();
    if (symbol === '+') {
        // Horizontal line
        ctx.moveTo(centerX - symbolSize / 2, centerY);
        ctx.lineTo(centerX + symbolSize / 2, centerY);
        // Vertical line
        ctx.moveTo(centerX, centerY - symbolSize / 2);
        ctx.lineTo(centerX, centerY + symbolSize / 2);
    } else if (symbol === '-') {
        // Horizontal line only
        ctx.moveTo(centerX - symbolSize / 2, centerY);
        ctx.lineTo(centerX + symbolSize / 2, centerY);
    }
    ctx.stroke();
}

// ========================================
// Weight
// ========================================

function getWeightText(text) {
    const weight = parseWeight(text);
    return weight === 1.0 ? '' : weight.toFixed(1);
}

function parseWeight(text) {
    const match = text.match(/\(([^:]+):(\d+\.?\d*)\)/);
    if (match) {
        const weight = parseFloat(match[2]);
        return isNaN(weight) ? 1.0 : weight;
    }
    return 1.0;
}

function setWeight(text, weight) {
    const cleanText = text.replace(/\(([^:]+):(\d+\.?\d*)\)/, '$1').trim();
    // Remove trailing comma
    const textWithoutComma = cleanText.replace(/,\s*$/, '').trim();
    if (weight === 1.0) {
        return textWithoutComma;
    }
    return `(${textWithoutComma}:${weight.toFixed(1)})`;
}

function adjustWeight(text, delta) {
    const currentWeight = parseWeight(text);
    const newWeight = Math.round((currentWeight + delta) * 10) / 10;
    
    const minWeight = CONFIG.minWeight;
    const maxWeight = CONFIG.maxWeight;
    
    // Handle out-of-range values
    if (newWeight < minWeight) {
        return text; // Don't allow values below minimum
    }
    
    if (newWeight > maxWeight) {
        // If trying to increase beyond maximum, don't change
        if (delta > 0) {
            return text;
        }
        // If trying to decrease from above maximum, clamp to maximum
        return setWeight(text, maxWeight);
    }
    
    // Special case: if current weight is above maximum and we're decreasing
    if (currentWeight > maxWeight && delta < 0) {
        return setWeight(text, maxWeight);
    }
    
    return setWeight(text, newWeight);
}

// ========================================
// Color
// ========================================

let colorCache = null;

function getColors() {
    if (colorCache) {
        return colorCache;
    }
    const themeColors = getComfyUIThemeColors();
    colorCache = {
        defaultTextColor: themeColors.inputText,
        inactiveTextColor: themeColors.inputText + "66",
        checkboxBorderColor: themeColors.inputText + "80",
        checkboxFillColor: themeColors.inputText + "BB",
        checkboxSymbolColor: themeColors.comfyInputBg,
        weightButtonFillColor: themeColors.comfyInputBg,
        weightButtonSymbolColor: themeColors.inputText + "99",
    };
    return colorCache;
}

function getComfyUIThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
        fgColor: expandHexColor(style.getPropertyValue('--fg-color').trim()) || "#ffffff",
        bgColor: expandHexColor(style.getPropertyValue('--bg-color').trim()) || "#202020",
        comfyMenuBg: expandHexColor(style.getPropertyValue('--comfy-menu-bg').trim()) || "#353535",
        comfyInputBg: expandHexColor(style.getPropertyValue('--comfy-input-bg').trim()) || "#222222",
        inputText: expandHexColor(style.getPropertyValue('--input-text').trim()) || "#dddddd",
        descripText: expandHexColor(style.getPropertyValue('--descrip-text').trim()) || "#999999",
        errorText: expandHexColor(style.getPropertyValue('--error-text').trim()) || "#ff4444",
        borderColor: expandHexColor(style.getPropertyValue('--border-color').trim()) || "#4e4e4e",
    };
}

function expandHexColor(color) {
    if (!color || !color.startsWith('#')) return color;
    if (color.length === 4) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
}

// ========================================
// Preview Functionality
// ========================================

function generatePreview(node) {
    const textWidget = findTextWidget(node);
    const separatorWidget = findSeparatorWidget(node);
    const addNewlineWidget = findNewlineWidget(node);
    const separatorNewlineWidget = findSeparatorNewlineWidget(node);
    const trailingSeparatorWidget = findTrailingSeparatorWidget(node);

    if (!textWidget) return "";

    const text = textWidget.value || "";
    const separator = separatorWidget ? (separatorWidget.value !== undefined ? separatorWidget.value : ", ") : ", ";
    const addNewline = addNewlineWidget ? addNewlineWidget.value : false;
    const separatorNewline = separatorNewlineWidget ? separatorNewlineWidget.value : false;
    const trailingSeparator = trailingSeparatorWidget ? trailingSeparatorWidget.value : false;

    // Reset scroll position when content changes
    if (!node.lastPreviewText || node.lastPreviewText !== text) {
        node.previewScrollOffset = 0;
        node.lastPreviewText = text;
    }

    // Replicate Python's process method logic
    return processTextForPreview(text, separator, addNewline, separatorNewline, trailingSeparator);
}

function processTextForPreview(text, separator = ", ", addNewline = false, separatorNewline = false, trailingSeparator = false) {
    const lines = text.split("\n");
    const filteredLines = [];

    for (let line of lines) {
        // Skip empty lines
        if (!line.trim()) {
            continue;
        }
        // Skip commented lines (// for toggle, # for description)
        if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
            continue;
        }
        // Remove inline comments
        if (line.includes("//")) {
            line = line.split("//")[0].trimEnd();
        }
        if (line.trim()) {
            filteredLines.push(line.trimEnd());
        }
    }

    // Join with custom separator
    let result;
    if (separator === "") {
        // No separator, no newlines
        result = filteredLines.join("");
    } else {
        // Add newline to separator if requested
        const effectiveSeparator = separatorNewline ? separator + "\n" : separator;
        result = filteredLines.join(effectiveSeparator);
    }

    // Add trailing separator if requested
    if (trailingSeparator && separator !== "" && filteredLines.length > 0) {
        const effectiveSeparator = separatorNewline ? separator + "\n" : separator;
        result += effectiveSeparator;
    }

    if (addNewline) {
        result += "\n";
    }

    return result;
}

function drawPreview(node, ctx) {
    if (!node || node.isEditMode || node.hidePreview) return;

    try {
        const preview = generatePreview(node);
        
        const nodeWidth = node.size[0];
        const nodeHeight = node.size[1];
    
    // Calculate preview area (position above the widget area)
    // ComfyUI widgets are typically placed at the bottom, so we position preview above them
    const widgetAreaHeight = 75; // Space for widgets (Edit, Hide Preview buttons)
    const previewY = nodeHeight - CONFIG.previewHeight - widgetAreaHeight;
    const previewX = CONFIG.sideNodePadding;
    const previewWidth = nodeWidth - CONFIG.sideNodePadding * 2;

    // Draw preview background
    const colors = getColors();
    
    // Ensure valid color values
    const bgColor = colors.comfyInputBg || "#222222";
    ctx.fillStyle = bgColor + "80"; // Semi-transparent background
    ctx.fillRect(previewX, previewY, previewWidth, CONFIG.previewHeight);

    // Draw preview border
    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(previewX, previewY, previewWidth, CONFIG.previewHeight);

    // Draw preview label
    ctx.fillStyle = colors.descripText;
    ctx.font = `${CONFIG.previewFontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText("Preview:", previewX + 6, previewY + 15);

    // Handle empty preview
    if (!preview || !preview.trim()) {
        ctx.fillStyle = colors.inactiveTextColor;
        ctx.fillText("(empty)", previewX + 6, previewY + 35);
        return;
    }

    // Prepare text content for scrollable display
    ctx.fillStyle = colors.defaultTextColor;
    ctx.font = `${CONFIG.previewFontSize}px monospace`;
    ctx.textAlign = "left";
    const textAreaWidth = previewWidth - 12 - CONFIG.scrollBarWidth;
    
    // Split by newlines first, then wrap each line
    const previewLines = preview.split('\n');
    let allWrappedLines = [];
    
    for (const line of previewLines) {
        if (line === '') {
            // Empty line - add as is
            allWrappedLines.push('');
        } else {
            // Wrap the line and add all wrapped parts
            const wrappedLine = wrapText(ctx, line, textAreaWidth);
            allWrappedLines = allWrappedLines.concat(wrappedLine);
        }
    }
    
    // Calculate scroll bounds
    const maxScrollOffset = Math.max(0, allWrappedLines.length - CONFIG.previewVisibleLines);
    node.previewScrollOffset = Math.max(0, Math.min(node.previewScrollOffset || 0, maxScrollOffset));
    
    // Draw visible lines with scroll offset
    const textStartY = previewY + 35;
    
    for (let i = 0; i < CONFIG.previewVisibleLines && (i + node.previewScrollOffset) < allWrappedLines.length; i++) {
        const lineIndex = i + node.previewScrollOffset;
        const line = allWrappedLines[lineIndex];
        const currentY = textStartY + i * CONFIG.previewLineHeight;
        
        if (line !== '') {
            ctx.fillStyle = colors.defaultTextColor || "#dddddd";
            ctx.font = `${CONFIG.previewFontSize}px monospace`;
            ctx.textAlign = "left";
            ctx.fillText(line, previewX + 6, currentY);
        }
    }
    
    // Draw scroll bar if needed
    if (allWrappedLines.length > CONFIG.previewVisibleLines) {
        drawScrollBar(ctx, previewX, previewY, previewWidth, CONFIG.previewHeight, 
                     node.previewScrollOffset, maxScrollOffset, colors, node);
    }
    
    } catch (error) {
        // If there's an error in preview rendering, show error message
        const colors = getColors();
        ctx.fillStyle = colors.errorText || "#ff4444";
        ctx.font = `${CONFIG.previewFontSize}px monospace`;
        ctx.fillText("Preview Error", previewX + 6, previewY + 35);
        console.error("Preview render error:", error);
    }
}

function drawScrollBar(ctx, x, y, width, height, scrollOffset, maxScrollOffset, colors, node) {
    const scrollBarX = x + width - CONFIG.scrollBarWidth - 2;
    const scrollBarY = y + 20; // Start below the "Preview:" label
    const scrollBarHeight = height - 25 - (CONFIG.scrollButtonHeight * 2); // Account for up/down buttons
    
    // Draw up scroll button
    const upButtonY = scrollBarY;
    drawScrollButton(ctx, scrollBarX, upButtonY, CONFIG.scrollBarWidth, CONFIG.scrollButtonHeight, '▲', colors);
    
    // Add clickable area for up button
    node.clickableAreas.push({
        x: scrollBarX,
        y: upButtonY,
        w: CONFIG.scrollBarWidth,
        h: CONFIG.scrollButtonHeight,
        action: 'scroll_up'
    });
    
    // Draw scroll track
    const trackY = scrollBarY + CONFIG.scrollButtonHeight;
    ctx.fillStyle = "#2a2a2a"; // Dark gray background for track
    ctx.fillRect(scrollBarX, trackY, CONFIG.scrollBarWidth, scrollBarHeight);
    
    // Draw scroll track border
    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(scrollBarX, trackY, CONFIG.scrollBarWidth, scrollBarHeight);
    
    // Calculate and draw scroll thumb
    if (maxScrollOffset > 0) {
        const visibleRatio = CONFIG.previewVisibleLines / (maxScrollOffset + CONFIG.previewVisibleLines);
        const thumbHeight = Math.max(20, scrollBarHeight * visibleRatio);
        const thumbY = trackY + (scrollBarHeight - thumbHeight) * (scrollOffset / maxScrollOffset);
        
        // Draw scroll thumb
        ctx.fillStyle = "#555555"; // Medium gray for thumb
        ctx.fillRect(scrollBarX + 1, thumbY, CONFIG.scrollBarWidth - 2, thumbHeight);
    }
    
    // Draw down scroll button
    const downButtonY = trackY + scrollBarHeight;
    drawScrollButton(ctx, scrollBarX, downButtonY, CONFIG.scrollBarWidth, CONFIG.scrollButtonHeight, '▼', colors);
    
    // Add clickable area for down button
    node.clickableAreas.push({
        x: scrollBarX,
        y: downButtonY,
        w: CONFIG.scrollBarWidth,
        h: CONFIG.scrollButtonHeight,
        action: 'scroll_down'
    });
}

function drawScrollButton(ctx, x, y, width, height, symbol, colors) {
    // Draw button background
    ctx.fillStyle = "#3a3a3a"; // Dark gray background for buttons
    ctx.fillRect(x, y, width, height);
    
    // Draw button border
    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw symbol
    ctx.fillStyle = colors.defaultTextColor;
    ctx.font = `${height - 4}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x + width/2, y + height/2);
}
