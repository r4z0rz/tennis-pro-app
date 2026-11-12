/**
 * Tennis Pro Analytics 3D — True 3D Volumetric Exoskeleton Wireframe, Articulated 3D Shoe Meshes,
 * Foot Velocity Vectors, 3D Motion Strobe (Onion-Skinning), and AI Angle-Aligned Dual Video Overlay.
 */

window.Viewer3D = {
  cam: {
    yaw: -32,       // Horizontal orbit angle in degrees
    pitch: 20,      // Vertical elevation angle in degrees
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
  dragStart: { x: 0, y: 0, yaw: 0, pitch: 0 },
  customPointsMode: false,
  customJoints: null
};

function init3DViewerAndVideo() {
  const canvas = document.getElementById('overlay-canvas');
  const dropzone = document.getElementById('canvas-dropzone');
  if (!canvas || !dropzone) return;

  // Initialize AI Pose & Auto-Align Engine
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
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
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
    Viewer3D.cam.pitch = 20;
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
// REAL VIDEO UPLOAD & AI AUTO-ALIGNMENT ENGINE
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
      document.getElementById('badge-pro').innerHTML = `⭐ ВИДЕО ПРОФИ + 3D СЕТКА: ${file.name.slice(0, 18)}`;
    } else {
      AppState.overlay.userVideoLoaded = true;
      document.getElementById('badge-user').innerHTML = `📹 ВАШЕ ВИДЕО + AI 3D СЕТКА: ${file.name.slice(0, 18)}`;
    }

    // Show video calibration toolbar & clear button
    const calBar = document.getElementById('video-calibration-bar');
    if (calBar) calBar.classList.remove('hidden');
    const clrBtn = document.getElementById('btn-clear-video');
    if (clrBtn) clrBtn.classList.remove('hidden');

    videoEl.playbackRate = AppState.overlay.speed;
    if (AppState.overlay.isPlaying) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.currentTime = AppState.overlay.progress * (videoEl.duration || 2.0);
    }

    // Trigger AI Pose & Camera Angle Auto-Alignment immediately on load
    if (typeof runAIAutoAlignVideos === 'function') {
      runAIAutoAlignVideos();
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
    window.AIPoseEngine.liveProPose3D = null;
  }

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  document.getElementById('badge-pro').textContent = `⭐ ЭТАЛОН ВИДЕО + 3D СЕТКА: ${stroke.proName.toUpperCase()}`;
  document.getElementById('badge-user').textContent = `👤 ВАШЕ ВИДЕО + AI 3D СЕТКА (АВТО-ВЫРАВНИВАНИЕ)`;

  const clrBtn = document.getElementById('btn-clear-video');
  if (clrBtn) clrBtn.classList.add('hidden');
}

/**
 * Draws an HTML5 video element onto the canvas, applying AI Camera Angle & Scale Alignment
 * (compensating for camera roll, scale difference, and pelvis/ground center offset).
 */
function drawAlignedVideoCover(ctx, videoEl, x, y, w, h, slot, isAligned) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return false;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.save();
  if (slot === 'user' && window.AIPoseEngine && isAligned) {
    const cam = window.AIPoseEngine.userDetectedCam;
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx + cam.offsetX * 0.4, cy + cam.offsetY * 0.4);
    ctx.rotate((-cam.roll * Math.PI) / 180);
    ctx.scale(cam.scaleRatio, cam.scaleRatio);
    ctx.translate(-cx, -cy);
  }
  ctx.drawImage(videoEl, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

// =========================================================================================
// 3D PERSPECTIVE ENGINE WITH CAMERA ANGLE COMPENSATION
// =========================================================================================

function project3D(pt3, cx, cy, scale, camOverride) {
  const yawDeg = camOverride && camOverride.yaw !== undefined ? camOverride.yaw : Viewer3D.cam.yaw;
  const pitchDeg = camOverride && camOverride.pitch !== undefined ? camOverride.pitch : Viewer3D.cam.pitch;
  const rollDeg = camOverride && camOverride.roll !== undefined ? camOverride.roll : 0;

  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const rollRad = (rollDeg * Math.PI) / 180;

  // Center around hip height (y = 0.88m)
  const x = pt3[0];
  const y = pt3[1] - 0.88;
  const z = pt3[2];

  // Rotate around Y (Yaw)
  const x1 = x * Math.cos(yawRad) + z * Math.sin(yawRad);
  const z1 = -x * Math.sin(yawRad) + z * Math.cos(yawRad);

  // Rotate around X (Pitch)
  const y2 = y * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
  const z2 = y * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);

  // Rotate around Z (Camera Roll if unaligned)
  const x3 = x1 * Math.cos(rollRad) - y2 * Math.sin(rollRad);
  const y3 = x1 * Math.sin(rollRad) + y2 * Math.cos(rollRad);

  // Perspective divide
  const fovDist = 4.2;
  const persp = fovDist / Math.max(1.2, fovDist - z2);

  return {
    x: cx + x3 * scale * persp,
    y: cy - y3 * scale * persp,
    z: z2,
    s: persp * (scale / 220)
  };
}

