/* ==========================================================
   Water Run — script.js (fresh)
   - Start -> Game (armed)
   - First Arrow key starts timer & movement
   - Hold Up/Down to move; Left/Right to change lanes
   - Jugs (yellow) reduce time; Hazards (black) add time
   - SVG sprites with safe fallbacks
   ========================================================== */

/* DOM */
const screenStart = document.getElementById('screen-start');
const screenGame  = document.getElementById('screen-game');
const screenOver  = document.getElementById('screen-over');

const btnStart     = document.getElementById('btnStart');
const btnReset     = document.getElementById('btnReset');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const btnResetInGame = document.getElementById('btnResetInGame');
const btnBackToMenu = document.getElementById('btnBackToMenu');

const finalTimeEl  = document.getElementById('finalTime');
const toast        = document.getElementById('toast');
const milestoneToast = document.getElementById('milestoneToast');

const hudTimeEl = document.getElementById('hudTime');
const hudJugsEl = document.getElementById('hudJugs');

const instructionsEl = document.getElementById('instructions');
const difficultyInputs = document.querySelectorAll('input[name="difficulty"]');
const difficultyOptions = difficultyInputs ? Array.from(difficultyInputs) : [];
let difficulty = 'normal';
let difficultyLocked = false;

const upZone    = document.getElementById('touchUpZone');
const downZone  = document.getElementById('touchDownZone');
const leftZone  = document.getElementById('touchLeftZone');
const rightZone = document.getElementById('touchRightZone');


const canvas = document.getElementById('stage');
const ctx    = canvas.getContext('2d');

/* Config / State */
const BASE_W = 480, BASE_H = 720;
canvas.width  = BASE_W;
canvas.height = BASE_H;

const TRACK_LEN  = 5200;
const EDGE_MARGIN = 20;
const LANE_COUNT = 3;
const lanesX = Array.from({ length: LANE_COUNT }, (_, i) => {
  if (LANE_COUNT === 1) return BASE_W / 2;
  const usable = BASE_W - EDGE_MARGIN * 2;
  const spacing = usable / (LANE_COUNT - 1);
  return EDGE_MARGIN + i * spacing;
});
const laneSpacing = lanesX.length > 1 ? (lanesX[1] - lanesX[0]) : (BASE_W - EDGE_MARGIN * 2);
const RUNNER_HALF_WIDTH = 18;
const RUNNER_TOP_OFFSET = 32;
const RUNNER_BOTTOM_OFFSET = 12;
const OBSTACLE_PADDING_X = 10;
const OBSTACLE_PADDING_TOP = 4;
const OBSTACLE_PADDING_BOTTOM = 8;
const RUNNER_SPRITE_WIDTH = 64;
const RUNNER_SPRITE_HEIGHT = 64;
const RUNNER_SPRITE_BASE_OFFSET = 38; // shift art downward so feet align with collision box
const RUNNER_FRAME_DURATION = 0.18;
const RUNNER_SPRITE_SOURCES = {
  forward: {
    idle: 'assets/forward-still.svg',
    move: ['assets/forward-move-1.svg', 'assets/forward-move-2.svg'],
  },
  left: {
    idle: 'assets/left_still.svg',
    move: ['assets/left_motion_1.svg', 'assets/left_motion_2.svg'],
  },
  right: {
    idle: 'assets/right_still.svg',
    move: ['assets/right_motion_1.svg', 'assets/right_motion_2.svg'],
  },
};
const runnerSprites = {
  forward: { idle: null, move: [] },
  left: { idle: null, move: [] },
  right: { idle: null, move: [] },
};
const minRunnerX = EDGE_MARGIN;
const maxRunnerX = BASE_W - EDGE_MARGIN;
const DIFFICULTIES = {
  easy: {
    rowGap: [140, 190],
    collectibleDensity: 2.6,
    yellowWeight: 3,
    blackWeight: 1,
    obstacleSegments: [2, 3],
    obstacleSize: { min: 0.15, max: 0.26, largeChance: 0.25 },
    emptyFracMin: 0.30,
    emptyFracMax: 0.50,
    yellowPlusEmptyFracMin: 0.40,
  },
  hard: {
    rowGap: [110, 165],
    collectibleDensity: 1.6,
    yellowWeight: 1,
    blackWeight: 3,
    obstacleSegments: [3, 5],
    obstacleSize: { min: 0.22, max: 0.40, largeChance: 0.65 },
    emptyFracMin: 0.10,
    emptyFracMax: 0.20,
    yellowPlusEmptyFracMin: 0.15,
  },
};
const GRID_COLS = 12;
const CELL_WIDTH = BASE_W / GRID_COLS;
const BASE_OBSTACLE_MIN_FRAC = 0.15;
const BASE_OBSTACLE_MAX_FRAC = 0.40;
const EASY_ROW_SPACING = 125;
const EASY_START_Y = 320;
const EASY_PATTERN = [
  {
    obstacles: [{ start: 3, width: 6 }],
    hazards: [1, 10],
    yellows: [5],
  },
  {
    obstacles: [{ start: 0, width: 4 }, { start: 8, width: 4 }],
    hazards: [4, 7],
    yellows: [1, 10],
  },
  {
    obstacles: [{ start: 3, width: 6 }],
    hazards: [5],
    yellows: [1, 10],
  },
  {
    obstacles: [{ start: 0, width: 4 }, { start: 8, width: 4 }],
    hazards: [4, 7],
    yellows: [5],
  },
];

