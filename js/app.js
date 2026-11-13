/**
 * Tennis Pro Analytics 3D — Main Application Controller (AceCue + Hawkeye Suite)
 */

const AppState = {
  currentTab: 'overlay',
  overlay: {
    mode: 'split',
    alpha: 0.50,
    curtainX: 0.50,
    isPlaying: true,
    speed: 0.25,
    progress: 0.62,
    anchorContactPro: 0.62,
    anchorContactUser: 0.62,
    userVideoLoaded: false,
    proVideoLoaded: false,
    preset: 'forehand_fed'
  },
  heatmap: {
    filter: 'cross_fh',
    showHeat: true,
    showDots: true,
    showVectors: true,
    selectedShotId: 14,
    addMode: false
  },
  footwork: {
    rallyId: 'rally_long',
    isPlaying: true,
    progress: 0.0,
    speed: 1.0,
    showOptimal: true,
    showBisection: true
  },
  telemetry: {
    launchSpeedKmh: 130,
    receiverDepthM: 0.5,
    surface: 'hard',
    animTime: 0
  }
};

const SHOT_DATABASE = [
  { id: 1, type: 'cross_fh', name: 'Forehand Crosscourt', x: 280, y: 360, depth: 0.9, speed: 126, rpm: 2950, inCourt: true, isDeep: true, isWinner: false },
  { id: 2, type: 'cross_fh', name: 'Forehand Crosscourt', x: 265, y: 380, depth: 0.5, speed: 132, rpm: 3100, inCourt: true, isDeep: true, isWinner: true },
  { id: 3, type: 'cross_fh', name: 'Forehand Crosscourt', x: 310, y: 340, depth: 1.4, speed: 121, rpm: 2800, inCourt: true, isDeep: true, isWinner: false },
  { id: 4, type: 'cross_fh', name: 'Forehand Crosscourt', x: 240, y: 395, depth: 0.2, speed: 135, rpm: 3200, inCourt: true, isDeep: true, isWinner: true },
  { id: 5, type: 'cross_fh', name: 'Forehand Crosscourt', x: 350, y: 270, depth: 2.8, speed: 114, rpm: 2600, inCourt: true, isDeep: false, isWinner: false },
  { id: 6, type: 'cross_fh', name: 'Forehand Crosscourt', x: 290, y: 375, depth: 0.6, speed: 128, rpm: 3000, inCourt: true, isDeep: true, isWinner: false },
  { id: 7, type: 'cross_fh', name: 'Forehand Crosscourt', x: 220, y: 428, depth: -0.4, speed: 139, rpm: 3150, inCourt: false, isDeep: false, error: 'long' },
  { id: 8, type: 'cross_fh', name: 'Forehand Crosscourt', x: 340, y: 350, depth: 1.2, speed: 123, rpm: 2850, inCourt: true, isDeep: true, isWinner: false },
  { id: 9, type: 'cross_fh', name: 'Forehand Crosscourt', x: 380, y: 220, depth: 4.1, speed: 108, rpm: 2400, inCourt: true, isDeep: false, isWinner: false },
  { id: 10, type: 'cross_fh', name: 'Forehand Crosscourt', x: 270, y: 385, depth: 0.4, speed: 130, rpm: 3050, inCourt: true, isDeep: true, isWinner: false },
  { id: 11, type: 'cross_fh', name: 'Forehand Crosscourt', x: 115, y: 350, depth: 1.1, speed: 124, rpm: 2700, inCourt: false, isDeep: false, error: 'wide' },
  { id: 12, type: 'cross_fh', name: 'Forehand Crosscourt', x: 295, y: 365, depth: 0.8, speed: 127, rpm: 2980, inCourt: true, isDeep: true, isWinner: false },
  { id: 13, type: 'cross_fh', name: 'Forehand Crosscourt', x: 320, y: 330, depth: 1.6, speed: 122, rpm: 2820, inCourt: true, isDeep: true, isWinner: false },
  { id: 14, type: 'cross_fh', name: 'Forehand Crosscourt', x: 260, y: 370, depth: 0.8, speed: 128.5, rpm: 3120, inCourt: true, isDeep: true, isWinner: false },
  { id: 15, type: 'cross_fh', name: 'Forehand Crosscourt', x: 275, y: 390, depth: 0.3, speed: 133, rpm: 3180, inCourt: true, isDeep: true, isWinner: true },
  { id: 16, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 620, y: 380, depth: 0.5, speed: 136, rpm: 2900, inCourt: true, isDeep: true, isWinner: true },
  { id: 17, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 640, y: 428, depth: -0.3, speed: 140, rpm: 3050, inCourt: false, isDeep: false, error: 'long' },
  { id: 18, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 615, y: 365, depth: 0.8, speed: 131, rpm: 2850, inCourt: true, isDeep: true, isWinner: false },
  { id: 19, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 780, y: 340, depth: 1.4, speed: 127, rpm: 2750, inCourt: false, isDeep: false, error: 'wide' },
  { id: 20, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 610, y: 390, depth: 0.3, speed: 138, rpm: 3000, inCourt: true, isDeep: true, isWinner: true },
  { id: 21, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 590, y: 290, depth: 2.4, speed: 119, rpm: 2600, inCourt: true, isDeep: false, isWinner: false },
  { id: 22, type: 'dtl_fh', name: 'Forehand Down-the-Line', x: 625, y: 375, depth: 0.6, speed: 133, rpm: 2920, inCourt: true, isDeep: true, isWinner: true },
  { id: 23, type: 'cross_bh', name: 'Backhand Crosscourt', x: 610, y: 370, depth: 0.7, speed: 118, rpm: 2450, inCourt: true, isDeep: true, isWinner: false },
  { id: 24, type: 'cross_bh', name: 'Backhand Crosscourt', x: 630, y: 385, depth: 0.4, speed: 122, rpm: 2600, inCourt: true, isDeep: true, isWinner: true },
  { id: 25, type: 'cross_bh', name: 'Backhand Crosscourt', x: 580, y: 340, depth: 1.4, speed: 115, rpm: 2380, inCourt: true, isDeep: true, isWinner: false },
  { id: 26, type: 'cross_bh', name: 'Backhand Crosscourt', x: 650, y: 428, depth: -0.2, speed: 126, rpm: 2700, inCourt: false, isDeep: false, error: 'long' },
  { id: 27, type: 'cross_bh', name: 'Backhand Crosscourt', x: 560, y: 280, depth: 2.6, speed: 110, rpm: 2200, inCourt: true, isDeep: false, isWinner: false },
  { id: 28, type: 'cross_bh', name: 'Backhand Crosscourt', x: 615, y: 360, depth: 0.9, speed: 119, rpm: 2500, inCourt: true, isDeep: true, isWinner: false }
];

