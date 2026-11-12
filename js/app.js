/**
 * Tennis Pro Analytics — Main Application Engine
 * Architecture: Event-Driven Vanilla JS / Canvas 2D / SVG Math
 * ATP / Semi-Pro Coaching Standard
 */

// =========================================================================================
// 1. GLOBAL STATE & SESSION CONFIGURATION
// =========================================================================================

const AppState = {
  currentTab: 'overlay', // 'overlay' | 'heatmap' | 'footwork' | 'telemetry'
  
  // Module 1: Dual Video & Skeleton Studio
  overlay: {
    mode: 'ghost', // 'split' | 'ghost' | 'curtain'
    alpha: 0.50, // 0.0 (only Pro) to 1.0 (only User)
    curtainX: 0.50, // 0.0 to 1.0
    isPlaying: true,
    speed: 0.25,
    progress: 0.62, // 0.0 to 1.0 (defaults to T2 Contact Point)
    anchorContactPro: 0.62,
    anchorContactUser: 0.62,
    anchorDeltaMs: 0,
    userVideoLoaded: false,
    proVideoLoaded: false,
    proVideoEl: null,
    userVideoEl: null,
    preset: 'forehand_fed'
  },

  // Module 2: Shot Dispersion & Heatmap
  heatmap: {
    filter: 'cross_fh', // 'cross_fh' | 'dtl_fh' | 'cross_bh' | 'all'
    showHeat: true,
    showDots: true,
    showVectors: true,
    selectedShotId: 14
  },

  // Module 3: Footwork Tracer
  footwork: {
    rallyId: 'rally_long',
    isPlaying: true,
    progress: 0.0,
    speed: 1.0,
    showOptimal: true,
    showBisection: true
  },

  // Module 4: Flight Telemetry & Radar
  telemetry: {
    launchSpeedKmh: 130,
    receiverDepthM: 0.5, // meters behind baseline (negative = inside court)
    surface: 'hard', // 'hard' | 'clay' | 'grass'
    animTime: 0
  }
};

// =========================================================================================
// 2. BIOMECHANICS SKELETON DATA & MOTION KEYFRAMES (PRO VS SEMI-PRO AMATEUR)
// =========================================================================================

/**
 * 5 Kinematic Chain Anchors for Forehand:
 * T0 (0.00): Unit Turn & Weight Loading
 * T1 (0.40): Racket Drop & Wrist Lag
 * T2 (0.62): Contact Point (Ideal Strike Zone: 30cm in front of hip)
 * T3 (0.78): Extension & Windshield-Wiper Follow-Through
 * T4 (1.00): Deceleration & Dynamic Recovery
 */
const SKELETON_PRESETS = {
  forehand_fed: {
    title: "Roger Federer (ATP Standard) vs Semi-Pro Forehand",
    phases: {
      T0: { t: 0.00, name: "T0 — Unit Turn (Поворот плеч и загрузка)" },
      T1: { t: 0.40, name: "T1 — Racket Drop (Опускание головки ракетки)" },
      T2: { t: 0.62, name: "T2 — Contact Point (Точка контакта)" },
      T3: { t: 0.78, name: "T3 — Extension (Линейная проводка)" },
      T4: { t: 1.00, name: "T4 — Recovery (Завершение и баланс)" }
    },
    // Keyframes: [headX, headY, shoulderR, elbowR, wristR, hipR, kneeR, ankleR, racketTip, shoulderL, elbowL, wristL, hipL, kneeL, ankleL]
    pro: [
      // T0: Unit Turn (Pivoted sideways, deep knee load)
      { t: 0.00, head:[240,160], shR:[230,195], elR:[200,240], wrR:[170,225], hipR:[235,290], knR:[225,370], anR:[220,440], rTip:[130,180], shL:[255,200], elL:[280,240], wrL:[275,220], hipL:[260,290], knL:[265,370], anL:[270,440] },
      // T1: Racket Drop & Lag (Butt cap facing incoming ball)
      { t: 0.40, head:[242,165], shR:[225,200], elR:[220,265], wrR:[230,305], hipR:[235,295], knR:[215,385], anR:[210,445], rTip:[160,360], shL:[260,200], elL:[290,220], wrL:[285,180], hipL:[260,295], knL:[270,380], anL:[275,445] },
      // T2: Contact Point (Straight arm 165°, knee bend 132°, contact 30cm out front)
      { t: 0.62, head:[244,162], shR:[228,198], elR:[270,230], wrR:[325,260], hipR:[240,290], knR:[220,380], anR:[210,445], rTip:[375,210], shL:[260,198], elL:[275,230], wrL:[260,210], hipL:[265,290], knL:[280,375], anL:[285,445], ball:[335,255] },
      // T3: Follow-through (Extension up and across)
      { t: 0.78, head:[245,160], shR:[230,195], elR:[250,210], wrR:[240,175], hipR:[240,285], knR:[230,365], anR:[220,440], rTip:[210,130], shL:[260,198], elL:[280,240], wrL:[285,270], hipL:[265,285], knL:[280,365], anL:[285,440] },
      // T4: Recovery
      { t: 1.00, head:[245,160], shR:[230,195], elR:[215,245], wrR:[235,265], hipR:[235,290], knR:[225,370], anR:[220,440], rTip:[250,210], shL:[260,195], elL:[275,245], wrL:[255,265], hipL:[265,290], knL:[270,370], anL:[275,440] }
    ],
    user: [
      // T0: Unit Turn (Flatter turn, straight knees)
      { t: 0.00, head:[240,150], shR:[230,185], elR:[195,230], wrR:[175,220], hipR:[235,280], knR:[230,360], anR:[220,440], rTip:[140,185], shL:[255,190], elL:[275,235], wrL:[270,225], hipL:[260,280], knL:[265,360], anL:[270,440] },
      // T1: Drop (Racket head stays too high)
      { t: 0.40, head:[242,152], shR:[225,190], elR:[210,250], wrR:[215,280], hipR:[235,285], knR:[225,365], anR:[215,445], rTip:[180,310], shL:[260,190], elL:[285,220], wrL:[280,185], hipL:[260,285], knL:[270,365], anL:[275,445] },
      // T2: Contact Point (Bent elbow 138°, straight knees 163°, Late Contact 18cm back)
      { t: 0.62, head:[242,150], shR:[225,188], elR:[245,235], wrR:[285,265], hipR:[238,280], knR:[230,360], anR:[215,445], rTip:[325,230], shL:[258,188], elL:[270,230], wrL:[260,215], hipL:[262,280], knL:[275,360], anL:[280,445], ball:[295,265] },
      // T3: Follow-through (Short finish, arm pulled into body)
      { t: 0.78, head:[243,150], shR:[228,186], elR:[238,215], wrR:[225,190], hipR:[238,280], knR:[230,360], anR:[220,440], rTip:[195,150], shL:[258,188], elL:[275,240], wrL:[280,265], hipL:[262,280], knL:[275,360], anL:[280,440] },
      // T4: Recovery
      { t: 1.00, head:[240,150], shR:[230,185], elR:[215,235], wrR:[235,255], hipR:[235,280], knR:[230,360], anR:[220,440], rTip:[245,200], shL:[260,185], elL:[275,235], wrL:[255,255], hipL:[265,280], knL:[270,360], anL:[275,440] }
    ]
  }
};

