const DEFAULT_GRID_WIDTH = 16;
const DEFAULT_GRID_HEIGHT = 16;
const CANVAS_SIZE = 320;
const STORAGE_KEY = 'pixel_sprites';

let GRID_WIDTH = DEFAULT_GRID_WIDTH;
let GRID_HEIGHT = DEFAULT_GRID_HEIGHT;
let PIXEL_DISPLAY_WIDTH = CANVAS_SIZE / GRID_WIDTH;
let PIXEL_DISPLAY_HEIGHT = CANVAS_SIZE / GRID_HEIGHT;

// 7 Presets + 1 Custom Default Color
const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#22c55e', 
  '#3b82f6', '#eab308', '#f97316'
];
let customColor = '#8b5cf6';
let activeColor = PRESET_COLORS[0];

const canvas = document.getElementById('editor');
const ctx = canvas.getContext('2d');
const paletteGrid = document.getElementById('paletteGrid');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const spriteNameInput = document.getElementById('spriteNameInput');

let pixels = createEmptyPixels(GRID_WIDTH, GRID_HEIGHT);
let isDrawing = false;
let currentSpriteId = null;
let hasBeenEdited = false;
let activeTool = 'paint';

function isTransparentPixel(color) {
  return color == null || color === '' || color === 'transparent';
}

function createEmptyPixels(width = GRID_WIDTH, height = GRID_HEIGHT) {
  return Array(height).fill().map(() => Array(width).fill(null));
}

function clampGridDimension(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(64, Math.max(1, parsed));
}

function updatePixelDisplaySize() {
  const cellSize = Math.floor(Math.min(CANVAS_SIZE / GRID_WIDTH, CANVAS_SIZE / GRID_HEIGHT));
  PIXEL_DISPLAY_WIDTH = cellSize;
  PIXEL_DISPLAY_HEIGHT = cellSize;
  canvas.width = GRID_WIDTH * cellSize;
  canvas.height = GRID_HEIGHT * cellSize;
}

// --- 1. ROUTING & STORAGE MANAGEMENT ---

function initSpriteSession() {
  const urlParams = new URLSearchParams(window.location.search);
  currentSpriteId = urlParams.get('id');

  if (!currentSpriteId) {
    currentSpriteId = 'sprite_' + Date.now();
    window.history.replaceState({}, '', `editor.html?id=${currentSpriteId}`);
  }

  const sprites = getAllSpritesFromStorage();

  if (sprites[currentSpriteId]) {
    const savedSprite = sprites[currentSpriteId];
    const savedWidth = savedSprite.gridWidth || savedSprite.gridSize || DEFAULT_GRID_WIDTH;
    const savedHeight = savedSprite.gridHeight || savedSprite.gridSize || DEFAULT_GRID_HEIGHT;
    GRID_WIDTH = clampGridDimension(savedWidth, DEFAULT_GRID_WIDTH);
    GRID_HEIGHT = clampGridDimension(savedHeight, DEFAULT_GRID_HEIGHT);
    updatePixelDisplaySize();
    pixels = Array.isArray(savedSprite.pixels) && savedSprite.pixels.length === GRID_HEIGHT && savedSprite.pixels[0]?.length === GRID_WIDTH
      ? savedSprite.pixels
      : createEmptyPixels(GRID_WIDTH, GRID_HEIGHT);
    spriteNameInput.value = savedSprite.name || 'Untitled Sprite';
    hasBeenEdited = false;
  } else {
    spriteNameInput.value = 'Untitled Sprite';
    GRID_WIDTH = DEFAULT_GRID_WIDTH;
    GRID_HEIGHT = DEFAULT_GRID_HEIGHT;
    pixels = createEmptyPixels(GRID_WIDTH, GRID_HEIGHT);
    updatePixelDisplaySize();
    hasBeenEdited = false;
  }
}


function getAllSpritesFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveToStorage() {
  if (!hasBeenEdited) return;

  const sprites = getAllSpritesFromStorage();
  sprites[currentSpriteId] = {
    id: currentSpriteId,
    name: spriteNameInput.value.trim() || 'Untitled Sprite',
    updatedAt: Date.now(),
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    pixels: pixels
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sprites));
  hasBeenEdited = false;
  showSaveStatus('Saved', false);
}

