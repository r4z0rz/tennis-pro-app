/**
 * Tennis Pro Analytics 3D — Fluid Organic 3D Anatomical Ghost & Live Video Pose Overlay Engine
 *
 * - 100% Outward-Rounded 3D Anatomical Limbs & Joints (zero concave cutouts or boxy shapes).
 * - Sculpted 3D Spine, Ribcage, Pelvis & Articulated 3D Shoes with Toe & Velocity Vectors.
 * - Direct Video AI Skeleton Overlay when a user video is uploaded + Live Biomechanical Angle Callouts.
 */

window.Viewer3D = {
  cam: {
    yaw: -32,       // Horizontal orbit angle in degrees
    pitch: 18,      // Vertical elevation angle in degrees
    zoom: 1.05,     // Camera zoom
    panX: 0,        // Screen X offset (px)
    panY: 35        // Screen Y offset (px)
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
    Viewer3D.cam.yaw = -32;
    Viewer3D.cam.pitch = 18;
  } else if (preset === 'side') {
    Viewer3D.cam.yaw = -90;
    Viewer3D.cam.pitch = 10;
  } else if (preset === 'top') {
    Viewer3D.cam.yaw = 0;
    Viewer3D.cam.pitch = 84;
  } else if (preset === 'back') {
    Viewer3D.cam.yaw = 0;
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
  if (oy) Viewer3D.cam.panY = 35 + parseFloat(oy.value);
  if (vt) {
    Viewer3D.videoSyncOffsetSec = parseFloat(vt.value) / 100;
    const lbl = document.getElementById('lbl-video-offset');
    if (lbl) lbl.textContent = `${Viewer3D.videoSyncOffsetSec >= 0 ? '+' : ''}${Viewer3D.videoSyncOffsetSec.toFixed(2)}с`;
  }
}

// =========================================================================================
// CLEAN, JITTER-FREE VIDEO UPLOAD & PLAYBACK ENGINE
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
    if (slot === 'pro') {
      AppState.overlay.proVideoLoaded = true;
      document.getElementById('badge-pro').innerHTML = `⭐ ВИДЕО ПРОФИ: ${file.name.slice(0, 18)}`;
    } else {
      AppState.overlay.userVideoLoaded = true;
      document.getElementById('badge-user').innerHTML = `📹 ВАШЕ ВИДЕО (LIVE AI АНАЛИЗ): ${file.name.slice(0, 18)}`;
      if (window.AIPoseEngine) {
        window.AIPoseEngine.smoothedVideoAnchor.initialized = false;
        window.AIPoseEngine.liveUserPose3D = null;
        window.AIPoseEngine.liveUserLandmarks2D = null;
        window.AIPoseEngine.videoMetrics.framesAnalyzed = 0;
        window.AIPoseEngine.videoMetrics.minKneeAngleDeg = 165;
        window.AIPoseEngine.videoMetrics.fileName = file.name;
      }
    }

    const calBar = document.getElementById('video-calibration-bar');
    if (calBar) calBar.classList.remove('hidden');
    const clrBtn = document.getElementById('btn-clear-video');
    if (clrBtn) clrBtn.classList.remove('hidden');

    if (AppState.overlay.speed < 0.5) {
      AppState.overlay.speed = 0.5;
    }
    videoEl.playbackRate = AppState.overlay.speed;
    AppState.overlay.isPlaying = true;
    const playIcon = document.getElementById('video-play-icon');
    const playText = document.getElementById('video-play-text');
    if (playIcon) playIcon.textContent = '⏸';
    if (playText) playText.textContent = 'Пауза';
    videoEl.play().catch(() => {});
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
    window.AIPoseEngine.videoMetrics.hasAnalyzedVideo = false;
  }

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  document.getElementById('badge-pro').textContent = `⭐ 3D ЭТАЛОН: ${stroke.proName.toUpperCase()}`;
  document.getElementById('badge-user').textContent = `👤 ВАША 3D-МОДЕЛЬ (ИЛИ ЗАГРУЗИТЕ ВИДЕО)`;

  const clrBtn = document.getElementById('btn-clear-video');
  if (clrBtn) clrBtn.classList.add('hidden');
  if (typeof renderAceCueSidebar === 'function') renderAceCueSidebar();
}