// =========================================================================================
// 3. SHOT DATABASE (45 REAL SEMI-PRO SHOTS FOR MODULE 2)
// =========================================================================================

const SHOT_DATABASE = [
  // Forehand Crosscourt (справа направо)
  { id: 1, type: 'cross_fh', name: 'Forehand Crosscourt', x: 280, y: 360, depth: 0.9, speed: 126, rpm: 2950, inCourt: true, isDeep: true, isWinner: false },
  { id: 2, type: 'cross_fh', name: 'Forehand Crosscourt', x: 265, y: 380, depth: 0.5, speed: 132, rpm: 3100, inCourt: true, isDeep: true, isWinner: true },
  { id: 3, type: 'cross_fh', name: 'Forehand Crosscourt', x: 310, y: 340, depth: 1.4, speed: 121, rpm: 2800, inCourt: true, isDeep: true, isWinner: false },
  { id: 4, type: 'cross_fh', name: 'Forehand Crosscourt', x: 240, y: 395, depth: 0.2, speed: 135, rpm: 3200, inCourt: true, isDeep: true, isWinner: true },
  { id: 5, type: 'cross_fh', name: 'Forehand Crosscourt', x: 350, y: 270, depth: 2.8, speed: 114, rpm: 2600, inCourt: true, isDeep: false, isWinner: false }, // Short
  { id: 6, type: 'cross_fh', name: 'Forehand Crosscourt', x: 290, y: 375, depth: 0.6, speed: 128, rpm: 3000, inCourt: true, isDeep: true, isWinner: false },
  { id: 7, type: 'cross_fh', name: 'Forehand Crosscourt', x: 220, y: 420, depth: -0.4, speed: 139, rpm: 3150, inCourt: false, isDeep: false, error: 'long' }, // Out long
  { id: 8, type: 'cross_fh', name: 'Forehand Crosscourt', x: 340, y: 350, depth: 1.2, speed: 123, rpm: 2850, inCourt: true, isDeep: true, isWinner: false },
  { id: 9, type: 'cross_fh', name: 'Forehand Crosscourt', x: 380, y: 220, depth: 4.1, speed: 108, rpm: 2400, inCourt: true, isDeep: false, isWinner: false }, // Short
  { id: 10, type: 'cross_fh', name: 'Forehand Crosscourt', x: 270, y: 385, depth: 0.4, speed: 130, rpm: 3050, inCourt: true, isDeep: true, isWinner: false },
  { id: 11, type: 'cross_fh', name: 'Forehand Crosscourt', x: 190, y: 350, depth: 1.1, speed: 124, rpm: 2700, inCourt: false, isDeep: false, error: 'wide' }, // Out wide
  { id: 12, type: 'cross_fh', name: 'Forehand Crosscourt', x: 295, y: 365, depth: 0.8, speed: 127, rpm: 2980, inCourt: true, isDeep: true, isWinner: false },
  { id: 13, type: 'cross_fh', name: 'Forehand Crosscourt', x: 320, y: 330, depth: 1.6, speed: 122, rpm: 2820, inCourt: true, isDeep: true, isWinner: false },
  { id: 14, type: 'cross_fh', name: 'Forehand Crosscourt', x: 260, y: 370, depth: 0.8, speed: 128.5, rpm: 3120, inCourt: true, isDeep: true, isWinner: false },
  { id: 15, type: 'cross_fh', name: 'Forehand Crosscourt', x: 275, y: 390, depth: 0.3, speed: 133, rpm: 3180, inCourt: true, isDeep: true, isWinner: true },

  // Forehand Down the Line (по линии)
  { id: 16, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 620, y: 380, depth: 0.5, speed: 136, rpm: 2900, inCourt: true, isDeep: true, isWinner: true },
  { id: 17, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 640, y: 415, depth: -0.3, speed: 140, rpm: 3050, inCourt: false, isDeep: false, error: 'long' },
  { id: 18, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 615, y: 365, depth: 0.8, speed: 131, rpm: 2850, inCourt: true, isDeep: true, isWinner: false },
  { id: 19, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 690, y: 340, depth: 1.4, speed: 127, rpm: 2750, inCourt: false, isDeep: false, error: 'wide' },
  { id: 20, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 610, y: 390, depth: 0.3, speed: 138, rpm: 3000, inCourt: true, isDeep: true, isWinner: true },
  { id: 21, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 590, y: 290, depth: 2.4, speed: 119, rpm: 2600, inCourt: true, isDeep: false, isWinner: false },
  { id: 22, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 625, y: 375, depth: 0.6, speed: 133, rpm: 2920, inCourt: true, isDeep: true, isWinner: true },

  // Backhand Crosscourt (слева налево)
  { id: 23, type: 'cross_bh', name: 'Backhand Crosscourt', x: 610, y: 370, depth: 0.7, speed: 118, rpm: 2450, inCourt: true, isDeep: true, isWinner: false },
  { id: 24, type: 'cross_bh', name: 'Backhand Crosscourt', x: 630, y: 385, depth: 0.4, speed: 122, rpm: 2600, inCourt: true, isDeep: true, isWinner: true },
  { id: 25, type: 'cross_bh', name: 'Backhand Crosscourt', x: 580, y: 340, depth: 1.4, speed: 115, rpm: 2380, inCourt: true, isDeep: true, isWinner: false },
  { id: 26, type: 'cross_bh', name: 'Backhand Crosscourt', x: 650, y: 410, depth: -0.2, speed: 126, rpm: 2700, inCourt: false, isDeep: false, error: 'long' },
  { id: 27, type: 'cross_bh', name: 'Backhand Crosscourt', x: 560, y: 280, depth: 2.6, speed: 110, rpm: 2200, inCourt: true, isDeep: false, isWinner: false },
  { id: 28, type: 'cross_bh', name: 'Backhand Crosscourt', x: 615, y: 360, depth: 0.9, speed: 119, rpm: 2500, inCourt: true, isDeep: true, isWinner: false }
];