const NORMAL_ROW_SPACING = 110;
const NORMAL_START_Y = 300;
const NORMAL_HALF_SPACING = NORMAL_ROW_SPACING / 2;
const NORMAL_PATTERN = [
  { // Row A1
    obstacles: [{ start: 2, width: 3 }, { start: 7, width: 3 }, { start: 11, width: 1 }],
    hazards: [0, 1, 6, 10],
    yellows: [5],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row A1 spacer
    obstacles: [],
    hazards: [8],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row B1
    obstacles: [{ start: 0, width: 1 }, { start: 3, width: 5 }, { start: 10, width: 2 }],
    hazards: [2, 9],
    yellows: [7],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row B1 spacer
    obstacles: [],
    hazards: [6],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row C1
    obstacles: [{ start: 0, width: 4 }, { start: 8, width: 4 }],
    hazards: [4, 7],
    yellows: [6],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row C1 spacer
    obstacles: [],
    hazards: [8],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row D1
    obstacles: [{ start: 0, width: 1 }, { start: 3, width: 7 }],
    hazards: [1, 10],
    yellows: [2, 9],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Cycle spacer
    obstacles: [],
    hazards: [0, 6, 8],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row A2
    obstacles: [{ start: 2, width: 3 }, { start: 7, width: 3 }, { start: 11, width: 1 }],
    hazards: [1, 6],
    yellows: [5],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row A2 spacer
    obstacles: [],
    hazards: [0, 9],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row B2
    obstacles: [{ start: 0, width: 1 }, { start: 3, width: 5 }, { start: 10, width: 2 }],
    hazards: [1, 2, 9],
    yellows: [7],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row B2 spacer
    obstacles: [],
    hazards: [0, 3, 5, 9],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row C2 (same as C1)
    obstacles: [{ start: 0, width: 4 }, { start: 8, width: 4 }],
    hazards: [4, 7],
    yellows: [6],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row C2 spacer
    obstacles: [],
    hazards: [2],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Row D2 (same as D1)
    obstacles: [{ start: 0, width: 1 }, { start: 3, width: 7 }],
    hazards: [1, 10],
    yellows: [2, 9],
    spacing: NORMAL_HALF_SPACING,
  },
  { // Cycle spacer
    obstacles: [],
    hazards: [0, 6, 8],
    yellows: [],
    spacing: NORMAL_HALF_SPACING,
  },
];

const HARD_ROW_SPACING = 100;
const HARD_START_Y = 280;
const HARD_PATTERN = [
  { // Hard Row 1
    obstacles: [],
    hazards: [4, 6],
    yellows: [3, 7],
  },
  { // Hard Row 2
    obstacles: [{ start: 0, width: 1 }, { start: 3, width: 6 }, { start: 11, width: 1 }],
    hazards: [1, 10],
    yellows: [],
  },
  { // Hard Row 3
    obstacles: [{ start: 0, width: 5 }, { start: 8, width: 4 }],
    hazards: [5, 7],
    yellows: [],
  },
  { // Hard Row 4
    obstacles: [{ start: 0, width: 1 }, { start: 11, width: 1 }],
    hazards: [7],
    yellows: [3, 6],
  },
  { // Hard Row 5
    obstacles: [{ start: 0, width: 1 }, { start: 11, width: 1 }],
    hazards: [3, 5, 6, 8, 9],
    yellows: [2, 7],
  },
  { // Hard Row 6
    obstacles: [{ start: 0, width: 1 }, { start: 4, width: 5 }, { start: 11, width: 1 }],
    hazards: [10],
    yellows: [2],
  },
];


function addObstacleCells(startCol, widthCols, y){
  const left = startCol * CELL_WIDTH;
  const widthPx = widthCols * CELL_WIDTH;
  obstacles.push({
    x: left + widthPx / 2,
    y,
    w: widthPx,
    h: 52,
  });
}
function addHazardCell(col, y){
  const x = col * CELL_WIDTH + CELL_WIDTH / 2;
  hazards.push({ x, y, w: 46, h: 26 });
}
function addYellowCell(col, y){
  const x = col * CELL_WIDTH + CELL_WIDTH / 2;
  jugs.push({ x, y });
}

let runnerX  = lanesX[Math.floor(lanesX.length/2)] || BASE_W/2;
let runnerY  = 80;
const MOVE_SPEED = 252; // 20% faster movement
let upHeld = false, downHeld = false, leftHeld = false, rightHeld = false;
let runnerFacing = 'forward';
let runnerMoving = false;
let runnerAnimFrameIndex = 0;
let runnerAnimElapsed = 0;
let runnerImpulseTimer = 0;

let camY     = 0;

let elapsed  = 0;
let lastTs   = 0;
let playing  = false;
let gameArmed = false;

const jugs      = [];
const hazards   = [];
const obstacles = [];
let jugCount    = 0;

let halfWayToastShown = false;
let milestoneToastTimeout = null;


const BEST_TIMES_KEY = 'water-run-best-times-v1';
let bestTimes = loadBestTimes();

function loadBestTimes() {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    if (!raw) return { easy: null, normal: null, hard: null };
    const parsed = JSON.parse(raw);
    return {
      easy: typeof parsed.easy === 'number' ? parsed.easy : null,
      normal: typeof parsed.normal === 'number' ? parsed.normal : null,
      hard: typeof parsed.hard === 'number' ? parsed.hard : null,
    };
  } catch (err) {
    console.warn('Failed to load best times', err);
    return { easy: null, normal: null, hard: null };
  }
}

function saveBestTimes() {
  try {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(bestTimes));
  } catch (err) {
    console.warn('Failed to save best times', err);
  }
}

function createSound(src){
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}
const SOUND_YELLOW = createSound('assets/ding-101377.mp3');
const SOUND_HAZARD = createSound('assets/cinematic-thud-fx-379991.mp3');
const SOUND_FINISH = createSound('assets/wow-423653.mp3');

