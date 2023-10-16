var canvas;
var gl;

var index = 0;
var colors2 = [];
var cBuffer;
var VBuffer;
var VPosition;
var vColor;
var isMouseDown = false;
var isPainting = false;
var program;
var currentColor = vec4(0.0, 0.0, 0.0, 1.0); // Initial color (black)

var colors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // black
    vec4(1.0, 0.0, 0.0, 1.0),  // red
    vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    vec4(0.0, 1.0, 0.0, 1.0),  // green
    vec4(0.0, 0.0, 1.0, 1.0),  // blue
    vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    vec4(0.0, 1.0, 1.0, 1.0)   // cyan
];



const numRows = 40; // Number of rows
const numColumns = 40; // Number of columns

const cubeSize = 0.05; // Size of each cube

// Define vertices and colors for the triangles
const vertices = [];
const vertexColors = [];

const undoHistory = {
    vertexStates: [],
    colorStates: [],
    currentIndex: -1,
    maxHistoryLength: 30
};


let isDragging = false;
let lastX = 0;
let lastY = 0;

let zoomScale = 1;
let xOffset = 0;
let yOffset = 0;

const ZOOM_FACTOR = 0.1; // The zoom sensitivity. Adjust as needed.

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // Set size value
    const size = gl.getUniformLocation(program, 'size');
    gl.uniform1f(size, 0.1); // Cube Size
    //manageZoomAndPan(canvas);
    // Orthographic Projection
    const left = 0;
    const right = 2;
    const bottom = 0;
    const top = 2;
    const near = -1;
    const far = 1;
    const projectionMatrix = ortho(left, right, bottom, top, near, far);
    const u_ProjectionMatrix = gl.getUniformLocation(program, 'projectionMatrix');
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, flatten(projectionMatrix));
    for (let m = 0; m < numRows * numColumns; m++) {
        for (let l = 0; l < 4; l++) {
            for (let k = 0; k < 3; k++) {
                const color = vec4(0.0, 1.0, 1.0, 1.0);
                vertexColors.push(color);
            }
            index++;
        }
    }


    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numColumns; j++) {
            const x = j * cubeSize;
            const y = i * cubeSize;
            const z = 0.0; // Z coordinate

            // Define the vertices for a single square divided into four triangles
            const squareVertices = [

                x, y + cubeSize, z,
                x + cubeSize / 2, y + cubeSize / 2, z, //left
                x, y, z,

                x + cubeSize, y + cubeSize, z,
                x, y + cubeSize, z,
                x + cubeSize / 2, y + cubeSize / 2, z, //top

                x + cubeSize, y + cubeSize, z,
                x + cubeSize / 2, y + cubeSize / 2, z, //right
                x + cubeSize, y, z,

                x, y, z,
                x + cubeSize / 2, y + cubeSize / 2, z, //bottom
                x + cubeSize, y, z
            ];

            // Define a single color for each triangle



            vertices.push(...squareVertices);

        }
    }
    pushState(); // Save the initial state
    VBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    VPosition = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(VPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(VPosition);


    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);


    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);



    // Add a mousedown event listener
    canvas.addEventListener("mousedown", function (event) {
        isMouseDown = true;
        // Start the recursive function
        drawing();
    });

    // Add a mousemove event listener to enable painting while dragging
    canvas.addEventListener("mousemove", function (event) {
        if (isMouseDown) {
            // Set the flag to indicate painting
            isPainting = true;
            drawing();
        }
    });

    // Add a mouseup event listener to stop painting when the mouse is released
    canvas.addEventListener("mouseup", function (event) {
        isMouseDown = false;
        isPainting = false;
        pushState();
    });

    canvas.addEventListener("mouseout", function (event) {
        isMouseDown = false;
        isPainting = false;
    });

    const undoButton = document.getElementById("undo-button");
    undoButton.addEventListener("click", undo);

    const saveButton = document.getElementById("save-button");
    saveButton.addEventListener("click", saveData);

    const loadButton = document.getElementById("load-button");
    loadButton.addEventListener("click", loadData);
}



function render() {

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

}

function manageZoomAndPan(canvas) {
    canvas.onmousedown = function (event) {
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
    }

    canvas.onmouseup = function (event) {
        isDragging = false;
    }

    canvas.onmousemove = function (event) {
        if (isDragging) {
            let dx = event.clientX - lastX;
            let dy = event.clientY - lastY;

            // Adjust the offsets based on the mouse drag
            xOffset -= dx / canvas.width * zoomScale;
            yOffset += dy / canvas.height * zoomScale;

            updateProjection();

            lastX = event.clientX;
            lastY = event.clientY;
        }
    }

    canvas.onwheel = function (event) {
        // Adjust the zoom scale based on the mouse wheel movement
        zoomScale *= (event.deltaY > 0) ? 1 + ZOOM_FACTOR : 1 - ZOOM_FACTOR;

        updateProjection();
    }
}

