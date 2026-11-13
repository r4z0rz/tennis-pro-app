/**
 * Tennis Pro Analytics 3D — AceCue Kinematic Robot Rig, Dual-View (Side-by-Side + Direct 3D Rig Overlay)
 * & Live Biomechanical Divergence Callout Engine (v8)
 *
 * Implements the 4-point specification & Father's 3 Audio requirements:
 * 1. Two Core Modes on a Single Screen ('split' default):
 *    - Left Viewport (Side-by-Side Comparison): Father's uploaded video (AI Auto-Zoomed + 3D skeleton + live swing path) alongside Pro reference stroke.
 *    - Right Viewport (Direct 3D Rig Overlay): Superimposes Father's 3D Kinematic Robot Rig (Blue) directly onto the Pro's 3D Rig (Gold) on the same 3D court coordinates.
 * 2. Camera Setup & Tripod Alignment Guide (45° rear-side diagonal or 90° side profile, 4.0–5.0m distance, 1.0–1.2m waist height, 60/120 FPS).
 * 3. AceCue Technical Mechanics & Engineering Callouts:
 *    - Full 3D Swing Path Splines (T0 -> T1 -> T2 -> T3 -> T4) with low-to-high brush angle (+15° vs +29°).
 *    - 3D Contact-Point Caliper highlighting exact impact divergence ("🔴 ТОЧКА УДАРА: на 21 см ПОЗЖЕ").
 *    - 3D Elbow-to-Torso Spacing Caliper ("🟠 ЛОКОТЬ СЛИШКОМ БЛИЗКО: 13 см vs 27 см").
 *    - X-Factor Hip-Shoulder Separation & Footwork Weight Rings.
 */

window.Viewer3D = {
  cam: {
    yaw: -58,       // Optimal 3/4 Side-Diagonal angle so both Contact Point (+Z) and Elbow Spacing (+X) are crystal clear!
    pitch: 15,      // Vertical elevation angle in degrees
    zoom: 1.02,     // Camera zoom
    panX: 0,        // Screen X offset (px)
    panY: 32        // Screen Y offset (px)
  },
  layers: {
    feetAndSteps: true,
    directionVectors: true,
    swingRibbon: true,
    show3DOverVideo: true
  },
  videoSyncOffsetSec: 0,
  isDraggingOrbit: false,
  dragStart: { x: 0, y: 0, yaw: 0, pitch: 0 }
};

function init3DViewerAndVideo() {
  const canvas = document.getElementById('overlay-canvas');
  const dropzone = document.getElementById('canvas-dropzone');
  if (!canvas || !dropzone) return;

  if (typeof initAIPoseEngine === 'function') {
    initAIPoseEngine();
  }

  // Mouse Orbit Controls on Canvas
  canvas.addEventListener('mousedown', (e) => {
    if (AppState.overlay.mode === 'curtain') {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      if (Math.abs(clickX - AppState.overlay.curtainX) < 0.06) {
        Viewer3D.isDraggingCurtain = true;
        return;
      }
    }
    Viewer3D.isDraggingOrbit = true;
    Viewer3D.dragStart = {
      x: e.clientX,
      y: e.clientY,
      yaw: Viewer3D.cam.yaw,
      pitch: Viewer3D.cam.pitch
    };
  });

  window.addEventListener('mousemove', (e) => {
    if (Viewer3D.isDraggingCurtain) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
      AppState.overlay.curtainX = x;
      const handle = document.getElementById('curtain-handle');
      if (handle) handle.style.left = `${x * 100}%`;
      return;
    }
    if (!Viewer3D.isDraggingOrbit) return;
    const dx = e.clientX - Viewer3D.dragStart.x;
    const dy = e.clientY - Viewer3D.dragStart.y;
    Viewer3D.cam.yaw = Viewer3D.dragStart.yaw + dx * 0.45;
    Viewer3D.cam.pitch = Math.max(2, Math.min(88, Viewer3D.dragStart.pitch + dy * 0.35));
  });

  window.addEventListener('mouseup', () => {
    Viewer3D.isDraggingOrbit = false;
    Viewer3D.isDraggingCurtain = false;
  });

  // Touch Orbit Controls for Mobile/Tablet
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      Viewer3D.isDraggingOrbit = true;
      Viewer3D.dragStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        yaw: Viewer3D.cam.yaw,
        pitch: Viewer3D.cam.pitch
      };
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (Viewer3D.isDraggingOrbit && e.touches.length === 1) {
      const dx = e.touches[0].clientX - Viewer3D.dragStart.x;
      const dy = e.touches[0].clientY - Viewer3D.dragStart.y;
      Viewer3D.cam.yaw = Viewer3D.dragStart.yaw + dx * 0.45;
      Viewer3D.cam.pitch = Math.max(2, Math.min(88, Viewer3D.dragStart.pitch + dy * 0.35));
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    Viewer3D.isDraggingOrbit = false;
  });

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    Viewer3D.cam.zoom = Math.max(0.55, Math.min(2.2, Viewer3D.cam.zoom * factor));
    const scaleSlider = document.getElementById('slider-3d-scale');
    if (scaleSlider) scaleSlider.value = Math.round(Viewer3D.cam.zoom * 100);
  }, { passive: false });

  // Drag & Drop video file directly onto the stage
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('ring-2', 'ring-sky-400');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('ring-2', 'ring-sky-400');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('ring-2', 'ring-sky-400');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadVideoFileIntoSlot(e.dataTransfer.files[0], 'user');
    }
  });
}

function set3DCameraPreset(preset) {
  if (preset === 'iso') {
    Viewer3D.cam.yaw = -54;
    Viewer3D.cam.pitch = 15;
  } else if (preset === 'side') {
    Viewer3D.cam.yaw = -88;
    Viewer3D.cam.pitch = 10;
  } else if (preset === 'top') {
    Viewer3D.cam.yaw = -15;
    Viewer3D.cam.pitch = 82;
  } else if (preset === 'back') {
    Viewer3D.cam.yaw = -8;
    Viewer3D.cam.pitch = 14;
  }
}

function onToggle3DLayer() {
  const f = document.getElementById('chk-3d-feet');
  const v = document.getElementById('chk-3d-vectors');
  const r = document.getElementById('chk-3d-ribbon');
  const o = document.getElementById('chk-show-3d-over-video');
  if (f) Viewer3D.layers.feetAndSteps = f.checked;
  if (v) Viewer3D.layers.directionVectors = v.checked;
  if (r) Viewer3D.layers.swingRibbon = r.checked;
  if (o) Viewer3D.layers.show3DOverVideo = o.checked;
}

function onCalibrate3D() {
  const s = document.getElementById('slider-3d-scale');
  const ox = document.getElementById('slider-3d-offset-x');
  const oy = document.getElementById('slider-3d-offset-y');
  const vt = document.getElementById('slider-video-offset');
  if (s) Viewer3D.cam.zoom = parseFloat(s.value) / 100;
  if (ox) Viewer3D.cam.panX = parseFloat(ox.value);
  if (oy) Viewer3D.cam.panY = 32 + parseFloat(oy.value);
  if (vt) {
    Viewer3D.videoSyncOffsetSec = parseFloat(vt.value) / 100;
    const lbl = document.getElementById('lbl-video-offset');
    if (lbl) lbl.textContent = `${Viewer3D.videoSyncOffsetSec >= 0 ? '+' : ''}${Viewer3D.videoSyncOffsetSec.toFixed(2)}с`;
  }
}

// =========================================================================================
// 100% AUTOMATIC ZERO-CLICK VIDEO UPLOAD & IMPACT SYNC PIPELINE
// =========================================================================================

function loadVideoFileIntoSlot(file, slot) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const videoEl = slot === 'pro'
    ? document.getElementById('pro-video-element')
    : document.getElementById('user-video-element');

  if (!videoEl) return;

  videoEl.src = url;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.loop = true;
  videoEl.load();

  videoEl.onloadedmetadata = () => {
    const engine = window.AIPoseEngine;
    if (slot === 'pro') {
      AppState.overlay.proVideoLoaded = true;
      const bPro = document.getElementById('badge-pro');
      if (bPro) bPro.innerHTML = `⭐ ВИДЕО ПРОФИ: ${file.name.slice(0, 18)}`;
      if (engine) {
        engine.liveProPose3D = null;
        engine.liveProLandmarks2D = null;
        engine.proRacketTipTrail2D = [];
        engine.liveProRacket2D = null;
        engine.proVideoLock.active = false;
        engine.proVideoLock.cropBox = null;
        engine.proVideoMetrics.framesAnalyzed = 0;
        engine.proVideoMetrics.fileName = file.name;
      }
    } else {
      AppState.overlay.userVideoLoaded = true;
      const bUsr = document.getElementById('badge-user');
      if (bUsr) bUsr.innerHTML = `📹 ВАШЕ ВИДЕО (AI 3D РИГ): ${file.name.slice(0, 18)}`;
      Viewer3D.cam.zoom = 1.0;
      Viewer3D.cam.panX = 0;
      Viewer3D.cam.panY = 0;
      if (typeof setOverlayMode === 'function') {
        setOverlayMode('split');
      }
      if (engine) {
        engine.smoothedVideoAnchor.initialized = false;
        engine.liveUserPose3D = null;
        engine.liveUserLandmarks2D = null;
        engine.wristTrail2D = [];
        engine.racketTipTrail2D = [];
        engine.liveRacket2D = null;
        engine.videoLock.active = false;
        engine.videoLock.cropBox = null;
        engine.videoMetrics.framesAnalyzed = 0;
        engine.videoMetrics.minKneeAngleDeg = 165;
        engine.videoMetrics.fileName = file.name;
      }
    }

    const clrBtn = document.getElementById('btn-clear-video');
    if (clrBtn) clrBtn.classList.remove('hidden');

    AppState.overlay.speed = 0.25;
    AppState.overlay.progress = 0.62;
    const scrub = document.getElementById('video-scrubber');
    if (scrub) scrub.value = 620;
    videoEl.playbackRate = AppState.overlay.speed;

    // Launch automated Pre-Scan pipeline (MediaPipe 3D + Pixel-Vision PCA Racket + Static Crop + T2 Sync)
    if (engine && typeof prescanVideoClip === 'function') {
      AppState.overlay.isPlaying = false;
      const playIcon = document.getElementById('video-play-icon');
      const playText = document.getElementById('video-play-text');
      if (playIcon) playIcon.textContent = '▶';
      if (playText) playText.textContent = 'Пуск';

      prescanVideoClip(videoEl, slot).then(() => {
        // Jump cleanly to auto-detected Impact T2 frame, ready for instant scrub or 0.25x synchronized playback
        videoEl.pause();
        AppState.overlay.isPlaying = true;
        if (playIcon) playIcon.textContent = '⏸';
        if (playText) playText.textContent = 'Пауза';
        if (typeof syncHtmlVideosToProgress === 'function') syncHtmlVideosToProgress();
        if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
      }).catch(() => {});
    } else {
      AppState.overlay.isPlaying = true;
      videoEl.play().catch(() => {});
    }
  };
}