function showSaveStatus(text, isSaving = false) {
  statusText.textContent = text;
  if (isSaving) {
    statusBadge.classList.add('saving');
  } else {
    statusBadge.classList.remove('saving');
  }
}

// --- 2. PALETTE SETUP ---

function buildPalette() {
  paletteGrid.innerHTML = '';

  PRESET_COLORS.forEach((color) => {
    const swatch = document.createElement('div');
    swatch.className = `swatch ${color === activeColor ? 'active' : ''}`;
    swatch.style.backgroundColor = color;
    swatch.addEventListener('click', () => {
      activeColor = color;
      updateActiveSwatch();
    });
    paletteGrid.appendChild(swatch);
  });

  // 8th Custom Swatch
  const customSwatch = document.createElement('div');
  customSwatch.className = `swatch custom-swatch ${customColor === activeColor ? 'active' : ''}`;
  customSwatch.style.backgroundColor = customColor;

  const pickerIcon = document.createElement('span');
  pickerIcon.className = 'swatch-picker-icon';
  pickerIcon.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.7 2.3a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4l-1.8 1.8-6-6 1.8-1.8ZM12.8 5.2l6 6-8.3 8.3-4.7 1.2 1.2-4.7L12.8 5.2Zm-9.5 14.3a1 1 0 0 1 1-1h3.5a1 1 0 1 1 0 2H4.3a1 1 0 0 1-1-1Z" fill="currentColor"/>
    </svg>
  `;

  const colorPickerInput = document.createElement('input');
  colorPickerInput.type = 'color';
  colorPickerInput.value = customColor;
  colorPickerInput.className = 'swatch-color-input';

  colorPickerInput.addEventListener('input', (e) => {
    customColor = e.target.value;
    activeColor = customColor;
    customSwatch.style.backgroundColor = customColor;
    updateActiveSwatch();
  });

  customSwatch.addEventListener('click', () => {
    colorPickerInput.click();
  });

  customSwatch.appendChild(pickerIcon);
  customSwatch.appendChild(colorPickerInput);
  paletteGrid.appendChild(customSwatch);
}

function updateActiveSwatch() {
  const swatches = paletteGrid.querySelectorAll('.swatch');
  swatches.forEach((swatch, index) => {
    if (index < 7) {
      swatch.classList.toggle('active', PRESET_COLORS[index] === activeColor);
    } else {
      swatch.classList.toggle('active', customColor === activeColor);
    }
  });
}

// --- 3. RENDERING & PAINT ENGINE ---

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_HEIGHT; r++) {
    for (let c = 0; c < GRID_WIDTH; c++) {
      const cellColor = pixels[r][c];
      const renderedColor = isTransparentPixel(cellColor) ? '#ffffff' : cellColor;

      ctx.fillStyle = renderedColor;
      ctx.fillRect(c * PIXEL_DISPLAY_WIDTH, r * PIXEL_DISPLAY_HEIGHT, PIXEL_DISPLAY_WIDTH, PIXEL_DISPLAY_HEIGHT);

      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(c * PIXEL_DISPLAY_WIDTH, r * PIXEL_DISPLAY_HEIGHT, PIXEL_DISPLAY_WIDTH, PIXEL_DISPLAY_HEIGHT);
    }
  }
}

function getGridCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_DISPLAY_WIDTH);
  const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_DISPLAY_HEIGHT);
  return {
    x: Math.max(0, Math.min(GRID_WIDTH - 1, x)),
    y: Math.max(0, Math.min(GRID_HEIGHT - 1, y))
  };
}

function paint(e) {
  const { x, y } = getGridCoords(e);
  if (pixels[y][x] !== activeColor) {
    pixels[y][x] = activeColor;
    hasBeenEdited = true;
    showSaveStatus('Saving...', true);
    render();
  }
}

function fillAt(x, y) {
  if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return false;

  const targetColor = pixels[y][x];
  if (targetColor === activeColor) return false;

  const stack = [[x, y]];

  while (stack.length) {
    const [currentX, currentY] = stack.pop();
    if (currentX < 0 || currentY < 0 || currentX >= GRID_WIDTH || currentY >= GRID_HEIGHT) continue;
    if (pixels[currentY][currentX] !== targetColor) continue;

    pixels[currentY][currentX] = activeColor;
    stack.push(
      [currentX + 1, currentY],
      [currentX - 1, currentY],
      [currentX, currentY + 1],
      [currentX, currentY - 1]
    );
  }

  hasBeenEdited = true;
  showSaveStatus('Saving...', true);
  render();
  return true;
}

// --- 4. LISTENERS ---

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const { x, y } = getGridCoords(e);

  if (activeTool === 'fill') {
    fillAt(x, y);
  } else {
    paint(e);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) paint(e);
});

window.addEventListener('mouseup', () => {
  if (isDrawing) {
    isDrawing = false;
    saveToStorage();
  }
});

spriteNameInput.addEventListener('input', () => {
  hasBeenEdited = true;
  showSaveStatus('Saving...', true);
});

spriteNameInput.addEventListener('change', () => {
  saveToStorage();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  const isBlank = pixels.flat().every((color) => isTransparentPixel(color));
  if (isBlank) return;

  pixels = createEmptyPixels(GRID_WIDTH, GRID_HEIGHT);
  hasBeenEdited = true;
  render();
  saveToStorage();
});

function exportSpriteAsPng() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = GRID_WIDTH;
  exportCanvas.height = GRID_HEIGHT;
  const exportCtx = exportCanvas.getContext('2d');

  exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

  for (let r = 0; r < GRID_HEIGHT; r++) {
    for (let c = 0; c < GRID_WIDTH; c++) {
      const color = pixels[r][c];
      if (isTransparentPixel(color)) continue;
      exportCtx.fillStyle = color;
      exportCtx.fillRect(c, r, 1, 1);
    }
  }

  const link = document.createElement('a');
  const fileName = (spriteNameInput.value.trim() || 'untitled-sprite').replace(/\s+/g, '-').toLowerCase();
  link.download = `${fileName}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
  showSaveStatus('Exported PNG', false);
}

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', exportSpriteAsPng);
}