function playSound(audio){
  if (!audio) return;
  try {
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (err) {
    // ignore playback restrictions
  }
}

/* Utils */
const worldToScreenY = (y) => BASE_H - (y - camY);
const clampRunnerX = (v) => Math.max(minRunnerX, Math.min(maxRunnerX, v));
function getNearestLaneIndex(){
  let nearest = 0;
  let bestDist = Infinity;
  for (let i=0; i<lanesX.length; i++){
    const d = Math.abs(runnerX - lanesX[i]);
    if (d < bestDist){
      bestDist = d;
      nearest = i;
    }
  }
  return nearest;
}
function applyLaneSnapImpulse(dir){
  runnerFacing = dir > 0 ? 'right' : 'left';
  runnerMoving = true;
  runnerAnimFrameIndex = 0;
  runnerAnimElapsed = 0;
  runnerImpulseTimer = 0.18;
}
function snapRunnerToLane(delta){
  const currentLane = getNearestLaneIndex();
  const next = Math.max(0, Math.min(lanesX.length - 1, currentLane + delta));
  if (next === currentLane) return;
  runnerX = lanesX[next];
  applyLaneSnapImpulse(next > currentLane ? 1 : -1);
}
function updateRunnerAnimation(movedX, movedY, dtSec){
  if (runnerImpulseTimer > 0){
    runnerImpulseTimer = Math.max(0, runnerImpulseTimer - dtSec);
  }
  const absX = Math.abs(movedX);
  const absY = Math.abs(movedY);
  let desiredFacing = runnerFacing;
  if (absX > 0.1 && absX >= absY){
    desiredFacing = movedX > 0 ? 'right' : 'left';
  } else if (absY > 0.1){
    desiredFacing = 'forward';
  }
  if (desiredFacing !== runnerFacing){
    runnerFacing = desiredFacing;
    runnerAnimFrameIndex = 0;
    runnerAnimElapsed = 0;
  }
  const active = absX > 0.1 || absY > 0.1 || runnerImpulseTimer > 0;
  if (active){
    runnerAnimElapsed += dtSec;
    const frames = (runnerSprites[runnerFacing] && runnerSprites[runnerFacing].move) || [];
    if (frames.length > 0 && runnerAnimElapsed >= RUNNER_FRAME_DURATION){
      runnerAnimElapsed = 0;
      runnerAnimFrameIndex = (runnerAnimFrameIndex + 1) % frames.length;
    }
  } else {
    runnerAnimFrameIndex = 0;
    runnerAnimElapsed = 0;
  }
  runnerMoving = active;
}
const runnerIntersectsObstacle = (rX, rY, ob) => {
  const runnerLeft = rX - RUNNER_HALF_WIDTH;
  const runnerRight = rX + RUNNER_HALF_WIDTH;
  const runnerTop = rY - RUNNER_TOP_OFFSET;
  const runnerBottom = rY + RUNNER_BOTTOM_OFFSET;
  const obLeft = ob.x - ob.w/2 + OBSTACLE_PADDING_X;
  const obRight = ob.x + ob.w/2 - OBSTACLE_PADDING_X;
  const obTop = ob.y - ob.h/2 + OBSTACLE_PADDING_TOP;
  const obBottom = ob.y + ob.h/2 - OBSTACLE_PADDING_BOTTOM;
  return !(runnerRight < obLeft || runnerLeft > obRight || runnerBottom < obTop || runnerTop > obBottom);
};
function applyDifficultySelection(){
  const selected = document.querySelector('input[name="difficulty"]:checked');
  if (selected) difficulty = selected.value;
}
if (difficultyOptions.length){
  applyDifficultySelection();
  difficultyOptions.forEach((input) => {
    input.addEventListener('change', () => {
      if (difficultyLocked) return;
      difficulty = input.value;
      resetGame();
      showScreen(screenStart);
    });
  });
}

function showScreen(el){
  [screenStart, screenGame, screenOver].forEach(s => s && s.classList.remove('show'));
  el && el.classList.add('show');
  if (el === screenGame) difficultyLocked = true;
  if (el === screenStart || el === screenOver) difficultyLocked = false;
}
function showHalfwayToast(){
  if (!milestoneToast) return;
  milestoneToast.textContent = 'Halfway done, keep going!';
  milestoneToast.style.opacity = 1;
  if (milestoneToastTimeout) clearTimeout(milestoneToastTimeout);
  milestoneToastTimeout = setTimeout(() => {
    milestoneToast.style.opacity = 0;
    milestoneToastTimeout = null;
  }, 5000);
}

function flash(text, color){
  if (!toast) return;
  toast.textContent = text;
  toast.style.color = color || '#fff';
  toast.style.opacity = 1;
  setTimeout(() => (toast.style.opacity = 0), 250);
}
function setHudTime(secondsFloat){
  const s = (Math.round(secondsFloat*100)/100).toFixed(2) + 's';
  if (hudTimeEl) hudTimeEl.textContent = s;
}
function setHudJugs(count){
  if (hudJugsEl) hudJugsEl.textContent = String(count);
}

function updateBestTimeDisplay(){
  const easyEl = document.getElementById('bestEasy');
  const normalEl = document.getElementById('bestNormal');
  const hardEl = document.getElementById('bestHard');
  if (easyEl) easyEl.textContent = bestTimes.easy != null ? bestTimes.easy.toFixed(2) + 's' : '--';
  if (normalEl) normalEl.textContent = bestTimes.normal != null ? bestTimes.normal.toFixed(2) + 's' : '--';
  if (hardEl) hardEl.textContent = bestTimes.hard != null ? bestTimes.hard.toFixed(2) + 's' : '--';
}

/* Assets */
function loadImage(src){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image failed: '+src));
    img.src = src;
  });
}
let imgJugYellow = null;
let imgJugBlack  = null;
async function loadRunnerSpriteAssets(){
  const tasks = [];
  for (const [dir, cfg] of Object.entries(RUNNER_SPRITE_SOURCES)){
    if (cfg.idle){
      tasks.push(
        loadImage(cfg.idle)
          .then((img) => { runnerSprites[dir].idle = img; })
          .catch((err) => console.error('runner idle failed', cfg.idle, err))
      );
    }
    if (Array.isArray(cfg.move)){
      cfg.move.forEach((src, idx) => {
        tasks.push(
          loadImage(src)
            .then((img) => { runnerSprites[dir].move[idx] = img; })
            .catch((err) => console.error('runner move failed', src, err))
        );
      });
    }
  }
  await Promise.all(tasks);
}

(async function preloadAssets(){
  try{ imgJugYellow = await loadImage('assets/jerry_jug_yellow.svg'); } catch(e){ console.error('yellow failed'); }
  try{ imgJugBlack  = await loadImage('assets/jerry_jug-black.svg');  } catch(e){ console.error('black failed'); }
  try{ await loadRunnerSpriteAssets(); } catch(err){ console.error('runner sprites failed', err); }
})();