function interpolate3DPose(keyframes, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  let k0 = keyframes[0];
  let k1 = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (clampedT >= keyframes[i].t && clampedT <= keyframes[i + 1].t) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }
  const span = (k1.t - k0.t) || 0.0001;
  const lt = Math.max(0, Math.min(1, (clampedT - k0.t) / span));

  const lerp = (a, b) => a + (b - a) * lt;
  const lerp3 = (a, b) => [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];

  return {
    pelvisPos: lerp3(k0.pelvisPos, k1.pelvisPos),
    pelvisYaw: lerp(k0.pelvisYaw, k1.pelvisYaw),
    chestYaw: lerp(k0.chestYaw, k1.chestYaw),
    headYaw: lerp(k0.headYaw, k1.headYaw),
    kneeBendDeg: lerp(k0.kneeBendDeg, k1.kneeBendDeg),
    elbowAngleDeg: lerp(k0.elbowAngleDeg, k1.elbowAngleDeg),
    contactOffsetCm: lerp(k0.contactOffsetCm, k1.contactOffsetCm),
    weightR: lerp(k0.weightR, k1.weightR),
    weightL: lerp(k0.weightL, k1.weightL),
    footR: {
      ankle: lerp3(k0.footR.ankle, k1.footR.ankle),
      heel: lerp3(k0.footR.heel, k1.footR.heel),
      toe: lerp3(k0.footR.toe, k1.footR.toe),
      yaw: lerp(k0.footR.yaw, k1.footR.yaw)
    },
    footL: {
      ankle: lerp3(k0.footL.ankle, k1.footL.ankle),
      heel: lerp3(k0.footL.heel, k1.footL.heel),
      toe: lerp3(k0.footL.toe, k1.footL.toe),
      yaw: lerp(k0.footL.yaw, k1.footL.yaw)
    },
    kneeR: lerp3(k0.kneeR, k1.kneeR),
    kneeL: lerp3(k0.kneeL, k1.kneeL),
    hipR: lerp3(k0.hipR, k1.hipR),
    hipL: lerp3(k0.hipL, k1.hipL),
    shR: lerp3(k0.shR, k1.shR),
    shL: lerp3(k0.shL, k1.shL),
    elR: lerp3(k0.elR, k1.elR),
    wrR: lerp3(k0.wrR, k1.wrR),
    rTip: lerp3(k0.rTip, k1.rTip),
    rFaceNormal: lerp3(k0.rFaceNormal, k1.rFaceNormal),
    elL: lerp3(k0.elL, k1.elL),
    wrL: lerp3(k0.wrL, k1.wrL),
    head: lerp3(k0.head, k1.head),
    ball: lerp3(k0.ball, k1.ball)
  };
}

/**
 * Draw 3D Court Floor Force-Plate Grid, Camera Perspective Frustum, Baseline, and Net Vector
 */