// =========================================================================================
// 4. FOOTWORK RALLY DATA (MODULE 3)
// =========================================================================================

const RALLY_DATA = {
  rally_long: {
    durationSec: 6.8,
    totalDistanceM: 38.6,
    optimalDistanceM: 31.8,
    pei: 82.4,
    splitStepMs: 135,
    points: [
      { t: 0.0, x: 450, y: 410, action: "Базовая стойка (Split-Step)", speed: 0.0 },
      { t: 0.8, x: 280, y: 380, action: "Взрывной шаг в правый угол", speed: 14.8 },
      { t: 1.4, x: 260, y: 395, action: "Удар форхендом из открытой стойки", speed: 4.2 },
      { t: 2.3, x: 390, y: 415, action: "Кросс-овер рекавери на биссектрису", speed: 16.4 },
      { t: 3.2, x: 410, y: 410, action: "Сплит-степ в момент удара соперника", speed: 1.5 },
      { t: 4.1, x: 620, y: 375, action: "Рывок в левый угол под бэкхенд", speed: 15.2 },
      { t: 4.8, x: 640, y: 390, action: "Бэкхенд с закрытой стойки", speed: 3.8 },
      { t: 5.7, x: 470, y: 415, action: "Возврат на заднюю линию", speed: 13.5 },
      { t: 6.8, x: 450, y: 330, action: "Вход в хавкорт на короткий мяч", speed: 17.1 }
    ]
  }
};

// =========================================================================================
// 5. APPLICATION INITIALIZATION & TAB SWITCHER
// =========================================================================================

document.addEventListener('DOMContentLoaded', () => {
  initOverlayStudio();
  initHeatmapModule();
  initFootworkModule();
  initTelemetryModule();

  // Start global animation loop
  requestAnimationFrame(appRenderLoop);
});

function switchTab(tabId) {
  AppState.currentTab = tabId;

  // Update Top Bar buttons
  const tabs = ['overlay', 'heatmap', 'footwork', 'telemetry'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab-' + t);
    const sec = document.getElementById('module-' + t + '-section');
    if (t === tabId) {
      btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 text-slate-950 shadow-md transition-all";
      sec.classList.remove('hidden');
    } else {
      btn.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all";
      sec.classList.add('hidden');
    }
  });

  // Re-trigger layout paints
  if (tabId === 'heatmap') drawHeatmap();
  if (tabId === 'footwork') drawFootworkFrame();
  if (tabId === 'telemetry') updateFlightPhysics();
}

// =========================================================================================
// 6. MODULE 1: DUAL VIDEO & SKELETON OVERLAY STUDIO
// =========================================================================================

function initOverlayStudio() {
  const canvas = document.getElementById('overlay-canvas');
  AppState.overlay.proVideoEl = document.getElementById('pro-video-element');
  AppState.overlay.userVideoEl = document.getElementById('user-video-element');

  // Curtain slider drag handling
  let isDraggingCurtain = false;
  const curtainHandle = document.getElementById('curtain-handle');

  canvas.addEventListener('mousedown', (e) => {
    if (AppState.overlay.mode === 'curtain') {
      isDraggingCurtain = true;
      updateCurtainPos(e);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingCurtain) updateCurtainPos(e);
  });

  window.addEventListener('mouseup', () => {
    isDraggingCurtain = false;
  });

  function updateCurtainPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    AppState.overlay.curtainX = x;
    curtainHandle.style.left = `${x * 100}%`;
  }
}