function drawCleanVideoCover(ctx, videoEl, x, y, w, h) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(videoEl, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}

/**
 * Draws the live MediaPipe 2D skeleton + measured joint angles directly on the uploaded video player!
 */
function drawDirectVideoAISkeleton(ctx, rect) {
  if (!rect || !window.AIPoseEngine || !window.AIPoseEngine.liveUserLandmarks2D) return;
  const lm = window.AIPoseEngine.liveUserLandmarks2D;
  const pt = (idx) => ({
    x: rect.dx + lm[idx].x * rect.dw,
    y: rect.dy + lm[idx].y * rect.dh
  });

  const pairs = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31],
    [24, 26], [26, 28], [28, 30], [30, 32]
  ];

  ctx.save();
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  pairs.forEach(([a, b]) => {
    if (!lm[a] || !lm[b]) return;
    const pA = pt(a), pB = pt(b);
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
  });

  [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32].forEach((idx) => {
    if (!lm[idx]) return;
    const p = pt(idx);
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Live Angle Callouts directly on the video player's Knee and Elbow
  const vm = window.AIPoseEngine.videoMetrics;
  const pKnee = pt(26);
  const pElbow = pt(14);
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(pKnee.x + 10, pKnee.y - 10, 96, 20);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`Колено: ${vm.kneeAngleDeg}°`, pKnee.x + 14, pKnee.y + 4);

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(pElbow.x + 10, pElbow.y - 10, 96, 20);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`Локоть: ${vm.elbowAngleDeg}°`, pElbow.x + 14, pElbow.y + 4);

  ctx.restore();
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
// FLUID, OUTWARD-ROUNDED 3D ANATOMICAL RENDERING PRIMITIVES (ZERO HOLES OR BOXES)
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

/**
 * Draw a 100% Outward-Capped, Volumetric 3D Shaded Limb Segment.
 * Uses multi-pass round-capped 3D strokes + specular highlight core so there are NEVER concave holes at joints!
 */