const RALLY_DATA = {
  rally_long: {
    durationSec: 6.8,
    totalDistanceM: 38.6,
    optimalDistanceM: 31.8,
    pei: 82.4,
    splitStepMs: 135,
    bisectPoint: [390, 415],
    points: [
      { t: 0.0, x: 450, y: 410, action: "Базовая стойка (Split-Step +135 мс)", speed: 0.0 },
      { t: 0.8, x: 280, y: 380, action: "Взрывной шаг в правый угол", speed: 14.8 },
      { t: 1.4, x: 260, y: 395, action: "Удар форхендом из полуоткрытой стойки", speed: 4.2 },
      { t: 2.3, x: 390, y: 415, action: "Кросс-овер рекавери на биссектрису", speed: 16.4 },
      { t: 3.2, x: 410, y: 410, action: "Сплит-степ в момент удара соперника", speed: 1.5 },
      { t: 4.1, x: 620, y: 375, action: "Рывок в левый угол под бэкхенд", speed: 15.2 },
      { t: 4.8, x: 640, y: 390, action: "Бэкхенд с широкого шага правой ногой", speed: 3.8 },
      { t: 5.7, x: 470, y: 415, action: "Возврат на биссектрису задней линии", speed: 13.5 },
      { t: 6.8, x: 450, y: 310, action: "Вход в корт на короткий мяч (Атака)", speed: 17.1 }
    ]
  },
  rally_serve_volley: {
    durationSec: 4.2,
    totalDistanceM: 19.4,
    optimalDistanceM: 17.8,
    pei: 91.8,
    splitStepMs: 122,
    bisectPoint: [410, 265],
    points: [
      { t: 0.0, x: 390, y: 418, action: "Подача в угол (Wide Serve)", speed: 2.0 },
      { t: 1.1, x: 405, y: 335, action: "Стартовый спринт к линии подачи", speed: 18.6 },
      { t: 1.8, x: 410, y: 310, action: "Первый сплит-степ перед приёмом (+122 мс)", speed: 3.2 },
      { t: 2.6, x: 365, y: 285, action: "Подготовительный слёт (Transition Volley)", speed: 11.4 },
      { t: 3.4, x: 380, y: 255, action: "Сжатие дистанции у сетки (Closing In)", speed: 12.8 },
      { t: 4.2, x: 445, y: 245, action: "Завершающий перехват с лёта навылет", speed: 14.0 }
    ]
  },
  rally_defensive: {
    durationSec: 5.6,
    totalDistanceM: 34.2,
    optimalDistanceM: 24.5,
    pei: 71.6,
    splitStepMs: 215,
    bisectPoint: [485, 420],
    points: [
      { t: 0.0, x: 450, y: 415, action: "Поздний сплит-степ (+215 мс опоздание)", speed: 1.0 },
      { t: 1.2, x: 175, y: 432, action: "Глубокое выбивание за коридор (Оборона)", speed: 19.2 },
      { t: 2.5, x: 440, y: 438, action: "Дугообразный возврат с потерей 2.4 метра", speed: 16.5 },
      { t: 3.9, x: 710, y: 425, action: "Доставание мяча в левом углу в скольжении", speed: 18.4 },
      { t: 5.6, x: 485, y: 420, action: "Возврат на биссектрису после свечи", speed: 14.2 }
    ]
  }
};

