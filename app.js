import { isLight } from "./themeSwitcher.js";
//canvas rendering
const canvas = document.getElementById("pixel-canvas");

const ctx = canvas.getContext("2d");
let pixelSize = 16;
let gridWidth = Math.floor(canvas.width / pixelSize);
let gridHeight = Math.floor(canvas.height / pixelSize);


let grid = [];

let previewIndex = 0;


for (let x = 0; x < gridWidth; x++) {
    grid[x] = [];
    for (let y = 0; y < gridHeight; y++) {
        grid[x][y] = null;
    }
}

//tools state
let activeTool = null;
let isDrawing = false;
let hoverCell = null;
let lastDrawX = null;
let lastDrawY = null;

//buttons
const pencilButton = document.getElementById("pencil-tool");
const eraserButton = document.getElementById("eraser-tool");
const fillButton = document.getElementById("fill-tool");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const x16Button = document.getElementById("16");
const x32Button = document.getElementById("32");
const x64Button = document.getElementById("64");
const colorSave = document.getElementById("color-save");
const addFrame = document.getElementById("add-frame");
const copyFrameToggle = document.getElementById("copyFrame-toggle");
const pixelPerfectToggle = document.getElementById("pixelPerfect-toggle");
const questionButton = document.getElementById("question-button");
const modal = document.getElementById("modal");
const closeButton = document.getElementById("close-button");


//Handling frames
let frames = [];
let activeFrameIndex = 0;

function createFrame() {
    const frameContainer = document.getElementById("timeline");
    const newFrame = document.createElement("canvas");
    newFrame.width = 100;
    newFrame.height = 100;
    newFrame.className = "frame-canvas";
    
    const frameWrap = document.createElement("div");
    frameWrap.className = "frame-wrap";
    const frameNumber = document.createElement("span");
    frameNumber.className = "frame-number";
    
    


    

    
    //Download single frame
    const downloadFrame = document.createElement("button");
    const downloadIcon = document.createElement("i");
    downloadFrame.className = "download-frame";
    downloadIcon.className = "download-icon";
    downloadFrame.appendChild(downloadIcon);

    downloadFrame.addEventListener("click", (e) => {
        const index = Array.from(frameContainer.children).indexOf(frameWrap);
        exportSpecificFrameAsPNG(index, `frame-${index + 1}`);
    });

    //DELETING FRAMES
    const deleteFrame = document.createElement("button");
    const deleteIcon = document.createElement("i");
    deleteIcon.className = "delete-icon";
    deleteFrame.appendChild(deleteIcon);
    deleteFrame.className = "delete-frame";
    deleteFrame.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = Array.from(frameContainer.children).indexOf(frameWrap);
        if (frames.length > 1) {
            frames.splice(index, 1);
            frameContainer.removeChild(frameWrap);
            //Updating frame numbers
            Array.from(frameContainer.children).forEach((wrap, i) => {
            const number = wrap.querySelector('.frame-number');
            if (number) number.textContent = i + 1;
            // Updating frames IDs
            const canvas = wrap.querySelector('.frame-canvas');
            if (canvas) canvas.id = `frame-${i + 1}`;
        });
            if (activeFrameIndex >= frames.length) {
                activeFrameIndex = frames.length - 1;
            }
            selectFrame(activeFrameIndex);
        } else {
            alert("You cannot delete the last frame.");
        }
    });

    const optionsMenu = document.createElement("div");
    optionsMenu.className = "options-menu";
    optionsMenu.appendChild(downloadFrame);
    optionsMenu.appendChild(deleteFrame);
    
    frameWrap.appendChild(optionsMenu);
    const optionsButton = document.createElement("button");
    optionsButton.className = "options-button";
    optionsButton.innerHTML = "&#8942;";
    
    optionsButton.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".frame-wrap.show-options").forEach(wrap => {
            if (wrap !== frameWrap) wrap.classList.remove("show-options");
        });
        frameWrap.classList.toggle("show-options");
    });

    // close button for the modal
    document.addEventListener("click", (e) => {
        document.querySelectorAll(".frame-wrap.show-options").forEach(wrap => {
            wrap.classList.remove("show-options");
        });
    });

    optionsMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    });
    

    frameWrap.appendChild(frameNumber);
    frameWrap.appendChild(newFrame);
    frameWrap.appendChild(optionsButton);
   
    // Each frame is indivual
    let prevFrame = frames[activeFrameIndex];
    let newGrid;
    if (prevFrame && copyFrameToggle.checked) {
        
        newGrid = JSON.parse(JSON.stringify(prevFrame.grid));
    } else {
        newGrid = Array.from({length: gridWidth}, () => Array(gridHeight).fill(null));
    
    }
    const insertIndex = activeFrameIndex + 1;
    frames.splice(insertIndex, 0, {
        grid: newGrid,
        undoStack: [JSON.stringify(newGrid)],
        redoStack: [],
        canvas: newFrame,
        ctx: newFrame.getContext("2d")
    });

     const wraps = Array.from(frameContainer.children);
