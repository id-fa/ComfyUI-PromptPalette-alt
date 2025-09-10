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
};

// ========================================
// Extension Registration
// ========================================

app.registerExtension({
    name: "PromptPalette",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptPalette") {
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
    
    // Add spacing below Edit button
    const spacer = node.addWidget("text", "", "");
    spacer.hidden = true;
    spacer.computeSize = () => [0, 6];
}

function setupClickHandler(node, textWidget, app) {
    // Initialize clickableAreas
    node.clickableAreas = [];
    
    // Add helper methods to node
    node.findClickedArea = findClickedArea;
    node.handleClickableAreaAction = handleClickableAreaAction;
    
    node.onMouseDown = function(e, pos) {
        if (this.isEditMode) return;
        
        const clickedArea = this.findClickedArea(pos);
        if (clickedArea) {
            this.handleClickableAreaAction(clickedArea, textWidget, app);
        }
    };
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
    
    // Adjust node size to match wrapped text line count
    const textHeight = Math.max(CONFIG.minNodeHeight, CONFIG.topNodePadding + totalWrappedLines * CONFIG.lineHeight + 10);
    
    if (node.size[1] < textHeight) {
        node.size[1] = textHeight;
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
        ctx.fillText("No Text", node.size[0]/2, node.size[1]/2);
    }
}

function drawCheckboxItems(ctx, lines, node) {
    // Clear clickableAreas before redrawing
    if (node) {
        node.clickableAreas = [];
    }
    
    let currentY = CONFIG.topNodePadding;
    const availableWidth = calculateAvailableTextWidth(node.size[0]);
    
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
    
    return phraseText;
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
