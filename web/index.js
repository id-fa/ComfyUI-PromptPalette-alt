import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "PromptPalette",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptPalette") {
            const UI_CONFIG = {
                lineHeight: 20,
                leftPadding: 14,
                topPadding: 54,
                minHeight: 80,
                checkboxSize: 10,
                checkboxOffset: 6
            };
            this.extendNodeCreatedCallback(nodeType, UI_CONFIG, app);
            this.extendDrawForegroundCallback(nodeType, UI_CONFIG, app);
        }
    },

    extendNodeCreatedCallback(nodeType, config, app) {
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

    extendDrawForegroundCallback(nodeType, config, app) {
        const origOnDrawForeground = nodeType.prototype.onDrawForeground;
        
        nodeType.prototype.onDrawForeground = function(ctx) {
            if (origOnDrawForeground) {
                origOnDrawForeground.call(this, ctx);
            }
            // Draw text when not in edit mode
            const textWidget = findTextWidget(this);
            if (textWidget && !this.isEditMode) {
                drawTextContent(this, ctx, textWidget, config, app);
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
    node.onMouseDown = function(e, pos) {
        if (this.isEditMode) return;
        
        // Calculate the clicked line number
        const relativeY = pos[1] - (config.topPadding - config.lineHeight);
        let clickedLineIndex = Math.floor(relativeY / config.lineHeight);
        
        const textLines = textWidget.value.split('\n');
        if (clickedLineIndex < 0 || clickedLineIndex >= textLines.length) return;
        if (isEmptyLine(textLines[clickedLineIndex])) return;
        
        // Check if the click is within the checkbox
        const relativeX = pos[0];
        const checkboxRight = config.leftPadding + config.checkboxSize;
        if (relativeX >= config.leftPadding && relativeX <= checkboxRight) {
            toggleCommentOnLine(textLines, clickedLineIndex);
            textWidget.value = textLines.join('\n');
            app.graph.setDirtyCanvas(true);
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

function drawTextContent(node, ctx, textWidget, config, app) {
    // Skip if node is collapsed
    if (node.flags && node.flags.collapsed) {
        return;
    }

    const text = textWidget.value || "";
    const lines = text.split('\n');
    
    // Adjust node size to match text line count
    const textHeight = Math.max(config.minHeight, config.topPadding + lines.length * config.lineHeight + 10);
    
    if (node.size[1] < textHeight) {
        node.size[1] = textHeight;
        app.graph.setDirtyCanvas(true);
    }

    // Text settings
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    if (text.trim() !== "") {
        drawTextLines(ctx, lines, config);
    } else {
        // If text is empty
        ctx.fillStyle = "#aaaaaa";
        ctx.textAlign = "center";
        ctx.fillText("No Text", node.size[0]/2, node.size[1]/2);
    }
}

function drawTextLines(ctx, lines, config) {
    lines.forEach((line, index) => {
        const y = config.topPadding + index * config.lineHeight;
        const isCommented = line.trim().startsWith("//");
        
        // Skip empty lines
        if (isEmptyLine(line)) return;
        
        // Checkbox
        ctx.fillStyle = "#AAAAAA";
        ctx.strokeStyle = "#505050";
        ctx.lineWidth = 1;
        if (!isCommented) {
            const padding = 2;
            ctx.fillRect(
                config.leftPadding + padding, 
                y - config.checkboxSize + padding, 
                config.checkboxSize - padding * 2, 
                config.checkboxSize - padding * 2
            );
        }
        ctx.beginPath();
        ctx.rect(config.leftPadding, y - config.checkboxSize, config.checkboxSize, config.checkboxSize);
        ctx.stroke();

        // Remove leading // and trailing ,
        let displayText = line;
        if (isCommented) {
            displayText = line.trim().replace(/^\s*\/\/\s*/, '');
        }
        if (displayText.trim().endsWith(',')) {
            displayText = displayText.substring(0, displayText.lastIndexOf(','));
        }
        
        // Draw text
        if (isCommented) {
            ctx.fillStyle = "#777777";
        } else {
            ctx.fillStyle = "#ffffff";
        }
        ctx.fillText(displayText, config.leftPadding + config.checkboxSize + config.checkboxOffset, y);
    });
}