frameContainer.insertBefore(frameWrap, wraps[insertIndex] || null);

    Array.from(frameContainer.children).forEach((wrap, i) => {
        const number = wrap.querySelector('.frame-number');
        if (number) number.textContent = i + 1;
        const canvas = wrap.querySelector('.frame-canvas');
        if (canvas) canvas.id = `frame-${i + 1}`;
    });

    frameWrap.addEventListener("click", () => {
        selectFrame(Array.from(frameContainer.children).indexOf(frameWrap));
    });
    selectFrame(insertIndex);
    
}

function selectFrame(index) {
    
    document.querySelectorAll(".frame-wrap.active").forEach(f => f.classList.remove("active"));
    document.querySelectorAll(".frame-canvas.active").forEach(c => c.classList.remove("active"));
    

    const frameContainer = document.getElementById("timeline");
    const frameWrap = frameContainer.children[index];
    if(!frameWrap)  return;
    const frameCanvas = frameWrap.querySelector(".frame-canvas");
    frameWrap.classList.add("active");
    frameCanvas.classList.add("active");
    activeFrameIndex = index;
    // Loading Frames
    const frame = frames[activeFrameIndex];
    grid = JSON.parse(JSON.stringify(frames[index].grid));
    
    previewIndex = frame.undoStack.length - 1;
    redrawCanvas();
    drawPreviewFromStack(previewIndex);
}

//canvas rendering
function redrawCanvas() {
    
    if (isLight) {
    ctx.fillStyle = "#fff";
    }
    else {
    ctx.fillStyle = "#585858ff";
    }
    
    
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(); 
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (grid[x][y]) {
                ctx.fillStyle = grid[x][y];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    //this is the cursor hover effect that adapts to the size of each tool
    if (hoverCell && activeTool !== "fill" && activeTool !== null) {
        const pixelSizeInput = document.getElementById("pixel-size");
        const eraseSizeInput = document.getElementById("erase-size");
        let pixelReSize = 1;
        if (activeTool === "pencil") {
         pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
        }
        else
        if (activeTool === "eraser") {
             pixelReSize = eraseSizeInput ? parseInt(eraseSizeInput.value) : 1;
        }
        let startX, startY, size;
        if (pixelReSize > 1) {
            if (pixelReSize % 2 !== 0) {
                
                const half = Math.floor(pixelReSize / 2);
                startX = hoverCell.x - half;
                startY = hoverCell.y - half;
            } else {
                
                const half = pixelReSize / 2;
                startX = hoverCell.x - half;
                startY = hoverCell.y - half;
            }
            size = pixelReSize;
        } else {
            startX = hoverCell.x;
            startY = hoverCell.y;
            size = 1;
        }

        ctx.save();
        ctx.strokeStyle = "#ff9800";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            startX * pixelSize + 1,
            startY * pixelSize + 1,
            size * pixelSize - 2,
            size * pixelSize - 2
        );
        ctx.restore();
    }
}

//this function is used for the preview in the frames
function drawPreviewFromStack(index) {
    const frame = frames[activeFrameIndex];
    if (!frame || !frame.ctx || !frame.canvas) return;
    const ctxPreview = frame.ctx;
    const canvasPreview = frame.canvas;
    ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);
    if (index < 0 || index >= frame.undoStack.length) return;
    const state = JSON.parse(frame.undoStack[index]);
    
    const cellSizeX = canvasPreview.width / gridWidth;
    const cellSizeY = canvasPreview.height / gridHeight;
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (state[x][y]) {
                ctxPreview.fillStyle = state[x][y];
                ctxPreview.fillRect(x * cellSizeX, y * cellSizeY, cellSizeX, cellSizeY);
            }
        }
    }
    // this draw the grid on the preview canvas
    ctxPreview.save();
    ctxPreview.strokeStyle = "rgba(0,0,0,0.15)";
    ctxPreview.lineWidth = 1;
    for (let x = 0; x <= gridWidth; x++) {
        ctxPreview.beginPath();
        ctxPreview.moveTo(x * cellSizeX, 0);
        ctxPreview.lineTo(x * cellSizeX, canvasPreview.height);
        ctxPreview.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
        ctxPreview.beginPath();
        ctxPreview.moveTo(0, y * cellSizeY);
        ctxPreview.lineTo(canvasPreview.width, y * cellSizeY);
        ctxPreview.stroke();
    }
    ctxPreview.restore();
}