function buildEasyStaticWorld(){
  buildStaticPattern(EASY_PATTERN, EASY_START_Y, EASY_ROW_SPACING, 0);
}

function buildNormalStaticWorld(){
  buildStaticPattern(NORMAL_PATTERN, NORMAL_START_Y, NORMAL_ROW_SPACING, NORMAL_PATTERN.length - 1);
}
function buildHardStaticWorld(){
  buildStaticPattern(HARD_PATTERN, HARD_START_Y, HARD_ROW_SPACING, HARD_PATTERN.length - 1);
}

function buildStaticPattern(pattern, startY, spacing, finalRowIndex){
  const patternLen = pattern.length || 0;
  if (!patternLen) return;
  let y = startY;
  let index = 0;
  let lastObstacleY = -Infinity;
  while (y < TRACK_LEN - 200){
    const def = pattern[index % patternLen];
    placePatternRow(def, y);
    if (def.obstacles && def.obstacles.length){
      lastObstacleY = y;
    }
    const step = def.spacing ?? spacing;
    index++;
    y += step;
  }
  if (TRACK_LEN - lastObstacleY > spacing){
    const finalDef = pattern[(finalRowIndex ?? 0) % patternLen];
    const finalStep = finalDef.spacing ?? spacing;
    const finalY = TRACK_LEN - finalStep;
    placePatternRow(finalDef, finalY);
  }
}

function placePatternRow(def, y){
  if (!def) return;
  if (def.obstacles){
    for (const seg of def.obstacles){
      addObstacleCells(seg.start, seg.width, y);
    }
  }
  if (def.hazards){
    for (const col of def.hazards){
      addHazardCell(col, y);
    }
  }
  if (def.yellows){
    for (const col of def.yellows){
      addYellowCell(col, y);
    }
  }
}

/* World */
function genWorld(){
  jugs.length = 0;
  hazards.length = 0;
  obstacles.length = 0;
  jugCount = 0;

  if (difficulty === 'easy'){
    buildEasyStaticWorld();
    return;
  }
  if (difficulty === 'normal'){
    buildNormalStaticWorld();
    return;
  }
  if (difficulty === 'hard'){
    buildHardStaticWorld();
    return;
  }

  const cfg = DIFFICULTIES[difficulty] || DIFFICULTIES.hard;
  const rows = [];
  const minGap = cfg.rowGap[0];
  const gapRange = Math.max(0, cfg.rowGap[1] - cfg.rowGap[0]);
  let y = 260;
  while (y < TRACK_LEN - 220){
    rows.push(y);
    y += minGap + Math.random() * gapRange;
  }
  if (!rows.length) return;

  const prevObstacleCols = new Set();
  const straightSafeCounts = Array(GRID_COLS).fill(0);
  const rowsMeta = [];
  let forcedBlack = 0;

  rows.forEach((rowY, rowIndex) => {
    const meta = buildRowLayout({
      rowIndex,
      rowY,
      cfg,
      prevObstacleCols,
      straightSafeCounts,
    });
    forcedBlack += meta.forcedHazards;
    rowsMeta.push(meta);
  });

  const slotPool = [];
  rowsMeta.forEach((rowMeta, rowIndex) => {
    rowMeta.collectibleCols.forEach((col) => {
      slotPool.push({ rowIndex, col });
    });
  });

  const totalWeight = cfg.yellowWeight + cfg.blackWeight;
  const targetBlack = Math.max(
    forcedBlack,
    Math.round((cfg.blackWeight / totalWeight) * (slotPool.length + forcedBlack))
  );
  let remainingBlack = Math.max(0, targetBlack - forcedBlack);

  shuffleArray(slotPool);

  for (const slot of slotPool){
    if (remainingBlack <= 0) break;
    const rowMeta = rowsMeta[slot.rowIndex];
    if (!rowMeta.collectibleCols.has(slot.col)) continue;
    const remainingCollectible = rowMeta.collectibleCols.size - 1;
    const afterHazardYellowEmpty = rowMeta.reservedEmptyCount + remainingCollectible;
    if (afterHazardYellowEmpty < rowMeta.minYellowPlusEmptyCols) continue;
    rowMeta.cells[slot.col] = 'hazard';
    rowMeta.collectibleCols.delete(slot.col);
    remainingBlack--;
  }

  if (remainingBlack > 0){
    const fallbackSlots = [];
    rowsMeta.forEach((rowMeta, rowIndex) => {
      rowMeta.collectibleCols.forEach((col) => fallbackSlots.push({ rowIndex, col }));
    });
    shuffleArray(fallbackSlots);
    for (const slot of fallbackSlots){
      if (remainingBlack <= 0) break;
      const rowMeta = rowsMeta[slot.rowIndex];
      if (!rowMeta.collectibleCols.has(slot.col)) continue;
      const remainingCollectible = rowMeta.collectibleCols.size - 1;
      if (rowMeta.reservedEmptyCount + remainingCollectible < rowMeta.minYellowPlusEmptyCols) continue;
      rowMeta.cells[slot.col] = 'hazard';
      rowMeta.collectibleCols.delete(slot.col);
      remainingBlack -= 1;
    }
  }

  rowsMeta.forEach((rowMeta) => {
    for (const col of Array.from(rowMeta.collectibleCols)){
      rowMeta.cells[col] = 'yellow';
      rowMeta.collectibleCols.delete(col);
    }
  });

  rowsMeta.forEach((rowMeta) => {
    const cells = rowMeta.cells;
    let col = 0;
    while (col < GRID_COLS){
      if (cells[col] === 'obstacle'){
        let end = col;
        while (end + 1 < GRID_COLS && cells[end + 1] === 'obstacle'){
          end++;
        }
        const startPixel = col * CELL_WIDTH;
        const endPixel = (end + 1) * CELL_WIDTH;
        const widthPx = endPixel - startPixel;
        const x = startPixel + widthPx / 2;
        obstacles.push({ x, y: rowMeta.y, w: widthPx, h: 52 });
        col = end + 1;
        continue;
      }
      if (cells[col] === 'hazard'){
        const x = col * CELL_WIDTH + CELL_WIDTH / 2;
        hazards.push({ x, y: rowMeta.y, w: 46, h: 26 });
      } else if (cells[col] === 'yellow'){
        const x = col * CELL_WIDTH + CELL_WIDTH / 2;
        jugs.push({ x, y: rowMeta.y });
      }
      col += 1;
    }
  });
}

