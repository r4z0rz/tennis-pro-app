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
      document.getElementById('badge-user').innerHTML = `📹 ВАШЕ ВИДЕО (AI АВТО-ЗУМ): ${file.name.slice(0, 18)}`;
      Viewer3D.cam.zoom = 1.0;
      Viewer3D.cam.panX = 0;
      Viewer3D.cam.panY = 35;
      if (typeof setOverlayMode === 'function') {
        setOverlayMode('split');
      }
      if (window.AIPoseEngine) {
        window.AIPoseEngine.smoothedVideoAnchor.initialized = false;
        window.AIPoseEngine.liveUserPose3D = null;
        window.AIPoseEngine.liveUserLandmarks2D = null;
        window.AIPoseEngine.videoLock.active = false;
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

function drawCleanVideoCover(ctx, videoEl, x, y, w, h, lock) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const baseScale = Math.min(w / vw, h / vh);

  // AI Smart Auto-Zoom: When a player is small/distant in a phone video (e.g. torsoLegNormSpan = 0.24),
  // automatically zoom & center on the player so they fill ~68% of the viewport height (~350px tall)!
  const activeLock = lock || (window.AIPoseEngine && window.AIPoseEngine.videoLock);
  let smartZoom = 1.0;
  let focusNormX = 0.52;
  let focusNormY = 0.46;

  if (activeLock) {
    const spanNorm = Math.max(0.16, activeLock.torsoLegNormSpan || 0.25);
    const unzoomedSpanPx = spanNorm * vh * baseScale;
    const targetSpanPx = h * 0.43; // Torso+Legs = 43% of viewport height (~220px -> ~350px full player height!)
    smartZoom = Math.max(1.0, Math.min(2.65, targetSpanPx / Math.max(40, unzoomedSpanPx))) * Viewer3D.cam.zoom;
    focusNormX = activeLock.hipNormX || 0.54;
    focusNormY = ((activeLock.shNormY || 0.33) + (activeLock.ankleNormY || 0.58)) * 0.5;
  }

  const dw = vw * baseScale * smartZoom;
  const dh = vh * baseScale * smartZoom;

  // Center the zoomed video frame on the player's body inside viewport (x, y, w, h)
  let dx = (x + w * 0.52) - focusNormX * dw + Viewer3D.cam.panX;
  let dy = (y + h * 0.52) - focusNormY * dh + (Viewer3D.cam.panY - 35);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.drawImage(videoEl, dx, dy, dw, dh);

  // Subtle Hawkeye Radial Spotlight Vignette around the player so the 3D overlay has crystal-clear contrast
  // against bright gymnasium walls or court backgrounds
  const playerScreenX = dx + focusNormX * dw;
  const playerScreenY = dy + focusNormY * dh;
  const spotRadius = Math.max(w, h) * 0.58;
  const vig = ctx.createRadialGradient(
    playerScreenX, playerScreenY, spotRadius * 0.22,
    playerScreenX, playerScreenY, spotRadius
  );
  vig.addColorStop(0, "rgba(7, 11, 18, 0.0)");
  vig.addColorStop(0.55, "rgba(7, 11, 18, 0.22)");
  vig.addColorStop(1, "rgba(7, 11, 18, 0.62)");
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
  return { dx, dy, dw, dh, smartZoom };
}

/**
 * Draws a Sleek X-Ray Translucent 3D Shell + High-Contrast Laser Skeleton directly on the video player
 * so the real person in the video remains 100% visible (zero opaque paint or floating text clutter blocking them!).
 */