function updateProjection() {
    const left = -zoomScale + xOffset;
    const right = zoomScale + xOffset;
    const bottom = -zoomScale + yOffset;
    const top = zoomScale + yOffset;

    const projectionMatrix = ortho(left, right, bottom, top, -1, 1);
    const u_ProjectionMatrix = gl.getUniformLocation(program, 'projectionMatrix');
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, flatten(projectionMatrix));

    // Render function to redraw your scene with the updated projection
    render();
}

function drawing() {


    if (isMouseDown) {

        // Get the mouse coordinates relative to the canvas
        var x = event.clientX - canvas.getBoundingClientRect().left;
        var y = event.clientY - canvas.getBoundingClientRect().top;

        // Convert mouse coordinates to WebGL coordinates (-1 to 1)
        x = (2 * x / canvas.width);
        y = 2 - (2 * y / canvas.height);


        console.log(x, y);

        var leftOrder = Math.floor(x / cubeSize + 1);
        var bottomOrder = Math.floor(y / cubeSize + 1);

        var maxY = bottomOrder * cubeSize;
        var middleY = maxY - (cubeSize / 2);
        var minY = (bottomOrder - 1) * cubeSize;

        var maxX = leftOrder * cubeSize;
        var middleX = maxX - (cubeSize / 2);
        var minX = (leftOrder - 1) * cubeSize;

        // top
        var G1x = (minX + middleX + maxX) / 3;
        var G1y = (middleY + maxY + maxY) / 3;


        // left
        var G2x = (minX + minX + middleX) / 3;
        var G2y = (minY + maxY + middleY) / 3;


        // right
        var G3x = (maxX + middleX + maxX) / 3;
        var G3y = (minY + maxY + middleY) / 3;


        // down
        var G4x = (minX + middleX + maxX) / 3;
        var G4y = (middleY + minY + minY) / 3;


        // Calculate distances to each of the G points
        var distanceToG1 = Math.sqrt(Math.pow(G1x - x, 2) + Math.pow(G1y - y, 2));
        var distanceToG2 = Math.sqrt(Math.pow(G2x - x, 2) + Math.pow(G2y - y, 2));
        var distanceToG3 = Math.sqrt(Math.pow(G3x - x, 2) + Math.pow(G3y - y, 2));
        var distanceToG4 = Math.sqrt(Math.pow(G4x - x, 2) + Math.pow(G4y - y, 2));

        // Find the closest point
        var offset;
        var minDistance = Math.min(distanceToG1, distanceToG2, distanceToG3, distanceToG4);


        if (minDistance === distanceToG1) {
            offset = 1;
        } else if (minDistance === distanceToG2) {
            offset = 0;
        } else if (minDistance === distanceToG3) {
            offset = 2;
        } else {
            offset = 3;
        }
        console.log("Soldan: " + leftOrder);
        console.log("Aşağıdan: " + bottomOrder);


        console.log("maxY: " + maxY);
        console.log("middleY: " + middleY);

        console.log("maxX: " + maxX);
        console.log("middleX: " + middleX);

        console.log("Closest: " + offset);

        console.log(vertexColors);
        // Change Color

        var indexColor = 12 * (((bottomOrder - 1) * numColumns + leftOrder) - 1) + (3 * offset);

        for (var i = indexColor; i < indexColor + 3; i++) {
            vertexColors[i] = currentColor;
            console.log(i);
        }
        console.log(vertexColors)

        // Bind the buffer again (in case it's not already bound)
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

        // Update the buffer data with the modified vertexColors array
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

        // Bind the vColor attribute again (if it's not already bound)
        var vColor = gl.getAttribLocation(program, "vColor");
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);

        render();


    }
}


function changeColor(color) {
    var colorMap = {
        'black': [0.0, 0.0, 0.0, 1.0],
        'red': [1.0, 0.0, 0.0, 1.0],
        'green': [0.0, 1.0, 0.0, 1.0],
        'blue': [0.0, 0.0, 1.0, 1.0],
        'ERASER': [0.0, 1.0, 1.0, 1.0],

    };

    if (colorMap[color]) {
        currentColor = colorMap[color];
        // You can pass the new color to your WebGL rendering function here
        // For example, you can update the uniform variable for the color in your shader.
        // Example:
        // gl.uniform4fv(gl.getUniformLocation(program, "uColor"), currentColor);
    }
}