function drawGrid()
{
   
    for (let x = 0; x < canvas.width; x += pixelSize)
    {
        for(let y = 0; y < canvas.height; y += pixelSize)
        {
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, pixelSize, pixelSize);
            
        }
    }
}
//Here everything starts
drawGrid();
redrawCanvas(); // Initial canvas rendering


//different listeners for mouse events

canvas.addEventListener("mousedown", function(e) {
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    lastDrawX = cellX;
    lastDrawY = cellY;
    switch (activeTool) {
        case "pencil":
            isDrawing = true;
            drawingAtMouse(e);
            break;
        case "eraser":
            isDrawing = true;
            eraseAtMouse(e);
            break;
        case "fill":
            fillAtMouse(e);
            break;
        default:
            isDrawing = false;
            break;
    }
});

canvas.addEventListener("mousemove", function(e) {
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);

    if (!hoverCell || hoverCell.x !== cellX || hoverCell.y !== cellY) {
        hoverCell = { x: cellX, y: cellY };
        redrawCanvas();
    }
    if (isDrawing && activeTool === "pencil") {

        if(pixelPerfectToggle.checked) {
        drawLineOnGrid(lastDrawX, lastDrawY, cellX, cellY, document.getElementById("color-picker").value);
        }
        else
        {
        drawingAtMouse(e);
        }
        lastDrawX = cellX;
        lastDrawY = cellY;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
        
        console.log("Drawing at mouse position:", e.offsetX, e.offsetY);

    }
    if (isDrawing && activeTool === "eraser") {
        if(pixelPerfectToggle.checked) {
            drawLineOnGrid(lastDrawX, lastDrawY, cellX, cellY, null);
        }
        else
        {
            eraseAtMouse(e);
        }
        lastDrawX = cellX;
        lastDrawY = cellY;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
        
        console.log("Erasing at mouse position:", e.offsetX, e.offsetY);
    }

    
    
});

function isGridChanged() {
    const frame = frames[activeFrameIndex];
    if (!frame || !frame.undoStack) return true;
    if (frame.undoStack.length === 0) return true;
    const last = JSON.stringify(grid);
    const prev = frame.undoStack[frame.undoStack.length - 1];
    return last !== prev;
}

canvas.addEventListener("mouseup", function() {
    isDrawing = false;
    lastDrawX = null;
    lastDrawY = null;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});


document.addEventListener("mouseup", function() {
    if (!isDrawing) return;
    isDrawing = false;
    lastDrawX = null;
    lastDrawY = null;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});


canvas.addEventListener("mouseleave", function() {
    
    hoverCell = null;
    redrawCanvas();
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});

//setting grid size
x64Button.addEventListener("click", () => {

    confirmGridResize(() => {
    pixelSize = 8;
    setGridSize();
    });
});
x16Button.addEventListener("click", () => {
    confirmGridResize(() => {
    pixelSize = 32;
    setGridSize();
    });
}
);
x32Button.addEventListener("click", () => {
    confirmGridResize(() => {
    pixelSize = 16;
    setGridSize();
    });
}
);


//selecting tools
pencilButton.addEventListener("click", () => {
    if (activeTool === "pencil") {
        
    activeTool = null;
    pencilButton.classList.remove("active"); 
  } else {
    
    activeTool = "pencil";
    pencilButton.classList.add("active");
    eraserButton.classList.remove("active");
    fillButton.classList.remove("active");
  }
});

eraserButton.addEventListener("click", () => {
    if (activeTool === "eraser") {
        
        activeTool = null;
        eraserButton.classList.remove("active");
    } else {
        
        activeTool = "eraser";
        eraserButton.classList.add("active");
        pencilButton.classList.remove("active");
        fillButton.classList.remove("active");
    }
}
);