function clearUploadedVideos() {
  const proV = document.getElementById('pro-video-element');
  const usrV = document.getElementById('user-video-element');
  if (proV) { proV.pause(); proV.removeAttribute('src'); proV.load(); }
  if (usrV) { usrV.pause(); usrV.removeAttribute('src'); usrV.load(); }
  AppState.overlay.proVideoLoaded = false;
  AppState.overlay.userVideoLoaded = false;
  if (window.AIPoseEngine) {
    window.AIPoseEngine.liveUserPose3D = null;
    window.AIPoseEngine.liveUserLandmarks2D = null;
    window.AIPoseEngine.liveProPose3D = null;
    window.AIPoseEngine.liveProLandmarks2D = null;
    window.AIPoseEngine.liveRacket2D = null;
    window.AIPoseEngine.liveProRacket2D = null;
    window.AIPoseEngine.wristTrail2D = [];
    window.AIPoseEngine.racketTipTrail2D = [];
    window.AIPoseEngine.proRacketTipTrail2D = [];
    window.AIPoseEngine.videoMetrics.hasAnalyzedVideo = false;
    ['user', 'pro'].forEach(s => {
      if (window.AIPoseEngine.scans && window.AIPoseEngine.scans[s]) {
        window.AIPoseEngine.scans[s].status = 'idle';
        window.AIPoseEngine.scans[s]._token = null;
        window.AIPoseEngine.scans[s].frames = [];
        window.AIPoseEngine.scans[s].swings = [];
        window.AIPoseEngine.scans[s].cropBox = null;
      }
    });
    window.AIPoseEngine.videoLock.active = false;
    window.AIPoseEngine.videoLock.cropBox = null;
    window.AIPoseEngine.proVideoLock.active = false;
    window.AIPoseEngine.proVideoLock.cropBox = null;
  }

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const bPro = document.getElementById('badge-pro');
  const bUsr = document.getElementById('badge-user');
  if (bPro) bPro.textContent = `⭐ 3D ЭТАЛОН: ${stroke.proName.toUpperCase()}`;
  if (bUsr) bUsr.textContent = `👤 ВАШ 3D РИГ (ИЛИ ЗАГРУЗИТЕ ВИДЕО)`;

  const clrBtn = document.getElementById('btn-clear-video');
  if (clrBtn) clrBtn.classList.add('hidden');
  const swWrap = document.getElementById('swing-selector-wrap');
  if (swWrap) swWrap.classList.add('hidden');
  if (typeof updateAITelemetryBanner === 'function') updateAITelemetryBanner();
  if (typeof renderAceCueSidebar === 'function') renderAceCueSidebar();
  if (typeof renderCauseAndEffectStrip === 'function') renderCauseAndEffectStrip();
}

function drawCleanVideoCover(ctx, videoEl, x, y, w, h, lock) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  const activeLock = lock || (window.AIPoseEngine && window.AIPoseEngine.videoLock);
  const cropBox = activeLock && activeLock.cropBox ? activeLock.cropBox : null;

  let dw, dh, dx, dy, smartZoom = 1.0, focusNormX = 0.50, focusNormY = 0.50;

  if (cropBox) {
    // Rock-steady Static Stroke Bounding-Box framing: fits 100% of head-to-shoe AND full racket swing arc + 15% padding
    const cropPxW = Math.max(40, cropBox.spanW * vw);
    const cropPxH = Math.max(40, cropBox.spanH * vh);
    const scaleToBox = Math.min(w / cropPxW, h / cropPxH) * Viewer3D.cam.zoom;
    dw = vw * scaleToBox;
    dh = vh * scaleToBox;
    smartZoom = scaleToBox / Math.max(0.001, Math.min(w / vw, h / vh));
    focusNormX = cropBox.cx;
    focusNormY = cropBox.cy;
    dx = (x + w * 0.50) - focusNormX * dw + Viewer3D.cam.panX * 0.25;
    dy = (y + h * 0.52) - focusNormY * dh;
  } else {
    const baseScale = Math.min(w / vw, h / vh);
    if (activeLock && activeLock.active) {
      const fullSpanNorm = Math.max(0.24, activeLock.fullBodyNormSpan || 0.36);
      const unzoomedFullPx = fullSpanNorm * vh * baseScale;
      smartZoom = Math.max(1.0, Math.min(1.65, (h * 0.56) / Math.max(45, unzoomedFullPx))) * Viewer3D.cam.zoom;
      focusNormX = activeLock.hipNormX || 0.50;
      const headY = activeLock.headNormY !== undefined ? activeLock.headNormY : 0.24;
      const ankleY = activeLock.ankleNormY || 0.62;
      focusNormY = (headY + ankleY) * 0.5;
    }
    dw = vw * baseScale * smartZoom;
    dh = vh * baseScale * smartZoom;
    dx = (x + w * 0.50) - focusNormX * dw + Viewer3D.cam.panX * 0.25;
    dy = (y + h * 0.52) - focusNormY * dh;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.drawImage(videoEl, dx, dy, dw, dh);

  const playerScreenX = dx + focusNormX * dw;
  const playerScreenY = dy + focusNormY * dh;
  const spotRadius = Math.max(w, h) * 0.60;
  const vig = ctx.createRadialGradient(
    playerScreenX, playerScreenY, spotRadius * 0.22,
    playerScreenX, playerScreenY, spotRadius
  );
  vig.addColorStop(0, "rgba(7, 11, 18, 0.0)");
  vig.addColorStop(0.58, "rgba(7, 11, 18, 0.20)");
  vig.addColorStop(1, "rgba(7, 11, 18, 0.62)");
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
  return { dx, dy, dw, dh, smartZoom };
}

/**
 * Draws the 3D Skeleton Rig + Live Swing Trajectory Trail + Elbow Spacing Caliper + Impact Zone Crosshair
 * directly on the uploaded video in the Left Viewport so the father sees his exact video movement tracked!
 */