function drawFluid3DLimb(ctx, ptA3D, ptB3D, radiusPx, cx, cy, scale, theme, camOverride) {
  const p1 = project3D(ptA3D, cx, cy, scale, camOverride);
  const p2 = project3D(ptB3D, cx, cy, scale, camOverride);

  const rAvg = Math.max(3, radiusPx * ((p1.s + p2.s) * 0.5));
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Outer Rim Contour Glow
  ctx.strokeStyle = theme.wireframe;
  ctx.lineWidth = rAvg * 2.05;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 2. Main Shaded Anatomical Muscle Volume
  ctx.strokeStyle = theme.main;
  ctx.lineWidth = rAvg * 1.85;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 3. 3D Specular Highlight Ridge (offset slightly towards light source)
  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = rAvg * 0.72;
  ctx.beginPath();
  ctx.moveTo(p1.x - nx * rAvg * 0.25, p1.y - ny * rAvg * 0.25);
  ctx.lineTo(p2.x - nx * rAvg * 0.25, p2.y - ny * rAvg * 0.25);
  ctx.stroke();

  // 4. Subtle 3D Cross-Section Contour Ring at Limb Midpoint
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const limbAngle = Math.atan2(dy, dx);
  const zTilt = Math.max(0.24, Math.min(0.62, Math.abs(ptB3D[2] - ptA3D[2]) * 1.3 + 0.28));
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(midX, midY, rAvg * zTilt, rAvg * 0.94, limbAngle, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw Sculpted 3D Anatomical Torso, Spine, Shoulder Girdle & Pelvis (Organic & Fluid, Zero Tin-Can Cylinders)
 */
function drawFluid3DTorsoAndPelvis(ctx, pose, P, cx, cy, scale, theme, camOverride) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const midSh3D = [
    (pose.shL[0] + pose.shR[0]) / 2,
    (pose.shL[1] + pose.shL[1]) / 2,
    (pose.shL[2] + pose.shR[2]) / 2
  ];
  const midHip3D = pose.pelvisPos;

  // 1. Sculpted 3D Pelvis / Hip Girdle Capsule
  drawFluid3DLimb(ctx, pose.hipL, pose.hipR, 14.5, cx, cy, scale, theme, camOverride);

  // 2. Sculpted 3D Thoracic / Lat / Oblique Volume (Smooth V-Taper)
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

  const torsoGrad = ctx.createLinearGradient(midSh.x, midSh.y, midHip.x, midHip.y);
  torsoGrad.addColorStop(0, theme.highlight);
  torsoGrad.addColorStop(0.55, theme.main);
  torsoGrad.addColorStop(1, theme.boxFill);

  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = theme.wireframe;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(P.shL.x, P.shL.y);
  ctx.quadraticCurveTo(midSh.x, midSh.y - 5 * P.shL.s, P.shR.x, P.shR.y);
  ctx.quadraticCurveTo(waistR.x, waistR.y, P.hipR.x, P.hipR.y);
  ctx.quadraticCurveTo(midHip.x, midHip.y + 8 * P.hipR.s, P.hipL.x, P.hipL.y);
  ctx.quadraticCurveTo(waistL.x, waistL.y, P.shL.x, P.shL.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Sculpted 3D Clavicle / Shoulder Girdle Capsule
  drawFluid3DLimb(ctx, pose.shL, pose.shR, 13.5, cx, cy, scale, theme, camOverride);

  // 4. 3D Articulated Spine Column (Lumbar -> Thoracic -> Cervical -> Head)
  for (let i = 1; i <= 4; i++) {
    const f = i / 5;
    const sp3D = [
      midHip3D[0] + (midSh3D[0] - midHip3D[0]) * f,
      midHip3D[1] + (midSh3D[1] - midHip3D[1]) * f,
      midHip3D[2] + (midSh3D[2] - midHip3D[2]) * f
    ];
    const sp2D = project3D(sp3D, cx, cy, scale, camOverride);
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.arc(sp2D.x, sp2D.y, 3.2 * sp2D.s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Sculpted 3D Neck connecting Chest to Head
  drawFluid3DLimb(ctx, midSh3D, pose.head, 8.5, cx, cy, scale, theme, camOverride);

  ctx.restore();
}

/**
 * Draw Sleek, Sculpted 3D Tennis Shoe with Rounded Heel, Curved Sole & Velocity Vectors
 */
function drawFluid3DShoe(ctx, foot, nextFoot, cx, cy, scale, theme, camOverride) {
  const yawRad = (foot.yaw * Math.PI) / 180;
  const pAnkle = project3D(foot.ankle, cx, cy, scale, camOverride);
  const pHeel = project3D(foot.heel, cx, cy, scale, camOverride);
  const pToe = project3D(foot.toe, cx, cy, scale, camOverride);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Rounded 3D Shoe Sole Base (Heel to Toe)
  const shoeWidth = Math.max(5, 13.5 * pToe.s);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = shoeWidth + 2.5;
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

  // Upper Shoe Bridge from Ankle to Forefoot
  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = shoeWidth * 0.68;
  ctx.beginPath();
  ctx.moveTo(pAnkle.x, pAnkle.y);
  ctx.lineTo((pHeel.x + pToe.x * 2) / 3, (pHeel.y + pToe.y * 2) / 3);
  ctx.stroke();

  if (Viewer3D.layers.feetAndSteps) {
    // 1. Toe Facing Orientation Vector
    const toeDir3D = [
      foot.toe[0] + Math.sin(yawRad) * 0.22,
      foot.toe[1] + 0.01,
      foot.toe[2] + Math.cos(yawRad) * 0.22
    ];
    const pToeEnd = project3D(toeDir3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, pToe.x, pToe.y, pToeEnd.x, pToeEnd.y, theme.accent, 2.3);

    // 2. Instantaneous 3D Foot Movement Velocity Vector
    if (nextFoot) {
      const vx = (nextFoot.ankle[0] - foot.ankle[0]) * 3.0;
      const vy = (nextFoot.ankle[1] - foot.ankle[1]) * 3.0;
      const vz = (nextFoot.ankle[2] - foot.ankle[2]) * 3.0;
      if (Math.hypot(vx, vy, vz) > 0.04) {
        const pVelEnd = project3D([
          foot.ankle[0] + vx,
          Math.max(0.02, foot.ankle[1] + vy),
          foot.ankle[2] + vz
        ], cx, cy, scale, camOverride);
        draw2DArrow(ctx, pAnkle.x, pAnkle.y, pVelEnd.x, pVelEnd.y, "#34d399", 2.6);
      }
    }
  }

  ctx.restore();
}

/**
 * Draw Silky-Smooth Comet Motion Trails for Feet & Wrist/Racket over the past 0.22 seconds
 */
function drawFluidCometTrails(ctx, keyframes, tNow, cx, cy, scale, theme, camOverride) {
  if (window.AIPoseEngine && !window.AIPoseEngine.showMotionStrobe) return;

  ctx.save();
  const steps = 14;
  const trailSpan = 0.22;

  ['footR', 'footL', 'wrR'].forEach((partKey) => {
    for (let i = 0; i < steps; i++) {
      const t0 = Math.max(0, tNow - trailSpan * (1 - i / steps));
      const t1 = Math.max(0, tNow - trailSpan * (1 - (i + 1) / steps));
      if (t1 <= t0) continue;

      const pose0 = interpolate3DPose(keyframes, t0);
      const pose1 = interpolate3DPose(keyframes, t1);

      const pt0 = partKey === 'wrR' ? pose0.wrR : [pose0[partKey].ankle[0], 0.02, pose0[partKey].ankle[2]];
      const pt1 = partKey === 'wrR' ? pose1.wrR : [pose1[partKey].ankle[0], 0.02, pose1[partKey].ankle[2]];

      const p0 = project3D(pt0, cx, cy, scale, camOverride);
      const p1 = project3D(pt1, cx, cy, scale, camOverride);

      const frac = (i + 1) / steps;
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = frac * 0.55;
      ctx.lineWidth = (partKey === 'wrR' ? 5.5 : 4.5) * frac;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  });

  ctx.restore();
}

/**
 * Draw Complete Fluid 3D Volumetric Athlete (with Both Arms, Head, Visor, Racket & Shoes)
 */
function draw3DVolumetricAthlete(ctx, pose, keyframes, cx, cy, scale, theme, alpha, camOverride) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tNow = AppState.overlay.progress;
  const nextPose = interpolate3DPose(keyframes, Math.min(1.0, tNow + 0.06));

  // 0. FLUID COMET TRAILS
  drawFluidCometTrails(ctx, keyframes, tNow, cx, cy, scale, theme, camOverride);

  // 1. FOOTWORK SPLINE PATHS & WEIGHT AURAS ON FLOOR
  if (Viewer3D.layers.feetAndSteps) {
    ['footR', 'footL'].forEach((fKey) => {
      ctx.beginPath();
      for (let s = 0; s <= 24; s++) {
        const kfPose = interpolate3DPose(keyframes, s / 24);
        const pt = project3D([kfPose[fKey].ankle[0], 0.015, kfPose[fKey].ankle[2]], cx, cy, scale, camOverride);
        if (s === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = theme.footTrail;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    [
      { f: pose.footR, w: pose.weightR, tag: 'Прав' },
      { f: pose.footL, w: pose.weightL, tag: 'Лев' }
    ].forEach(({ f, w, tag }) => {
      const groundPt = project3D([f.ankle[0], 0.01, f.ankle[2]], cx, cy, scale, camOverride);
      const ringRadius = (12 + (w / 100) * 22) * groundPt.s;
      ctx.fillStyle = theme.glowRing;
      ctx.beginPath();
      ctx.ellipse(groundPt.x, groundPt.y, ringRadius, ringRadius * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`${tag}:${Math.round(w)}%`, groundPt.x - 22, groundPt.y + 18);
    });
  }

  // 2. SMOOTH 3D SWING PATH RIBBON
  if (Viewer3D.layers.swingRibbon) {
    ctx.save();
    for (let s = 0; s < 32; s++) {
      const t0 = s / 32;
      const t1 = (s + 1) / 32;
      const sp0 = interpolate3DPose(keyframes, t0);
      const sp1 = interpolate3DPose(keyframes, t1);
      const tip0 = project3D(sp0.rTip, cx, cy, scale, camOverride);
      const tip1 = project3D(sp1.rTip, cx, cy, scale, camOverride);
      const wr0 = project3D(sp0.wrR, cx, cy, scale, camOverride);
      const wr1 = project3D(sp1.wrR, cx, cy, scale, camOverride);

      ctx.fillStyle = theme.ribbonFill;
      ctx.beginPath();
      ctx.moveTo(tip0.x, tip0.y);
      ctx.lineTo(tip1.x, tip1.y);
      ctx.lineTo(wr1.x, wr1.y);
      ctx.lineTo(wr0.x, wr0.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = theme.ribbon;
      ctx.lineWidth = 3.2;
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

  // 3. FLUID 3D SHOES & FOOT VECTORS
  drawFluid3DShoe(ctx, pose.footR, nextPose.footR, cx, cy, scale, theme, camOverride);
  drawFluid3DShoe(ctx, pose.footL, nextPose.footL, cx, cy, scale, theme, camOverride);

  // 4. FLUID 3D LEGS (Outward-capped organic muscle segments)
  const legs = [
    { z: (P.hipR.z + P.kneeR.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipR, pose.kneeR, 14.5, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeR, pose.footR.ankle, 11.2, cx, cy, scale, theme, camOverride);
    }},
    { z: (P.hipL.z + P.kneeL.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipL, pose.kneeL, 14.5, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeL, pose.footL.ankle, 11.2, cx, cy, scale, theme, camOverride);
    }}
  ];
  legs.sort((a, b) => a.z - b.z).forEach(l => l.fn());

  // 5. FLUID SCULPTED 3D TORSO, SPINE, CLAVICLES & PELVIS
  drawFluid3DTorsoAndPelvis(ctx, pose, P, cx, cy, scale, theme, camOverride);

  // 6. PELVIS & SHOULDER 3D DIRECTION ARROWS (X-Factor Vectors)
  if (Viewer3D.layers.directionVectors) {
    const pelRad = (pose.pelvisYaw * Math.PI) / 180;
    const pelEnd3D = [
      pose.pelvisPos[0] + Math.sin(pelRad) * 0.42,
      pose.pelvisPos[1],
      pose.pelvisPos[2] + Math.cos(pelRad) * 0.42
    ];
    const pS = project3D(pose.pelvisPos, cx, cy, scale, camOverride);
    const pE = project3D(pelEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, pS.x, pS.y, pE.x, pE.y, theme.accent, 2.5);

    const chRad = (pose.chestYaw * Math.PI) / 180;
    const chStart3D = [
      (pose.shR[0] + pose.shL[0]) / 2,
      (pose.shR[1] + pose.shL[1]) / 2,
      (pose.shR[2] + pose.shL[2]) / 2
    ];
    const chEnd3D = [
      chStart3D[0] + Math.sin(chRad) * 0.46,
      chStart3D[1],
      chStart3D[2] + Math.cos(chRad) * 0.46
    ];
    const cS = project3D(chStart3D, cx, cy, scale, camOverride);
    const cE = project3D(chEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, cS.x, cS.y, cE.x, cE.y, "#ffffff", 2.5);
  }

  // 7. FLUID 3D ARMS (Both Left and Right Arms!)
  drawFluid3DLimb(ctx, pose.shL, pose.elL, 10.2, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.elL, pose.wrL, 8.4, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.shR, pose.elR, 10.6, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.elR, pose.wrR, 8.8, cx, cy, scale, theme, camOverride);

  // 8. 3D SHADED JOINT SPHERES
  [P.shR, P.shL, P.elR, P.wrR, P.elL, P.wrL, P.hipR, P.hipL, P.kneeR, P.kneeL, P.ankleR, P.ankleL].forEach(j => {
    const jr = Math.max(3, 6.2 * j.s);
    const jGrad = ctx.createRadialGradient(j.x - jr * 0.3, j.y - jr * 0.3, 1, j.x, j.y, jr);
    jGrad.addColorStop(0, "#ffffff");
    jGrad.addColorStop(0.5, theme.accent);
    jGrad.addColorStop(1, theme.main);
    ctx.fillStyle = jGrad;
    ctx.beginPath();
    ctx.arc(j.x, j.y, jr, 0, Math.PI * 2);
    ctx.fill();
  });

  // 9. SCULPTED 3D HEAD SPHERE WITH ATHLETIC VISOR & GAZE DIRECTION
  const headR = Math.max(6, 17.5 * P.head.s);
  const headGrad = ctx.createRadialGradient(P.head.x - 4, P.head.y - 5, 2, P.head.x, P.head.y, headR);
  headGrad.addColorStop(0, "#ffffff");
  headGrad.addColorStop(0.35, theme.highlight);
  headGrad.addColorStop(1, theme.main);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Athletic Headband / Visor
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y - 2, headR * 0.95, -0.25, Math.PI + 0.25, true);
  ctx.stroke();

  // 10. 3D TENNIS RACKET & STRING BED
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
  ctx.lineWidth = Math.max(2, 4.2 * P.wrR.s);
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
  ctx.lineWidth = 3.0;
  const rx = Math.max(8, rLen);
  const ry = Math.max(6, 15 * PHoop.s);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (Viewer3D.layers.directionVectors && pose.rFaceNormal) {
    const normEnd3D = [
      centerHoop3D[0] + pose.rFaceNormal[0] * 0.26,
      centerHoop3D[1] + pose.rFaceNormal[1] * 0.26,
      centerHoop3D[2] + pose.rFaceNormal[2] * 0.26
    ];
    const normEnd2D = project3D(normEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, PHoop.x, PHoop.y, normEnd2D.x, normEnd2D.y, "#bef264", 2.2);
  }

  // 11. 3D TENNIS BALL & FLOOR SHADOW
  if (pose.ball) {
    const ballP = project3D(pose.ball, cx, cy, scale, camOverride);
    const ballFloor = project3D([pose.ball[0], 0.01, pose.ball[2]], cx, cy, scale, camOverride);

    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(ballFloor.x, ballFloor.y, 6.5 * ballFloor.s, 3.2 * ballFloor.s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.arc(ballP.x, ballP.y, 7.2 * ballP.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.fillStyle = theme.accent;
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(theme.label, P.head.x - 48, P.head.y - headR - 10);

  ctx.restore();
  return P;
}

/**
 * Main 60 FPS Render Function for Module 1
 */
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

  if (typeof processVideoFrameWithAI === 'function') {
    const nowMs = performance.now();
    if (AppState.overlay.userVideoLoaded) processVideoFrameWithAI(userVid, 'user', nowMs);
    if (AppState.overlay.proVideoLoaded) processVideoFrameWithAI(proVid, 'pro', nowMs + 1);
  }

  const proPose = interpolate3DPose(stroke.proKeyframes, t);
  const userPose = (AppState.overlay.userVideoLoaded && window.AIPoseEngine && window.AIPoseEngine.liveUserPose3D)
    ? window.AIPoseEngine.liveUserPose3D
    : interpolate3DPose(stroke.userKeyframes, t);

  const proTheme = {
    label: `⭐ ${stroke.proName.split('(')[0].trim()}`,
    main: "rgba(217, 119, 6, 0.85)",
    highlight: "rgba(253, 224, 71, 0.92)",
    accent: "#fbbf24",
    wireframe: "rgba(254, 240, 138, 0.70)",
    boxFill: "rgba(245, 158, 11, 0.30)",
    shoeColor: "rgba(245, 158, 11, 0.90)",
    footTrail: "rgba(251, 191, 36, 0.75)",
    glowRing: "rgba(251, 191, 36, 0.25)",
    ribbon: "rgba(250, 204, 21, 0.82)",
    ribbonFill: "rgba(250, 204, 21, 0.16)",
    racketStrings: "rgba(251, 191, 36, 0.24)"
  };

  const userTheme = {
    label: AppState.overlay.userVideoLoaded ? "👤 Вы (По вашему видео)" : "👤 Ваша 3D-модель",
    main: "rgba(2, 132, 199, 0.85)",
    highlight: "rgba(125, 211, 252, 0.92)",
    accent: "#38bdf8",
    wireframe: "rgba(186, 230, 253, 0.70)",
    boxFill: "rgba(14, 165, 233, 0.30)",
    shoeColor: "rgba(14, 165, 233, 0.90)",
    footTrail: "rgba(56, 189, 248, 0.75)",
    glowRing: "rgba(56, 189, 248, 0.25)",
    ribbon: "rgba(56, 189, 248, 0.82)",
    ribbonFill: "rgba(56, 189, 248, 0.16)",
    racketStrings: "rgba(56, 189, 248, 0.24)"
  };

  const baseScale = 235 * Viewer3D.cam.zoom;
  const centerY = h * 0.52 + Viewer3D.cam.panY;
  const centerX = w * 0.50 + Viewer3D.cam.panX;

  if (AppState.overlay.mode === 'split') {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) {
      drawCleanVideoCover(ctx, proVid, 0, 0, w / 2, h);
    }
    if (!AppState.overlay.proVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, w * 0.25, centerY, baseScale * 0.86);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.25, centerY, baseScale * 0.86, proTheme, 0.95);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip();
    let vidRect = null;
    if (AppState.overlay.userVideoLoaded) {
      vidRect = drawCleanVideoCover(ctx, userVid, w / 2, 0, w / 2, h);
      drawDirectVideoAISkeleton(ctx, vidRect);
    }
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, w * 0.75, centerY, baseScale * 0.86);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, w * 0.75, centerY, baseScale * 0.86, userTheme, 0.95);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'curtain') {
    const splitX = AppState.overlay.curtainX * w;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) drawCleanVideoCover(ctx, proVid, 0, 0, w, h);
    draw3DFloorGrid(ctx, centerX, centerY, baseScale);
    draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, centerX, centerY, baseScale, proTheme, 0.95);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      const vidRect = drawCleanVideoCover(ctx, userVid, 0, 0, w, h);
      drawDirectVideoAISkeleton(ctx, vidRect);
    }
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, centerX, centerY, baseScale, userTheme, 0.95);
    }
    ctx.restore();

  } else {
    const proAlpha = 1.0 - AppState.overlay.alpha;
    const userAlpha = AppState.overlay.alpha;

    if (AppState.overlay.userVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.proVideoLoaded ? Math.max(0.45, userAlpha) : 1.0;
      const vidRect = drawCleanVideoCover(ctx, userVid, 0, 0, w, h);
      drawDirectVideoAISkeleton(ctx, vidRect);
      ctx.restore();
    }
    if (AppState.overlay.proVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.userVideoLoaded ? proAlpha : 1.0;
      drawCleanVideoCover(ctx, proVid, 0, 0, w, h);
      ctx.restore();
    }

    if ((!AppState.overlay.userVideoLoaded && !AppState.overlay.proVideoLoaded) || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);

      const pUser = draw3DVolumetricAthlete(
        ctx, userPose, stroke.userKeyframes,
        centerX, centerY, baseScale,
        userTheme,
        AppState.overlay.userVideoLoaded ? Math.min(0.75, userAlpha) : Math.max(0.32, userAlpha)
      );

      const pPro = draw3DVolumetricAthlete(
        ctx, proPose, stroke.proKeyframes,
        centerX, centerY, baseScale,
        proTheme,
        Math.max(0.35, proAlpha)
      );

      draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, centerX, centerY, baseScale);
    }
  }

  let activePhase = stroke.phases[0];
  stroke.phases.forEach(p => {
    if (Math.abs(t - p.t) < 0.14) activePhase = p;
  });
  const phaseEl = document.getElementById('hud-phase-name');
  if (phaseEl) phaseEl.textContent = activePhase.label;

  const weightEl = document.getElementById('hud-weight-transfer');
  if (weightEl) {
    weightEl.textContent = `Профи ${Math.round(proPose.weightL)}% лев / Вы ${Math.round(userPose.weightL)}% лев`;
  }
}

function draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, cx, cy, scale) {
  ctx.save();

  if (AppState.overlay.progress >= 0.48 && AppState.overlay.progress <= 0.74) {
    const bPro = project3D(proPose.ball, cx, cy, scale);
    const bUsr = project3D(userPose.ball, cx, cy, scale);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(bPro.x, bPro.y);
    ctx.lineTo(bUsr.x, bUsr.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (bPro.x + bUsr.x) / 2;
    const midY = Math.min(bPro.y, bUsr.y) - 18;
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(midX - 85, midY - 15, 175, 22);
    ctx.strokeStyle = "#ef4444";
    ctx.strokeRect(midX - 85, midY - 15, 175, 22);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`Δ Контакт: ${Math.round(proPose.contactOffsetCm - userPose.contactOffsetCm)} см вперёд`, midX - 78, midY);
  }

  ctx.restore();
}