fillButton.addEventListener("click", () => {
    if (activeTool === "fill") {
        activeTool = null;
        fillButton.classList.remove("active");
    } else {
        activeTool = "fill";
        fillButton.classList.add("active");
        pencilButton.classList.remove("active");
        eraserButton.classList.remove("active");
    }
}
);

//undo and redo functionality


function saveState() {
    const frame = frames[activeFrameIndex];
    if (!frame) return;
    frame.grid = JSON.parse(JSON.stringify(grid));
    frame.undoStack.push(JSON.stringify(grid));
    frame.redoStack = [];
    previewIndex = frame.undoStack.length - 1;
    drawPreviewFromStack(previewIndex);
}

undoButton.addEventListener("click", () => {
    const frame = frames[activeFrameIndex];
    if (frame.undoStack.length > 1) {
        frame.redoStack.push(JSON.stringify(frame.grid));
        frame.undoStack.pop();
        frame.grid = JSON.parse(frame.undoStack[frame.undoStack.length - 1]);
        grid = JSON.parse(JSON.stringify(frame.grid));
        redrawCanvas();
        previewIndex = frame.undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});
redoButton.addEventListener("click", () => {
    const frame = frames[activeFrameIndex];
    if (frame.redoStack.length > 0) {
        const redoState = frame.redoStack.pop();
        frame.undoStack.push(redoState);
        frame.grid = JSON.parse(redoState);
        grid = JSON.parse(JSON.stringify(frame.grid));
        redrawCanvas();
        previewIndex = frame.undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});




//tools functions

//pencil

//Bresenham
function drawLineOnGrid(x0, y0, x1, y1, color) {
    if (x0 === null || y0 === null) return;
    
    // Get the tool size based on active tool
    let toolSize = 1;
    if (activeTool === "pencil") {
        const pixelSizeInput = document.getElementById("pixel-size");
        toolSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    } else if (activeTool === "eraser") {
        const eraseSizeInput = document.getElementById("erase-size");
        toolSize = eraseSizeInput ? parseInt(eraseSizeInput.value) : 1;
    }
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    
    while (true) {
        // Draw area of toolSize centered on current point
        drawToolArea(x, y, toolSize, color);
        
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

// Helper function to draw an area with the specified tool size
function drawToolArea(centerX, centerY, toolSize, color) {
    if (toolSize <= 1) {
        // Single pixel
        if (centerX >= 0 && centerX < gridWidth && centerY >= 0 && centerY < gridHeight) {
            grid[centerX][centerY] = color;
        }
        return;
    }
    
    // Multiple pixels - handle both odd and even sizes
    let startX, startY;
    if (toolSize % 2 !== 0) {
        // Odd size - center perfectly
        const halfSize = Math.floor(toolSize / 2);
        startX = centerX - halfSize;
        startY = centerY - halfSize;
    } else {
        // Even size - offset slightly
        const halfSize = toolSize / 2;
        startX = Math.floor(centerX - halfSize);
        startY = Math.floor(centerY - halfSize);
    }
    
    // Draw the area
    for (let x = startX; x < startX + toolSize; x++) {
        for (let y = startY; y < startY + toolSize; y++) {
            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                grid[x][y] = color;
            }
        }
    }
}

function drawingAtMouse(e)
{
    if (!isDrawing || activeTool !== "pencil") {
        return;
    }
    const colorPicker = document.getElementById("color-picker");
    const currentColor = colorPicker ? colorPicker.value : "#000000";
const pixelSizeInput = document.getElementById("pixel-size");
    const pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    //Adjust the pixel size based on the input value
    if (pixelReSize > 1) {
        if (pixelReSize % 2 !== 0) {
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = Math.floor(pixelReSize / 2);
            for (let x = cellX - halfSize; x <= cellX + halfSize; x++) {
                for (let y = cellY - halfSize; y <= cellY + halfSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {

                        grid[x][y] = currentColor;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
        else {
    
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = pixelReSize / 2;
            
            const startX = Math.floor(cellX - halfSize );
            const startY = Math.floor(cellY - halfSize );
            for (let x = startX; x < startX + pixelReSize; x++) {
                for (let y = startY; y < startY + pixelReSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = currentColor;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
    }   
    else {
        const cellX = Math.floor(e.offsetX / pixelSize);
        const cellY = Math.floor(e.offsetY / pixelSize);
        grid[cellX][cellY] = currentColor;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
    }
}


//eraser
function eraseAtMouse(e) {
    if (!isDrawing || activeTool !== "eraser") {
        return;
    }
    const pixelSizeInput = document.getElementById("erase-size");
    const pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    //same adjustment as the pencil
    if (pixelReSize > 1) {
        if (pixelReSize % 2 !== 0) {
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = Math.floor(pixelReSize / 2);
            for (let x = cellX - halfSize; x <= cellX + halfSize; x++) {
                for (let y = cellY - halfSize; y <= cellY + halfSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = null;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
        else {
    
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = pixelReSize / 2;
            
            const startX = Math.floor(cellX - halfSize );
            const startY = Math.floor(cellY - halfSize );
            for (let x = startX; x < startX + pixelReSize; x++) {
                for (let y = startY; y < startY + pixelReSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = null;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
    }   
    else {
        const cellX = Math.floor(e.offsetX / pixelSize);
        const cellY = Math.floor(e.offsetY / pixelSize);
        grid[cellX][cellY] = null;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
    }
}

//fill
function fillAtMouse(e) {
    if (activeTool !== "fill") return;
    const currentColor = document.getElementById("color-picker").value;
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    if (grid[cellX][cellY] === currentColor) return;
    const targetColor = grid[cellX][cellY];
    floodFill(cellX, cellY, targetColor, currentColor);
    redrawCanvas();
    // Save the state after filling
    const frame = frames[activeFrameIndex];
    frame.undoStack.push(JSON.stringify(grid));
    frame.grid = JSON.parse(JSON.stringify(grid));
    frame.redoStack = [];
    previewIndex = frame.undoStack.length - 1;
    drawPreviewFromStack(previewIndex);
}

function floodFill(x, y, targetColor, replacementColor) {
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        return;
    }
    if (grid[x][y] !== targetColor) {
        return;
    }
    grid[x][y] = replacementColor;
    
    // Recursively fill adjacent cells, this repeats until all connected 
    // cells of the target color are filled
    // with the replacement color.
    // (ik not the most efficient way, but works for this purpose)
    
       floodFill(x + 1, y, targetColor, replacementColor);
    
    
       floodFill(x, y + 1, targetColor, replacementColor);
    
    
       floodFill(x - 1, y, targetColor, replacementColor);
    
    
       floodFill(x, y - 1, targetColor, replacementColor);
    
}

//pulse effect on buttons

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
        btn.classList.remove('pulse');
        void btn.offsetWidth;
        btn.classList.add('pulse');
    });
    
});

//save or load color

function hexToRgb(hex) {
    
    hex = hex.replace(/^#/, '');
    
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return `rgb(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255})`;
}

colorSave.addEventListener("click", () => {
    const currentColor = document.getElementById("color-picker").value;
    const colorList = document.getElementById("color-list");
    const rgbColor = hexToRgb(currentColor);
    const alreadyExists = Array.from(colorList.children).some(div => 
    div.style.backgroundColor.replace(/\s/g, '').toLowerCase() === rgbColor.replace(/\s/g, '').toLowerCase()
    );
    if (alreadyExists) return;
    const newColorDiv = document.createElement("div");
    newColorDiv.className = "color";
    newColorDiv.style.backgroundColor = currentColor;
    newColorDiv.addEventListener("click", () => {
        document.getElementById("color-picker").value = currentColor;
        activeTool = "pencil";
        newColorDiv.classList.remove("pulse");
        void newColorDiv.offsetWidth;
        newColorDiv.classList.add("pulse");
        pencilButton.classList.add("active");
        eraserButton.classList.remove("active");
        fillButton.classList.remove("active");
    });
    
    colorList.appendChild(newColorDiv);
});

// Pixel size and erase size inputs
const pixelSizeInputs = document.querySelectorAll('input[id="pixel-size"]');
pixelSizeInputs.forEach(input => {
    input.addEventListener('input', () => {
        activeTool = "pencil";
        pencilButton.classList.add("active");
        eraserButton.classList.remove("active");
        fillButton.classList.remove("active");
    });
});

const eraseSizeInputs = document.querySelectorAll('input[id="erase-size"]');
eraseSizeInputs.forEach(input => {
    input.addEventListener('input', () => {
        activeTool = "eraser";
        eraserButton.classList.add("active");
        pencilButton.classList.remove("active");
        fillButton.classList.remove("active");
    });
});

// This add the first frame to the timeline when the page loads
addFrame.addEventListener("click", createFrame);

window.addEventListener("DOMContentLoaded", () => {
    createFrame();
    selectFrame(0);
    activeTool = "pencil";
    pencilButton.classList.add("active");
});

function confirmGridResize(callback) {
    if (confirm("*Changing size will delete every frame*\nAre you sure you want to continue?")) {
        callback();
    }
}

function setGridSize() {

    // Update pixel size and grid dimensions to the frames
    gridWidth = Math.floor(canvas.width / pixelSize);
    gridHeight = Math.floor(canvas.height / pixelSize);
    // This deletes all frames from the timeline
    const frameContainer = document.getElementById("timeline");
    while (frameContainer.firstChild) {
        frameContainer.removeChild(frameContainer.firstChild);
    }
    // Reset
    frames = [];
    activeFrameIndex = 0;
    
    grid = [];
    for (let x = 0; x < gridWidth; x++) {
        grid[x] = [];
        for (let y = 0; y < gridHeight; y++) {
            grid[x][y] = null;
        }
    }
    
    
    previewIndex = 0;
    // Create the first frame (again)
    createFrame();
    redrawCanvas();
}

function exportCanvasWithTransparentBg(callback) {
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (grid[x][y]) {
                ctx.fillStyle = grid[x][y];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    // export the canvas as PNG
    callback();

    // Restore the original image data
    ctx.putImageData(imageData, 0, 0);
}

function exportSpecificFrameAsPNG(frameIndex, filename = "frame") {
    const frame = frames[frameIndex];
    if (!frame) {
        alert("Frame non trovato!");
        return;
    }

    // Create a temporary canvas to draw the frame
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    
    const state = frame.grid;

    
    
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (state[x][y]) {
                tempCtx.fillStyle = state[x][y];
                tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    // Export the temporary canvas as PNG
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
}


// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    const pixelSizeInput = document.getElementById("pixel-size");
    const eraseSizeInput = document.getElementById("erase-size");
    if (e.ctrlKey) {
        e.preventDefault();
        addFrame.click();
    }
    
    if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        undoButton.click();
    }

    if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        redoButton.click();
    }

    if(e.key === "b" || e.key === "B")
    {
        e.preventDefault();
        if (activeTool === "pencil") {
            activeTool = null;
            pencilButton.classList.remove("active");
            
        }
        else {
            activeTool = "pencil";
            pencilButton.classList.add("active");
            eraserButton.classList.remove("active");
            fillButton.classList.remove("active");
        }
        redrawCanvas();
    }

    if(e.key === "e" || e.key === "E")
    {
        e.preventDefault();
        if (activeTool === "eraser") {
            activeTool = null;
            eraserButton.classList.remove("active");
        }
        else {
            activeTool = "eraser";
            eraserButton.classList.add("active");
            pencilButton.classList.remove("active");
            fillButton.classList.remove("active");
        }
        redrawCanvas();
    }
    if(e.key === "f" || e.key === "F")
    {
        console.log("Fill tool activated");
        e.preventDefault();
        if (activeTool === "fill") {
            activeTool = null;
            fillButton.classList.remove("active");
        }
        else {
            activeTool = "fill";
            fillButton.classList.add("active");
            pencilButton.classList.remove("active");
            eraserButton.classList.remove("active");
        }
        redrawCanvas();
    }

    if (e.key === ".") {
        e.preventDefault();
        copyFrameToggle.checked = !copyFrameToggle.checked;
        
        copyFrameToggle.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if(activeTool === "pencil")
    {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            pixelSizeInput.value = Math.min(parseInt(pixelSizeInput.value) + 1, 20);
            pixelSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            redrawCanvas();
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            pixelSizeInput.value = Math.max(parseInt(pixelSizeInput.value) - 1, 1);
            pixelSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            redrawCanvas();
        }
    }
    else if(activeTool === "eraser")
    {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            eraseSizeInput.value = Math.min(parseInt(eraseSizeInput.value) + 1, 20);
            eraseSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            redrawCanvas();
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            eraseSizeInput.value = Math.max(parseInt(eraseSizeInput.value) - 1, 1);
            eraseSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            redrawCanvas();
        }
    }

    if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        colorSave.click();
    }

    if (e.key === "Escape") {
        modal.style.display = "none";
    }
});


questionButton.addEventListener("click", () => {
    modal.style.display = "block";
});

closeButton.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("themechange", (e) => {
    
    redrawCanvas();
});

export{exportCanvasWithTransparentBg};

export {frames, activeFrameIndex, selectFrame, gridHeight, gridWidth, pixelSize};