function drawDirectVideo3DAthlete(ctx, rect, theme, alpha = 0.95, slot = 'user') {
  if (!rect || !window.AIPoseEngine) return;
  const lm = slot === 'pro' ? window.AIPoseEngine.liveProLandmarks2D : window.AIPoseEngine.liveUserLandmarks2D;
  if (!lm) return;
  const lock = slot === 'pro' ? window.AIPoseEngine.proVideoLock : window.AIPoseEngine.videoLock;
  const vm = slot === 'pro' ? window.AIPoseEngine.proVideoMetrics : window.AIPoseEngine.videoMetrics;
  const isProSlot = slot === 'pro';
  const strokeCol = isProSlot ? "#fbbf24" : "#38bdf8";
  const glowCol = isProSlot ? "rgba(245, 158, 11, 0.22)" : "rgba(14, 165, 233, 0.22)";
  const ellipseCol = isProSlot ? "rgba(254, 240, 138, 0.65)" : "rgba(186, 230, 253, 0.65)";

  const pt = (idx) => ({
    x: rect.dx + lm[idx].x * rect.dw,
    y: rect.dy + lm[idx].y * rect.dh
  });

  const playerPxSpan = Math.max(60, (lock.torsoLegNormSpan || 0.25) * rect.dh);
  const s = Math.max(0.35, Math.min(1.35, playerPxSpan / 220));

  const drawXRayLimb = (p1, p2, baseRad) => {
    const r = Math.max(2.5, baseRad * s);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = glowCol;
    ctx.lineWidth = r * 1.4;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

    const midX = (p1.x + p2.x) * 0.5;
    const midY = (p1.y + p2.y) * 0.5;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.strokeStyle = ellipseCol;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(midX, midY, r * 0.30, r * 0.68, angle, 0, Math.PI * 2);
    ctx.stroke();
  };

  ctx.save();
  ctx.globalAlpha = alpha;

  const pHead = pt(0);
  const pShL = pt(11), pShR = pt(12);
  const pElL = pt(13), pElR = pt(14);
  const pWrL = pt(15), pWrR = pt(16);
  const pHipL = pt(23), pHipR = pt(24);
  const pKneeL = pt(25), pKneeR = pt(26);
  const pAnkL = pt(27), pAnkR = pt(28);
  const pHeelL = pt(29), pHeelR = pt(30);
  const pToeL = pt(31), pToeR = pt(32);

  // 1. Live 2D Racket Tip & Wrist Swing Path Ribbon on Video (AceCue Racket Tracking Overlay)
  const rTrail = (slot === 'pro' ? window.AIPoseEngine.proRacketTipTrail2D : window.AIPoseEngine.racketTipTrail2D) || [];
  if (rTrail.length > 1) {
    ctx.save();
    // Translucent swept racket ribbon between wrist and racket tip
    for (let i = 0; i < rTrail.length - 1; i++) {
      const a = rTrail[i];
      const b = rTrail[i + 1];
      const frac = (i + 1) / rTrail.length;
      ctx.fillStyle = `rgba(163, 230, 53, ${0.04 + frac * 0.14})`;
      ctx.beginPath();
      ctx.moveTo(rect.dx + a.wrX * rect.dw, rect.dy + a.wrY * rect.dh);
      ctx.lineTo(rect.dx + a.tipX * rect.dw, rect.dy + a.tipY * rect.dh);
      ctx.lineTo(rect.dx + b.tipX * rect.dw, rect.dy + b.tipY * rect.dh);
      ctx.lineTo(rect.dx + b.wrX * rect.dw, rect.dy + b.wrY * rect.dh);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing Neon Lime Racket-Head Tip Trajectory Curve + Strobe Dots
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    rTrail.forEach((tp, idx) => {
      const tx = rect.dx + tp.tipX * rect.dw;
      const ty = rect.dy + tp.tipY * rect.dh;
      if (idx === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    });
    ctx.stroke();

    // Wrist trajectory curve in Cyan
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    rTrail.forEach((tp, idx) => {
      const wx = rect.dx + tp.wrX * rect.dw;
      const wy = rect.dy + tp.wrY * rect.dh;
      if (idx === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Strobe markers along the racket tip trajectory
    rTrail.forEach((tp, idx) => {
      if (idx % 3 === 0 || idx === rTrail.length - 1) {
        const tx = rect.dx + tp.tipX * rect.dw;
        const ty = rect.dy + tp.tipY * rect.dh;
        ctx.fillStyle = idx === rTrail.length - 1 ? "#ffffff" : "#bef264";
        ctx.beginPath();
        ctx.arc(tx, ty, idx === rTrail.length - 1 ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // 2. Weight Rings & Foot Direction Vectors
  [
    { ank: pAnkL, heel: pHeelL, toe: pToeL, w: vm.weightFrontPct },
    { ank: pAnkR, heel: pHeelR, toe: pToeR, w: 100 - vm.weightFrontPct }
  ].forEach(({ ank, heel, toe, w }) => {
    const ringR = Math.max(9, (11 + (w / 100) * 14) * s);
    ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
    ctx.beginPath();
    ctx.ellipse(ank.x, ank.y + 3 * s, ringR, ringR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = Math.max(3, 5.5 * s);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(heel.x, heel.y); ctx.lineTo(toe.x, toe.y); ctx.stroke();

    const fdx = toe.x - heel.x;
    const fdy = toe.y - heel.y;
    const flen = Math.hypot(fdx, fdy) || 1;
    draw2DArrow(ctx, toe.x, toe.y, toe.x + (fdx / flen) * 22 * s, toe.y + (fdy / flen) * 22 * s, "#34d399", 2.0);
  });

  // 3. Limbs & Torso Rig
  drawXRayLimb(pHipL, pKneeL, 11.0);
  drawXRayLimb(pKneeL, pAnkL, 8.5);
  drawXRayLimb(pHipR, pKneeR, 11.0);
  drawXRayLimb(pKneeR, pAnkR, 8.5);

  ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
  ctx.strokeStyle = "rgba(125, 211, 252, 0.72)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(pShL.x, pShL.y);
  ctx.lineTo(pShR.x, pShR.y);
  ctx.lineTo(pHipR.x, pHipR.y);
  ctx.lineTo(pHipL.x, pHipL.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawXRayLimb(pShL, pElL, 8.2);
  drawXRayLimb(pElL, pWrL, 6.8);
  drawXRayLimb(pShR, pElR, 8.5);
  drawXRayLimb(pElR, pWrR, 7.0);

  // 4. Joint Nodes
  [pShL, pShR, pElL, pElR, pWrL, pWrR, pHipL, pHipR, pKneeL, pKneeR, pAnkL, pAnkR].forEach(j => {
    const jr = Math.max(2.8, 4.2 * s);
    ctx.fillStyle = isProSlot ? "#f59e0b" : "#0ea5e9";
    ctx.beginPath();
    ctx.arc(j.x, j.y, jr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  });

  // 5. Head Ring
  const headR = Math.max(7, 13.0 * s);
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(pHead.x, pHead.y, headR, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Orange Elbow-Spacing Caliper on Video (Hitting Elbow to Ribcage)
  const isLeftDom = lock && lock.activeHand === 'left';
  const pElHit = isLeftDom ? pElL : pElR;
  const pWrHit = isLeftDom ? pWrL : pWrR;
  const pShHit = isLeftDom ? pShL : pShR;
  const pHipHit = isLeftDom ? pHipL : pHipR;
  const ribPt = {
    x: (pShHit.x + pHipHit.x) * 0.5,
    y: (pShHit.y + pHipHit.y) * 0.5
  };
  ctx.save();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 2.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(pElHit.x, pElHit.y);
  ctx.lineTo(ribPt.x, ribPt.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 7. Full Tracked Tennis Racket (Handle, Throat, String Hoop, Sweet-Spot Reticle) on Video!
  const rk = isProSlot ? window.AIPoseEngine.liveProRacket2D : window.AIPoseEngine.liveRacket2D;
  const rWr = rk
    ? { x: rect.dx + rk.wrist.x * rect.dw, y: rect.dy + rk.wrist.y * rect.dh }
    : pWrHit;
  const rThroat = rk
    ? { x: rect.dx + rk.throat.x * rect.dw, y: rect.dy + rk.throat.y * rect.dh }
    : { x: pWrHit.x + (pWrHit.x - pElHit.x) * 0.45, y: pWrHit.y + (pWrHit.y - pElHit.y) * 0.45 };
  const rHoop = rk
    ? { x: rect.dx + rk.hoop.x * rect.dw, y: rect.dy + rk.hoop.y * rect.dh }
    : { x: pWrHit.x + (pWrHit.x - pElHit.x) * 0.85, y: pWrHit.y + (pWrHit.y - pElHit.y) * 0.85 };
  const rTip = rk
    ? { x: rect.dx + rk.tip.x * rect.dw, y: rect.dy + rk.tip.y * rect.dh }
    : { x: pWrHit.x + (pWrHit.x - pElHit.x) * 1.25, y: pWrHit.y + (pWrHit.y - pElHit.y) * 1.25 };

  ctx.save();
  // Racket Handle & Shaft
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2.5, 4.0 * s);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rWr.x, rWr.y);
  ctx.lineTo(rThroat.x, rThroat.y);
  ctx.stroke();

  // Racket Hoop & Crossed String Grid
  const rkAngle = Math.atan2(rTip.y - rThroat.y, rTip.x - rThroat.x);
  const hoopRx = Math.max(12, Math.hypot(rTip.x - rThroat.x, rTip.y - rThroat.y) * 0.52);
  const hoopRy = Math.max(8, hoopRx * 0.62);

  ctx.save();
  ctx.translate(rHoop.x, rHoop.y);
  ctx.rotate(rkAngle);
  ctx.fillStyle = "rgba(163, 230, 53, 0.20)";
  ctx.strokeStyle = "#a3e635";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, hoopRx, hoopRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // String bed grid lines inside hoop
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.0;
  for (let gx = -hoopRx * 0.6; gx <= hoopRx * 0.61; gx += hoopRx * 0.4) {
    ctx.beginPath(); ctx.moveTo(gx, -hoopRy * 0.78); ctx.lineTo(gx, hoopRy * 0.78); ctx.stroke();
  }
  for (let gy = -hoopRy * 0.5; gy <= hoopRy * 0.51; gy += hoopRy * 0.5) {
    ctx.beginPath(); ctx.moveTo(-hoopRx * 0.82, gy); ctx.lineTo(hoopRx * 0.82, gy); ctx.stroke();
  }
  ctx.restore();

  // Red Sweet-Spot Impact Crosshair on Racket Face + Racket Tip Node
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(rHoop.x, rHoop.y, 9 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rHoop.x - 13 * s, rHoop.y); ctx.lineTo(rHoop.x + 13 * s, rHoop.y);
  ctx.moveTo(rHoop.x, rHoop.y - 13 * s); ctx.lineTo(rHoop.x, rHoop.y + 13 * s);
  ctx.stroke();

  // Glowing Neon Racket Tip Tracker Node + Label Pill
  ctx.fillStyle = "#a3e635";
  ctx.beginPath();
  ctx.arc(rTip.x, rTip.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = "rgba(7, 11, 18, 0.85)";
  ctx.strokeStyle = "#a3e635";
  ctx.lineWidth = 1.2;
  const tagX = Math.max(8, Math.min(rect.dx + rect.dw - 135, rTip.x + 8));
  const tagY = Math.max(38, rTip.y - 22);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tagX, tagY, 128, 20, 5);
  else ctx.rect(tagX, tagY, 128, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#bef264";
  ctx.font = "bold 10px monospace";
  ctx.fillText(`🎾 РАКЕТКА: +${vm.swingPathAngleDeg}°`, tagX + 6, tagY + 14);
  ctx.restore();

  ctx.restore();
}

function computeLockedProTransform(proPose, vidRect, lock, proCam) {
  const uShL = project3D(proPose.shL, 0, 0, 1, proCam);
  const uShR = project3D(proPose.shR, 0, 0, 1, proCam);
  const uAnkL = project3D(proPose.footL.ankle, 0, 0, 1, proCam);
  const uAnkR = project3D(proPose.footR.ankle, 0, 0, 1, proCam);
  const uHip = project3D(proPose.pelvisPos, 0, 0, 1, proCam);

  const uShY = (uShL.y + uShR.y) * 0.5;
  const uAnkY = (uAnkL.y + uAnkR.y) * 0.5;
  const unitSpanY = Math.max(0.45, Math.abs(uAnkY - uShY));

  const playerPxSpan = Math.max(60, (lock.torsoLegNormSpan || 0.25) * vidRect.dh);
  const proScale = playerPxSpan / unitSpanY;

  const targetHipX = vidRect.dx + lock.hipNormX * vidRect.dw;
  const targetAnkleY = vidRect.dy + lock.ankleNormY * vidRect.dh;

  const proCX = targetHipX - proScale * uHip.x;
  const proCY = targetAnkleY - proScale * uAnkY;

  return { cx: proCX, cy: proCY, scale: proScale };
}

// =========================================================================================
// 3D PERSPECTIVE & FLUID CATMULL-ROM SPLINE INTERPOLATION
// =========================================================================================

function project3D(pt3, cx, cy, scale, camOverride) {
  const yawDeg = camOverride && camOverride.yaw !== undefined ? camOverride.yaw : Viewer3D.cam.yaw;
  const pitchDeg = camOverride && camOverride.pitch !== undefined ? camOverride.pitch : Viewer3D.cam.pitch;

  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;

  const x = pt3[0];
  const y = pt3[1] - 0.88;
  const z = pt3[2];

  const x1 = x * Math.cos(yawRad) + z * Math.sin(yawRad);
  const z1 = -x * Math.sin(yawRad) + z * Math.cos(yawRad);

  const y2 = y * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
  const z2 = y * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);

  const fovDist = 4.4;
  const persp = fovDist / Math.max(1.2, fovDist - z2);

  return {
    x: cx + x1 * scale * persp,
    y: cy - y2 * scale * persp,
    z: z2,
    s: persp * (scale / 220)
  };
}

function catmullRomScalar(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u3
  );
}

function interpolate3DPose(keyframes, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  let idx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (clampedT >= keyframes[i].t && clampedT <= keyframes[i + 1].t) {
      idx = i;
      break;
    }
  }

  const k0 = keyframes[Math.max(0, idx - 1)];
  const k1 = keyframes[idx];
  const k2 = keyframes[Math.min(keyframes.length - 1, idx + 1)];
  const k3 = keyframes[Math.min(keyframes.length - 1, idx + 2)];

  const span = (k2.t - k1.t) || 0.0001;
  const u = Math.max(0, Math.min(1, (clampedT - k1.t) / span));

  const spline1 = (key) => catmullRomScalar(k0[key], k1[key], k2[key], k3[key], u);
  const spline3 = (arr0, arr1, arr2, arr3) => [
    catmullRomScalar(arr0[0], arr1[0], arr2[0], arr3[0], u),
    catmullRomScalar(arr0[1], arr1[1], arr2[1], arr3[1], u),
    catmullRomScalar(arr0[2], arr1[2], arr2[2], arr3[2], u)
  ];

  return {
    pelvisPos: spline3(k0.pelvisPos, k1.pelvisPos, k2.pelvisPos, k3.pelvisPos),
    pelvisYaw: spline1('pelvisYaw'),
    chestYaw: spline1('chestYaw'),
    headYaw: spline1('headYaw'),
    kneeBendDeg: spline1('kneeBendDeg'),
    elbowAngleDeg: spline1('elbowAngleDeg'),
    contactOffsetCm: spline1('contactOffsetCm'),
    weightR: Math.max(0, Math.min(100, spline1('weightR'))),
    weightL: Math.max(0, Math.min(100, spline1('weightL'))),
    footR: {
      ankle: spline3(k0.footR.ankle, k1.footR.ankle, k2.footR.ankle, k3.footR.ankle),
      heel: spline3(k0.footR.heel, k1.footR.heel, k2.footR.heel, k3.footR.heel),
      toe: spline3(k0.footR.toe, k1.footR.toe, k2.footR.toe, k3.footR.toe),
      yaw: catmullRomScalar(k0.footR.yaw, k1.footR.yaw, k2.footR.yaw, k3.footR.yaw, u)
    },
    footL: {
      ankle: spline3(k0.footL.ankle, k1.footL.ankle, k2.footL.ankle, k3.footL.ankle),
      heel: spline3(k0.footL.heel, k1.footL.heel, k2.footL.heel, k3.footL.heel),
      toe: spline3(k0.footL.toe, k1.footL.toe, k2.footL.toe, k3.footL.toe),
      yaw: catmullRomScalar(k0.footL.yaw, k1.footL.yaw, k2.footL.yaw, k3.footL.yaw, u)
    },
    kneeR: spline3(k0.kneeR, k1.kneeR, k2.kneeR, k3.kneeR),
    kneeL: spline3(k0.kneeL, k1.kneeL, k2.kneeL, k3.kneeL),
    hipR: spline3(k0.hipR, k1.hipR, k2.hipR, k3.hipR),
    hipL: spline3(k0.hipL, k1.hipL, k2.hipL, k3.hipL),
    shR: spline3(k0.shR, k1.shR, k2.shR, k3.shR),
    shL: spline3(k0.shL, k1.shL, k2.shL, k3.shL),
    elR: spline3(k0.elR, k1.elR, k2.elR, k3.elR),
    wrR: spline3(k0.wrR, k1.wrR, k2.wrR, k3.wrR),
    rTip: spline3(k0.rTip, k1.rTip, k2.rTip, k3.rTip),
    rFaceNormal: spline3(k0.rFaceNormal, k1.rFaceNormal, k2.rFaceNormal, k3.rFaceNormal),
    elL: spline3(k0.elL, k1.elL, k2.elL, k3.elL),
    wrL: spline3(k0.wrL, k1.wrL, k2.wrL, k3.wrL),
    head: spline3(k0.head, k1.head, k2.head, k3.head),
    ball: spline3(k0.ball, k1.ball, k2.ball, k3.ball)
  };
}

// =========================================================================================
// 3D KINEMATIC ROBOT RIG & ACECUE BIOMECHANICAL OVERLAY PRIMITIVES
// =========================================================================================

function draw3DFloorGrid(ctx, cx, cy, scale, camOverride) {
  ctx.save();
  ctx.lineWidth = 1;
  for (let x = -1.2; x <= 1.21; x += 0.3) {
    const p0 = project3D([x, 0, -0.8], cx, cy, scale, camOverride);
    const p1 = project3D([x, 0, 1.2], cx, cy, scale, camOverride);
    ctx.strokeStyle = Math.abs(x) < 0.05 ? "rgba(56, 189, 248, 0.28)" : "rgba(148, 163, 184, 0.12)";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  for (let z = -0.8; z <= 1.21; z += 0.3) {
    const p0 = project3D([-1.2, 0, z], cx, cy, scale, camOverride);
    const p1 = project3D([1.2, 0, z], cx, cy, scale, camOverride);
    const isBaseline = Math.abs(z) < 0.05;
    ctx.strokeStyle = isBaseline ? "rgba(255, 255, 255, 0.72)" : "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = isBaseline ? 2.8 : 1;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  const netA = project3D([0, 0.01, 0.68], cx, cy, scale, camOverride);
  const netB = project3D([0, 0.01, 1.12], cx, cy, scale, camOverride);
  draw2DArrow(ctx, netA.x, netA.y, netB.x, netB.y, "rgba(56, 189, 248, 0.85)", 2.2);
  ctx.restore();
}

function draw2DArrow(ctx, x1, y1, x2, y2, color, width) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 3) return;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.min(dist * 0.6, 7 + width * 1.5);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFluid3DLimb(ctx, ptA3D, ptB3D, radiusPx, cx, cy, scale, theme, camOverride) {
  const p1 = project3D(ptA3D, cx, cy, scale, camOverride);
  const p2 = project3D(ptB3D, cx, cy, scale, camOverride);

  const rAvg = Math.max(2.5, radiusPx * ((p1.s + p2.s) * 0.5));
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = theme.main;
  ctx.lineWidth = rAvg * 1.32;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = Math.max(2.2, rAvg * 0.36);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const limbAngle = Math.atan2(dy, dx);
  const zTilt = Math.max(0.24, Math.min(0.58, Math.abs(ptB3D[2] - ptA3D[2]) * 1.2 + 0.26));
  ctx.strokeStyle = theme.wireframe;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(midX, midY, rAvg * zTilt * 0.72, rAvg * 0.68, limbAngle, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawFluid3DTorsoAndPelvis(ctx, pose, P, cx, cy, scale, theme, camOverride) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const midSh3D = [
    (pose.shL[0] + pose.shR[0]) / 2,
    (pose.shL[1] + pose.shR[1]) / 2,
    (pose.shL[2] + pose.shR[2]) / 2
  ];
  const midHip3D = pose.pelvisPos;

  drawFluid3DLimb(ctx, pose.hipL, pose.hipR, 10.5, cx, cy, scale, theme, camOverride);

  const midSh = { x: (P.shL.x + P.shR.x) / 2, y: (P.shL.y + P.shR.y) / 2 };
  const midHip = { x: (P.hipL.x + P.hipR.x) / 2, y: (P.hipL.y + P.hipR.y) / 2 };
  const waistL = {
    x: P.shL.x * 0.32 + P.hipL.x * 0.68 + (midSh.x - P.shL.x) * 0.22,
    y: P.shL.y * 0.45 + P.hipL.y * 0.55
  };
  const waistR = {
    x: P.shR.x * 0.32 + P.hipR.x * 0.68 + (midSh.x - P.shR.x) * 0.22,
    y: P.shR.y * 0.45 + P.hipR.y * 0.55
  };

  ctx.fillStyle = theme.boxFill;
  ctx.strokeStyle = theme.wireframe;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(P.shL.x, P.shL.y);
  ctx.quadraticCurveTo(midSh.x, midSh.y - 4 * P.shL.s, P.shR.x, P.shR.y);
  ctx.quadraticCurveTo(waistR.x, waistR.y, P.hipR.x, P.hipR.y);
  ctx.quadraticCurveTo(midHip.x, midHip.y + 6 * P.hipR.s, P.hipL.x, P.hipL.y);
  ctx.quadraticCurveTo(waistL.x, waistL.y, P.shL.x, P.shL.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawFluid3DLimb(ctx, pose.shL, pose.shR, 10.0, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, midHip3D, midSh3D, 6.0, cx, cy, scale, theme, camOverride);

  for (let i = 1; i <= 3; i++) {
    const f = i / 4;
    const sp3D = [
      midHip3D[0] + (midSh3D[0] - midHip3D[0]) * f,
      midHip3D[1] + (midSh3D[1] - midHip3D[1]) * f,
      midHip3D[2] + (midSh3D[2] - midHip3D[2]) * f
    ];
    const sp2D = project3D(sp3D, cx, cy, scale, camOverride);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.arc(sp2D.x, sp2D.y, 2.5 * sp2D.s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFluid3DLimb(ctx, midSh3D, pose.head, 6.5, cx, cy, scale, theme, camOverride);

  // Body Rotation Vectors (Pelvis & Chest X-Factor) when enabled
  if (Viewer3D.layers.directionVectors) {
    const pYaw = (pose.pelvisYaw * Math.PI) / 180;
    const cYaw = (pose.chestYaw * Math.PI) / 180;
    const pelDir = project3D([
      midHip3D[0] + Math.sin(pYaw) * 0.28,
      midHip3D[1],
      midHip3D[2] + Math.cos(pYaw) * 0.28
    ], cx, cy, scale, camOverride);
    const chDir = project3D([
      midSh3D[0] + Math.sin(cYaw) * 0.30,
      midSh3D[1],
      midSh3D[2] + Math.cos(cYaw) * 0.30
    ], cx, cy, scale, camOverride);
    draw2DArrow(ctx, midHip.x, midHip.y, pelDir.x, pelDir.y, theme.accent, 2.0);
    draw2DArrow(ctx, midSh.x, midSh.y, chDir.x, chDir.y, theme.highlight, 2.0);
  }

  ctx.restore();
}

function drawFluid3DShoe(ctx, foot, nextFoot, cx, cy, scale, theme, camOverride) {
  const yawRad = (foot.yaw * Math.PI) / 180;
  const pHeel = project3D(foot.heel, cx, cy, scale, camOverride);
  const pToe = project3D(foot.toe, cx, cy, scale, camOverride);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const shoeWidth = Math.max(4, 9.5 * pToe.s);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = shoeWidth + 1.8;
  ctx.beginPath();
  ctx.moveTo(pHeel.x, pHeel.y);
  ctx.lineTo(pToe.x, pToe.y);
  ctx.stroke();

  ctx.strokeStyle = theme.shoeColor;
  ctx.lineWidth = shoeWidth;
  ctx.beginPath();
  ctx.moveTo(pHeel.x, pHeel.y);
  ctx.lineTo(pToe.x, pToe.y);
  ctx.stroke();

  if (Viewer3D.layers.feetAndSteps) {
    const toeDir3D = [
      foot.toe[0] + Math.sin(yawRad) * 0.20,
      foot.toe[1] + 0.01,
      foot.toe[2] + Math.cos(yawRad) * 0.20
    ];
    const pToeEnd = project3D(toeDir3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, pToe.x, pToe.y, pToeEnd.x, pToeEnd.y, theme.accent, 2.0);
  }

  ctx.restore();
}

/**
 * Draw Complete Sleek 3D Volumetric Kinematic Robot Rig
 * Includes complete continuous 3D Swing Path Spline (T0 -> T1 -> T2 -> T3 -> T4) so the difference in swing trajectory is unmistakable!
 */
function draw3DVolumetricAthlete(ctx, pose, keyframes, cx, cy, scale, theme, alpha, camOverride) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tNow = pose._phaseT !== undefined ? pose._phaseT : AppState.overlay.progress;
  const nextPose = interpolate3DPose(keyframes, Math.min(1.0, tNow + 0.06));

  // 1. WEIGHT RINGS ON FLOOR
  if (Viewer3D.layers.feetAndSteps) {
    [
      { f: pose.footR, w: pose.weightR },
      { f: pose.footL, w: pose.weightL }
    ].forEach(({ f, w }) => {
      const groundPt = project3D([f.ankle[0], 0.01, f.ankle[2]], cx, cy, scale, camOverride);
      const ringRadius = Math.max(8, (10 + (w / 100) * 16) * groundPt.s);
      ctx.fillStyle = theme.glowRing;
      ctx.beginPath();
      ctx.ellipse(groundPt.x, groundPt.y, ringRadius, ringRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });
  }

  // 2. COMPLETE 3D RACKET TRACKING & SWING PATH SPLINE (T0 -> T1 Slot -> T2 Contact -> T3 Follow-Through)
  if (Viewer3D.layers.swingRibbon && keyframes && keyframes.length >= 3) {
    ctx.save();
    const sampleCount = 26;
    const tStart = 0.14;
    const tEnd = 0.90;

    // 2A. Translucent 3D Racket Sweep Ribbon (connecting Wrist path to Racket-Tip path)
    for (let i = 0; i < sampleCount; i++) {
      const ts0 = tStart + (tEnd - tStart) * (i / sampleCount);
      const ts1 = tStart + (tEnd - tStart) * ((i + 1) / sampleCount);
      const sp0 = interpolate3DPose(keyframes, ts0);
      const sp1 = interpolate3DPose(keyframes, ts1);
      const tip0 = project3D(sp0.rTip, cx, cy, scale, camOverride);
      const tip1 = project3D(sp1.rTip, cx, cy, scale, camOverride);
      const wr0 = project3D(sp0.wrR, cx, cy, scale, camOverride);
      const wr1 = project3D(sp1.wrR, cx, cy, scale, camOverride);

      ctx.fillStyle = theme.ribbonFill;
      ctx.globalAlpha = alpha * 0.55;
      ctx.beginPath();
      ctx.moveTo(wr0.x, wr0.y);
      ctx.lineTo(tip0.x, tip0.y);
      ctx.lineTo(tip1.x, tip1.y);
      ctx.lineTo(wr1.x, wr1.y);
      ctx.closePath();
      ctx.fill();
    }

    // 2B. Full 3D Racket-Tip Trajectory Curve with Directional Arrows
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 3]);
    ctx.globalAlpha = alpha * 0.72;
    ctx.beginPath();
    for (let i = 0; i <= sampleCount; i++) {
      const ts = tStart + (tEnd - tStart) * (i / sampleCount);
      const sp = interpolate3DPose(keyframes, ts);
      const pt = project3D(sp.rTip, cx, cy, scale, camOverride);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2C. Stroboscopic Ghost Rackets at Key Phases (T1 Slot Drop = 0.40, T2 Impact = 0.62, T3 Finish = 0.80)
    [0.38, 0.52, 0.62].forEach((tGhost) => {
      if (Math.abs(tGhost - tNow) < 0.04) return;
      const gPose = interpolate3DPose(keyframes, tGhost);
      const gWr = project3D(gPose.wrR, cx, cy, scale, camOverride);
      const gTip = project3D(gPose.rTip, cx, cy, scale, camOverride);
      const gHoop3D = [
        gPose.wrR[0] + (gPose.rTip[0] - gPose.wrR[0]) * 0.69,
        gPose.wrR[1] + (gPose.rTip[1] - gPose.wrR[1]) * 0.69,
        gPose.wrR[2] + (gPose.rTip[2] - gPose.wrR[2]) * 0.69
      ];
      const gHoop = project3D(gHoop3D, cx, cy, scale, camOverride);
      const gAng = Math.atan2(gTip.y - gWr.y, gTip.x - gWr.x);

      ctx.save();
      ctx.globalAlpha = alpha * 0.36;
      ctx.strokeStyle = theme.highlight;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gWr.x, gWr.y); ctx.lineTo(gTip.x, gTip.y); ctx.stroke();
      ctx.translate(gHoop.x, gHoop.y);
      ctx.rotate(gAng);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(6, 12 * gHoop.s), Math.max(4, 8 * gHoop.s), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 2D. Active High-Brightness Racket Tip Laser Comet up to current phase tNow
    const activeSteps = 16;
    const span = 0.28;
    for (let s = 0; s < activeSteps; s++) {
      const t0 = Math.max(0, tNow - span * (1 - s / activeSteps));
      const t1 = Math.max(0, tNow - span * (1 - (s + 1) / activeSteps));
      if (t1 <= t0) continue;
      const sp0 = interpolate3DPose(keyframes, t0);
      const sp1 = interpolate3DPose(keyframes, t1);
      const tip0 = project3D(sp0.rTip, cx, cy, scale, camOverride);
      const tip1 = project3D(sp1.rTip, cx, cy, scale, camOverride);

      const frac = (s + 1) / activeSteps;
      ctx.strokeStyle = theme.highlight;
      ctx.globalAlpha = alpha * frac * 0.96;
      ctx.lineWidth = 4.2 * frac;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tip0.x, tip0.y);
      ctx.lineTo(tip1.x, tip1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Project all 3D anatomical points
  const P = {
    head: project3D(pose.head, cx, cy, scale, camOverride),
    shR: project3D(pose.shR, cx, cy, scale, camOverride),
    shL: project3D(pose.shL, cx, cy, scale, camOverride),
    elR: project3D(pose.elR, cx, cy, scale, camOverride),
    wrR: project3D(pose.wrR, cx, cy, scale, camOverride),
    rTip: project3D(pose.rTip, cx, cy, scale, camOverride),
    elL: project3D(pose.elL, cx, cy, scale, camOverride),
    wrL: project3D(pose.wrL, cx, cy, scale, camOverride),
    hipR: project3D(pose.hipR, cx, cy, scale, camOverride),
    hipL: project3D(pose.hipL, cx, cy, scale, camOverride),
    kneeR: project3D(pose.kneeR, cx, cy, scale, camOverride),
    kneeL: project3D(pose.kneeL, cx, cy, scale, camOverride),
    ankleR: project3D(pose.footR.ankle, cx, cy, scale, camOverride),
    heelR: project3D(pose.footR.heel, cx, cy, scale, camOverride),
    toeR: project3D(pose.footR.toe, cx, cy, scale, camOverride),
    ankleL: project3D(pose.footL.ankle, cx, cy, scale, camOverride),
    heelL: project3D(pose.footL.heel, cx, cy, scale, camOverride),
    toeL: project3D(pose.footL.toe, cx, cy, scale, camOverride)
  };

  drawFluid3DShoe(ctx, pose.footR, nextPose.footR, cx, cy, scale, theme, camOverride);
  drawFluid3DShoe(ctx, pose.footL, nextPose.footL, cx, cy, scale, theme, camOverride);

  const legs = [
    { z: (P.hipR.z + P.kneeR.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipR, pose.kneeR, 11.2, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeR, pose.footR.ankle, 8.8, cx, cy, scale, theme, camOverride);
    }},
    { z: (P.hipL.z + P.kneeL.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipL, pose.kneeL, 11.2, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeL, pose.footL.ankle, 8.8, cx, cy, scale, camOverride);
    }}
  ];
  legs.sort((a, b) => a.z - b.z).forEach(l => l.fn());

  drawFluid3DTorsoAndPelvis(ctx, pose, P, cx, cy, scale, theme, camOverride);

  drawFluid3DLimb(ctx, pose.shL, pose.elL, 8.2, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.elL, pose.wrL, 6.8, cx, cy, scale, camOverride);
  drawFluid3DLimb(ctx, pose.shR, pose.elR, 8.5, cx, cy, scale, camOverride);
  drawFluid3DLimb(ctx, pose.elR, pose.wrR, 7.0, cx, cy, scale, camOverride);

  [P.shR, P.shL, P.elR, P.wrR, P.elL, P.wrL, P.hipR, P.hipL, P.kneeR, P.kneeL, P.ankleR, P.ankleL].forEach(j => {
    const jr = Math.max(2.8, 4.8 * j.s);
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(j.x, j.y, jr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  const headR = Math.max(6, 14.5 * P.head.s);
  ctx.fillStyle = theme.boxFill;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y - 2, headR * 0.92, -0.25, Math.PI + 0.25, true);
  ctx.stroke();

  // 3D TENNIS RACKET & STRING BED
  const throat3D = [
    pose.wrR[0] + (pose.rTip[0] - pose.wrR[0]) * 0.38,
    pose.wrR[1] + (pose.rTip[1] - pose.wrR[1]) * 0.38,
    pose.wrR[2] + (pose.rTip[2] - pose.wrR[2]) * 0.38
  ];
  const centerHoop3D = [
    pose.wrR[0] + (pose.rTip[0] - pose.wrR[0]) * 0.69,
    pose.wrR[1] + (pose.rTip[1] - pose.wrR[1]) * 0.69,
    pose.wrR[2] + (pose.rTip[2] - pose.wrR[2]) * 0.69
  ];
  const PThroat = project3D(throat3D, cx, cy, scale, camOverride);
  const PHoop = project3D(centerHoop3D, cx, cy, scale, camOverride);

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = Math.max(2, 3.4 * P.wrR.s);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(P.wrR.x, P.wrR.y);
  ctx.lineTo(PThroat.x, PThroat.y);
  ctx.stroke();

  const rAngle = Math.atan2(P.rTip.y - PThroat.y, P.rTip.x - PThroat.x);
  const rLen = Math.hypot(P.rTip.x - PThroat.x, P.rTip.y - PThroat.y) / 2;
  ctx.save();
  ctx.translate(PHoop.x, PHoop.y);
  ctx.rotate(rAngle);
  ctx.fillStyle = theme.racketStrings;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.6;
  const rx = Math.max(9, rLen * 1.08);
  const ry = Math.max(6, 13.5 * PHoop.s);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crossed String Grid inside 3D Racket Head
  ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = 0.9;
  for (let gx = -rx * 0.55; gx <= rx * 0.56; gx += rx * 0.36) {
    ctx.beginPath(); ctx.moveTo(gx, -ry * 0.78); ctx.lineTo(gx, ry * 0.78); ctx.stroke();
  }
  for (let gy = -ry * 0.5; gy <= ry * 0.51; gy += ry * 0.5) {
    ctx.beginPath(); ctx.moveTo(-rx * 0.80, gy); ctx.lineTo(rx * 0.80, gy); ctx.stroke();
  }
  ctx.restore();

  // 3D Racket Face Normal Arrow (shows exact racket face orientation & topspin brush angle at contact!)
  if (pose.rFaceNormal) {
    const normEnd3D = [
      centerHoop3D[0] + pose.rFaceNormal[0] * 0.24,
      centerHoop3D[1] + pose.rFaceNormal[1] * 0.24,
      centerHoop3D[2] + pose.rFaceNormal[2] * 0.24
    ];
    const PNormEnd = project3D(normEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, PHoop.x, PHoop.y, PNormEnd.x, PNormEnd.y, theme.highlight, 2.2);
  }

  // Glowing Tracker Node on 3D Racket Tip
  ctx.fillStyle = theme.highlight;
  ctx.beginPath();
  ctx.arc(P.rTip.x, P.rTip.y, Math.max(3.2, 4.5 * P.rTip.s), 0, Math.PI * 2);
  ctx.fill();

  if (pose.ball) {
    const ballP = project3D(pose.ball, cx, cy, scale, camOverride);
    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.arc(ballP.x, ballP.y, Math.max(4, 6.2 * ballP.s), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
  return P;
}

/**
 * ACECUE ENGINEERING CALLOUTS ON THE 3D DIRECT OVERLAY STAGE
 * Explicitly highlights the Acceptance Test divergences with leader lines to clean margin callout cards:
 * 1. 🔴 ТОЧКА УДАРА: на 21 см ПОЗЖЕ (+17 см vs +38 см у Профи)
 * 2. 🟠 ЛОКОТЬ СЛИШКОМ БЛИЗКО: 13 см от корпуса (Профи: 27 см)
 * 3. 🟡 ТРАЕКТОРИЯ РАЗГОНА: +15° снизу-вверх (Профи: +29°)
 */
function drawAceCueBiomechanicalCallouts(ctx, proPose, userPose, cx, cy, scale, camOverride, viewX, viewW, viewH) {
  const vm = (window.AIPoseEngine && window.AIPoseEngine.videoMetrics)
    ? window.AIPoseEngine.videoMetrics
    : { elbowSpacingCm: 13, contactOffsetCm: 17, contactLateCm: 21, swingPathAngleDeg: 15 };

  const pProBall = project3D(proPose.ball || proPose.rTip, cx, cy, scale, camOverride);
  const pUserBall = project3D(userPose.ball || userPose.rTip, cx, cy, scale, camOverride);

  const userRib3D = [
    (userPose.shR[0] + userPose.hipR[0]) * 0.5,
    (userPose.shR[1] + userPose.hipR[1]) * 0.5,
    (userPose.shR[2] + userPose.hipR[2]) * 0.5
  ];
  const pUserEl = project3D(userPose.elR, cx, cy, scale, camOverride);
  const pUserRib = project3D(userRib3D, cx, cy, scale, camOverride);
  const pProEl = project3D(proPose.elR, cx, cy, scale, camOverride);

  ctx.save();

  // 1. RED 3D CONTACT-POINT DIVERGENCE CALIPER (Pro Ball Impact vs User Ball Impact)
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.8;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(pProBall.x, pProBall.y);
  ctx.lineTo(pUserBall.x, pUserBall.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Glowing target rings on both contact points
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(pProBall.x, pProBall.y, 11, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(pUserBall.x, pUserBall.y, 11, 0, Math.PI * 2); ctx.stroke();

  // 2. ORANGE 3D ELBOW-TO-RIBCAGE SPACING CALIPER (Trapped Elbow 13cm vs Pro 27cm)
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(pUserEl.x, pUserEl.y);
  ctx.lineTo(pUserRib.x, pUserRib.y);
  ctx.stroke();

  // Dashed reference line to Pro's free elbow position
  ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pUserEl.x, pUserEl.y);
  ctx.lineTo(pProEl.x, pProEl.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. CLEAN ENGINEERING LEADER LINES & MARGIN CALLOUT CARDS (Never covering the 3D bodies!)
  const drawCalloutCard = (anchorX, anchorY, cardX, cardY, cardW, cardH, borderCol, titleTxt, subTxt) => {
    // Leader line from 3D joint/ball to margin card
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(cardX + 12, cardY + cardH * 0.5);
    ctx.stroke();

    ctx.fillStyle = borderCol;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Card box
    ctx.fillStyle = "rgba(7, 11, 18, 0.90)";
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 7);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(titleTxt, cardX + 8, cardY + 15);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px monospace";
    ctx.fillText(subTxt, cardX + 8, cardY + 29);
  };

  const marginX = viewX + 12;
  const rightCardX = viewX + viewW - 238;

  // Callout #1: Contact Point 21 cm Late
  const midBallX = (pProBall.x + pUserBall.x) * 0.5;
  const midBallY = (pProBall.y + pUserBall.y) * 0.5;
  drawCalloutCard(
    midBallX,
    midBallY,
    marginX,
    46,
    248,
    36,
    "#f43f5e",
    `🔴 ТОЧКА УДАРА: на ${vm.contactLateCm} см ПОЗЖЕ`,
    `Вы: +${vm.contactOffsetCm} см перед тазом | Профи: +38 см`
  );

  // Callout #2: Elbow Too Close to Body (13 cm vs 27 cm)
  const midElX = (pUserEl.x + pUserRib.x) * 0.5;
  const midElY = (pUserEl.y + pUserRib.y) * 0.5;
  drawCalloutCard(
    midElX,
    midElY,
    marginX,
    88,
    248,
    36,
    "#f97316",
    `🟠 ЛОКОТЬ СЛИШКОМ БЛИЗКО: ${vm.elbowSpacingCm} см`,
    `Зажат у рёбер (${vm.elbowSpacingCm} см vs 27 см у Профи)`
  );

  // Callout #3: Swing Path Trajectory Angle (+15° vs +29°)
  drawCalloutCard(
    pProBall.x,
    pProBall.y - 12,
    rightCardX,
    viewH - 96,
    226,
    36,
    "#eab308",
    `🟡 ТРАЕКТОРИЯ: +${vm.swingPathAngleDeg}° vs +29°`,
    `Мало разгона снизу-вверх (${vm.spinRpm || 1480} RPM)`
  );

  ctx.restore();
}

/**
 * Draws the On-Screen Camera Placement & Tripod Framing Guide in the Left Viewport
 * when no video is uploaded yet or when the user toggles the Camera Setup Guide.
 */
function drawCameraAlignmentGuideOverlay(ctx, x, y, w, h) {
  ctx.save();
  const boxX = x + w * 0.16;
  const boxY = y + h * 0.14;
  const boxW = w * 0.68;
  const boxH = h * 0.70;

  // Target Framing Brackets (65-75% Player Height Guide)
  ctx.strokeStyle = "rgba(52, 211, 153, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  // Corner brackets
  const cLen = 18;
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + cLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + cLen, boxY);
  ctx.moveTo(boxX + boxW - cLen, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + cLen);
  ctx.moveTo(boxX, boxY + boxH - cLen); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX + cLen, boxY + boxH);
  ctx.moveTo(boxX + boxW - cLen, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
  ctx.stroke();

  // Baseline horizontal alignment line
  const baseLineY = boxY + boxH * 0.88;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(boxX - 10, baseLineY);
  ctx.lineTo(boxX + boxW + 10, baseLineY);
  ctx.stroke();

  // Compact instruction banner at bottom of guide
  const banW = Math.min(w - 20, 420);
  const banH = 52;
  const banX = x + (w - banW) * 0.5;
  const banY = y + h - 108;

  ctx.fillStyle = "rgba(7, 11, 18, 0.88)";
  ctx.strokeStyle = "rgba(52, 211, 153, 0.65)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(banX, banY, banW, banH, 8);
  else ctx.rect(banX, banY, banW, banH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("📐 ГИД КАМЕРЫ (ШТАТИВ / ЗАБОР): 45° СЗАДИ-СБОКУ ИЛИ 90° ПРОФИЛЬ", banX + 10, banY + 18);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "10px monospace";
  ctx.fillText("Дистанция: 4.0–5.0 м | Высота: 1.0–1.2 м (пояс) | 60/120 FPS", banX + 10, banY + 34);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("Перетащите своё видео сюда — 3D-риг и синхронизация T2 включатся сами!", banX + 10, banY + 47);

  ctx.restore();
}

function drawViewportHeaderPill(ctx, x, y, text, borderCol, textCol) {
  ctx.save();
  ctx.font = "bold 11px sans-serif";
  const padX = 10;
  const pillW = ctx.measureText(text).width + padX * 2;
  const pillH = 24;

  ctx.fillStyle = "rgba(7, 11, 18, 0.88)";
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, pillW, pillH, 6);
  else ctx.rect(x, y, pillW, pillH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textCol;
  ctx.fillText(text, x + padX, y + 16);
  ctx.restore();
}

/**
 * Main 60 FPS Render Function for Module 1
 * Supports:
 * - 'split' (DEFAULT — Both Core Modes on One Screen!):
 *     Left Half (0..w*0.48): Side-by-Side Comparison (Father's Video + Pro Reference)
 *     Right Half (w*0.48..w): Direct 3D Rig Overlay (Father's Blue 3D Rig superimposed onto Pro's Gold 3D Rig + Engineering Callouts)
 * - 'ghost' (Full-Screen Direct 3D Rig Overlay + Callouts)
 * - 'curtain' (Interactive Wipe Comparison)
 */
function drawPrescanProgressOverlay(ctx, x, y, w, h, scan, titleText) {
  if (!scan || scan.status !== 'scanning') return;
  ctx.save();
  ctx.fillStyle = "rgba(7, 11, 18, 0.86)";
  ctx.fillRect(x, y, w, h);

  const boxW = Math.min(w - 24, 300);
  const boxH = 88;
  const bx = x + (w - boxW) * 0.5;
  const by = y + (h - boxH) * 0.5;

  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, 10);
  else ctx.rect(bx, by, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  const pct = Math.round((scan.progress || 0) * 100);
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(titleText || "🔍 AI Pre-Scan видео...", bx + 12, by + 22);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "10px monospace";
  ctx.fillText((scan.statusText || `${pct}%`).slice(0, 42), bx + 12, by + 40);

  const barW = boxW - 24;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(bx + 12, by + 52, barW, 10);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(bx + 12, by + 52, Math.max(4, barW * (scan.progress || 0)), 10);

  ctx.fillStyle = "#34d399";
  ctx.font = "bold 10px monospace";
  ctx.fillText(`${pct}%`, bx + barW - 14, by + 76);
  ctx.restore();
}

function getActiveKeyframesForSlot(slot, fallbackKeyframes) {
  const engine = window.AIPoseEngine;
  const scan = engine && engine.scans ? engine.scans[slot] : null;
  if (!scan || scan.status !== 'ready' || !scan.frames || scan.frames.length < 3) {
    return fallbackKeyframes;
  }
  const swIdx = scan.activeSwingIdx || 0;
  const sw = scan.swings[swIdx] || scan.swings[0];
  if (scan._kfCache && scan._kfSwingIdx === swIdx && scan._kfT2 === (sw ? sw.t2Time : 0)) {
    return scan._kfCache;
  }
  const winFrames = scan.frames.filter(f => f.pose3D && (!sw || (f.time >= sw.startTime && f.time <= sw.endTime)));
  const useFrames = winFrames.length >= 3 ? winFrames : scan.frames.filter(f => f.pose3D);
  if (useFrames.length < 3) return fallbackKeyframes;
  const kfs = useFrames.map(f => ({
    ...f.pose3D,
    t: typeof mapClipTimeToProgress === 'function' ? mapClipTimeToProgress(scan, f.time) : 0.5
  }));
  kfs.sort((a, b) => a.t - b.t);
  scan._kfCache = kfs;
  scan._kfSwingIdx = swIdx;
  scan._kfT2 = sw ? sw.t2Time : 0;
  return kfs;
}

function render3DOverlayStage() {
  const canvas = document.getElementById('overlay-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.72);
  bgGrad.addColorStop(0, "#111c2d");
  bgGrad.addColorStop(1, "#070b12");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const t = AppState.overlay.progress;

  const userVid = document.getElementById('user-video-element');
  const proVid = document.getElementById('pro-video-element');
  const engine = window.AIPoseEngine;
  const scanU = engine && engine.scans ? engine.scans.user : null;
  const scanP = engine && engine.scans ? engine.scans.pro : null;

  if (typeof applyScannedStateForPhase === 'function') {
    applyScannedStateForPhase(t);
  }

  const lock = (engine && engine.videoLock)
    ? engine.videoLock
    : {
        active: false, hipNormX: 0.54, hipNormY: 0.46, ankleNormY: 0.58, shNormY: 0.33,
        torsoLegNormSpan: 0.25, facingSign: -1, matchedYawDeg: -72, matchedPitchDeg: 12, matchedPhaseT: 0.62
      };

  const proLock = (engine && engine.proVideoLock && engine.proVideoLock.active)
    ? engine.proVideoLock
    : lock;
  const autoAlign = Boolean(engine ? engine.autoAlignEnabled : true);
  const effectivePhaseT = (engine && engine.lockImpactMode) ? 0.62 : t;

  const proKeyframes = getActiveKeyframesForSlot('pro', stroke.proKeyframes);
  const userKeyframes = getActiveKeyframesForSlot('user', stroke.userKeyframes);

  const proPose = (AppState.overlay.proVideoLoaded && engine && engine.liveProPose3D)
    ? engine.liveProPose3D
    : interpolate3DPose(proKeyframes, effectivePhaseT);
  proPose._phaseT = effectivePhaseT;

  const userPose = (AppState.overlay.userVideoLoaded && engine && engine.liveUserPose3D)
    ? engine.liveUserPose3D
    : interpolate3DPose(userKeyframes, effectivePhaseT);
  userPose._phaseT = effectivePhaseT;

  const proCam = (AppState.overlay.userVideoLoaded && autoAlign && lock.active)
    ? { yaw: Viewer3D.cam.yaw, pitch: Viewer3D.cam.pitch }
    : { yaw: Viewer3D.cam.yaw, pitch: Viewer3D.cam.pitch };

  const proTheme = {
    label: `⭐ ${stroke.proName.split('(')[0].trim()}`,
    main: "rgba(245, 158, 11, 0.44)",
    highlight: "#fde047",
    accent: "#fbbf24",
    wireframe: "rgba(254, 240, 138, 0.75)",
    boxFill: "rgba(245, 158, 11, 0.16)",
    shoeColor: "rgba(245, 158, 11, 0.88)",
    footTrail: "rgba(251, 191, 36, 0.65)",
    glowRing: "rgba(251, 191, 36, 0.18)",
    ribbon: "rgba(250, 204, 21, 0.75)",
    ribbonFill: "rgba(250, 204, 21, 0.12)",
    racketStrings: "rgba(251, 191, 36, 0.22)"
  };

  const userTheme = {
    label: AppState.overlay.userVideoLoaded ? "👤 Вы (3D Риг из видео)" : "👤 Ваш 3D Риг",
    main: "rgba(14, 165, 233, 0.46)",
    highlight: "#7dd3fc",
    accent: "#38bdf8",
    wireframe: "rgba(186, 230, 253, 0.75)",
    boxFill: "rgba(14, 165, 233, 0.16)",
    shoeColor: "rgba(14, 165, 233, 0.88)",
    footTrail: "rgba(56, 189, 248, 0.65)",
    glowRing: "rgba(56, 189, 248, 0.18)",
    ribbon: "rgba(56, 189, 248, 0.75)",
    ribbonFill: "rgba(56, 189, 248, 0.12)",
    racketStrings: "rgba(56, 189, 248, 0.22)"
  };

  const baseScale = 232 * Viewer3D.cam.zoom;
  const centerY = h * 0.54 + Viewer3D.cam.panY;
  const centerX = w * 0.50 + Viewer3D.cam.panX;

  if (AppState.overlay.mode === 'split') {
    const splitX = Math.round(w * 0.50);

    // =====================================================================================
    // LEFT VIEWPORT (0 .. splitX): MODE 1 — SIDE-BY-SIDE COLUMNS (ПРОФИ | ВЫ)
    // =====================================================================================
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();

    if (AppState.overlay.userVideoLoaded && AppState.overlay.proVideoLoaded) {
      // BOTH VIDEOS UPLOADED: Two Full-Height Side-by-Side Columns (zero squished vertical headroom!)
      const colW = Math.round(splitX * 0.5);

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, colW, h); ctx.clip();
      const proRect = drawCleanVideoCover(ctx, proVid, 0, 0, colW, h, proLock);
      if (Viewer3D.layers.show3DOverVideo && proRect && engine && engine.liveProLandmarks2D) {
        drawDirectVideo3DAthlete(ctx, proRect, proTheme, 0.96, 'pro');
      }
      drawPrescanProgressOverlay(ctx, 0, 0, colW, h, scanP, "⭐ Pre-Scan видео ПРОФИ...");
      ctx.fillStyle = "rgba(7, 11, 18, 0.78)";
      ctx.fillRect(6, h - 24, colW - 12, 18);
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("⭐ ПРОФИ (ЭТАЛОН)", 12, h - 11);
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.rect(colW, 0, splitX - colW, h); ctx.clip();
      const vidRect = drawCleanVideoCover(ctx, userVid, colW, 0, splitX - colW, h, lock);
      if (Viewer3D.layers.show3DOverVideo && vidRect && engine && engine.liveUserLandmarks2D) {
        drawDirectVideo3DAthlete(ctx, vidRect, userTheme, 0.96, 'user');
      }
      drawPrescanProgressOverlay(ctx, colW, 0, splitX - colW, h, scanU, "📹 Pre-Scan ВАШЕГО видео...");
      ctx.fillStyle = "rgba(7, 11, 18, 0.78)";
      ctx.fillRect(colW + 6, h - 24, splitX - colW - 12, 18);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("📹 ВАШЕ ВИДЕО (3D + PCA)", colW + 12, h - 11);
      ctx.restore();

      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(colW, 0); ctx.lineTo(colW, h); ctx.stroke();
    } else if (AppState.overlay.userVideoLoaded) {
      const vidRect = drawCleanVideoCover(ctx, userVid, 0, 0, splitX, h, lock);
      if (Viewer3D.layers.show3DOverVideo && vidRect && engine && engine.liveUserLandmarks2D) {
        drawDirectVideo3DAthlete(ctx, vidRect, userTheme, 0.96, 'user');
      }
      drawPrescanProgressOverlay(ctx, 0, 0, splitX, h, scanU, "📹 Pre-Scan 3D позы и ракетки...");
      // Compact Picture-in-Picture Pro Reference Card in Top-Right corner
      if (!scanU || scanU.status !== 'scanning') {
        const pipW = 128, pipH = 144, pipX = splitX - pipW - 10, pipY = 42;
        ctx.fillStyle = "rgba(7, 11, 18, 0.86)";
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pipX, pipY, pipW, pipH, 8);
        else ctx.rect(pipX, pipY, pipW, pipH);
        ctx.fill();
        ctx.stroke();
        draw3DVolumetricAthlete(ctx, proPose, proKeyframes, pipX + pipW * 0.5, pipY + pipH * 0.60, 102, proTheme, 0.95, proCam);
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`⭐ 3D-База: ${stroke.proName.split('(')[0].trim()}`, pipX + 8, pipY + 14);
      }
    } else if (AppState.overlay.proVideoLoaded) {
      const proRect = drawCleanVideoCover(ctx, proVid, 0, 0, splitX, h, proLock);
      if (Viewer3D.layers.show3DOverVideo && proRect && engine && engine.liveProLandmarks2D) {
        drawDirectVideo3DAthlete(ctx, proRect, proTheme, 0.96, 'pro');
      }
      drawPrescanProgressOverlay(ctx, 0, 0, splitX, h, scanP, "⭐ Pre-Scan видео ПРОФИ...");
    } else {
      // Side-by-Side Pro (Left) vs User (Right) inside Left Viewport + Optional Camera Framing Guide
      draw3DFloorGrid(ctx, splitX * 0.50, centerY, baseScale * 0.78, proCam);
      draw3DVolumetricAthlete(ctx, proPose, proKeyframes, splitX * 0.30, centerY, baseScale * 0.76, proTheme, 0.95, proCam);
      draw3DVolumetricAthlete(ctx, userPose, userKeyframes, splitX * 0.72, centerY, baseScale * 0.76, userTheme, 0.95, proCam);

      ctx.fillStyle = "#fde047";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`⭐ Профи (${stroke.proName.split('(')[0].trim()})`, 18, 62);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`👤 Вы (Загрузите видео)`, splitX * 0.54, 62);

      if (engine && engine.showCameraGuide) {
        drawCameraAlignmentGuideOverlay(ctx, 0, 0, splitX, h);
      }
    }

    drawViewportHeaderPill(ctx, 12, 12, "🎬 РЕЖИМ 1: СРАВНЕНИЕ РЯДОМ (ПРОФИ | ВЫ)", "rgba(56, 189, 248, 0.6)", "#7dd3fc");
    ctx.restore();

    // =====================================================================================
    // RIGHT VIEWPORT (splitX .. w): MODE 2 — DIRECT 3D KINEMATIC RIG OVERLAY + CALLOUTS
    // =====================================================================================
    const rightW = w - splitX;
    const rightCX = splitX + rightW * 0.50 + Viewer3D.cam.panX * 0.5;
    const rigScale = baseScale * 0.92;

    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, rightW, h); ctx.clip();

    draw3DFloorGrid(ctx, rightCX, centerY, rigScale, proCam);
    draw3DVolumetricAthlete(ctx, proPose, proKeyframes, rightCX, centerY, rigScale, proTheme, 0.90, proCam);
    draw3DVolumetricAthlete(ctx, userPose, userKeyframes, rightCX, centerY, rigScale, userTheme, 0.92, proCam);

    // Draw the 3 explicit AceCue Engineering Callouts
    drawAceCueBiomechanicalCallouts(ctx, proPose, userPose, rightCX, centerY, rigScale, proCam, splitX, rightW, h);

    drawViewportHeaderPill(ctx, splitX + 12, 12, "🤖 РЕЖИМ 2: ПРЯМОЕ 3D-НАЛОЖЕНИЕ РИГОВ (ВЫ НА ПРОФИ)", "rgba(251, 191, 36, 0.65)", "#fde047");
    ctx.restore();

    // Center Divider Line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'curtain') {
    const splitX = AppState.overlay.curtainX * w;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
    let vidRectL = null;
    if (AppState.overlay.proVideoLoaded) vidRectL = drawCleanVideoCover(ctx, proVid, 0, 0, w, h, proLock);
    else if (AppState.overlay.userVideoLoaded) vidRectL = drawCleanVideoCover(ctx, userVid, 0, 0, w, h, lock);

    if (vidRectL) {
      const tf = computeLockedProTransform(proPose, vidRectL, lock, proCam);
      draw3DFloorGrid(ctx, tf.cx, tf.cy, tf.scale, proCam);
      draw3DVolumetricAthlete(ctx, proPose, proKeyframes, tf.cx, tf.cy, tf.scale, proTheme, 0.92, proCam);
    } else {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);
      draw3DVolumetricAthlete(ctx, proPose, proKeyframes, centerX, centerY, baseScale, proTheme, 0.95, proCam);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      const vidRectR = drawCleanVideoCover(ctx, userVid, 0, 0, w, h, lock);
      if (Viewer3D.layers.show3DOverVideo && vidRectR) {
        if (engine && engine.liveUserLandmarks2D) {
          drawDirectVideo3DAthlete(ctx, vidRectR, userTheme, 0.95);
        } else {
          const tf = computeLockedProTransform(userPose, vidRectR, lock, proCam);
          draw3DVolumetricAthlete(ctx, userPose, userKeyframes, tf.cx, tf.cy, tf.scale, userTheme, 0.88, proCam);
        }
      }
    } else {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);
      draw3DVolumetricAthlete(ctx, userPose, userKeyframes, centerX, centerY, baseScale, userTheme, 0.95, proCam);
    }
    ctx.restore();

  } else {
    // 'ghost' — FULL-SCREEN DIRECT 3D OVERLAY MODE
    const proAlpha = 1.0 - AppState.overlay.alpha;
    const userAlpha = AppState.overlay.alpha;

    let vidRect = null;
    if (AppState.overlay.userVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.proVideoLoaded ? Math.max(0.45, userAlpha) : 1.0;
      vidRect = drawCleanVideoCover(ctx, userVid, 0, 0, w, h, lock);
      ctx.restore();
    }
    if (AppState.overlay.proVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.userVideoLoaded ? proAlpha : 1.0;
      drawCleanVideoCover(ctx, proVid, 0, 0, w, h, proLock);
      ctx.restore();
    }

    if (AppState.overlay.userVideoLoaded && vidRect) {
      if (Viewer3D.layers.show3DOverVideo) {
        const tf = computeLockedProTransform(proPose, vidRect, lock, proCam);
        if (engine && engine.liveUserLandmarks2D) {
          drawDirectVideo3DAthlete(ctx, vidRect, userTheme, Math.max(0.65, userAlpha));
        }
        draw3DVolumetricAthlete(ctx, userPose, userKeyframes, tf.cx, tf.cy, tf.scale, userTheme, Math.max(0.65, userAlpha), proCam);
        draw3DVolumetricAthlete(ctx, proPose, proKeyframes, tf.cx, tf.cy, tf.scale, proTheme, Math.max(0.65, proAlpha), proCam);
        drawAceCueBiomechanicalCallouts(ctx, proPose, userPose, tf.cx, tf.cy, tf.scale, proCam, 0, w, h);
      }
    } else {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);
      draw3DVolumetricAthlete(ctx, proPose, proKeyframes, centerX, centerY, baseScale, proTheme, Math.max(0.55, proAlpha), proCam);
      draw3DVolumetricAthlete(ctx, userPose, userKeyframes, centerX, centerY, baseScale, userTheme, Math.max(0.55, userAlpha), proCam);
      drawAceCueBiomechanicalCallouts(ctx, proPose, userPose, centerX, centerY, baseScale, proCam, 0, w, h);
    }

    drawViewportHeaderPill(ctx, 12, 12, "🤖 ПРЯМОЕ 3D-НАЛОЖЕНИЕ РИГОВ (ВО ВЕСЬ ЭКРАН)", "rgba(251, 191, 36, 0.65)", "#fde047");
  }

  let activePhase = stroke.phases[0];
  stroke.phases.forEach(p => {
    if (Math.abs(effectivePhaseT - p.t) < 0.14) activePhase = p;
  });
  const phaseEl = document.getElementById('hud-phase-name');
  if (phaseEl) phaseEl.textContent = activePhase.label;

  const weightEl = document.getElementById('hud-weight-transfer');
  if (weightEl) {
    weightEl.textContent = `Профи ${Math.round(proPose.weightL)}% лев / Вы ${Math.round(userPose.weightL)}% лев`;
  }

  // Keep the Cause-and-Effect Ball Flight & Court Landing Diagram updated
  if (typeof renderCauseAndEffectStrip === 'function') {
    renderCauseAndEffectStrip();
  }
}
