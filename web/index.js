import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "PromptPalette",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptPalette") {
            const UI_CONFIG = {
                minNodeHeight: 80,
                topNodePadding: 40,
                leftNodePadding: 14,
                lineHeight: 26,
                fontSize: 14,
                checkboxSize: 16,
                spaceBetweenCheckboxAndText: 6,
            };
            this.setupNodeCreatedCallback(nodeType, UI_CONFIG, app);
            this.setupDrawForegroundCallback(nodeType, UI_CONFIG, app);
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
            if (textWidget) {
                textWidget.hidden = true;
                addEditButton(this, textWidget, app);
                setupClickHandler(this, textWidget, config, app);
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
                drawCheckboxList(this, ctx, textWidget.value, config, app);
            }
        };
    }
});

function findTextWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "text") {
            return w;
        }
    }
    return null;
}

function addEditButton(node, textWidget, app) {
    const textButton = node.addWidget("button", "Edit", "edit_text", () => {
        node.isEditMode = !node.isEditMode;
        textWidget.hidden = !node.isEditMode;
        textButton.name = node.isEditMode ? "Save" : "Edit";
        app.graph.setDirtyCanvas(true); // 再描画
    });
}

function isEmptyLine(line) {
    return line.trim() === "";
}

function setupClickHandler(node, textWidget, config, app) {
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

function toggleCommentOnLine(textLines, lineIndex) {
    const line = textLines[lineIndex];
    
    if (line.trim().startsWith("//")) {
        textLines[lineIndex] = line.replace(/^\s*\/\/\s*/, '');
    } else {
        textLines[lineIndex] = "// " + line;
    }
}

function drawCheckboxList(node, ctx, text, config, app) {
    // Skip if node is collapsed
    if (node.flags && node.flags.collapsed) {
        return;
    }

    const lines = text.split('\n');
    
    // Adjust node size to match text line count
    const textHeight = Math.max(config.minNodeHeight, config.topNodePadding + lines.length * config.lineHeight + 10);
    
    if (node.size[1] < textHeight) {
        node.size[1] = textHeight;
        app.graph.setDirtyCanvas(true);
    }

    // Text settings
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    if (text.trim() !== "") {
        drawCheckboxItems(ctx, lines, config, node);
    } else {
        // If text is empty
        ctx.fillStyle = "#aaaaaa";
        ctx.textAlign = "center";
        ctx.fillText("No Text", node.size[0]/2, node.size[1]/2);
    }
}

function drawCheckboxItems(ctx, lines, config, node) {
    // Clear clickableAreas before redrawing
    if (node) {
        node.clickableAreas = [];
    }
    
    lines.forEach((line, index) => {
        // Skip empty lines
        if (isEmptyLine(line)) return;
        
        const y = config.topNodePadding + index * config.lineHeight;
        const isCommented = line.trim().startsWith("//");
        
        // Draw checkbox and add to clickable areas
        drawCheckbox(ctx, config, y, isCommented, node, index);
        
        // Remove comments/commas and draw text
        const displayText = cleanTextForDisplay(line, isCommented);
        drawLineText(ctx, displayText, config, y, isCommented);
    });
}

function drawCheckbox(ctx, config, y, isCommented, node, lineIndex) {
    const checkboxX = config.leftNodePadding;
    const checkboxY = y;
    const checkboxW = config.checkboxSize;
    const checkboxH = config.checkboxSize;
    
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
    ctx.fillStyle = "#AAAAAA";
    ctx.strokeStyle = "#505050";
    ctx.lineWidth = 1;
    
    if (!isCommented) {
        const padding = 2;
        ctx.fillRect(
            checkboxX + padding, 
            checkboxY + padding, 
            checkboxW - padding * 2, 
            checkboxH - padding * 2
        );
    }
    
    ctx.beginPath();
    ctx.rect(checkboxX, checkboxY, checkboxW, checkboxH);
    ctx.stroke();
}

function cleanTextForDisplay(line, isCommented) {
    let displayText = line;
    
    // Remove leading //
    if (isCommented) {
        displayText = line.trim().replace(/^\s*\/\/\s*/, '');
    }
    
    // Remove trailing comma
    if (displayText.trim().endsWith(',')) {
        displayText = displayText.substring(0, displayText.lastIndexOf(','));
    }
    
    return displayText;
}

function drawLineText(ctx, displayText, config, y, isCommented) {
    // Set text color based on comment status
    ctx.fillStyle = isCommented ? "#777777" : "#ffffff";
    
    // Draw text
    // Calculate text baseline to align visual center with checkbox center
    const checkboxCenter = y + config.checkboxSize / 2;
    const textBaseline = checkboxCenter + config.fontSize * 0.35;
    
    ctx.fillText(displayText, config.leftNodePadding + config.checkboxSize + config.spaceBetweenCheckboxAndText, textBaseline);
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
        // Future actions can be added here
    }
}