function setOverlayMode(mode) {
  AppState.overlay.mode = mode;
  ['split', 'ghost', 'curtain'].forEach(m => {
    const btn = document.getElementById('mode-' + m + '-btn');
    if (m === mode) {
      btn.className = "px-2.5 py-1 rounded-md font-semibold bg-sky-500 text-slate-950 shadow";
    } else {
      btn.className = "px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white";
    }
  });

  const curtainEl = document.getElementById('curtain-handle');
  const alphaCtrl = document.getElementById('alpha-controls');
  
  if (mode === 'curtain') {
    curtainEl.classList.remove('hidden');
    alphaCtrl.classList.add('opacity-40', 'pointer-events-none');
  } else if (mode === 'ghost') {
    curtainEl.classList.add('hidden');
    alphaCtrl.classList.remove('opacity-40', 'pointer-events-none');
  } else { // split
    curtainEl.classList.add('hidden');
    alphaCtrl.classList.add('opacity-40', 'pointer-events-none');
  }
}

function onAlphaChange(val) {
  AppState.overlay.alpha = parseFloat(val) / 100;
  document.getElementById('alpha-label').textContent = `${val}%`;
}

function onVideoScrub(val) {
  AppState.overlay.progress = parseFloat(val) / 1000;
  updateVideoTime();
}

function toggleVideoPlay() {
  AppState.overlay.isPlaying = !AppState.overlay.isPlaying;
  document.getElementById('video-play-icon').textContent = AppState.overlay.isPlaying ? '⏸' : '▶';
  document.getElementById('video-play-text').textContent = AppState.overlay.isPlaying ? 'Пауза' : 'Пуск';
}

function stepFrame(dir) {
  AppState.overlay.isPlaying = false;
  document.getElementById('video-play-icon').textContent = '▶';
  document.getElementById('video-play-text').textContent = 'Пуск';
  AppState.overlay.progress = Math.max(0, Math.min(1, AppState.overlay.progress + dir * 0.02));
  document.getElementById('video-scrubber').value = Math.round(AppState.overlay.progress * 1000);
  updateVideoTime();
}

function setPlaySpeed(sp) {
  AppState.overlay.speed = sp;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.className = "speed-btn px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700";
  });
  event.target.className = "speed-btn px-2 py-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold";
}

function jumpToPhase(phaseKey) {
  const p = SKELETON_PRESETS[AppState.overlay.preset].phases[phaseKey];
  if (p) {
    AppState.overlay.progress = p.t;
    document.getElementById('video-scrubber').value = Math.round(p.t * 1000);
    updateVideoTime();
  }
}

function setContactAnchorHere() {
  AppState.overlay.anchorContactPro = AppState.overlay.progress;
  AppState.overlay.anchorContactUser = AppState.overlay.progress;
  alert(`Якорь точки контакта T2 зафиксирован на прогрессе ${(AppState.overlay.progress * 100).toFixed(0)}%! Видеопотоки синхронизированы.`);
}

function handleUserVideoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  AppState.overlay.userVideoEl.src = url;
  AppState.overlay.userVideoLoaded = true;
  document.getElementById('badge-user').textContent = `👤 ВАШЕ ВИДЕО: ${file.name.slice(0, 18)}`;
}

function handleProVideoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  AppState.overlay.proVideoEl.src = url;
  AppState.overlay.proVideoLoaded = true;
  document.getElementById('badge-pro').textContent = `⭐ РЕФЕРЕНС: ${file.name.slice(0, 18)}`;
}

function onPresetChange(val) {
  AppState.overlay.preset = val;
}

function updateVideoTime() {
  if (AppState.overlay.proVideoLoaded && AppState.overlay.proVideoEl.duration) {
    AppState.overlay.proVideoEl.currentTime = AppState.overlay.progress * AppState.overlay.proVideoEl.duration;
  }
  if (AppState.overlay.userVideoLoaded && AppState.overlay.userVideoEl.duration) {
    AppState.overlay.userVideoEl.currentTime = AppState.overlay.progress * AppState.overlay.userVideoEl.duration;
  }
}

/**
 * Render Skeleton Studio on Canvas
 */