function drawDirectVideo3DAthlete(ctx, rect, theme, alpha = 0.95) {
  if (!rect || !window.AIPoseEngine || !window.AIPoseEngine.liveUserLandmarks2D) return;
  const lm = window.AIPoseEngine.liveUserLandmarks2D;
  const lock = window.AIPoseEngine.videoLock;
  const vm = window.AIPoseEngine.videoMetrics;

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

    // 1. Translucent X-Ray Glass 3D Volume (lets 80% of the real video arm/leg show right through!)
    ctx.strokeStyle = "rgba(14, 165, 233, 0.22)";
    ctx.lineWidth = r * 1.45;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

    // 2. Crisp Glowing Laser Bone Axis (high contrast, thin so it never hides the body)
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

    // 3. 3D Cross-section Ring at Mid-Limb
    const midX = (p1.x + p2.x) * 0.5;
    const midY = (p1.y + p2.y) * 0.5;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.strokeStyle = "rgba(186, 230, 253, 0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(midX, midY, r * 0.32, r * 0.72, angle, 0, Math.PI * 2);
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

  // 1. 3D Weight Rings & Shoes under the video player's feet
  [
    { ank: pAnkL, heel: pHeelL, toe: pToeL, w: vm.weightFrontPct },
    { ank: pAnkR, heel: pHeelR, toe: pToeR, w: 100 - vm.weightFrontPct }
  ].forEach(({ ank, heel, toe, w }) => {
    const ringR = Math.max(10, (12 + (w / 100) * 16) * s);
    ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
    ctx.beginPath();
    ctx.ellipse(ank.x, ank.y + 3 * s, ringR, ringR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crisp Shoe Sole & Toe Orientation Vector
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = Math.max(3, 6 * s);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(heel.x, heel.y); ctx.lineTo(toe.x, toe.y); ctx.stroke();

    const fdx = toe.x - heel.x;
    const fdy = toe.y - heel.y;
    const flen = Math.hypot(fdx, fdy) || 1;
    draw2DArrow(
      ctx,
      toe.x,
      toe.y,
      toe.x + (fdx / flen) * 24 * s,
      toe.y + (fdy / flen) * 24 * s,
      "#34d399",
      2.2
    );
  });

  // 2. X-Ray 3D Legs & Arms
  drawXRayLimb(pHipL, pKneeL, 11.5);
  drawXRayLimb(pKneeL, pAnkL, 8.8);
  drawXRayLimb(pHipR, pKneeR, 11.5);
  drawXRayLimb(pKneeR, pAnkR, 8.8);

  // 3. X-Ray Torso Frame (ultra-translucent so player's shirt/torso is 100% visible)
  ctx.fillStyle = "rgba(14, 165, 233, 0.14)";
  ctx.strokeStyle = "rgba(125, 211, 252, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(pShL.x, pShL.y);
  ctx.lineTo(pShR.x, pShR.y);
  ctx.lineTo(pHipR.x, pHipR.y);
  ctx.lineTo(pHipL.x, pHipL.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawXRayLimb(pShL, pElL, 8.5);
  drawXRayLimb(pElL, pWrL, 7.0);
  drawXRayLimb(pShR, pElR, 8.5);
  drawXRayLimb(pElR, pWrR, 7.0);

  // 4. Crisp Glowing Joint Rings
  [pShL, pShR, pElL, pElR, pWrL, pWrR, pHipL, pHipR, pKneeL, pKneeR, pAnkL, pAnkR].forEach(j => {
    const jr = Math.max(3, 4.5 * s);
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(j.x, j.y, jr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  // 5. Sleek X-Ray Head Ring (doesn't cover the player's face!)
  const headR = Math.max(8, 13.5 * s);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(pHead.x, pHead.y, headR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Analytically solves for the exact (cx, cy, scale) so the Pro 3D Ghost:
 * - Has the EXACT same shoulder-to-ankle pixel height as the player in the zoomed video,
 * - Stands on the EXACT same floor line (ankles Y) as the player in the zoomed video,
 * - Aligns horizontally (pelvis X) with the player in the zoomed video!
 */
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
 * Draw a Sleek, X-Ray Holographic 3D Shaded Limb Segment.
 * Uses a translucent 3D glass muscle envelope + crisp bright core bone axis so it NEVER obscures the video player!
 */
function drawFluid3DLimb(ctx, ptA3D, ptB3D, radiusPx, cx, cy, scale, theme, camOverride) {
  const p1 = project3D(ptA3D, cx, cy, scale, camOverride);
  const p2 = project3D(ptB3D, cx, cy, scale, camOverride);

  const rAvg = Math.max(2.5, radiusPx * ((p1.s + p2.s) * 0.5));
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Translucent 3D X-Ray Muscle Volume (lets video behind show right through!)
  ctx.strokeStyle = theme.main;
  ctx.lineWidth = rAvg * 1.35;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 2. Crisp Glowing 3D Bone / Axis Core (high visibility, zero visual clutter)
  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = Math.max(2.2, rAvg * 0.36);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 3. Subtle 3D Cross-Section Contour Ring at Limb Midpoint
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

/**
 * Draw Sleek X-Ray 3D Anatomical Torso, Spine, Shoulder Girdle & Pelvis
 */
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

  // 1. Sleek 3D Pelvis / Hip Girdle
  drawFluid3DLimb(ctx, pose.hipL, pose.hipR, 10.5, cx, cy, scale, theme, camOverride);

  // 2. Translucent X-Ray Thoracic V-Taper
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

  // 3. Sleek 3D Clavicle / Shoulder Girdle
  drawFluid3DLimb(ctx, pose.shL, pose.shR, 10.0, cx, cy, scale, theme, camOverride);

  // 4. 3D Articulated Spine Axis
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

  // 5. Sleek 3D Neck connecting Chest to Head
  drawFluid3DLimb(ctx, midSh3D, pose.head, 6.5, cx, cy, scale, theme, camOverride);

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
 * Draw Complete Sleek 3D Volumetric Athlete (Zero Visual Clutter or Text Blocking the Body!)
 */
function draw3DVolumetricAthlete(ctx, pose, keyframes, cx, cy, scale, theme, alpha, camOverride) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tNow = pose._phaseT !== undefined ? pose._phaseT : AppState.overlay.progress;
  const nextPose = interpolate3DPose(keyframes, Math.min(1.0, tNow + 0.06));

  // 1. SUBTLE WEIGHT RINGS ON FLOOR (No text clutter on the feet!)
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

  // 2. CLEAN RACKET COMET ARC (Only trailing the past 0.18s — NEVER a giant filled sail across the body!)
  if (Viewer3D.layers.swingRibbon) {
    ctx.save();
    const steps = 12;
    const span = 0.18;
    for (let s = 0; s < steps; s++) {
      const t0 = Math.max(0, tNow - span * (1 - s / steps));
      const t1 = Math.max(0, tNow - span * (1 - (s + 1) / steps));
      if (t1 <= t0) continue;
      const sp0 = interpolate3DPose(keyframes, t0);
      const sp1 = interpolate3DPose(keyframes, t1);
      const tip0 = project3D(sp0.rTip, cx, cy, scale, camOverride);
      const tip1 = project3D(sp1.rTip, cx, cy, scale, camOverride);

      const frac = (s + 1) / steps;
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = alpha * frac * 0.65;
      ctx.lineWidth = 3.2 * frac;
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

  // 4. SLEEK 3D LEGS
  const legs = [
    { z: (P.hipR.z + P.kneeR.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipR, pose.kneeR, 11.2, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeR, pose.footR.ankle, 8.8, cx, cy, scale, theme, camOverride);
    }},
    { z: (P.hipL.z + P.kneeL.z) / 2, fn: () => {
      drawFluid3DLimb(ctx, pose.hipL, pose.kneeL, 11.2, cx, cy, scale, theme, camOverride);
      drawFluid3DLimb(ctx, pose.kneeL, pose.footL.ankle, 8.8, cx, cy, scale, theme, camOverride);
    }}
  ];
  legs.sort((a, b) => a.z - b.z).forEach(l => l.fn());

  // 5. SLEEK 3D TORSO, SPINE, CLAVICLES & PELVIS
  drawFluid3DTorsoAndPelvis(ctx, pose, P, cx, cy, scale, theme, camOverride);

  // 6. SLEEK 3D ARMS (Both Left and Right Arms!)
  drawFluid3DLimb(ctx, pose.shL, pose.elL, 8.2, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.elL, pose.wrL, 6.8, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.shR, pose.elR, 8.5, cx, cy, scale, theme, camOverride);
  drawFluid3DLimb(ctx, pose.elR, pose.wrR, 7.0, cx, cy, scale, theme, camOverride);

  // 7. CRISP 3D JOINT SPHERES
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

  // 8. SLEEK X-RAY 3D HEAD SPHERE WITH ATHLETIC VISOR
  const headR = Math.max(6, 14.5 * P.head.s);
  ctx.fillStyle = theme.boxFill;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.highlight;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Athletic Headband / Visor
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y - 2, headR * 0.92, -0.25, Math.PI + 0.25, true);
  ctx.stroke();

  // 9. 3D TENNIS RACKET & STRING BED
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
  ctx.lineWidth = 2.4;
  const rx = Math.max(7, rLen);
  const ry = Math.max(5, 12.5 * PHoop.s);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 10. 3D TENNIS BALL
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
 * Draws a Sleek, Non-Obscuring Corner Telemetry HUD Panel (Zero Floating Text Over the Players!)
 */
function drawCleanCornerHUD(ctx, w, h, stroke, proPose, userPose, lock) {
  ctx.save();
  const boxW = 248;
  const boxH = AppState.overlay.userVideoLoaded ? 98 : 82;
  const bx = w - boxW - 12;
  const by = 46;

  ctx.fillStyle = "rgba(7, 11, 18, 0.82)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 10) : ctx.rect(bx, by, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  const proShort = stroke.proName.split('(')[0].trim();
  const vm = window.AIPoseEngine ? window.AIPoseEngine.videoMetrics : null;
  const usrKnee = (AppState.overlay.userVideoLoaded && vm) ? vm.kneeAngleDeg : Math.round(userPose.kneeBendDeg);
  const usrElbow = (AppState.overlay.userVideoLoaded && vm) ? vm.elbowAngleDeg : Math.round(userPose.elbowAngleDeg);

  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`⭐ ${proShort}`, bx + 10, by + 18);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`vs 👤 Вы`, bx + 138, by + 18);

  ctx.font = "11px monospace";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`Колено:  ${Math.round(proPose.kneeBendDeg)}°  vs  ${usrKnee}°`, bx + 10, by + 38);
  ctx.fillText(`Локоть:  ${Math.round(proPose.elbowAngleDeg)}°  vs  ${usrElbow}°`, bx + 10, by + 56);
  ctx.fillText(`Контакт: +${Math.round(proPose.contactOffsetCm)}см vs +${Math.round(userPose.contactOffsetCm)}см`, bx + 10, by + 74);

  if (AppState.overlay.userVideoLoaded) {
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 10px monospace";
    const dirTxt = lock && lock.facingSign < 0 ? "Профиль ВЛЕВО" : "Профиль ВПРАВО";
    ctx.fillText(`🎯 AI Авто-Зум 2.4x • ${dirTxt}`, bx + 10, by + 91);
  }

  ctx.restore();
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

  const lock = (window.AIPoseEngine && window.AIPoseEngine.videoLock)
    ? window.AIPoseEngine.videoLock
    : {
        active: false,
        hipNormX: 0.54,
        hipNormY: 0.46,
        ankleNormY: 0.58,
        shNormY: 0.33,
        torsoLegNormSpan: 0.25,
        facingSign: -1,
        matchedYawDeg: -86,
        matchedPitchDeg: 10,
        matchedPhaseT: 0.62
      };

  const autoAlign = Boolean(window.AIPoseEngine ? window.AIPoseEngine.autoAlignEnabled : true);
  const effectivePhaseT = (AppState.overlay.userVideoLoaded && autoAlign && lock.active)
    ? lock.matchedPhaseT
    : t;

  const proPose = interpolate3DPose(stroke.proKeyframes, effectivePhaseT);
  proPose._phaseT = effectivePhaseT;

  const userPose = (AppState.overlay.userVideoLoaded && window.AIPoseEngine && window.AIPoseEngine.liveUserPose3D)
    ? window.AIPoseEngine.liveUserPose3D
    : interpolate3DPose(stroke.userKeyframes, effectivePhaseT);
  userPose._phaseT = effectivePhaseT;

  const proCam = (AppState.overlay.userVideoLoaded && autoAlign)
    ? { yaw: lock.matchedYawDeg, pitch: lock.matchedPitchDeg }
    : { yaw: Viewer3D.cam.yaw, pitch: Viewer3D.cam.pitch };

  const proTheme = {
    label: `⭐ ${stroke.proName.split('(')[0].trim()}`,
    main: AppState.overlay.userVideoLoaded ? "rgba(245, 158, 11, 0.36)" : "rgba(217, 119, 6, 0.52)",
    highlight: "#fde047",
    accent: "#fbbf24",
    wireframe: "rgba(254, 240, 138, 0.72)",
    boxFill: "rgba(245, 158, 11, 0.16)",
    shoeColor: "rgba(245, 158, 11, 0.85)",
    footTrail: "rgba(251, 191, 36, 0.65)",
    glowRing: "rgba(251, 191, 36, 0.18)",
    ribbon: "rgba(250, 204, 21, 0.75)",
    ribbonFill: "rgba(250, 204, 21, 0.12)",
    racketStrings: "rgba(251, 191, 36, 0.20)"
  };

  const userTheme = {
    label: AppState.overlay.userVideoLoaded ? "👤 Вы (1:1 Видео)" : "👤 Ваша 3D-модель",
    main: "rgba(14, 165, 233, 0.45)",
    highlight: "#7dd3fc",
    accent: "#38bdf8",
    wireframe: "rgba(186, 230, 253, 0.72)",
    boxFill: "rgba(14, 165, 233, 0.16)",
    shoeColor: "rgba(14, 165, 233, 0.85)",
    footTrail: "rgba(56, 189, 248, 0.65)",
    glowRing: "rgba(56, 189, 248, 0.18)",
    ribbon: "rgba(56, 189, 248, 0.75)",
    ribbonFill: "rgba(56, 189, 248, 0.12)",
    racketStrings: "rgba(56, 189, 248, 0.20)"
  };

  const baseScale = 235 * Viewer3D.cam.zoom;
  const centerY = h * 0.52 + Viewer3D.cam.panY;
  const centerX = w * 0.50 + Viewer3D.cam.panX;

  if (AppState.overlay.mode === 'split') {
    if (AppState.overlay.userVideoLoaded) {
      // SYNCHRO-STUDIO SPLIT MODE WHEN USER VIDEO IS LOADED:
      // Left Half: Your AI Auto-Zoomed Video + Sleek X-Ray Cyan Skeleton on your body
      // Right Half: Clean Dark 3D Hawkeye Stage with BOTH 3D Ghosts (Gold Federer + Blue You) overlaid at full size & locked angle!
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
      const vidRect = drawCleanVideoCover(ctx, userVid, 0, 0, w / 2, h, lock);
      if (Viewer3D.layers.show3DOverVideo && vidRect && window.AIPoseEngine && window.AIPoseEngine.liveUserLandmarks2D) {
        drawDirectVideo3DAthlete(ctx, vidRect, userTheme, 0.95);
      }
      ctx.restore();

      // Right Half: Full-scale 3D Hologram Comparison on dark 3D Hawkeye court!
      ctx.save();
      ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip();
      draw3DFloorGrid(ctx, w * 0.75, centerY, baseScale * 0.90, proCam);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, w * 0.75, centerY, baseScale * 0.90, userTheme, 0.88, proCam);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.75, centerY, baseScale * 0.90, proTheme, 0.92, proCam);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
      if (AppState.overlay.proVideoLoaded) drawCleanVideoCover(ctx, proVid, 0, 0, w / 2, h, lock);
      draw3DFloorGrid(ctx, w * 0.25, centerY, baseScale * 0.86, proCam);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.25, centerY, baseScale * 0.86, proTheme, 0.95, proCam);
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip();
      draw3DFloorGrid(ctx, w * 0.75, centerY, baseScale * 0.86);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, w * 0.75, centerY, baseScale * 0.86, userTheme, 0.95);
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'curtain') {
    const splitX = AppState.overlay.curtainX * w;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
    let vidRectL = null;
    if (AppState.overlay.proVideoLoaded) vidRectL = drawCleanVideoCover(ctx, proVid, 0, 0, w, h, lock);
    else if (AppState.overlay.userVideoLoaded) vidRectL = drawCleanVideoCover(ctx, userVid, 0, 0, w, h, lock);

    if (vidRectL) {
      const tf = computeLockedProTransform(proPose, vidRectL, lock, proCam);
      draw3DFloorGrid(ctx, tf.cx, tf.cy, tf.scale, proCam);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, tf.cx, tf.cy, tf.scale, proTheme, 0.92, proCam);
    } else {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, centerX, centerY, baseScale, proTheme, 0.95, proCam);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      const vidRectR = drawCleanVideoCover(ctx, userVid, 0, 0, w, h, lock);
      if (Viewer3D.layers.show3DOverVideo && vidRectR) {
        if (window.AIPoseEngine && window.AIPoseEngine.liveUserLandmarks2D) {
          drawDirectVideo3DAthlete(ctx, vidRectR, userTheme, 0.95);
        } else {
          const tf = computeLockedProTransform(userPose, vidRectR, lock, proCam);
          draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, tf.cx, tf.cy, tf.scale, userTheme, 0.88, proCam);
        }
      }
    } else {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, centerX, centerY, baseScale, userTheme, 0.95);
    }
    ctx.restore();

  } else {
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
      drawCleanVideoCover(ctx, proVid, 0, 0, w, h, lock);
      ctx.restore();
    }

    if (AppState.overlay.userVideoLoaded && vidRect) {
      if (Viewer3D.layers.show3DOverVideo) {
        // Compute exact 1:1 scale & anchor on the AI-zoomed video player!
        const tf = computeLockedProTransform(proPose, vidRect, lock, proCam);

        // 1. Sleek X-Ray Cyan Skeleton directly on the video player's limbs (real body stays 100% visible!)
        if (window.AIPoseEngine && window.AIPoseEngine.liveUserLandmarks2D) {
          drawDirectVideo3DAthlete(ctx, vidRect, userTheme, Math.max(0.55, userAlpha));
        } else {
          const uTf = computeLockedProTransform(userPose, vidRect, lock, proCam);
          draw3DVolumetricAthlete(
            ctx, userPose, stroke.userKeyframes,
            uTf.cx, uTf.cy, uTf.scale,
            userTheme,
            Math.max(0.45, userAlpha),
            proCam
          );
        }

        // 2. Translucent X-Ray Gold Pro 3D Ghost locked 1:1 in height, floor line, facing direction & swing phase!
        draw3DVolumetricAthlete(
          ctx, proPose, stroke.proKeyframes,
          tf.cx, tf.cy, tf.scale,
          proTheme,
          Math.max(0.48, proAlpha),
          proCam
        );
      }
    } else if (!AppState.overlay.userVideoLoaded && (!AppState.overlay.proVideoLoaded || Viewer3D.layers.show3DOverVideo)) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);

      draw3DVolumetricAthlete(
        ctx, userPose, stroke.userKeyframes,
        centerX, centerY, baseScale,
        userTheme,
        Math.max(0.38, userAlpha)
      );

      draw3DVolumetricAthlete(
        ctx, proPose, stroke.proKeyframes,
        centerX, centerY, baseScale,
        proTheme,
        Math.max(0.42, proAlpha)
      );
    }
  }

  // Draw Clean Corner Telemetry HUD (never blocks the players!)
  drawCleanCornerHUD(ctx, w, h, stroke, proPose, userPose, lock);

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
}
