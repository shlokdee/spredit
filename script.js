const GRID_SIZE = 16;
const PIXEL_DISPLAY_SIZE = 20;
const STORAGE_KEY = 'pixel_sprites';

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

let pixels = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#ffffff'));
let isDrawing = false;
let currentSpriteId = null;

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
    pixels = sprites[currentSpriteId].pixels;
    spriteNameInput.value = sprites[currentSpriteId].name || 'Untitled Sprite';
  } else {
    // Brand new sprite setup
    saveToStorage();
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
  const sprites = getAllSpritesFromStorage();
  sprites[currentSpriteId] = {
    id: currentSpriteId,
    name: spriteNameInput.value.trim() || 'Untitled Sprite',
    updatedAt: Date.now(),
    pixels: pixels
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sprites));
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
  customSwatch.className = `swatch ${customColor === activeColor ? 'active' : ''}`;
  customSwatch.style.backgroundColor = customColor;

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
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillStyle = pixels[r][c];
      ctx.fillRect(c * PIXEL_DISPLAY_SIZE, r * PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE);

      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(c * PIXEL_DISPLAY_SIZE, r * PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE, PIXEL_DISPLAY_SIZE);
    }
  }
}

function getGridCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / PIXEL_DISPLAY_SIZE);
  const y = Math.floor((e.clientY - rect.top) / PIXEL_DISPLAY_SIZE);
  return {
    x: Math.max(0, Math.min(GRID_SIZE - 1, x)),
    y: Math.max(0, Math.min(GRID_SIZE - 1, y))
  };
}

function paint(e) {
  const { x, y } = getGridCoords(e);
  if (pixels[y][x] !== activeColor) {
    pixels[y][x] = activeColor;
    showSaveStatus('Saving...', true);
    render();
  }
}

// --- 4. LISTENERS ---

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  paint(e);
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

spriteNameInput.addEventListener('change', saveToStorage);

document.getElementById('clearBtn').addEventListener('click', () => {
  pixels = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#ffffff'));
  render();
  saveToStorage();
});

// --- INITIALIZATION ---
initSpriteSession();
buildPalette();
render();