function buildRowLayout({ rowIndex, rowY, cfg, prevObstacleCols, straightSafeCounts }){
  const minEmptyCols = Math.max(1, Math.round(GRID_COLS * cfg.emptyFracMin));
  const maxEmptyCols = Math.max(minEmptyCols, Math.round(GRID_COLS * cfg.emptyFracMax));
  const minYellowPlusEmptyBase = Math.round(GRID_COLS * cfg.yellowPlusEmptyFracMin);
  const cells = Array(GRID_COLS).fill('empty');
  const obstacleCols = new Set();
  const obstacleSegments = [];
  let forcedHazards = 0;

  placeObstacleSegments({
    cells,
    cfg,
    minEmptyCols,
    prevObstacleCols,
    obstacleSegments,
    obstacleCols,
  });

  let clearCount = cells.filter((cell) => cell === 'empty').length;
  for (let col = 0; col < GRID_COLS; col++){
    if (cells[col] === 'empty'){
      straightSafeCounts[col] += 1;
      if (straightSafeCounts[col] > 3){
        if (clearCount - 1 >= minEmptyCols){
          cells[col] = 'hazard';
          clearCount -= 1;
          forcedHazards += 1;
          straightSafeCounts[col] = 0;
        } else if (shrinkObstacleForClear({
          cells,
          obstacleSegments,
          obstacleCols,
          prevObstacleCols,
          minEmptyCols,
        })){
          clearCount = cells.filter((cell) => cell === 'empty').length;
          if (clearCount - 1 >= minEmptyCols){
            cells[col] = 'hazard';
            clearCount -= 1;
            forcedHazards += 1;
            straightSafeCounts[col] = 0;
          } else {
            straightSafeCounts[col] = 3;
          }
        } else {
          straightSafeCounts[col] = 3;
        }
      }
    } else {
      straightSafeCounts[col] = 0;
    }
  }

  clearCount = cells.filter((cell) => cell === 'empty').length;
  if (clearCount > maxEmptyCols){
    const empties = [];
    for (let col = 0; col < GRID_COLS; col++){
      if (cells[col] === 'empty') empties.push(col);
    }
    shuffleArray(empties);
    const toConvert = clearCount - maxEmptyCols;
    for (let i = 0; i < toConvert; i++){
      const col = empties[i];
      cells[col] = 'hazard';
      forcedHazards += 1;
      straightSafeCounts[col] = 0;
    }
    clearCount = maxEmptyCols;
  }

  const emptyCols = [];
  for (let col = 0; col < GRID_COLS; col++){
    if (cells[col] === 'empty') emptyCols.push(col);
  }
  shuffleArray(emptyCols);
  const reserveMax = Math.min(emptyCols.length, maxEmptyCols);
  const reserveMin = Math.min(emptyCols.length, minEmptyCols);
  let reserveCount = reserveMax;
  if (reserveMax > reserveMin){
    reserveCount = randomInt(reserveMin, reserveMax);
  }
  const reservedSet = new Set(emptyCols.slice(0, reserveCount));
  const collectibleSet = new Set(emptyCols.slice(reserveCount));
  const reservedEmptyCount = reservedSet.size;
  const collectibleCount = collectibleSet.size;
  const minYellowPlusEmptyCols = Math.min(
    reservedEmptyCount + collectibleCount,
    Math.max(reservedEmptyCount, minYellowPlusEmptyBase)
  );

  prevObstacleCols.clear();
  obstacleCols.forEach((col) => prevObstacleCols.add(col));

  return {
    y: rowY,
    cells,
    reservedEmptyCount,
    minEmptyCols,
    maxEmptyCols,
    minYellowPlusEmptyCols,
    collectibleCols: collectibleSet,
    forcedHazards,
  };
}

function placeObstacleSegments({ cells, cfg, minEmptyCols, prevObstacleCols, obstacleSegments, obstacleCols }){
  const segmentsTarget = randomInt(cfg.obstacleSegments[0], cfg.obstacleSegments[1]);
  const minCols = Math.max(1, Math.round(GRID_COLS * Math.max(BASE_OBSTACLE_MIN_FRAC, cfg.obstacleSize.min)));
  const maxCols = Math.max(minCols, Math.round(GRID_COLS * Math.min(BASE_OBSTACLE_MAX_FRAC, cfg.obstacleSize.max)));
  let segmentsPlaced = 0;
  let attempts = 0;
  while (segmentsPlaced < segmentsTarget && attempts < 120){
    attempts++;
    let widthCols = chooseObstacleWidth({ minCols, maxCols, cfg });
    widthCols = Math.min(widthCols, GRID_COLS - 1);
    let candidate = null;
    let selectedWidth = widthCols;
    for (let size = Math.min(widthCols, maxCols); size >= minCols; size--){
      candidate = findObstacleSlot({ cells, widthCols: size, minEmptyCols, prevObstacleCols });
      if (candidate){
        selectedWidth = size;
        break;
      }
    }
    if (!candidate) continue;
    applyObstacleSegment({ cells, start: candidate.start, widthCols: selectedWidth, obstacleSegments, obstacleCols });
    segmentsPlaced += 1;
  }

  if (segmentsPlaced < cfg.obstacleSegments[0]){
    // fallback: add minimal segments ignoring previous overlap to guarantee requirement
    const missing = cfg.obstacleSegments[0] - segmentsPlaced;
    for (let i = 0; i < missing; i++){
      const candidate = findObstacleSlot({ cells, widthCols: minCols, minEmptyCols, prevObstacleCols, force:true });
      if (!candidate) break;
      applyObstacleSegment({ cells, start: candidate.start, widthCols: minCols, obstacleSegments, obstacleCols });
    }
  }

  let currentClear = cells.filter((cell) => cell === 'empty').length;
  let guard = 0;
  while (currentClear < minEmptyCols && guard < 10){
    guard++;
    if (!shrinkObstacleForClear({ cells, obstacleSegments, obstacleCols, prevObstacleCols, minEmptyCols })){
      break;
    }
    currentClear = cells.filter((cell) => cell === 'empty').length;
  }
}