function renderOverlayCanvas() {
  const canvas = document.getElementById('overlay-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Current progress
  const t = AppState.overlay.progress;
  const preset = SKELETON_PRESETS[AppState.overlay.preset];

  // Interpolate Pro & User keyframes
  const proPose = interpolatePose(preset.pro, t);
  const userPose = interpolatePose(preset.user, t);

  // Render based on display mode
  if (AppState.overlay.mode === 'split') {
    // Left half: Pro (Amber), Right half: User (Sky)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w / 2, h);
    ctx.clip();
    drawSkeleton(ctx, proPose, "#f59e0b", "#fbbf24", "⭐ Roger Federer (ATP)", 60, 40);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(w / 2, 0, w / 2, h);
    ctx.clip();
    drawSkeleton(ctx, userPose, "#0284c7", "#38bdf8", "👤 Your Forehand", w / 2 + 60, 40);
    ctx.restore();

    // Divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'ghost') {
    // Both overlaid on top of each other with alpha blending
    const proAlpha = 1.0 - AppState.overlay.alpha;
    const userAlpha = AppState.overlay.alpha;

    ctx.save();
    ctx.globalAlpha = Math.max(0.15, proAlpha);
    drawSkeleton(ctx, proPose, "#f59e0b", "#fbbf24", `ATP Pro (${(proAlpha*100).toFixed(0)}%)`, w/2 - 120, 30);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.max(0.15, userAlpha);
    drawSkeleton(ctx, userPose, "#0284c7", "#38bdf8", `You (${(userAlpha*100).toFixed(0)}%)`, w/2 - 120, 30);
    ctx.restore();

    // Draw live angle callouts between skeletons
    drawAngleComparisonCallouts(ctx, proPose, userPose, w/2 - 120);

  } else if (AppState.overlay.mode === 'curtain') {
    const cx = AppState.overlay.curtainX * w;

    // Left side of curtain: Pro
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, cx, h); ctx.clip();
    drawSkeleton(ctx, proPose, "#f59e0b", "#fbbf24", "⭐ Pro (ATP)", 60, 40);
    ctx.restore();

    // Right side of curtain: User
    ctx.save();
    ctx.beginPath(); ctx.rect(cx, 0, w - cx, h); ctx.clip();
    drawSkeleton(ctx, userPose, "#0284c7", "#38bdf8", "👤 You", 60, 40);
    ctx.restore();

    // Curtain line
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  }

  // Update HUD text
  let curPhaseText = "Вне фаз";
  Object.values(preset.phases).forEach(p => {
    if (Math.abs(t - p.t) < 0.12) curPhaseText = p.name;
  });
  document.getElementById('hud-phase-name').textContent = curPhaseText;
}

function interpolatePose(keyframes, t) {
  let k0 = keyframes[0];
  let k1 = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  const span = (k1.t - k0.t) || 0.0001;
  const localT = (t - k0.t) / span;

  function lerpPt(pA, pB) {
    return [pA[0] + (pB[0] - pA[0]) * localT, pA[1] + (pB[1] - pA[1]) * localT];
  }

  const res = {};
  ['head', 'shR', 'elR', 'wrR', 'hipR', 'knR', 'anR', 'rTip', 'shL', 'elL', 'wrL', 'hipL', 'knL', 'anL'].forEach(j => {
    res[j] = lerpPt(k0[j], k1[j]);
  });
  if (k0.ball && k1.ball) res.ball = lerpPt(k0.ball, k1.ball);
  return res;
}