document.addEventListener('DOMContentLoaded', () => {
  init3DViewerAndVideo();
  renderAceCueSidebar();
  if (typeof updateSidebarWithLiveVideoMetrics === 'function') {
    updateSidebarWithLiveVideoMetrics();
  }
  if (typeof renderCauseAndEffectStrip === 'function') {
    renderCauseAndEffectStrip();
  }
  initHeatmapModule();
  initFootworkModule();
  initTelemetryModule();
  requestAnimationFrame(appRenderLoop);
});

function switchTab(tabId) {
  AppState.currentTab = tabId;
  ['overlay', 'heatmap', 'footwork', 'telemetry'].forEach(t => {
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
  if (tabId === 'heatmap') { updateHeatmapStats(); drawHeatmap(); }
  if (tabId === 'footwork') drawFootworkFrame();
  if (tabId === 'telemetry') updateFlightPhysics();
}

// =========================================================================================
// MODULE 1: ACECUE SIDEBAR + 3D & VIDEO CONTROLS
// =========================================================================================

function renderAceCueSidebar() {
  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;

  // Update Score Badge
  const scoreEl = document.getElementById('biomech-score');
  if (scoreEl) scoreEl.textContent = `${stroke.score.toFixed(1)} / 10 (AceCue AI)`;

  const sumEl = document.getElementById('biomech-summary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="mb-1.5 text-xs text-slate-300">
        <strong>Стойка Профи:</strong> <span class="text-amber-300">${stroke.stanceTypePro}</span><br/>
        <strong>Ваша стойка:</strong> <span class="text-sky-300">${stroke.stanceTypeUser}</span>
      </div>
      <div class="grid grid-cols-5 gap-1 text-center text-xs font-mono pt-1 border-t border-slate-800">
        <div class="bg-slate-900 p-1 rounded">Замах<br/><span class="text-emerald-400 font-bold">${stroke.subScores.prep}</span></div>
        <div class="bg-slate-900 p-1 rounded">Стопы<br/><span class="text-amber-400 font-bold">${stroke.subScores.footwork}</span></div>
        <div class="bg-slate-900 p-1 rounded">Подсед<br/><span class="text-amber-400 font-bold">${stroke.subScores.loading}</span></div>
        <div class="bg-slate-900 p-1 rounded">Контакт<br/><span class="text-red-400 font-bold">${stroke.subScores.contact}</span></div>
        <div class="bg-slate-900 p-1 rounded">Финиш<br/><span class="text-sky-400 font-bold">${stroke.subScores.follow}</span></div>
      </div>
    `;
  }

  // Render Top 3 Prioritized Fixes + Strengths + Drills (AceCue format)
  const listEl = document.getElementById('discrepancy-list');
  if (!listEl) return;

  const fixesHtml = stroke.top3Fixes.map(fix => {
    const borderCls = fix.priority === 1 ? 'border-red-500/50 bg-red-950/20' : (fix.priority === 2 ? 'border-amber-500/50 bg-amber-950/20' : 'border-sky-500/40 bg-sky-950/20');
    const badgeCls = fix.priority === 1 ? 'bg-red-500/30 text-red-200' : (fix.priority === 2 ? 'bg-amber-500/30 text-amber-200' : 'bg-sky-500/30 text-sky-200');
    return `
      <div onclick="jumpToPhase('${fix.phaseKey}')" class="glass-panel rounded-xl p-2.5 border ${borderCls} cursor-pointer hover:brightness-110 transition">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-bold text-white">Приоритет #${fix.priority}: ${fix.title}</span>
          <span class="font-mono px-1.5 py-0.5 rounded text-xs ${badgeCls} font-bold shrink-0 ml-1">${fix.phaseKey}</span>
        </div>
        <p class="text-xs text-slate-300 leading-snug">${fix.desc}</p>
        <div class="mt-1 text-xs font-mono text-amber-300">⚡ Эффект: ${fix.impact} (Нажмите для показа в 3D)</div>
      </div>
    `;
  }).join('');

  const drillsHtml = stroke.drills.map(d => `
    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
      <div class="flex justify-between font-bold text-emerald-300">
        <span>🏋️ ${d.name}</span>
      </div>
      <div class="text-slate-400 font-mono text-xs mb-0.5">${d.duration}</div>
      <div class="text-slate-300 leading-snug">${d.desc}</div>
    </div>
  `).join('');

  listEl.innerHTML = `
    <div class="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Топ-3 исправления по приоритету (AceCue AI):</div>
    ${fixesHtml}
    <div class="text-xs font-bold uppercase tracking-wider text-emerald-400 px-1 pt-1">Персональные упражнения (Drills):</div>
    <div class="space-y-1.5">${drillsHtml}</div>
  `;

  // Update badges if no custom video is loaded
  if (!AppState.overlay.proVideoLoaded) {
    document.getElementById('badge-pro').textContent = `⭐ 3D ЭТАЛОН ATP: ${stroke.proName.toUpperCase()}`;
  }
}

function setOverlayMode(mode) {
  AppState.overlay.mode = mode;
  ['ghost', 'split', 'curtain'].forEach(m => {
    const btn = document.getElementById('mode-' + m + '-btn');
    if (!btn) return;
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
  } else {
    curtainEl.classList.add('hidden');
    alphaCtrl.classList.add('opacity-40', 'pointer-events-none');
  }
}

function onAlphaChange(val) {
  AppState.overlay.alpha = parseFloat(val) / 100;
  document.getElementById('alpha-label').textContent = `${val}%`;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function onVideoScrub(val) {
  if (window.AIPoseEngine) window.AIPoseEngine.lockImpactMode = false;
  AppState.overlay.progress = parseFloat(val) / 1000;
  syncHtmlVideosToProgress();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleVideoPlay() {
  if (window.AIPoseEngine && typeof window.AIPoseEngine.lockImpactMode === 'boolean') {
    window.AIPoseEngine.lockImpactMode = false;
  }
  AppState.overlay.isPlaying = !AppState.overlay.isPlaying;
  document.getElementById('video-play-icon').textContent = AppState.overlay.isPlaying ? '⏸' : '▶';
  document.getElementById('video-play-text').textContent = AppState.overlay.isPlaying ? 'Пауза' : 'Пуск';

  const uv = document.getElementById('user-video-element');
  const pv = document.getElementById('pro-video-element');
  const scans = window.AIPoseEngine ? window.AIPoseEngine.scans : null;
  const usingScan = scans && ((scans.user && scans.user.status === 'ready') || (scans.pro && scans.pro.status === 'ready'));

  if (AppState.overlay.isPlaying && !usingScan) {
    if (AppState.overlay.userVideoLoaded && uv) uv.play().catch(() => {});
    if (AppState.overlay.proVideoLoaded && pv) pv.play().catch(() => {});
  } else {
    if (uv) uv.pause();
    if (pv) pv.pause();
  }
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function stepFrame(dir) {
  if (window.AIPoseEngine) window.AIPoseEngine.lockImpactMode = false;
  AppState.overlay.isPlaying = false;
  document.getElementById('video-play-icon').textContent = '▶';
  document.getElementById('video-play-text').textContent = 'Пуск';
  const uv = document.getElementById('user-video-element');
  const pv = document.getElementById('pro-video-element');
  if (uv) uv.pause();
  if (pv) pv.pause();

  AppState.overlay.progress = Math.max(0, Math.min(1, AppState.overlay.progress + dir * 0.015));
  document.getElementById('video-scrubber').value = Math.round(AppState.overlay.progress * 1000);
  syncHtmlVideosToProgress();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function setPlaySpeed(sp, btnEl) {
  AppState.overlay.speed = sp;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.className = "speed-btn px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700";
  });
  if (btnEl) {
    btnEl.className = "speed-btn px-2 py-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold";
  }
  const uv = document.getElementById('user-video-element');
  const pv = document.getElementById('pro-video-element');
  if (uv) uv.playbackRate = sp;
  if (pv) pv.playbackRate = sp;
}

function jumpToPhase(phaseKey) {
  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const p = stroke.phases.find(ph => ph.key === phaseKey);
  if (p) {
    if (window.AIPoseEngine) window.AIPoseEngine.lockImpactMode = (phaseKey === 'T2');
    AppState.overlay.isPlaying = false;
    document.getElementById('video-play-icon').textContent = '▶';
    document.getElementById('video-play-text').textContent = 'Пуск';
    const uv = document.getElementById('user-video-element');
    const pv = document.getElementById('pro-video-element');
    if (uv) uv.pause();
    if (pv) pv.pause();
    AppState.overlay.progress = p.t;
    document.getElementById('video-scrubber').value = Math.round(p.t * 1000);
    syncHtmlVideosToProgress();
    if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
  }
}

function setContactAnchorHere() {
  if (typeof nudgeImpactT2ToCurrentTime === 'function' && window.AIPoseEngine && window.AIPoseEngine.scans.user.status === 'ready') {
    nudgeImpactT2ToCurrentTime('user');
    const sw = window.AIPoseEngine.scans.user.swings[window.AIPoseEngine.scans.user.activeSwingIdx];
    const tip = document.getElementById('coach-tip-box');
    if (tip && sw) {
      tip.innerHTML = `✅ <strong>Точка удара T2 зафиксирована на ${sw.t2Time.toFixed(2)}с!</strong> Окно удара перестроено и синхронизировано с профи.`;
    }
    return;
  }
  AppState.overlay.anchorContactPro = AppState.overlay.progress;
  AppState.overlay.anchorContactUser = AppState.overlay.progress;
  const tip = document.getElementById('coach-tip-box');
  if (tip) {
    tip.innerHTML = `✅ <strong>Якорь контакта зафиксирован на ${(AppState.overlay.progress * 100).toFixed(0)}%!</strong> Оба потока синхронизированы по точке удара.`;
  }
}

function nudgeImpactT2Here() {
  setContactAnchorHere();
}

function toggleExtraCalibration() {
  const bar = document.getElementById('video-calibration-bar');
  if (bar) bar.classList.toggle('hidden');
}

function handleUserVideoUpload(e) {
  if (e.target.files && e.target.files[0]) {
    loadVideoFileIntoSlot(e.target.files[0], 'user');
  }
}

function handleProVideoUpload(e) {
  if (e.target.files && e.target.files[0]) {
    loadVideoFileIntoSlot(e.target.files[0], 'pro');
  }
}

function onPresetChange(val) {
  AppState.overlay.preset = val;
  renderAceCueSidebar();
}

function syncHtmlVideosToProgress() {
  const uv = document.getElementById('user-video-element');
  const pv = document.getElementById('pro-video-element');
  const scans = window.AIPoseEngine ? window.AIPoseEngine.scans : null;

  if (AppState.overlay.userVideoLoaded && uv && uv.duration) {
    const scanU = scans ? scans.user : null;
    if (scanU && scanU.status === 'scanning') return;
    const baseT = (scanU && scanU.status === 'ready' && typeof mapProgressToClipTime === 'function')
      ? mapProgressToClipTime(scanU, AppState.overlay.progress)
      : AppState.overlay.progress * Math.min(uv.duration, 3.0);
    const targetT = Math.max(0, Math.min(uv.duration, baseT + (Viewer3D.videoSyncOffsetSec || 0)));
    if (!uv.seeking && Math.abs(uv.currentTime - targetT) > 0.025) uv.currentTime = targetT;
  }
  if (AppState.overlay.proVideoLoaded && pv && pv.duration) {
    const scanP = scans ? scans.pro : null;
    if (scanP && scanP.status === 'scanning') return;
    const baseT = (scanP && scanP.status === 'ready' && typeof mapProgressToClipTime === 'function')
      ? mapProgressToClipTime(scanP, AppState.overlay.progress)
      : AppState.overlay.progress * Math.min(pv.duration, 3.0);
    const targetT = Math.max(0, Math.min(pv.duration, baseT));
    if (!pv.seeking && Math.abs(pv.currentTime - targetT) > 0.025) pv.currentTime = targetT;
  }
}

// =========================================================================================
// MODULE 2: SHOT DISPERSION & ZONE HEATMAP (INTERACTIVE)
// =========================================================================================

function initHeatmapModule() {
  const canvas = document.getElementById('heatmap-canvas');
  if (!canvas) return;
  canvas.addEventListener('click', onHeatmapClick);
  updateHeatmapStats();
  drawHeatmap();
}

function setShotFilter(flt) {
  AppState.heatmap.filter = flt;
  ['cross_fh', 'dtl_fh', 'cross_bh', 'all'].forEach(f => {
    const btn = document.getElementById('flt-' + f.replace('_', '-'));
    if (!btn) return;
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

function getFilteredShots() {
  if (AppState.heatmap.filter === 'all') return SHOT_DATABASE;
  return SHOT_DATABASE.filter(s => s.type === AppState.heatmap.filter);
}

function updateHeatmapStats() {
  const shots = getFilteredShots();
  const total = shots.length || 1;
  const inCourtShots = shots.filter(s => s.inCourt);
  const inCount = inCourtShots.length || 1;
  const deepCount = inCourtShots.filter(s => s.isDeep).length;
  const winCount = shots.filter(s => s.isWinner).length;
  const shortCount = inCourtShots.filter(s => !s.isDeep).length;

  document.getElementById('stat-in-court').textContent = `${((inCourtShots.length / total) * 100).toFixed(1)}%`;
  document.getElementById('stat-deep-rate').textContent = `${((deepCount / inCount) * 100).toFixed(1)}%`;
  document.getElementById('stat-winners').textContent = `${winCount} удара`;
  document.getElementById('stat-short-balls').textContent = `${((shortCount / inCount) * 100).toFixed(1)}%`;
}

function drawHeatmap() {
  const canvas = document.getElementById('heatmap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  drawITFCourt(ctx, w, h);

  const shots = getFilteredShots();

  if (AppState.heatmap.showHeat) {
    shots.forEach(s => {
      const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 48);
      grad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      grad.addColorStop(0.5, "rgba(245, 158, 11, 0.25)");
      grad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(s.x, s.y, 48, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (AppState.heatmap.showVectors) {
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    shots.forEach(s => {
      const originX = s.type === 'cross_bh' ? w / 2 - 140 : w / 2 + 130;
      ctx.strokeStyle = s.inCourt ? "rgba(56, 189, 248, 0.35)" : "rgba(239, 68, 68, 0.35)";
      ctx.beginPath();
      ctx.moveTo(originX, 55);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  if (AppState.heatmap.showDots) {
    shots.forEach(s => {
      const isSelected = s.id === AppState.heatmap.selectedShotId;
      ctx.fillStyle = s.inCourt ? (s.isDeep ? "#22c55e" : "#eab308") : "#ef4444";
      ctx.beginPath();
      ctx.arc(s.x, s.y, isSelected ? 8.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#ffffff" : "#0f172a";
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      ctx.stroke();

      if (isSelected) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }
}

function drawITFCourt(ctx, w, h) {
  const left = 90, right = 810, top = 40, bottom = 420;
  const courtW = right - left, courtH = bottom - top, alleyW = 50;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(left, top, courtW, courtH);
  ctx.strokeRect(left + alleyW, top, courtW - alleyW * 2, courtH);

  const netY = (top + bottom) / 2;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(left - 15, netY); ctx.lineTo(right + 15, netY); ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 11px monospace";
  ctx.fillText("СЕТКА (0.914м)", w / 2 - 42, netY - 6);

  const sLineTop = netY - 95, sLineBot = netY + 95;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left + alleyW, sLineTop); ctx.lineTo(right - alleyW, sLineTop);
  ctx.moveTo(left + alleyW, sLineBot); ctx.lineTo(right - alleyW, sLineBot);
  ctx.moveTo(w / 2, sLineTop); ctx.lineTo(w / 2, sLineBot);
  ctx.moveTo(w / 2, top); ctx.lineTo(w / 2, top + 10);
  ctx.moveTo(w / 2, bottom); ctx.lineTo(w / 2, bottom - 10);
  ctx.stroke();

  ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
  ctx.fillRect(left + alleyW, bottom - 45, courtW - alleyW * 2, 45);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left + alleyW, bottom - 45, courtW - alleyW * 2, 45);
  ctx.setLineDash([]);
}

function onHeatmapClick(e) {
  const canvas = document.getElementById('heatmap-canvas');
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const shots = getFilteredShots();
  let closest = null, minDist = 28;
  shots.forEach(s => {
    const d = Math.hypot(s.x - clickX, s.y - clickY);
    if (d < minDist) { minDist = d; closest = s; }
  });

  // If user clicked empty court space on bottom half, log a new custom shot!
  if (!closest && clickY > 230) {
    const inCourt = clickX >= 140 && clickX <= 760 && clickY <= 420;
    const depthM = Number(((420 - clickY) / 22.5).toFixed(2));
    const isDeep = inCourt && depthM >= 0 && depthM <= 2.0;
    const newShot = {
      id: SHOT_DATABASE.length + 1,
      type: AppState.heatmap.filter === 'all' ? 'cross_fh' : AppState.heatmap.filter,
      name: 'Добавленный удар на корте',
      x: Math.round(clickX),
      y: Math.round(clickY),
      depth: depthM,
      speed: Math.round(118 + Math.random() * 20),
      rpm: Math.round(2600 + Math.random() * 600),
      inCourt,
      isDeep,
      isWinner: isDeep && Math.random() > 0.65,
      error: !inCourt ? (clickY > 420 ? 'long' : 'wide') : null
    };
    SHOT_DATABASE.push(newShot);
    closest = newShot;
    updateHeatmapStats();
  }

  if (closest) {
    AppState.heatmap.selectedShotId = closest.id;
    drawHeatmap();
    const card = document.getElementById('selected-shot-card');
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="font-bold text-sky-300">Выбранный удар #${closest.id}</span>
        <span class="px-2 py-0.5 rounded ${closest.inCourt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'} font-mono font-bold">
          ${closest.inCourt ? (closest.isWinner ? 'WINNER 🏆' : 'IN COURT') : 'OUT'}
        </span>
      </div>
      <div class="space-y-1 text-xs text-slate-300">
        <div>Тип: <strong class="text-white">${closest.name}</strong></div>
        <div>Скорость при вылете: <strong class="text-amber-400">${closest.speed} км/ч</strong> | Вращение: <strong class="text-sky-300">${closest.rpm} RPM</strong></div>
        <div>Глубина: <strong class="${closest.isDeep ? 'text-emerald-400' : 'text-amber-400'}">${closest.depth >= 0 ? closest.depth + ' м от задней линии' : 'Аут +' + Math.abs(closest.depth) + ' м'}</strong></div>
      </div>
    `;
  }
}

// =========================================================================================
// MODULE 3: FOOTWORK & COURT MOVEMENT TRACER
// =========================================================================================

function initFootworkModule() {
  drawFootworkFrame();
}

function onRallyChange(val) {
  AppState.footwork.rallyId = val;
  AppState.footwork.progress = 0;
  const r = RALLY_DATA[val] || RALLY_DATA.rally_long;
  document.getElementById('stat-pei-score').textContent = `${r.pei}%`;
  document.getElementById('stat-dist-actual').textContent = `${r.totalDistanceM} м`;
  document.getElementById('stat-dist-optimal').textContent = `${r.optimalDistanceM} м`;
  const wasted = (r.totalDistanceM - r.optimalDistanceM).toFixed(1);
  document.getElementById('stat-dist-wasted').textContent = `+${wasted} м`;
  document.getElementById('split-badge').textContent = `+${r.splitStepMs} мс (${r.splitStepMs <= 165 ? 'ИДЕАЛ' : 'ПОЗДНО'})`;
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
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  drawITFCourt(ctx, w, h);

  const rally = RALLY_DATA[AppState.footwork.rallyId] || RALLY_DATA.rally_long;
  const pts = rally.points;
  const t = AppState.footwork.progress;

  AppState.footwork.showOptimal = document.getElementById('chk-optimal-path').checked;
  AppState.footwork.showBisection = document.getElementById('chk-bisection').checked;

  // Actual trajectory
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  pts.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();

  if (AppState.footwork.showOptimal) {
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0 || idx % 2 === 0 || idx === pts.length - 1) {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (AppState.footwork.showBisection && rally.bisectPoint) {
    const [bx, by] = rally.bisectPoint;
    ctx.fillStyle = "rgba(245, 158, 11, 0.28)";
    ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#fde047"; ctx.font = "bold 11px monospace";
    ctx.fillText("Цель рекавери (Биссектриса)", bx - 82, by + 30);
  }

  const totalPts = pts.length;
  const idxFloat = t * (totalPts - 1);
  const baseIdx = Math.floor(idxFloat);
  const nextIdx = Math.min(totalPts - 1, baseIdx + 1);
  const localFrac = idxFloat - baseIdx;

  const curX = pts[baseIdx].x + (pts[nextIdx].x - pts[baseIdx].x) * localFrac;
  const curY = pts[baseIdx].y + (pts[nextIdx].y - pts[baseIdx].y) * localFrac;
  const curSpeed = pts[baseIdx].speed + (pts[nextIdx].speed - pts[baseIdx].speed) * localFrac;

  ctx.fillStyle = "#0284c7";
  ctx.beginPath(); ctx.arc(curX, curY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke();

  document.getElementById('fw-hud-action').textContent = pts[baseIdx].action;
  document.getElementById('fw-hud-speed').textContent = `${curSpeed.toFixed(1)} км/ч`;
  document.getElementById('rally-time-label').textContent = `t = ${(t * rally.durationSec).toFixed(1)} с`;
}

// =========================================================================================
// MODULE 4: BALL FLIGHT TELEMETRY & RADAR
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
  document.getElementById('val-depth').textContent = depth >= 0 ? `+${depth.toFixed(1)} м за задней` : `${depth.toFixed(1)} м (В корте)`;

  const distM = 24.5 + depth;
  document.getElementById('stat-transit-sub').innerHTML = `Дистанция полёта: <span class="text-white font-mono font-bold">${distM.toFixed(1)} метра</span>`;

  let surfaceDrop = 0.24;
  if (surface === 'clay') surfaceDrop = 0.31;
  if (surface === 'grass') surfaceDrop = 0.18;

  const v0Ms = speed / 3.6;
  const vAvgMs = v0Ms * (1.0 - surfaceDrop * 0.45);
  const transitTimeMs = Math.round((distM / vAvgMs) * 1000);

  document.getElementById('stat-transit-time').textContent = `${transitTimeMs} мс`;

  const timeFootwork = Math.round(Math.max(220, 360 + depth * 35));
  const totalRequired = 180 + 120 + timeFootwork + 200;
  const marginMs = transitTimeMs - totalRequired;

  document.getElementById('time-footwork').textContent = `${timeFootwork} мс`;

  const marginEl = document.getElementById('stat-margin-time');
  const alertBox = document.getElementById('transit-alert-box');
  const bar = document.getElementById('margin-progress');

  if (marginMs > 80) {
    marginEl.textContent = `+${marginMs} мс (Комфортно)`;
    marginEl.className = "font-mono text-emerald-400 font-bold";
    bar.className = "h-full bg-emerald-500 rounded-full";
    bar.style.width = "82%";
    alertBox.className = "p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed";
    alertBox.innerHTML = `🟢 <strong>Статус:</strong> При скорости ${speed} км/ч у вас есть +${marginMs} мс резерва. Вы успеваете выполнить полный замах с глубоким разгоном (Full Loop).`;
  } else if (marginMs >= -40) {
    marginEl.textContent = `${marginMs >= 0 ? '+' : ''}${marginMs} мс (Плотный тайминг)`;
    marginEl.className = "font-mono text-amber-400 font-bold";
    bar.className = "h-full bg-amber-500 rounded-full";
    bar.style.width = "48%";
    alertBox.className = "p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 leading-relaxed";
    alertBox.innerHTML = `🟡 <strong>Внимание:</strong> Окно реакции сжато! Сократите замах на 30% (Compact Takeback) и встречайте мяч на подъёме.`;
  } else {
    marginEl.textContent = `${marginMs} мс (Дефицит времени)`;
    marginEl.className = "font-mono text-red-400 font-bold";
    bar.className = "h-full bg-red-500 rounded-full";
    bar.style.width = "18%";
    alertBox.className = "p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200 leading-relaxed";
    alertBox.innerHTML = `🔴 <strong>Критический дефицит (${marginMs} мс):</strong> Полный замах приведёт к срыву точки контакта назад! Требуется короткий блок перед корпусом или отход на 1.5 м за заднюю линию.`;
  }

  drawTelemetryRadar(speed, transitTimeMs, surfaceDrop);
}

function drawTelemetryRadar(speed, transitMs, surfaceDrop) {
  const canvas = document.getElementById('telemetry-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Draw Velocity Decay Graph Background & Trajectory
  const x0 = 70, x1 = w - 70, yGround = h - 55, netX = w / 2;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
  ctx.lineWidth = 1;
  for (let y = 60; y <= yGround; y += 50) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0 - 15, yGround); ctx.lineTo(x1 + 15, yGround); ctx.stroke();

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(netX, yGround); ctx.lineTo(netX, yGround - 55); ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 11px monospace";
  ctx.fillText("СЕТКА (0.914м)", netX - 42, yGround - 62);

  // Ball Arc
  const bounceX = x1 - 125;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, yGround - 45);
  ctx.quadraticCurveTo(netX, yGround - 125, bounceX, yGround);
  ctx.quadraticCurveTo(bounceX + 60, yGround - 58, x1, yGround - 40);
  ctx.stroke();

  // Speed Decay Curve (Amber dashed graph at top)
  const afterBounceSpeed = Math.round(speed * (1 - surfaceDrop));
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, 75);
  ctx.lineTo(bounceX, 115);
  ctx.lineTo(bounceX, 155);
  ctx.lineTo(x1, 170);
  ctx.stroke();
  ctx.setLineDash([]);

  AppState.telemetry.animTime += 0.015;
  const ballT = AppState.telemetry.animTime % 1.0;
  let bx, by;
  if (ballT < 0.74) {
    const st = ballT / 0.74;
    bx = x0 + (bounceX - x0) * st;
    by = (yGround - 45) * Math.pow(1 - st, 2) + (yGround - 125) * 2 * (1 - st) * st + yGround * Math.pow(st, 2);
  } else {
    const st = (ballT - 0.74) / 0.26;
    bx = bounceX + (x1 - bounceX) * st;
    by = yGround * Math.pow(1 - st, 2) + (yGround - 58) * 2 * (1 - st) * st + (yGround - 40) * Math.pow(st, 2);
  }

  ctx.fillStyle = "#bef264";
  ctx.beginPath(); ctx.arc(bx, by, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 12px monospace";
  ctx.fillText(`Вылет: ${speed} км/ч`, x0, 58);
  ctx.fillText(`После отскока: ${afterBounceSpeed} км/ч (-${Math.round(surfaceDrop * 100)}%)`, bounceX - 95, 145);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`Время полёта до ракетки соперника: ${transitMs} мс`, w - 340, 58);
}

// =========================================================================================
// GLOBAL 60 FPS RENDER LOOP
// =========================================================================================

let lastTimestamp = performance.now();

function appRenderLoop(now) {
  const dt = Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
  lastTimestamp = now;

  try {
    if (AppState.currentTab === 'overlay') {
      const scans = window.AIPoseEngine ? window.AIPoseEngine.scans : null;
      const isScanning = scans && ((scans.user && scans.user.status === 'scanning') || (scans.pro && scans.pro.status === 'scanning'));
      if (AppState.overlay.isPlaying && !isScanning) {
        const strokeDuration = 2.4;
        AppState.overlay.progress += (dt * AppState.overlay.speed) / strokeDuration;
        if (AppState.overlay.progress >= 1.0) AppState.overlay.progress = 0.0;
        const scrub = document.getElementById('video-scrubber');
        if (scrub) scrub.value = Math.round(AppState.overlay.progress * 1000);
        syncHtmlVideosToProgress();
      }
      render3DOverlayStage();
    } else if (AppState.currentTab === 'footwork' && AppState.footwork.isPlaying) {
      const r = RALLY_DATA[AppState.footwork.rallyId] || RALLY_DATA.rally_long;
      AppState.footwork.progress += (dt * AppState.footwork.speed) / r.durationSec;
      if (AppState.footwork.progress >= 1.0) AppState.footwork.progress = 0.0;
      document.getElementById('rally-scrubber').value = Math.round(AppState.footwork.progress * 1000);
      drawFootworkFrame();
    } else if (AppState.currentTab === 'telemetry') {
      updateFlightPhysics();
    }
  } catch (err) {
    console.error("Render frame error:", err);
  }

  requestAnimationFrame(appRenderLoop);
}