// Function to save the current state to the undo history
function pushState() {
    if (undoHistory.currentIndex < undoHistory.vertexStates.length - 1) {
        // Remove redo history when a new action is performed
        undoHistory.vertexStates.splice(undoHistory.currentIndex + 1);
        undoHistory.colorStates.splice(undoHistory.currentIndex + 1);
    }

    const clonedVertices = vertices.slice();
    const clonedColors = vertexColors.slice();

    undoHistory.vertexStates.push(clonedVertices);
    undoHistory.colorStates.push(clonedColors);

    if (undoHistory.vertexStates.length > undoHistory.maxHistoryLength) {
        // Remove the oldest state if the history exceeds the limit
        undoHistory.vertexStates.shift();
        undoHistory.colorStates.shift();
    }

    undoHistory.currentIndex = undoHistory.vertexStates.length - 1;
}

// Function to undo the last action
function undo() {
    if (undoHistory.currentIndex > 0) {
        undoHistory.currentIndex--;

        // Restore the previous state from the undo history
        const previousVertices = undoHistory.vertexStates[undoHistory.currentIndex];
        const previousColors = undoHistory.colorStates[undoHistory.currentIndex];

        // Update the current state
        vertices.length = 0;
        vertices.push(...previousVertices);
        vertexColors.length = 0;
        vertexColors.push(...previousColors);

        // Update WebGL buffers with the previous state
        gl.bindBuffer(gl.ARRAY_BUFFER, VBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

        render(); // Redraw the canvas
    }
}

function eraser() {
    isErasing = true;
}
function brush() {
    isErasing = false;
}

function saveDataToFile() {
    const saveData = {
        vertices: vertices,
        vertexColors: vertexColors,
    };

    const jsonSaveData = JSON.stringify(saveData);

    // Create a Blob (binary large object) from the JSON data
    const blob = new Blob([jsonSaveData], { type: 'application/json' });

    // Create a download link for the Blob
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'webgl_data.json'; // File name
    a.style.display = 'none';

    // Append the link to the document and trigger a click event to download the file
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}



function loadFileData(inputFile) {
    const file = inputFile.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            const jsonSaveData = event.target.result;
            const saveData = JSON.parse(jsonSaveData);

            // Update the arrays with the loaded data
            vertices.length = 0;
            vertices.push(...saveData.vertices);
            vertexColors.length = 0;
            vertexColors.push(...saveData.vertexColors);

            // Update WebGL buffers with the loaded data
            gl.bindBuffer(gl.ARRAY_BUFFER, VBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

            render(); // Redraw the canvas with the loaded data
        };

        reader.readAsText(file);
    }
}


/* UI Elements Functions */

// Function to change the color and set the selectedColor class
function changeColorUI(element, color) {
    // Remove selectedColor class from all clickableColor elements
    const clickableColors = document.querySelectorAll('.clickableColor');
    clickableColors.forEach((clickableColor) => {
        clickableColor.classList.remove('selectedColor');
    });

    // Add selectedColor class to the clicked color element
    element.classList.add('selectedColor');
    changeColor(color);
}

// Function to move a layer up or down
function moveLayer(direction, element) {
    const listItem = element.closest('.layer');
    const list = listItem.parentElement;

    if (direction === 'up' && listItem.previousElementSibling) {
        list.insertBefore(listItem, listItem.previousElementSibling);
    } else if (direction === 'down' && listItem.nextElementSibling) {
        list.insertBefore(listItem.nextElementSibling, listItem);
    }
}

// Function to select a layer and deselect the previously selected one
function selectLayer(layer) {
    const layerList = document.querySelectorAll('.layer');

    // Deselect all layers
    layerList.forEach((item) => {
        item.classList.remove('selectedLayer');
    });

    // Add 'selectedLayer' class to the closest li element (parent)
    const closestLi = layer.closest('li');
    if (closestLi) {
        closestLi.classList.add('selectedLayer');
    }
}

// Function to select a tool and deselect the previously selected one
function selectTool(element, tool) {
    const toolList = document.querySelectorAll('.clickable.selectedTool');
    
    // Deselect all tools
    toolList.forEach((item) => {
        item.classList.remove('selectedTool');
    });

    // Select the clicked tool
    element.classList.add('selectedTool');

    if (tool == "brush") {
        brush();
    } else if (tool == "eraser") {
        eraser();
    }
}