function setGridSize(nextWidth, nextHeight) {
  const width = clampGridDimension(nextWidth, DEFAULT_GRID_WIDTH);
  const height = clampGridDimension(nextHeight, DEFAULT_GRID_HEIGHT);

  if (width === GRID_WIDTH && height === GRID_HEIGHT) return;

  GRID_WIDTH = width;
  GRID_HEIGHT = height;
  updatePixelDisplaySize();
  pixels = createEmptyPixels(GRID_WIDTH, GRID_HEIGHT);
  hasBeenEdited = true;
  render();
  saveToStorage();

  const customWidthInput = document.getElementById('customGridWidthInput');
  const customHeightInput = document.getElementById('customGridHeightInput');
  if (customWidthInput) customWidthInput.value = String(GRID_WIDTH);
  if (customHeightInput) customHeightInput.value = String(GRID_HEIGHT);

  document.querySelectorAll('.size-btn').forEach((button) => {
    const isActive = Number(button.dataset.width) === GRID_WIDTH && Number(button.dataset.height) === GRID_HEIGHT;
    button.classList.toggle('active', isActive);
  });
}

const customGridWidthInput = document.getElementById('customGridWidthInput');
const customGridHeightInput = document.getElementById('customGridHeightInput');
const customSizeApplyBtn = document.getElementById('customGridSizeApply');

customSizeApplyBtn.addEventListener('click', () => {
  setGridSize(customGridWidthInput.value, customGridHeightInput.value);
});

[customGridWidthInput, customGridHeightInput].forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      setGridSize(customGridWidthInput.value, customGridHeightInput.value);
    }
  });
});

document.querySelectorAll('.size-btn').forEach((button) => {
  button.addEventListener('click', () => {
    setGridSize(button.dataset.width, button.dataset.height);
  });
});

document.querySelectorAll('.tool-btn').forEach((button) => {
  button.addEventListener('click', () => {
    activeTool = button.dataset.tool;
    document.querySelectorAll('.tool-btn').forEach((toolButton) => {
      toolButton.classList.toggle('active', toolButton.dataset.tool === activeTool);
    });
  });
});

// --- INITIALIZATION ---
initSpriteSession();
updatePixelDisplaySize();
buildPalette();
customGridWidthInput.value = String(GRID_WIDTH);
customGridHeightInput.value = String(GRID_HEIGHT);
document.querySelectorAll('.size-btn').forEach((button) => {
  const isActive = Number(button.dataset.width) === GRID_WIDTH && Number(button.dataset.height) === GRID_HEIGHT;
  button.classList.toggle('active', isActive);
});
render();