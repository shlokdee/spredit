const GRID_SIZE = 16;
const PIXEL_DISPLAY_SIZE = 20;
const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const clearBtn = document.getElementById('clearBtn');

let pixels=Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('#FFFFFF'));
let isDrawing = false;

function render(){
    for (let r=0; r<GRID_SIZE; r++){
        for (let c=0; c<GRID_SIZE; c++){
            ctx.fillStyle = pixels[r][c];
            ctx.fillRect(c * PIXEL_DISPLAY_SIZE, r * PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE);

            ctx.strokeStyle = '#e0e0e0';
            ctx.strokeRect(c * PIXEL_DISPLAY_SIZE, r * PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE);

        }
    }
}

function getGridCoords(e){
    const rect = canvas.getBoundingClientRect();
    const x=Math.floor((e.clientX - rect.left) / PIXEL_DISPLAY_SIZE);
    const y=Math.floor((e.clientY - rect.top) / PIXEL_DISPLAY_SIZE);
    return {
        x: Math.max(0, Math.min(GRID_SIZE - 1, x)),
        y: Math.max(0, Math.min(GRID_SIZE - 1, y))
    };
}

function paint(e){
    const { x, y } = getGridCoords(e);
    pixels[y][x] = colorPicker.value;
    render();
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    paint(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        paint(e);
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

document.getElementById('clearBtn').addEventListener('click', () => {
    pixels = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('#FFFFFF'));
    render();
});

render();