function chooseObstacleWidth({ minCols, maxCols, cfg }){
  if (minCols === maxCols) return minCols;
  const largeRangeStart = Math.max(minCols, Math.floor(maxCols * 0.75));
  if (Math.random() < cfg.obstacleSize.largeChance){
    return randomInt(largeRangeStart, maxCols);
  }
  return randomInt(minCols, Math.max(minCols, Math.round((minCols + maxCols) / 2)));
}

function findObstacleSlot({ cells, widthCols, minEmptyCols, prevObstacleCols, force }){
  const currentClear = cells.filter((cell) => cell === 'empty').length;
  const candidates = [];
  for (let start = 0; start <= GRID_COLS - widthCols; start++){
    let fits = true;
    for (let col = start; col < start + widthCols; col++){
      if (cells[col] !== 'empty'){
        fits = false;
        break;
      }
      if (prevObstacleCols.has(col)){
        fits = false;
        break;
      }
    }
    if (!fits) continue;
    if (start > 0 && cells[start - 1] === 'obstacle') continue;
    if (start + widthCols < GRID_COLS && cells[start + widthCols] === 'obstacle') continue;
    const remainingClear = currentClear - widthCols;
    if (!force && remainingClear < minEmptyCols) continue;
    candidates.push({ start });
  }
  if (!candidates.length) return null;
  const edgeCandidates = candidates.filter((c) => c.start === 0 || c.start + widthCols === GRID_COLS);
  if (edgeCandidates.length){
    return edgeCandidates[Math.floor(Math.random() * edgeCandidates.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function applyObstacleSegment({ cells, start, widthCols, obstacleSegments, obstacleCols }){
  for (let col = start; col < start + widthCols; col++){
    cells[col] = 'obstacle';
    obstacleCols.add(col);
  }
  obstacleSegments.push({ start, end: start + widthCols - 1 });
}

function shrinkObstacleForClear({ cells, obstacleSegments, obstacleCols, prevObstacleCols, minEmptyCols }){
  const minCols = Math.max(1, Math.round(GRID_COLS * BASE_OBSTACLE_MIN_FRAC));
  obstacleSegments.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  for (const segment of obstacleSegments){
    const length = segment.end - segment.start + 1;
    if (length <= minCols) continue;
    // try removing one column from left or right that doesn't collide with prev obstacles
    const leftCol = segment.start;
    const rightCol = segment.end;
    const options = [];
    if (!prevObstacleCols.has(leftCol)){
      options.push({ removeCol: leftCol, direction: 'left' });
    }
    if (!prevObstacleCols.has(rightCol)){
      options.push({ removeCol: rightCol, direction: 'right' });
    }
    if (!options.length){
      options.push({ removeCol: leftCol, direction: 'left' });
    }
    const choice = options[Math.floor(Math.random() * options.length)];
    cells[choice.removeCol] = 'empty';
    obstacleCols.delete(choice.removeCol);
    if (choice.direction === 'left'){
      segment.start += 1;
    } else {
      segment.end -= 1;
    }
    if (segment.end < segment.start){
      const index = obstacleSegments.indexOf(segment);
      if (index >= 0){
        obstacleSegments.splice(index, 1);
      }
    }
    return cells.filter((cell) => cell === 'empty').length >= minEmptyCols;
  }
  return false;
}

function shuffleArray(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randomInt(min, max){
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Drawing */
function drawBackground(ts){
  const t = ts * 0.00025;
  const g = ctx.createRadialGradient(
    BASE_W*0.5, BASE_H*0.1, 40 + 30*Math.sin(t),
    BASE_W*0.5, BASE_H*0.85, BASE_H*0.95
  );
  g.addColorStop(0, '#2e8f39');
  g.addColorStop(1, '#0f4d1f');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,BASE_W,BASE_H);

  const finishScreenY = worldToScreenY(TRACK_LEN);
  if (finishScreenY < BASE_H + 60){
    ctx.fillStyle = '#FFD84D';
    ctx.fillRect(0, finishScreenY - 6, BASE_W, 12);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', BASE_W/2, finishScreenY - 12);
  }
}
function getRunnerSprite(){
  const pack = runnerSprites[runnerFacing] || runnerSprites.forward;
  if (runnerMoving && pack.move && pack.move.length){
    const idx = runnerAnimFrameIndex % pack.move.length;
    return pack.move[idx] || pack.idle || null;
  }
  return pack.idle || (pack.move ? pack.move[0] : null) || null;
}
function drawRunner(){
  const x = runnerX;
  const baseY = worldToScreenY(runnerY) + RUNNER_SPRITE_BASE_OFFSET;
  const sprite = getRunnerSprite();
  if (sprite){
    ctx.drawImage(sprite, x - RUNNER_SPRITE_WIDTH/2, baseY - RUNNER_SPRITE_HEIGHT, RUNNER_SPRITE_WIDTH, RUNNER_SPRITE_HEIGHT);
    return;
  }
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(x - 18, baseY - 52, 36, 52);
  ctx.beginPath();
  ctx.fillStyle = '#93c5fd';
  ctx.arc(x, baseY - 64, 12, 0, Math.PI*2);
  ctx.fill();
}
const SPRITE_W = 40, SPRITE_H = 48;
function drawJug(it){
  const yS = worldToScreenY(it.y);
  if (!imgJugYellow){
    ctx.save();
    ctx.translate(it.x, yS);
    ctx.fillStyle = '#FFD84D';
    ctx.fillRect(-16, -22, 32, 44);
    ctx.fillStyle = '#bda10d';
    ctx.fillRect(-6, -26, 12, 6);
    ctx.restore();
    return;
  }
  ctx.drawImage(imgJugYellow, it.x - SPRITE_W/2, yS - SPRITE_H/2, SPRITE_W, SPRITE_H);
}
function drawHazard(it){
  const yS = worldToScreenY(it.y);
  if (!imgJugBlack){
    ctx.save();
    ctx.translate(it.x, yS);
    ctx.fillStyle = '#253331';
    ctx.fillRect(-it.w/2, -it.h/2, it.w, it.h);
    ctx.restore();
    return;
  }
  ctx.drawImage(imgJugBlack, it.x - SPRITE_W/2, yS - SPRITE_H/2, SPRITE_W, SPRITE_H);
}
function drawObstacle(it){
  const yS = worldToScreenY(it.y);
  ctx.save();
  ctx.translate(it.x, yS);
  ctx.fillStyle = '#3f2d20';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.fillRect(-it.w/2, -it.h/2, it.w, it.h);
  ctx.strokeRect(-it.w/2, -it.h/2, it.w, it.h);
  ctx.restore();
}

/* Game Flow */
function resetGame(){
  if (difficultyOptions.length){
    const selected = difficultyOptions.find((input) => input.checked);
    if (selected) difficulty = selected.value;
  }
  playing = false;
  gameArmed = false;
  elapsed = 0;
  runnerX = lanesX[Math.floor(lanesX.length/2)] || BASE_W/2;
  runnerY = 80;
  camY = 0;
  lastTs = 0;
  upHeld = downHeld = leftHeld = rightHeld = false;
  halfWayToastShown = false;
  runnerFacing = 'forward';
  runnerMoving = false;
  runnerAnimFrameIndex = 0;
  runnerAnimElapsed = 0;
  runnerImpulseTimer = 0;
  if (milestoneToast){
    milestoneToast.style.opacity = 0;
  }
  if (milestoneToastTimeout){
    clearTimeout(milestoneToastTimeout);
    milestoneToastTimeout = null;
  }

  setHudTime(0);
  setHudJugs(0);
  genWorld();

  document.querySelectorAll('.confetti').forEach(n => n.remove());
}

function beginIfArmedAndTouch(direction /* 'up'|'down'|null */) {
  if (!gameArmed) return;
  gameArmed = false;
  playing = true;
  lastTs = 0;
  if (direction === 'up')   upHeld = true;
  if (direction === 'down') downHeld = true;
  if (instructionsEl) instructionsEl.classList.add('hidden');
  requestAnimationFrame(loop);
}


function startGame(){
  if (difficultyOptions.length){
    const selected = difficultyOptions.find((input) => input.checked);
    if (selected) difficulty = selected.value;
  }
  resetGame();
  showScreen(screenGame);

  // Armed: wait for first arrow
  playing = false;
  gameArmed = true;
  if (instructionsEl) instructionsEl.classList.remove('hidden');

  // Initial frame for visibility
  ctx.clearRect(0,0,BASE_W,BASE_H);
  drawBackground(0);
  for (const j of jugs) drawJug(j);
  for (const h of hazards) drawHazard(h);
  for (const o of obstacles) drawObstacle(o);
  drawRunner();
}
function finish(){
  playing = false;
  const timeRounded = (Math.round(elapsed*100)/100);
  if (finalTimeEl) finalTimeEl.textContent = timeRounded.toFixed(2);
  const newRecord = maybeUpdateBestTime(timeRounded);
  updateBestTimeDisplay();
  playSound(SOUND_FINISH);
  showScreen(screenOver);
  const congrats = document.getElementById('finishCongrats');
  congrats && congrats.classList.toggle('hidden', !newRecord);
  if (newRecord) {
    congrats && congrats.classList.remove('hidden');
  }
  celebrate();
}

/* Confetti */
function maybeUpdateBestTime(timeSeconds){
  const key = difficulty || 'normal';
  const current = bestTimes[key];
  const isBetter = current == null || timeSeconds < current;
  if (isBetter){
    bestTimes[key] = timeSeconds;
    saveBestTimes();
    updateBestTimeDisplay();
  }
  return isBetter;
}

function resetBestTimes(){
  bestTimes = { easy: null, normal: null, hard: null };
  saveBestTimes();
  updateBestTimeDisplay();
}
function celebrate(){
  const wrap = document.querySelector('.stage-wrap');
  if (!wrap) return;
  for (let i=0;i<90;i++){
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random()*100 + '%';
    p.style.background = ['#ffd84d','#60a5fa','#22c55e','#f97316','#a78bfa'][Math.floor(Math.random()*5)];
    p.style.animationDuration = (4 + Math.random()*2) + 's';
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 6500);
  }
}

/* Loop */
function loop(ts){
  const dt = Math.min(48, ts - (lastTs || ts));
  const dtSec = dt/1000;
  lastTs = ts;

  const prevRunnerX = runnerX;
  const prevRunnerY = runnerY;
  if (upHeld)    runnerY += MOVE_SPEED * dtSec;
  if (downHeld)  runnerY  = Math.max(80, runnerY - MOVE_SPEED * dtSec);
  if (leftHeld)  runnerX  = clampRunnerX(runnerX - MOVE_SPEED * dtSec);
  if (rightHeld) runnerX  = clampRunnerX(runnerX + MOVE_SPEED * dtSec);

  for (const ob of obstacles){
    if (!runnerIntersectsObstacle(runnerX, runnerY, ob)) continue;

    if (runnerY !== prevRunnerY){
      const candidateY = prevRunnerY;
      if (!runnerIntersectsObstacle(runnerX, candidateY, ob)){
        runnerY = candidateY;
        continue;
      }
      runnerY = candidateY;
    }

    if (runnerX !== prevRunnerX){
      const candidateX = prevRunnerX;
      if (!runnerIntersectsObstacle(candidateX, runnerY, ob)){
        runnerX = candidateX;
        continue;
      }
      runnerX = candidateX;
    }

    runnerX = prevRunnerX;
    runnerY = prevRunnerY;
    break;
  }

  updateRunnerAnimation(runnerX - prevRunnerX, runnerY - prevRunnerY, dtSec);

  camY = Math.max(camY, runnerY - 0.68 * BASE_H);

  elapsed += dtSec;
  setHudTime(elapsed);

  ctx.clearRect(0,0,BASE_W,BASE_H);
  drawBackground(ts);
  for (const j of jugs)    drawJug(j);
  for (const h of hazards) drawHazard(h);
  for (const o of obstacles) drawObstacle(o);

  const runnerXNow = runnerX;
  const rY = runnerY;

  for (let i=jugs.length-1; i>=0; i--){
    const it = jugs[i];
    if (Math.abs(it.x - runnerXNow) < 28 && Math.abs(it.y - rY) < 42){
      jugs.splice(i,1);
      jugCount++; setHudJugs(jugCount);
      elapsed = Math.max(0, elapsed - 3); setHudTime(elapsed);
      flash('-3.00s', '#22c55e');
      playSound(SOUND_YELLOW);
    }
  }
  for (let i=hazards.length-1; i>=0; i--){
    const it = hazards[i];
    const top = it.y - it.h/2, bottom = it.y + it.h/2;
    const overlapLane = Math.abs(it.x - runnerXNow) < (it.w * 0.6);
    const overlapY = !((rY - 40) > bottom || (rY + 20) < top);
    if (overlapLane && overlapY){
      hazards.splice(i,1);
      elapsed += 4; setHudTime(elapsed);
      flash('+4.00s', '#ef4444');
      playSound(SOUND_HAZARD);
    }
  }

  drawRunner();

  if (!halfWayToastShown && runnerY >= TRACK_LEN * 0.5){
    halfWayToastShown = true;
    showHalfwayToast();
  }

  if (runnerY >= TRACK_LEN){ finish(); return; }
  if (playing) requestAnimationFrame(loop);
}

/* Input */
window.addEventListener('keydown', (e) => {
  const isArrow = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key);

  if (gameArmed && isArrow){
    gameArmed = false;
    playing = true;
    lastTs = 0;
    if (e.key === 'ArrowUp')   upHeld = true;
    if (e.key === 'ArrowDown') downHeld = true;
    if (e.key === 'ArrowLeft') leftHeld = true;
    if (e.key === 'ArrowRight') rightHeld = true;
    if (instructionsEl) instructionsEl.classList.add('hidden');
    requestAnimationFrame(loop);
  }

  if (!playing) return;

  if (e.key === 'ArrowUp')    upHeld = true;
  if (e.key === 'ArrowDown')  downHeld = true;
  if (e.key === 'ArrowLeft')  leftHeld = true;
  if (e.key === 'ArrowRight') rightHeld = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp')    upHeld = false;
  if (e.key === 'ArrowDown')  downHeld = false;
  if (e.key === 'ArrowLeft')  leftHeld = false;
  if (e.key === 'ArrowRight') rightHeld = false;
});

/* Touch (swipe lanes only) */
// Touch (swipe lanes + hold zones for up/down)
let touchSX=null, touchSY=null;

canvas.addEventListener('touchstart', (e) => {
  // If armed, a first touch on canvas just starts (no movement)
  if (gameArmed) {
    beginIfArmedAndTouch(null);
  }
  const t = e.changedTouches[0];
  touchSX = t.clientX; touchSY = t.clientY;
  e.preventDefault();
}, { passive:false });

canvas.addEventListener('touchend', (e) => {
  if (!playing || touchSX==null || touchSY==null) { touchSX=touchSY=null; return; }
  const t  = e.changedTouches[0];
  const dx = t.clientX - touchSX;
  if (dx < -20) snapRunnerToLane(-1);
  if (dx >  20) snapRunnerToLane(1);
  touchSX = touchSY = null;
  e.preventDefault();
}, { passive:false });

// Press-and-hold zones for vertical movement
function holdStart(direction){
  if (gameArmed) beginIfArmedAndTouch(direction);
  if (!playing) return;
  if (direction === 'up')   upHeld = true;
  if (direction === 'down') downHeld = true;
}
function holdEnd(direction){
  if (direction === 'up')   upHeld = false;
  if (direction === 'down') downHeld = false;
}
function laneTap(direction){
  if (gameArmed) beginIfArmedAndTouch(null);
  if (!playing) return;
  snapRunnerToLane(direction);
}

upZone && upZone.addEventListener('touchstart', (e) => { holdStart('up'); e.preventDefault(); }, { passive:false });
upZone && upZone.addEventListener('touchend',   (e) => { holdEnd('up');   e.preventDefault(); }, { passive:false });
upZone && upZone.addEventListener('touchcancel',(e) => { holdEnd('up');   e.preventDefault(); }, { passive:false });

downZone && downZone.addEventListener('touchstart', (e) => { holdStart('down'); e.preventDefault(); }, { passive:false });
downZone && downZone.addEventListener('touchend',   (e) => { holdEnd('down');   e.preventDefault(); }, { passive:false });
downZone && downZone.addEventListener('touchcancel',(e) => { holdEnd('down');   e.preventDefault(); }, { passive:false });

leftZone && leftZone.addEventListener('touchstart', (e) => { laneTap(-1); e.preventDefault(); }, { passive:false });
rightZone && rightZone.addEventListener('touchstart', (e) => { laneTap(1); e.preventDefault(); }, { passive:false });


/* Buttons */
btnStart     && btnStart.addEventListener('click', startGame);
btnPlayAgain && btnPlayAgain.addEventListener('click', startGame);
btnReset     && btnReset.addEventListener('click', () => {
  resetGame();
  showScreen(screenStart);
});
btnBackToMenu && btnBackToMenu.addEventListener('click', () => {
  resetGame();
  showScreen(screenStart);
});

btnResetInGame && btnResetInGame.addEventListener('click', () => {
  // stop play immediately
  playing = false;
  // return to Start screen (clean slate)
  resetGame();
  showScreen(screenStart);
});

const btnResetScores = document.getElementById('btnResetScores');
btnResetScores && btnResetScores.addEventListener('click', () => {
  resetBestTimes();
});


/* Init */
(function init(){
  showScreen(screenStart);
  setHudTime(0); setHudJugs(0);
  updateBestTimeDisplay();
  genWorld();
})();