function draw3DFloorGrid(ctx, cx, cy, scale, camOverride, gridColor) {
  ctx.save();
  const baseLineCol = gridColor || "rgba(56, 189, 248, 0.35)";

  // Floor Grid Tiles (-1.2m to +1.2m X, -0.8m to +1.2m Z)
  ctx.lineWidth = 1;
  for (let x = -1.2; x <= 1.21; x += 0.3) {
    const p0 = project3D([x, 0, -0.8], cx, cy, scale, camOverride);
    const p1 = project3D([x, 0, 1.2], cx, cy, scale, camOverride);
    ctx.strokeStyle = Math.abs(x) < 0.05 ? baseLineCol : "rgba(148, 163, 184, 0.16)";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  for (let z = -0.8; z <= 1.21; z += 0.3) {
    const p0 = project3D([-1.2, 0, z], cx, cy, scale, camOverride);
    const p1 = project3D([1.2, 0, z], cx, cy, scale, camOverride);
    const isBaseline = Math.abs(z) < 0.05;
    ctx.strokeStyle = isBaseline ? "rgba(255, 255, 255, 0.85)" : "rgba(148, 163, 184, 0.16)";
    ctx.lineWidth = isBaseline ? 3.2 : 1;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  // 3D Vertical Reference Coordinate Axis Pillar at (-1.15, 0, -0.75)
  if (!window.AIPoseEngine || window.AIPoseEngine.showAngleGrid) {
    const origin3D = [-1.15, 0, -0.75];
    const pO = project3D(origin3D, cx, cy, scale, camOverride);
    const pX = project3D([-0.80, 0, -0.75], cx, cy, scale, camOverride);
    const pY = project3D([-1.15, 0.35, -0.75], cx, cy, scale, camOverride);
    const pZ = project3D([-1.15, 0, -0.40], cx, cy, scale, camOverride);

    draw2DArrow(ctx, pO.x, pO.y, pX.x, pX.y, "#ef4444", 1.8); // X axis
    draw2DArrow(ctx, pO.x, pO.y, pY.x, pY.y, "#22c55e", 1.8); // Y axis (Up)
    draw2DArrow(ctx, pO.x, pO.y, pZ.x, pZ.y, "#38bdf8", 1.8); // Z axis (Net)
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "bold 9px monospace";
    ctx.fillText("3D ОСИ (X/Y/Z)", pO.x - 10, pO.y + 14);
  }

  // Direction to Net Arrow on Floor
  const netA = project3D([0, 0.01, 0.65], cx, cy, scale, camOverride);
  const netB = project3D([0, 0.01, 1.15], cx, cy, scale, camOverride);
  draw2DArrow(ctx, netA.x, netA.y, netB.x, netB.y, "#38bdf8", 2.5);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("⚡ К СЕТКЕ (+Z)", netB.x - 42, netB.y - 7);

  ctx.restore();
}

function draw2DArrow(ctx, x1, y1, x2, y2, color, width) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 2) return;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.min(dist * 0.65, 8 + width * 1.6);
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
 * Draw a True 3D Wireframe + Shaded Cylinder Limb with 3D Cross-Sectional Ellipses
 * and Longitudinal 3D Ribs so 3D depth, orientation, and foreshortening are unmistakable!
 */
function draw3DWireframeCylinderLimb(ctx, ptA3D, ptB3D, radiusM, cx, cy, scale, theme, camOverride, isGhostStrobe) {
  const dx = ptB3D[0] - ptA3D[0];
  const dy = ptB3D[1] - ptA3D[1];
  const dz = ptB3D[2] - ptA3D[2];
  const len = Math.hypot(dx, dy, dz) || 0.001;

  // Unit bone vector U = (ux, uy, uz)
  const ux = dx / len, uy = dy / len, uz = dz / len;

  // Two orthogonal basis vectors V1, V2 perpendicular to bone in 3D space
  let vx = -uz, vy = 0, vz = ux;
  let vLen = Math.hypot(vx, vy, vz);
  if (vLen < 0.05) { vx = 1; vy = 0; vz = 0; vLen = 1; }
  vx /= vLen; vy /= vLen; vz /= vLen;

  const wx = uy * vz - uz * vy;
  const wy = uz * vx - ux * vz;
  const wz = ux * vy - uy * vx;

  const p1 = project3D(ptA3D, cx, cy, scale, camOverride);
  const p2 = project3D(ptB3D, cx, cy, scale, camOverride);

  // First draw translucent volumetric capsule body
  if (!isGhostStrobe) {
    draw3DLimb(ctx, p1, p2, radiusM * 215, theme.main, theme.highlight);
  }

  // Generate 3D cross-section rings at s = 0.15, 0.50, 0.85 along the bone
  const ringFractions = isGhostStrobe ? [0.2, 0.8] : [0.12, 0.50, 0.88];
  const numSides = 8;
  const rings2D = [];

  ringFractions.forEach((f) => {
    const r = radiusM * (1 - f * 0.18);
    const center = [
      ptA3D[0] + dx * f,
      ptA3D[1] + dy * f,
      ptA3D[2] + dz * f
    ];
    const pts = [];
    for (let i = 0; i < numSides; i++) {
      const ang = (i / numSides) * Math.PI * 2;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const p3 = [
        center[0] + r * (cosA * vx + sinA * wx),
        center[1] + r * (cosA * vy + sinA * wy),
        center[2] + r * (cosA * vz + sinA * wz)
      ];
      pts.push(project3D(p3, cx, cy, scale, camOverride));
    }
    rings2D.push(pts);
  });

  ctx.save();
  ctx.strokeStyle = isGhostStrobe ? theme.footTrail : theme.wireframe;
  ctx.lineWidth = isGhostStrobe ? 1.0 : 1.25;

  // Draw 3D Cross-Section Rings around limb
  rings2D.forEach((ring) => {
    ctx.beginPath();
    ring.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  // Draw 4 Longitudinal 3D Wireframe Ribs along the limb
  for (let i = 0; i < numSides; i += 2) {
    ctx.beginPath();
    for (let rIdx = 0; rIdx < rings2D.length; rIdx++) {
      const pt = rings2D[rIdx][i];
      if (rIdx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw a True 3D Oriented 8-Corner Wireframe Box (for 3D Pelvis, 3D Ribcage, and 3D Shoes)
 */
function draw3DOrientedWireframeBox(ctx, center3D, halfExtents, yawDeg, cx, cy, scale, fillStyle, strokeStyle, camOverride) {
  const [hx, hy, hz] = halfExtents;
  const rad = (yawDeg * Math.PI) / 180;
  const cosY = Math.cos(rad);
  const sinY = Math.sin(rad);

  const localCorners = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], // Back face (0,1,2,3)
    [-hx, -hy,  hz], [hx, -hy,  hz], [hx, hy,  hz], [-hx, hy,  hz]  // Front face (4,5,6,7)
  ];

  const projCorners = localCorners.map(([lx, ly, lz]) => {
    const wx = center3D[0] + lx * cosY + lz * sinY;
    const wy = center3D[1] + ly;
    const wz = center3D[2] - lx * sinY + lz * cosY;
    return project3D([wx, wy, wz], cx, cy, scale, camOverride);
  });

  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.5;

  // Draw Back Face
  ctx.beginPath();
  [0, 1, 2, 3].forEach((idx, i) => i === 0 ? ctx.moveTo(projCorners[idx].x, projCorners[idx].y) : ctx.lineTo(projCorners[idx].x, projCorners[idx].y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw Connecting Side Edges
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(projCorners[i].x, projCorners[i].y);
    ctx.lineTo(projCorners[i + 4].x, projCorners[i + 4].y);
    ctx.stroke();
  }

  // Draw Front Face (facing player's heading direction +Z)
  ctx.fillStyle = fillStyle;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  [4, 5, 6, 7].forEach((idx, i) => i === 0 ? ctx.moveTo(projCorners[idx].x, projCorners[idx].y) : ctx.lineTo(projCorners[idx].x, projCorners[idx].y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front X-cross wireframe on the front face so 3D front orientation is unmistakable
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(projCorners[4].x, projCorners[4].y);
  ctx.lineTo(projCorners[6].x, projCorners[6].y);
  ctx.moveTo(projCorners[5].x, projCorners[5].y);
  ctx.lineTo(projCorners[7].x, projCorners[7].y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw Volumetric Shaded 3D Capsule Limb
 */
function draw3DLimb(ctx, p1, p2, radiusPx, mainColor, highlightColor) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const r1 = Math.max(2, radiusPx * p1.s);
  const r2 = Math.max(2, radiusPx * p2.s * 0.82);

  ctx.save();
  const grad = ctx.createLinearGradient(
    (p1.x + p2.x) / 2 - nx * r1,
    (p1.y + p2.y) / 2 - ny * r1,
    (p1.x + p2.x) / 2 + nx * r1,
    (p1.y + p2.y) / 2 + ny * r1
  );
  grad.addColorStop(0, mainColor);
  grad.addColorStop(0.4, highlightColor);
  grad.addColorStop(1, "rgba(15, 23, 42, 0.85)");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1.1;

  ctx.beginPath();
  ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
  ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
  ctx.arc(p2.x, p2.y, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
  ctx.arc(p1.x, p1.y, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw 3D Articulated Shoe Cage (Heel Block + Midfoot Arch + Toe Box + Sole Tread Grid + Velocity Vector)
 */
function draw3DArticulatedShoeCage(ctx, foot, nextFoot, cx, cy, scale, theme, camOverride, isGhostStrobe) {
  const yawRad = (foot.yaw * Math.PI) / 180;
  const nx = Math.cos(yawRad) * 0.055; // half-width of shoe (5.5cm)
  const nz = -Math.sin(yawRad) * 0.055;

  // 8 3D vertices of the anatomical shoe prism (heel to toe, sole to ankle cuff)
  const hL = [foot.heel[0] - nx, foot.heel[1], foot.heel[2] - nz];
  const hR = [foot.heel[0] + nx, foot.heel[1], foot.heel[2] + nz];
  const tL = [foot.toe[0] - nx * 1.15, foot.toe[1], foot.toe[2] - nz * 1.15];
  const tR = [foot.toe[0] + nx * 1.15, foot.toe[1], foot.toe[2] + nz * 1.15];

  const hTopL = [hL[0], foot.ankle[1], hL[2]];
  const hTopR = [hR[0], foot.ankle[1], hR[2]];
  const tTopL = [tL[0], foot.toe[1] + 0.045, tL[2]];
  const tTopR = [tR[0], foot.toe[1] + 0.045, tR[2]];

  const P = [hL, hR, tR, tL, hTopL, hTopR, tTopR, tTopL].map(pt => project3D(pt, cx, cy, scale, camOverride));

  ctx.save();
  ctx.fillStyle = isGhostStrobe ? "rgba(255,255,255,0.05)" : theme.shoeColor;
  ctx.strokeStyle = isGhostStrobe ? theme.footTrail : "#ffffff";
  ctx.lineWidth = isGhostStrobe ? 1.0 : 1.5;

  // Sole Polygon (0-1-2-3)
  ctx.beginPath();
  ctx.moveTo(P[0].x, P[0].y); ctx.lineTo(P[1].x, P[1].y);
  ctx.lineTo(P[2].x, P[2].y); ctx.lineTo(P[3].x, P[3].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper 3D Shoe Mesh (4-5-6-7)
  ctx.fillStyle = isGhostStrobe ? "rgba(255,255,255,0.04)" : theme.main;
  ctx.beginPath();
  ctx.moveTo(P[4].x, P[4].y); ctx.lineTo(P[5].x, P[5].y);
  ctx.lineTo(P[6].x, P[6].y); ctx.lineTo(P[7].x, P[7].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vertical 3D Shoe Side Ribs
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(P[i].x, P[i].y);
    ctx.lineTo(P[i + 4].x, P[i + 4].y);
    ctx.stroke();
  }

  // Cross Laces / Tread Wireframe Lines across the shoe top
  for (let f = 0.35; f <= 0.75; f += 0.2) {
    const lPt = project3D([
      hTopL[0] + (tTopL[0] - hTopL[0]) * f,
      hTopL[1] + (tTopL[1] - hTopL[1]) * f,
      hTopL[2] + (tTopL[2] - hTopL[2]) * f
    ], cx, cy, scale, camOverride);
    const rPt = project3D([
      hTopR[0] + (tTopR[0] - hTopR[0]) * f,
      hTopR[1] + (tTopR[1] - hTopR[1]) * f,
      hTopR[2] + (tTopR[2] - hTopR[2]) * f
    ], cx, cy, scale, camOverride);
    ctx.beginPath();
    ctx.moveTo(lPt.x, lPt.y);
    ctx.lineTo(rPt.x, rPt.y);
    ctx.stroke();
  }

  if (!isGhostStrobe && Viewer3D.layers.feetAndSteps) {
    // 1. Toe Facing Orientation Vector (compass heading of the shoe)
    const pToe = project3D(foot.toe, cx, cy, scale, camOverride);
    const toeDir3D = [
      foot.toe[0] + Math.sin(yawRad) * 0.22,
      foot.toe[1] + 0.01,
      foot.toe[2] + Math.cos(yawRad) * 0.22
    ];
    const pToeEnd = project3D(toeDir3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, pToe.x, pToe.y, pToeEnd.x, pToeEnd.y, theme.accent, 2.3);

    // 2. Instantaneous 3D Foot Movement Velocity Vector (shows step direction & movement!)
    if (nextFoot) {
      const vx = (nextFoot.ankle[0] - foot.ankle[0]) * 3.2;
      const vy = (nextFoot.ankle[1] - foot.ankle[1]) * 3.2;
      const vz = (nextFoot.ankle[2] - foot.ankle[2]) * 3.2;
      const speedMag = Math.hypot(vx, vy, vz);
      if (speedMag > 0.04) {
        const pAnkle = project3D(foot.ankle, cx, cy, scale, camOverride);
        const pVelEnd = project3D([
          foot.ankle[0] + vx,
          Math.max(0.02, foot.ankle[1] + vy),
          foot.ankle[2] + vz
        ], cx, cy, scale, camOverride);
        draw2DArrow(ctx, pAnkle.x, pAnkle.y, pVelEnd.x, pVelEnd.y, "#22c55e", 2.8);
      }
    }
  }

  ctx.restore();
}

/**
 * Draw Full 3D Volumetric Wireframe & Exoskeleton Athlete with:
 * - 3D Motion Strobe Ghosts (Onion-skin movement trails of past frames)
 * - 3D Articulated Shoe Cages + Toe Direction & Step Velocity Vectors
 * - 3D Oriented Pelvis & Ribcage Wireframe Boxes + Heading Arrows
 * - 3D Cylindrical Wireframe Limbs with 3D Cross-Section Rings
 */
function draw3DVolumetricAthlete(ctx, pose, keyframes, cx, cy, scale, theme, alpha, camOverride, isStrobePass) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tNow = AppState.overlay.progress;
  const nextPose = interpolate3DPose(keyframes, Math.min(1.0, tNow + 0.06));

  // 0. 3D MOTION STROBE / ONION-SKIN GHOSTS (Shows 3D movement of feet, legs, torso, and racket!)
  if (!isStrobePass && (!window.AIPoseEngine || window.AIPoseEngine.showMotionStrobe)) {
    const strobeOffsets = [-0.14, -0.07];
    strobeOffsets.forEach((dt, idx) => {
      const stT = tNow + dt;
      if (stT >= 0.0) {
        const stPose = interpolate3DPose(keyframes, stT);
        const stAlpha = alpha * (idx === 0 ? 0.18 : 0.28);
        draw3DVolumetricAthlete(ctx, stPose, keyframes, cx, cy, scale, theme, stAlpha, camOverride, true);
      }
    });
  }

  // 1. FOOTWORK TRAILS, STANCE LINE, WEIGHT RINGS & SHOE VECTORS ON FLOOR
  if (!isStrobePass && Viewer3D.layers.feetAndSteps) {
    // Draw 3D Foot Movement Paths across the entire stroke with directional chevrons
    ['footR', 'footL'].forEach((fKey) => {
      ctx.beginPath();
      for (let s = 0; s <= 16; s++) {
        const kfPose = interpolate3DPose(keyframes, s / 16);
        const pt = project3D([kfPose[fKey].ankle[0], 0.015, kfPose[fKey].ankle[2]], cx, cy, scale, camOverride);
        if (s === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = theme.footTrail;
      ctx.lineWidth = 3.2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Stance Line connecting Left and Right Ankle on floor + Stance Angle Display
    const flFloor = project3D([pose.footL.ankle[0], 0.01, pose.footL.ankle[2]], cx, cy, scale, camOverride);
    const frFloor = project3D([pose.footR.ankle[0], 0.01, pose.footR.ankle[2]], cx, cy, scale, camOverride);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(flFloor.x, flFloor.y);
    ctx.lineTo(frFloor.x, frFloor.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ground Reaction Force (Weight %) Rings under each foot
    [
      { f: pose.footR, w: pose.weightR, tag: 'Прав' },
      { f: pose.footL, w: pose.weightL, tag: 'Лев' }
    ].forEach(({ f, w, tag }) => {
      const groundPt = project3D([f.ankle[0], 0.01, f.ankle[2]], cx, cy, scale, camOverride);
      const ringRadius = (12 + (w / 100) * 24) * groundPt.s;
      ctx.fillStyle = theme.glowRing;
      ctx.beginPath();
      ctx.ellipse(groundPt.x, groundPt.y, ringRadius, ringRadius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`${tag}:${Math.round(w)}%`, groundPt.x - 22, groundPt.y + 18);
    });
  }

  // 2. 3D SWING PATH RIBBON (Volumetric 3D Band from Wrist to Racket Tip across time)
  if (!isStrobePass && Viewer3D.layers.swingRibbon) {
    ctx.save();
    for (let s = 0; s < 24; s++) {
      const t0 = s / 24;
      const t1 = (s + 1) / 24;
      const sp0 = interpolate3DPose(keyframes, t0);
      const sp1 = interpolate3DPose(keyframes, t1);
      const tip0 = project3D(sp0.rTip, cx, cy, scale, camOverride);
      const tip1 = project3D(sp1.rTip, cx, cy, scale, camOverride);
      const wr0 = project3D(sp0.wrR, cx, cy, scale, camOverride);
      const wr1 = project3D(sp1.wrR, cx, cy, scale, camOverride);

      // Draw translucent 3D swept quad between wrist path and racket-tip path
      ctx.fillStyle = theme.ribbonFill;
      ctx.beginPath();
      ctx.moveTo(tip0.x, tip0.y);
      ctx.lineTo(tip1.x, tip1.y);
      ctx.lineTo(wr1.x, wr1.y);
      ctx.lineTo(wr0.x, wr0.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = theme.ribbon;
      ctx.lineWidth = 3.5;
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

  // 3. 3D ARTICULATED SHOE CAGES & MOVEMENT VECTORS
  draw3DArticulatedShoeCage(ctx, pose.footR, nextPose.footR, cx, cy, scale, theme, camOverride, isStrobePass);
  draw3DArticulatedShoeCage(ctx, pose.footL, nextPose.footL, cx, cy, scale, theme, camOverride, isStrobePass);

  // 4. VOLUMETRIC 3D WIREFRAME LEGS (Depth-sorted with 3D Cylindrical Cross-Section Rings)
  const legs = [
    { z: (P.hipR.z + P.kneeR.z) / 2, fn: () => {
      draw3DWireframeCylinderLimb(ctx, pose.hipR, pose.kneeR, 0.068, cx, cy, scale, theme, camOverride, isStrobePass);
      draw3DWireframeCylinderLimb(ctx, pose.kneeR, pose.footR.ankle, 0.052, cx, cy, scale, theme, camOverride, isStrobePass);
    }},
    { z: (P.hipL.z + P.kneeL.z) / 2, fn: () => {
      draw3DWireframeCylinderLimb(ctx, pose.hipL, pose.kneeL, 0.068, cx, cy, scale, theme, camOverride, isStrobePass);
      draw3DWireframeCylinderLimb(ctx, pose.kneeL, pose.footL.ankle, 0.052, cx, cy, scale, theme, camOverride, isStrobePass);
    }}
  ];
  legs.sort((a, b) => a.z - b.z).forEach(l => l.fn());

  // 5. TRUE 3D ORIENTED PELVIS BOX & 3D RIBCAGE EXOSKELETON BOX
  const chestCenter3D = [
    (pose.shR[0] + pose.shL[0] + pose.hipR[0] + pose.hipL[0]) / 4,
    (pose.shR[1] + pose.shL[1]) * 0.35 + (pose.hipR[1] + pose.hipL[1]) * 0.15,
    (pose.shR[2] + pose.shL[2] + pose.hipR[2] + pose.hipL[2]) / 4
  ];

  // Pelvis 3D Oriented Box
  draw3DOrientedWireframeBox(
    ctx,
    pose.pelvisPos,
    [0.16, 0.08, 0.10],
    pose.pelvisYaw,
    cx, cy, scale,
    isStrobePass ? "rgba(255,255,255,0.03)" : theme.boxFill,
    isStrobePass ? theme.footTrail : theme.accent,
    camOverride
  );

  // Ribcage / Torso 3D Oriented Box
  draw3DOrientedWireframeBox(
    ctx,
    chestCenter3D,
    [0.19, 0.16, 0.11],
    pose.chestYaw,
    cx, cy, scale,
    isStrobePass ? "rgba(255,255,255,0.03)" : theme.boxFill,
    isStrobePass ? theme.footTrail : theme.accent,
    camOverride
  );

  // 6. PELVIS, SHOULDER & KNEE 3D DIRECTION ARROWS (X-Factor & Knee Drive Vectors)
  if (!isStrobePass && Viewer3D.layers.directionVectors) {
    // Pelvis Facing Vector
    const pelRad = (pose.pelvisYaw * Math.PI) / 180;
    const pelStart3D = pose.pelvisPos;
    const pelEnd3D = [
      pelStart3D[0] + Math.sin(pelRad) * 0.44,
      pelStart3D[1],
      pelStart3D[2] + Math.cos(pelRad) * 0.44
    ];
    const pS = project3D(pelStart3D, cx, cy, scale, camOverride);
    const pE = project3D(pelEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, pS.x, pS.y, pE.x, pE.y, theme.accent, 2.8);

    // Chest / Shoulder Facing Vector
    const chRad = (pose.chestYaw * Math.PI) / 180;
    const chStart3D = [
      (pose.shR[0] + pose.shL[0]) / 2,
      (pose.shR[1] + pose.shL[1]) / 2,
      (pose.shR[2] + pose.shL[2]) / 2
    ];
    const chEnd3D = [
      chStart3D[0] + Math.sin(chRad) * 0.48,
      chStart3D[1],
      chStart3D[2] + Math.cos(chRad) * 0.48
    ];
    const cS = project3D(chStart3D, cx, cy, scale, camOverride);
    const cE = project3D(chEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, cS.x, cS.y, cE.x, cE.y, "#ffffff", 2.8);
  }

  // 7. VOLUMETRIC 3D WIREFRAME ARMS
  draw3DWireframeCylinderLimb(ctx, pose.shL, pose.elL, 0.045, cx, cy, scale, theme, camOverride, isStrobePass);
  draw3DWireframeCylinderLimb(ctx, pose.elL, pose.wrL, 0.038, cx, cy, scale, theme, camOverride, isStrobePass);
  draw3DWireframeCylinderLimb(ctx, pose.shR, pose.elR, 0.048, cx, cy, scale, theme, camOverride, isStrobePass);
  draw3DWireframeCylinderLimb(ctx, pose.elR, pose.wrR, 0.040, cx, cy, scale, theme, camOverride, isStrobePass);

  // 8. 3D ARTICULATED JOINTS (Spheres with 3D Equator Rings)
  if (!isStrobePass) {
    [P.shR, P.shL, P.elR, P.wrR, P.elL, P.wrL, P.hipR, P.hipL, P.kneeR, P.kneeL, P.ankleR, P.ankleL].forEach(j => {
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(j.x, j.y, 5.2 * j.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  // 9. 3D WIREFRAME HEAD SPHERE WITH VISOR & GAZE RAY
  const headR = Math.max(4, 17 * P.head.s);
  if (!isStrobePass) {
    const headGrad = ctx.createRadialGradient(P.head.x - 4, P.head.y - 5, 2, P.head.x, P.head.y, headR);
    headGrad.addColorStop(0, theme.highlight);
    headGrad.addColorStop(1, theme.main);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(P.head.x, P.head.y, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3D Latitude/Longitude Wireframe Rings on Head
    ctx.strokeStyle = theme.wireframe;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(P.head.x, P.head.y, headR, headR * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(P.head.x, P.head.y, headR * 0.45, headR, (pose.headYaw * Math.PI) / 360, 0, Math.PI * 2);
    ctx.stroke();

    // Visor showing gaze direction
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(P.head.x, P.head.y - 2, headR * 0.95, -0.25, Math.PI + 0.25, true);
    ctx.stroke();
  }

  // 10. 3D TENNIS RACKET, STRING BED GRID & FACE NORMAL VECTOR
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

  ctx.strokeStyle = isStrobePass ? theme.footTrail : "#f8fafc";
  ctx.lineWidth = Math.max(1.5, 4 * P.wrR.s);
  ctx.beginPath();
  ctx.moveTo(P.wrR.x, P.wrR.y);
  ctx.lineTo(PThroat.x, PThroat.y);
  ctx.stroke();

  const rAngle = Math.atan2(P.rTip.y - PThroat.y, P.rTip.x - PThroat.x);
  const rLen = Math.hypot(P.rTip.x - PThroat.x, P.rTip.y - PThroat.y) / 2;
  ctx.save();
  ctx.translate(PHoop.x, PHoop.y);
  ctx.rotate(rAngle);
  ctx.fillStyle = isStrobePass ? "rgba(255,255,255,0.03)" : theme.racketStrings;
  ctx.strokeStyle = isStrobePass ? theme.footTrail : theme.accent;
  ctx.lineWidth = isStrobePass ? 1.5 : 3;
  const rx = Math.max(8, rLen);
  const ry = Math.max(6, 15 * PHoop.s);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wireframe String Mesh inside Racket Hoop
  if (!isStrobePass) {
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 0.8;
    for (let sx = -0.6; sx <= 0.61; sx += 0.4) {
      ctx.beginPath();
      ctx.moveTo(sx * rx, -ry * 0.8);
      ctx.lineTo(sx * rx, ry * 0.8);
      ctx.stroke();
    }
    for (let sy = -0.6; sy <= 0.61; sy += 0.4) {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.8, sy * ry);
      ctx.lineTo(rx * 0.8, sy * ry);
      ctx.stroke();
    }
  }
  ctx.restore();

  // String-Bed Normal Vector (shows face angle!)
  if (!isStrobePass && Viewer3D.layers.directionVectors && pose.rFaceNormal) {
    const normEnd3D = [
      centerHoop3D[0] + pose.rFaceNormal[0] * 0.28,
      centerHoop3D[1] + pose.rFaceNormal[1] * 0.28,
      centerHoop3D[2] + pose.rFaceNormal[2] * 0.28
    ];
    const normEnd2D = project3D(normEnd3D, cx, cy, scale, camOverride);
    draw2DArrow(ctx, PHoop.x, PHoop.y, normEnd2D.x, normEnd2D.y, "#bef264", 2.2);
  }

  // 11. 3D TENNIS BALL & FLOOR SHADOW DROP LINE
  if (!isStrobePass && pose.ball) {
    const ballP = project3D(pose.ball, cx, cy, scale, camOverride);
    const ballFloor = project3D([pose.ball[0], 0.01, pose.ball[2]], cx, cy, scale, camOverride);

    ctx.strokeStyle = "rgba(190, 242, 100, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ballP.x, ballP.y);
    ctx.lineTo(ballFloor.x, ballFloor.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(ballFloor.x, ballFloor.y, 7 * ballFloor.s, 3.5 * ballFloor.s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.arc(ballP.x, ballP.y, 7.5 * ballP.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  if (!isStrobePass) {
    ctx.fillStyle = theme.accent;
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(theme.label, P.head.x - 54, P.head.y - headR - 10);
  }

  ctx.restore();
  return P;
}

/**
 * Main Render Function for Module 1:
 * Renders Both Reference Video & Uploaded Video with AI Camera-Angle Alignment
 * and Overlays Full 3D Volumetric Wireframes + Motion Strobe on BOTH Videos!
 */
function render3DOverlayStage() {
  const canvas = document.getElementById('overlay-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#070b12";
  ctx.fillRect(0, 0, w, h);

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const t = AppState.overlay.progress;

  const userVid = document.getElementById('user-video-element');
  const proVid = document.getElementById('pro-video-element');

  // Run AI 3D Pose Extraction on uploaded video frames if loaded
  if (typeof processVideoFrameWithAI === 'function') {
    const nowMs = performance.now();
    if (AppState.overlay.userVideoLoaded) processVideoFrameWithAI(userVid, 'user', nowMs);
    if (AppState.overlay.proVideoLoaded) processVideoFrameWithAI(proVid, 'pro', nowMs + 1);
  }

  const proPose = (window.AIPoseEngine && window.AIPoseEngine.liveProPose3D)
    ? window.AIPoseEngine.liveProPose3D
    : interpolate3DPose(stroke.proKeyframes, t);

  const userPose = (window.AIPoseEngine && window.AIPoseEngine.liveUserPose3D)
    ? window.AIPoseEngine.liveUserPose3D
    : interpolate3DPose(stroke.userKeyframes, t);

  const isAligned = window.AIPoseEngine ? window.AIPoseEngine.autoAlignEnabled : true;
  const usrCam = window.AIPoseEngine ? window.AIPoseEngine.userDetectedCam : { yaw: -43.5, pitch: 12.4, roll: 2.8, scaleRatio: 1.12, offsetX: -28, offsetY: 16 };

  // When AI Auto-Alignment is OFF, show the User's unaligned imperfect camera angle!
  // When AI Auto-Alignment is ON, both cameras are locked to the exact same 3D perspective!
  const proCam = { yaw: Viewer3D.cam.yaw, pitch: Viewer3D.cam.pitch, roll: 0 };
  const userCam = isAligned
    ? { yaw: Viewer3D.cam.yaw, pitch: Viewer3D.cam.pitch, roll: 0 }
    : { yaw: Viewer3D.cam.yaw - 15.5, pitch: Math.max(4, Viewer3D.cam.pitch - 6.0), roll: usrCam.roll };

  const proTheme = {
    label: `⭐ 3D ЭТАЛОН: ${stroke.proName.split('(')[0].trim()}`,
    main: "rgba(217, 119, 6, 0.72)",
    highlight: "rgba(253, 224, 71, 0.85)",
    accent: "#fbbf24",
    wireframe: "rgba(254, 240, 138, 0.78)",
    boxFill: "rgba(245, 158, 11, 0.28)",
    shoeColor: "rgba(245, 158, 11, 0.82)",
    footTrail: "rgba(251, 191, 36, 0.75)",
    glowRing: "rgba(251, 191, 36, 0.25)",
    ribbon: "rgba(250, 204, 21, 0.80)",
    ribbonFill: "rgba(250, 204, 21, 0.16)",
    racketStrings: "rgba(251, 191, 36, 0.22)"
  };

  const userTheme = {
    label: "👤 3D СЕТКА ВАШЕГО ВИДЕО",
    main: "rgba(2, 132, 199, 0.72)",
    highlight: "rgba(125, 211, 252, 0.85)",
    accent: "#38bdf8",
    wireframe: "rgba(186, 230, 253, 0.82)",
    boxFill: "rgba(14, 165, 233, 0.28)",
    shoeColor: "rgba(14, 165, 233, 0.82)",
    footTrail: "rgba(56, 189, 248, 0.75)",
    glowRing: "rgba(56, 189, 248, 0.25)",
    ribbon: "rgba(56, 189, 248, 0.80)",
    ribbonFill: "rgba(56, 189, 248, 0.16)",
    racketStrings: "rgba(56, 189, 248, 0.22)"
  };

  const baseScale = 235 * Viewer3D.cam.zoom;
  const centerY = h * 0.52 + Viewer3D.cam.panY;
  const centerX = w * 0.50 + Viewer3D.cam.panX;
  const userUnalignedCenterX = isAligned ? centerX : centerX + usrCam.offsetX;
  const userUnalignedCenterY = isAligned ? centerY : centerY + usrCam.offsetY;
  const userUnalignedScale = isAligned ? baseScale : baseScale / usrCam.scaleRatio;

  if (AppState.overlay.mode === 'split') {
    // =======================================================================
    // DUAL SIDE-BY-SIDE MODE: Reference Video + 3D Wireframe (Left)
    //                         Uploaded Video + 3D Wireframe (Right)
    // =======================================================================
    // LEFT: Reference Video + Reference 3D Wireframe
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) {
      drawAlignedVideoCover(ctx, proVid, 0, 0, w / 2, h, 'pro', isAligned);
    } else if (typeof renderSimulatedCourtVideoFrame === 'function') {
      renderSimulatedCourtVideoFrame(ctx, w / 2, h, 'pro', proPose, proCam, true);
    }
    if (!AppState.overlay.proVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, w * 0.25, centerY, baseScale * 0.86, proCam, "rgba(251, 191, 36, 0.4)");
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.25, centerY, baseScale * 0.86, proTheme, 0.96, proCam, false);
    }
    // Top-left panel tag
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(12, 46, 265, 24);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`КАМЕРА ЭТАЛОНА: Yaw ${proCam.yaw.toFixed(0)}° / Pitch ${proCam.pitch.toFixed(0)}°`, 18, 62);
    ctx.restore();

    // RIGHT: Uploaded Video + User 3D Wireframe (+ Optional Ghost Reference Comparison)
    ctx.save();
    ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      drawAlignedVideoCover(ctx, userVid, w / 2, 0, w / 2, h, 'user', isAligned);
    } else {
      ctx.save();
      ctx.translate(w / 2, 0);
      if (typeof renderSimulatedCourtVideoFrame === 'function') {
        renderSimulatedCourtVideoFrame(ctx, w / 2, h, 'user', userPose, userCam, isAligned);
      }
      ctx.restore();
    }
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      const rightCX = w * 0.75 + (isAligned ? 0 : usrCam.offsetX * 0.6);
      const rightCY = centerY + (isAligned ? 0 : usrCam.offsetY * 0.6);
      const rightScale = (isAligned ? baseScale : userUnalignedScale) * 0.86;
      draw3DFloorGrid(ctx, rightCX, rightCY, rightScale, userCam, "rgba(56, 189, 248, 0.4)");
      // Faint Pro 3D Wireframe Ghost on the right side too so user sees exact alignment delta!
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.75, centerY, baseScale * 0.86, proTheme, 0.28, proCam, false);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, rightCX, rightCY, rightScale, userTheme, 0.96, userCam, false);
    }
    // Top-right panel camera angle telemetry tag
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(w / 2 + 12, 46, 345, 24);
    ctx.fillStyle = isAligned ? "#34d399" : "#f87171";
    ctx.font = "bold 11px monospace";
    ctx.fillText(
      isAligned
        ? `🤖 AI ВЫРОВНЕНО: Угол и масштаб синхронизированы с эталоном`
        : `⚠️ УГОЛ НЕ ВЫРОВНЕН: Yaw ${userCam.yaw.toFixed(0)}°, Крен +${usrCam.roll}°, Сдвиг X/Y`,
      w / 2 + 18, 62
    );
    ctx.restore();

    // Center divider
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'curtain') {
    const splitX = AppState.overlay.curtainX * w;

    // Left of curtain: Pro Video + 3D Wireframe
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) {
      drawAlignedVideoCover(ctx, proVid, 0, 0, w, h, 'pro', isAligned);
    } else if (typeof renderSimulatedCourtVideoFrame === 'function') {
      renderSimulatedCourtVideoFrame(ctx, w, h, 'pro', proPose, proCam, true);
    }
    draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);
    draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, centerX, centerY, baseScale, proTheme, 0.96, proCam, false);
    ctx.restore();

    // Right of curtain: User Video + 3D Wireframe
    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      drawAlignedVideoCover(ctx, userVid, 0, 0, w, h, 'user', isAligned);
    } else if (typeof renderSimulatedCourtVideoFrame === 'function') {
      renderSimulatedCourtVideoFrame(ctx, w, h, 'user', userPose, userCam, isAligned);
    }
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, userUnalignedCenterX, userUnalignedCenterY, userUnalignedScale, userCam);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, userUnalignedCenterX, userUnalignedCenterY, userUnalignedScale, userTheme, 0.96, userCam, false);
    }
    ctx.restore();

  } else {
    // =======================================================================
    // AI ALIGNED GHOST OVERLAY MODE (Default):
    // Aligns BOTH videos and overlays BOTH 3D Volumetric Wireframes + Vectors
    // =======================================================================
    const proAlpha = 1.0 - AppState.overlay.alpha;
    const userAlpha = AppState.overlay.alpha;

    // Render video layers (Real uploaded videos or simulated court feeds)
    if (AppState.overlay.userVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.proVideoLoaded ? Math.max(0.38, userAlpha) : 0.92;
      drawAlignedVideoCover(ctx, userVid, 0, 0, w, h, 'user', isAligned);
      ctx.restore();
    } else if (typeof renderSimulatedCourtVideoFrame === 'function') {
      renderSimulatedCourtVideoFrame(ctx, w, h, 'user', userPose, userCam, isAligned);
    }

    if (AppState.overlay.proVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.userVideoLoaded ? proAlpha : 0.85;
      drawAlignedVideoCover(ctx, proVid, 0, 0, w, h, 'pro', isAligned);
      ctx.restore();
    }

    // Draw 3D Volumetric Wireframe Exoskeletons on BOTH Reference and Uploaded Video
    if ((!AppState.overlay.userVideoLoaded && !AppState.overlay.proVideoLoaded) || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale, proCam);

      // If unaligned, also show the unaligned user floor grid in red/cyan so the camera angle mismatch is visible
      if (!isAligned) {
        draw3DFloorGrid(ctx, userUnalignedCenterX, userUnalignedCenterY, userUnalignedScale, userCam, "rgba(248, 113, 113, 0.45)");
      }

      // Draw User 3D Volumetric Wireframe + 3D Feet + Motion Strobe
      const pUser = draw3DVolumetricAthlete(
        ctx, userPose, stroke.userKeyframes,
        userUnalignedCenterX, userUnalignedCenterY, userUnalignedScale,
        userTheme, Math.max(0.32, userAlpha), userCam, false
      );

      // Draw Pro 3D Volumetric Wireframe + 3D Feet + Motion Strobe
      const pPro = draw3DVolumetricAthlete(
        ctx, proPose, stroke.proKeyframes,
        centerX, centerY, baseScale,
        proTheme, Math.max(0.32, proAlpha), proCam, false
      );

      // Draw 3D Joint-to-Joint Alignment & Deviation Vectors between Reference and User
      draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, centerX, centerY, baseScale, proCam);
    }
  }

  // Update Bottom HUD Telemetry
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

/**
 * Draws 3D Biomechanical Deviation Callouts & Joint Alignment Vectors
 * bridging the Reference 3D Wireframe and User 3D Wireframe
 */
function draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, cx, cy, scale, camOverride) {
  ctx.save();

  // Draw red dashed alignment vectors connecting key mismatched joints (Wrist, Right Knee, Left Foot)
  [
    { a: pUser.wrR, b: pPro.wrR },
    { a: pUser.kneeR, b: pPro.kneeR },
    { a: pUser.toeL, b: pPro.toeL }
  ].forEach(({ a, b }) => {
    if (!a || !b) return;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist > 8) {
      draw2DArrow(ctx, a.x, a.y, b.x, b.y, "rgba(248, 113, 113, 0.85)", 1.8);
    }
  });

  // Contact zone delta callout around T2 (t between 0.48 and 0.74)
  if (AppState.overlay.progress >= 0.48 && AppState.overlay.progress <= 0.74) {
    const bPro = project3D(proPose.ball, cx, cy, scale, camOverride);
    const bUsr = project3D(userPose.ball, cx, cy, scale, camOverride);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(bPro.x, bPro.y);
    ctx.lineTo(bUsr.x, bUsr.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (bPro.x + bUsr.x) / 2;
    const midY = Math.min(bPro.y, bUsr.y) - 18;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(midX - 88, midY - 15, 180, 22);
    ctx.strokeStyle = "#ef4444";
    ctx.strokeRect(midX - 88, midY - 15, 180, 22);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`Δ Контакт: ${Math.round(proPose.contactOffsetCm - userPose.contactOffsetCm)} см вперёд`, midX - 80, midY);
  }

  // Knee Bend & Foot Angle comparison tag
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(pPro.kneeR.x + 14, pPro.kneeR.y - 12, 195, 36);
  ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
  ctx.strokeRect(pPro.kneeR.x + 14, pPro.kneeR.y - 12, 195, 36);
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 10px monospace";
  ctx.fillText(`Колени: ${Math.round(proPose.kneeBendDeg)}° vs ${Math.round(userPose.kneeBendDeg)}°`, pPro.kneeR.x + 19, pPro.kneeR.y + 1);
  ctx.fillStyle = "#7dd3fc";
  ctx.fillText(`Стопа Прав Yaw: ${Math.round(proPose.footR.yaw)}° vs ${Math.round(userPose.footR.yaw)}°`, pPro.kneeR.x + 19, pPro.kneeR.y + 16);

  ctx.restore();
}