function drawSkeleton(ctx, pose, boneColor, jointColor, label, offsetX, offsetY) {
  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Label
  ctx.fillStyle = jointColor;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(label, pose.head[0] - 40, pose.head[1] - 30);

  // Bones definitions
  const bones = [
    [pose.head, pose.shR],
    [pose.shR, pose.elR],
    [pose.elR, pose.wrR],
    [pose.shR, pose.hipR],
    [pose.hipR, pose.knR],
    [pose.knR, pose.anR],
    // Left side
    [pose.head, pose.shL],
    [pose.shL, pose.elL],
    [pose.elL, pose.wrL],
    [pose.shL, pose.hipL],
    [pose.hipL, pose.knL],
    [pose.knL, pose.anL],
    // Hips & Shoulders cross
    [pose.shR, pose.shL],
    [pose.hipR, pose.hipL]
  ];

  ctx.strokeStyle = boneColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  bones.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  });

  // Racket
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pose.wrR[0], pose.wrR[1]);
  ctx.lineTo(pose.rTip[0], pose.rTip[1]);
  ctx.stroke();

  // Racket Head Ellipse
  ctx.fillStyle = "rgba(226, 232, 240, 0.25)";
  ctx.beginPath();
  ctx.ellipse(pose.rTip[0], pose.rTip[1], 18, 30, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Joints
  Object.entries(pose).forEach(([k, pt]) => {
    if (k === 'ball') return;
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], k === 'head' ? 14 : 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Tennis ball
  if (pose.ball) {
    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.arc(pose.ball[0], pose.ball[1], 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4d7c0f";
    ctx.stroke();
  }

  ctx.restore();
}

function drawAngleComparisonCallouts(ctx, pro, user, offsetX) {
  ctx.save();
  ctx.translate(offsetX, 30);

  // Highlight Elbow discrepancy at Contact (T2)
  if (AppState.overlay.progress >= 0.50 && AppState.overlay.progress <= 0.72) {
    // Pro Elbow Ring
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pro.elR[0], pro.elR[1], 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 12px monospace";
    ctx.fillText("Pro: 165°", pro.elR[0] + 20, pro.elR[1] - 5);

    // User Elbow Ring
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(user.elR[0], user.elR[1], 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.fillText("Вы: 138° (-27°)", user.elR[0] - 90, user.elR[1] + 20);

    // Dotted error link
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(pro.elR[0], pro.elR[1]);
    ctx.lineTo(user.elR[0], user.elR[1]);
    ctx.stroke();
  }

  ctx.restore();
}

// =========================================================================================
// 7. MODULE 2: SHOT DISPERSION & ZONE HEATMAP
// =========================================================================================

function initHeatmapModule() {
  const canvas = document.getElementById('heatmap-canvas');
  canvas.addEventListener('click', onHeatmapClick);
  drawHeatmap();
}

function setShotFilter(flt) {
  AppState.heatmap.filter = flt;
  ['cross_fh', 'dtl_fh', 'cross_bh', 'all'].forEach(f => {
    const btn = document.getElementById('flt-' + f.replace('_', '-'));
    if (f === flt) {
      btn.className = "px-2.5 py-1 rounded-md font-semibold bg-sky-500 text-slate-950";
    } else {
      btn.className = "px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white";
    }
  });
  updateHeatmapStats();
  drawHeatmap();
}

function toggleHeatmapVisuals() {
  AppState.heatmap.showHeat = document.getElementById('chk-show-heat').checked;
  AppState.heatmap.showDots = document.getElementById('chk-show-dots').checked;
  AppState.heatmap.showVectors = document.getElementById('chk-show-vectors').checked;
  drawHeatmap();
}

function updateHeatmapStats() {
  const shots = getFilteredShots();
  const total = shots.length;
  if (!total) return;

  const inCourtCount = shots.filter(s => s.inCourt).length;
  const deepCount = shots.filter(s => s.isDeep).length;
  const winCount = shots.filter(s => s.isWinner).length;
  const shortCount = shots.filter(s => s.inCourt && !s.isDeep).length;

  document.getElementById('stat-in-court').textContent = `${((inCourtCount / total) * 100).toFixed(1)}%`;
  document.getElementById('stat-deep-rate').textContent = `${((deepCount / inCourtCount) * 100).toFixed(1)}%`;
  document.getElementById('stat-winners').textContent = `${winCount} ударов`;
  document.getElementById('stat-short-balls').textContent = `${((shortCount / inCourtCount) * 100).toFixed(1)}%`;
}

function getFilteredShots() {
  if (AppState.heatmap.filter === 'all') return SHOT_DATABASE;
  return SHOT_DATABASE.filter(s => s.type === AppState.heatmap.filter);
}

function drawHeatmap() {
  const canvas = document.getElementById('heatmap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Draw Standard ITF Tennis Court
  drawITFCourt(ctx, w, h);

  const shots = getFilteredShots();

  // Layer 1: True Kernel Density Heatmap
  if (AppState.heatmap.showHeat) {
    shots.forEach(s => {
      const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 45);
      grad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      grad.addColorStop(0.5, "rgba(245, 158, 11, 0.25)");
      grad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 45, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Layer 2: Flight Vectors from baseline
  if (AppState.heatmap.showVectors) {
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    shots.forEach(s => {
      ctx.strokeStyle = s.inCourt ? "rgba(56, 189, 248, 0.35)" : "rgba(239, 68, 68, 0.35)";
      ctx.beginPath();
      ctx.moveTo(w / 2 + 120, 60); // approximate hitting origin
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // Layer 3: Individual Landing Marks
  if (AppState.heatmap.showDots) {
    shots.forEach(s => {
      const isSelected = s.id === AppState.heatmap.selectedShotId;

      ctx.fillStyle = s.inCourt ? (s.isDeep ? "#22c55e" : "#eab308") : "#ef4444";
      ctx.beginPath();
      ctx.arc(s.x, s.y, isSelected ? 8.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0f172a";
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      ctx.stroke();

      if (isSelected) {
        // Selection ripple
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
}

function drawITFCourt(ctx, w, h) {
  // Baseline bounds: x: 100 to 800, y: 50 to 410
  const left = 90;
  const right = 810;
  const top = 40;
  const bottom = 420;
  const courtW = right - left;
  const courtH = bottom - top;

  // Outer doubles court
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(left, top, courtW, courtH);

  // Doubles corridors (Alleys) 45px each
  const alleyW = 50;
  ctx.strokeRect(left + alleyW, top, courtW - alleyW * 2, courtH);

  // Net (Center horizontal)
  const netY = (top + bottom) / 2;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(left - 15, netY); ctx.lineTo(right + 15, netY); ctx.stroke();
  ctx.fillText("СЕТКА", w / 2 - 20, netY - 6);

  // Service Lines (top and bottom)
  const sLineTop = netY - 95;
  const sLineBot = netY + 95;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left + alleyW, sLineTop); ctx.lineTo(right - alleyW, sLineTop);
  ctx.moveTo(left + alleyW, sLineBot); ctx.lineTo(right - alleyW, sLineBot);
  ctx.stroke();

  // Center Service Line
  ctx.beginPath();
  ctx.moveTo(w / 2, sLineTop); ctx.lineTo(w / 2, sLineBot);
  ctx.stroke();

  // Center Marks
  ctx.beginPath();
  ctx.moveTo(w / 2, top); ctx.lineTo(w / 2, top + 10);
  ctx.moveTo(w / 2, bottom); ctx.lineTo(w / 2, bottom - 10);
  ctx.stroke();

  // Target Highlight: Deep 2m Zone (Bottom Baseline)
  ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
  ctx.fillRect(left + alleyW, bottom - 45, courtW - alleyW * 2, 45);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left + alleyW, bottom - 45, courtW - alleyW * 2, 45);
  ctx.setLineDash([]);
}

function onHeatmapClick(e) {
  const canvas = document.getElementById('heatmap-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const shots = getFilteredShots();
  let closest = null;
  let minDist = 30;

  shots.forEach(s => {
    const d = Math.hypot(s.x - clickX, s.y - clickY);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  });

  if (closest) {
    AppState.heatmap.selectedShotId = closest.id;
    drawHeatmap();

    // Update detail card
    const card = document.getElementById('selected-shot-card');
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="font-bold text-sky-300">Выбранный удар #${closest.id}</span>
        <span class="px-2 py-0.5 rounded ${closest.inCourt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'} font-mono font-bold">
          ${closest.inCourt ? (closest.isWinner ? 'WINNER 🏆' : 'IN COURT') : 'OUT (' + closest.error.toUpperCase() + ')'}
        </span>
      </div>
      <div class="space-y-1 text-xs text-slate-300">
        <div>Тип: <strong class="text-white">${closest.name}</strong></div>
        <div>Скорость при вылете: <strong class="text-amber-400">${closest.speed} км/ч</strong> | Вращение: <strong class="text-sky-300">${closest.rpm} RPM</strong></div>
        <div>Глубина приземления: <strong class="${closest.isDeep ? 'text-emerald-400' : 'text-amber-400'}">${closest.depth > 0 ? closest.depth.toFixed(2) + ' м от задней' : 'Аут за заднюю +' + Math.abs(closest.depth) + ' м'}</strong></div>
      </div>
    `;
  }
}

// =========================================================================================
// 8. MODULE 3: FOOTWORK & COURT MOVEMENT TRACER
// =========================================================================================

function initFootworkModule() {
  drawFootworkFrame();
}

function onRallyChange(val) {
  AppState.footwork.rallyId = val;
  AppState.footwork.progress = 0;
  drawFootworkFrame();
}

function toggleRallyPlay() {
  AppState.footwork.isPlaying = !AppState.footwork.isPlaying;
  document.getElementById('rally-play-icon').textContent = AppState.footwork.isPlaying ? '⏸' : '▶';
  document.getElementById('rally-play-text').textContent = AppState.footwork.isPlaying ? 'Пауза симуляции' : 'Пуск';
}

function onRallyScrub(val) {
  AppState.footwork.progress = parseFloat(val) / 1000;
  drawFootworkFrame();
}

function drawFootworkFrame() {
  const canvas = document.getElementById('footwork-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  drawITFCourt(ctx, w, h);

  const rally = RALLY_DATA[AppState.footwork.rallyId] || RALLY_DATA.rally_long;
  const pts = rally.points;
  const t = AppState.footwork.progress;

  // Draw full rally trace (Actual player path)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Draw optimal geodesic path
  if (AppState.footwork.showOptimal) {
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[5].x, pts[5].y);
    ctx.lineTo(pts[8].x, pts[8].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Target Center of Bisection
  if (AppState.footwork.showBisection) {
    const bisectX = 390;
    const bisectY = 415;
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.beginPath();
    ctx.arc(bisectX, bisectY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px monospace";
    ctx.fillText("Цель рекавери (Биссектриса)", bisectX - 80, bisectY + 28);
  }

  // Calculate current player position
  const totalPts = pts.length;
  const idxFloat = t * (totalPts - 1);
  const baseIdx = Math.floor(idxFloat);
  const nextIdx = Math.min(totalPts - 1, baseIdx + 1);
  const localFrac = idxFloat - baseIdx;

  const curX = pts[baseIdx].x + (pts[nextIdx].x - pts[baseIdx].x) * localFrac;
  const curY = pts[baseIdx].y + (pts[nextIdx].y - pts[baseIdx].y) * localFrac;
  const curSpeed = pts[baseIdx].speed + (pts[nextIdx].speed - pts[baseIdx].speed) * localFrac;

  // Draw Player Avatar
  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.arc(curX, curY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Foot steps pulse
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(curX, curY, 20, 0, Math.PI * 2);
  ctx.stroke();

  // Update HUD
  document.getElementById('fw-hud-action').textContent = pts[baseIdx].action;
  document.getElementById('fw-hud-speed').textContent = `${curSpeed.toFixed(1)} км/ч`;
  document.getElementById('rally-time-label').textContent = `t = ${(t * rally.durationSec).toFixed(1)} с`;
}

// =========================================================================================
// 9. MODULE 4: BALL FLIGHT TELEMETRY & RADAR
// =========================================================================================

function initTelemetryModule() {
  updateFlightPhysics();
}

function updateFlightPhysics() {
  const speed = parseFloat(document.getElementById('slider-speed').value);
  const depth = parseFloat(document.getElementById('slider-depth').value);
  const surface = document.getElementById('select-surface').value;

  AppState.telemetry.launchSpeedKmh = speed;
  AppState.telemetry.receiverDepthM = depth;
  AppState.telemetry.surface = surface;

  document.getElementById('val-speed').textContent = `${speed} км/ч`;
  document.getElementById('val-depth').textContent = depth > 0 ? `+${depth.toFixed(1)} м за задней` : `${depth.toFixed(1)} м (В корте)`;

  // Baseline transit distance: 23.77m court + hitting offsets
  const distM = 24.5 + depth;
  document.getElementById('stat-transit-sub').innerHTML = `Дистанция полёта: <span class="text-white font-mono font-bold">${distM.toFixed(1)} метра</span>`;

  // Surface drag coefficient
  let surfaceDrop = 0.24; // Hard default
  if (surface === 'clay') surfaceDrop = 0.31;
  if (surface === 'grass') surfaceDrop = 0.18;

  // Real aerodynamic flight time integration
  const v0Ms = speed / 3.6;
  const vAvgMs = v0Ms * (1.0 - surfaceDrop * 0.45);
  const transitTimeSec = distM / vAvgMs;
  const transitTimeMs = Math.round(transitTimeSec * 1000);

  document.getElementById('stat-transit-time').textContent = `${transitTimeMs} мс`;

  // Time budget breakdown
  const timeVis = 180;
  const timeSplit = 120;
  const timeFootwork = Math.round(Math.max(220, 360 + depth * 35));
  const timeSwing = 200;
  const totalRequired = timeVis + timeSplit + timeFootwork + timeSwing;
  const marginMs = transitTimeMs - totalRequired;

  document.getElementById('time-footwork').textContent = `${timeFootwork} мс`;

  const marginEl = document.getElementById('stat-margin-time');
  const alertBox = document.getElementById('transit-alert-box');
  const bar = document.getElementById('margin-progress');

  if (marginMs > 80) {
    marginEl.textContent = `+${marginMs} мс (Комфортно)`;
    marginEl.className = "font-mono text-emerald-400 font-bold";
    bar.className = "h-full bg-emerald-500 rounded-full";
    bar.style.width = "85%";
    alertBox.className = "p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed";
    alertBox.innerHTML = `🟢 <strong>Статус:</strong> При скорости ${speed} км/ч у вас есть ${marginMs} мс запаса времени. Вы успеваете выполнить полный замах с глубоким разгоном (Full Loop).`;
  } else if (marginMs >= -40) {
    marginEl.textContent = `${marginMs >= 0 ? '+' : ''}${marginMs} мс (Плотный тайминг)`;
    marginEl.className = "font-mono text-amber-400 font-bold";
    bar.className = "h-full bg-amber-500 rounded-full";
    bar.style.width = "50%";
    alertBox.className = "p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 leading-relaxed";
    alertBox.innerHTML = `🟡 <strong>Внимание:</strong> Окно реакции сужено! Не делайте длинный замах. Рекомендуется компактный подъем ракетки (Compact Takeback) и блокирующий удар.`;
  } else {
    marginEl.textContent = `${marginMs} мс (Критический дефицит)`;
    marginEl.className = "font-mono text-red-400 font-bold";
    bar.className = "h-full bg-red-500 rounded-full";
    bar.style.width = "20%";
    alertBox.className = "p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200 leading-relaxed";
    alertBox.innerHTML = `🔴 <strong>Опасность:</strong> Дефицит ${Math.abs(marginMs)} мс! Вы гарантированно опоздаете с точкой контакта, если не сыграете короткий слёт/полулёт (Half-Volley Block) прямо перед собой.`;
  }

  drawTelemetryRadar(speed, transitTimeMs, distM);
}

function drawTelemetryRadar(speed, transitMs, distM) {
  const canvas = document.getElementById('telemetry-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Radar Grid Circles
  ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
  ctx.lineWidth = 1;
  const cx = w / 2;
  const cy = h / 2;
  [60, 120, 170].forEach(r => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  });

  // Radar sweep line
  AppState.telemetry.animTime += 0.04;
  const sweepAngle = AppState.telemetry.animTime;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * 170, cy + Math.sin(sweepAngle) * 170);
  ctx.stroke();

  // Ball Trajectory Flight Arc (Side profile perspective inside radar)
  const x0 = 80;
  const x1 = w - 80;
  const yGround = h - 60;
  const netX = w / 2;

  // Ground line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0 - 20, yGround); ctx.lineTo(x1 + 20, yGround); ctx.stroke();

  // Net in center
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(netX, yGround); ctx.lineTo(netX, yGround - 55); ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "10px monospace";
  ctx.fillText("СЕТКА (0.914м)", netX - 35, yGround - 65);

  // Flight curve
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, yGround - 40);
  ctx.quadraticCurveTo(netX, yGround - 110, x1 - 100, yGround); // Bounce point
  ctx.quadraticCurveTo(x1 - 40, yGround - 50, x1, yGround - 35); // Post-bounce
  ctx.stroke();

  // Animated Ball along trajectory
  const ballT = (AppState.telemetry.animTime * 0.8) % 1.0;
  let bx, by;
  if (ballT < 0.75) {
    const subT = ballT / 0.75;
    bx = x0 + (x1 - 100 - x0) * subT;
    by = (yGround - 40) * Math.pow(1 - subT, 2) + (yGround - 110) * 2 * (1 - subT) * subT + yGround * Math.pow(subT, 2);
  } else {
    const subT = (ballT - 0.75) / 0.25;
    bx = (x1 - 100) + 100 * subT;
    by = yGround * Math.pow(1 - subT, 2) + (yGround - 50) * 2 * (1 - subT) * subT + (yGround - 35) * Math.pow(subT, 2);
  }

  ctx.fillStyle = "#bef264";
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#15803d";
  ctx.stroke();

  // Speedometer text at top corners
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 14px monospace";
  ctx.fillText(`Скорость вылета: ${speed} км/ч`, 50, 40);

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`Время в воздухе: ${transitMs} мс`, w - 240, 40);
}

// =========================================================================================
// 10. GLOBAL HIGH-FPS ANIMATION LOOP
// =========================================================================================

let lastTimestamp = performance.now();

function appRenderLoop(now) {
  const dt = (now - lastTimestamp) / 1000;
  lastTimestamp = now;

  // Module 1 animation
  if (AppState.currentTab === 'overlay' && AppState.overlay.isPlaying) {
    const duration = 2.4; // 2.4 seconds per stroke cycle
    AppState.overlay.progress += (dt * AppState.overlay.speed) / duration;
    if (AppState.overlay.progress >= 1.0) AppState.overlay.progress = 0.0;
    document.getElementById('video-scrubber').value = Math.round(AppState.overlay.progress * 1000);
    renderOverlayCanvas();
  } else if (AppState.currentTab === 'overlay') {
    renderOverlayCanvas();
  }

  // Module 3 animation
  if (AppState.currentTab === 'footwork' && AppState.footwork.isPlaying) {
    AppState.footwork.progress += (dt * AppState.footwork.speed) / 6.8;
    if (AppState.footwork.progress >= 1.0) AppState.footwork.progress = 0.0;
    document.getElementById('rally-scrubber').value = Math.round(AppState.footwork.progress * 1000);
    drawFootworkFrame();
  }

  // Module 4 animation
  if (AppState.currentTab === 'telemetry') {
    updateFlightPhysics();
  }

  requestAnimationFrame(appRenderLoop);
}
