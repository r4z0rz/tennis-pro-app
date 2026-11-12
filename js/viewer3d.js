/**
 * Tennis Pro Analytics 3D — Volumetric 3D Ghost Engine + Real Video Upload & Overlay
 * Renders 3D articulated feet, shoe orientation vectors, ground force rings,
 * 3D pelvis/chest blocks with direction arrows, volumetric limbs, 3D racket & swing ribbon,
 * and handles real HTML5 video upload/webcam playback with 3D ghost overlay.
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

  // Touch Orbit Controls for Mobile (Father's phone/tablet)
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
// REAL VIDEO UPLOAD & SYNCHRONIZED PLAYBACK ENGINE
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
      document.getElementById('badge-pro').innerHTML = `⭐ ВИДЕО ПРОФИ: ${file.name.slice(0, 20)} (${videoEl.videoWidth}×${videoEl.videoHeight})`;
    } else {
      AppState.overlay.userVideoLoaded = true;
      document.getElementById('badge-user').innerHTML = `📹 ВАШЕ ВИДЕО: ${file.name.slice(0, 20)} (${videoEl.videoWidth}×${videoEl.videoHeight})`;
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
  };
}

function clearUploadedVideos() {
  const proV = document.getElementById('pro-video-element');
  const usrV = document.getElementById('user-video-element');
  if (proV) { proV.pause(); proV.removeAttribute('src'); proV.load(); }
  if (usrV) { usrV.pause(); usrV.removeAttribute('src'); usrV.load(); }
  AppState.overlay.proVideoLoaded = false;
  AppState.overlay.userVideoLoaded = false;

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  document.getElementById('badge-pro').textContent = `⭐ 3D ЭТАЛОН ATP: ${stroke.proName.toUpperCase()}`;
  document.getElementById('badge-user').textContent = `👤 3D GHOST УЧЕНИКА (ИЛИ ЗАГРУЗИТЕ ВИДЕО)`;

  const calBar = document.getElementById('video-calibration-bar');
  if (calBar) calBar.classList.add('hidden');
  const clrBtn = document.getElementById('btn-clear-video');
  if (clrBtn) clrBtn.classList.add('hidden');
}

function drawVideoCover(ctx, videoEl, x, y, w, h) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return false;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(videoEl, dx, dy, dw, dh);
  return true;
}

// =========================================================================================
// 3D PROJECTION & VOLUMETRIC MANNEQUIN RENDERER
// =========================================================================================

function project3D(pt3, cx, cy, scale) {
  const yawRad = (Viewer3D.cam.yaw * Math.PI) / 180;
  const pitchRad = (Viewer3D.cam.pitch * Math.PI) / 180;

  // Center around hip height (y = 0.90m)
  const x = pt3[0];
  const y = pt3[1] - 0.88;
  const z = pt3[2];

  // Rotate around Y (Yaw)
  const x1 = x * Math.cos(yawRad) + z * Math.sin(yawRad);
  const z1 = -x * Math.sin(yawRad) + z * Math.cos(yawRad);

  // Rotate around X (Pitch)
  const y2 = y * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
  const z2 = y * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);

  // Perspective divide
  const fovDist = 4.2;
  const persp = fovDist / Math.max(1.2, fovDist - z2);

  return {
    x: cx + x1 * scale * persp,
    y: cy - y2 * scale * persp,
    z: z2,
    s: persp * (scale / 220)
  };
}

function interpolate3DPose(keyframes, t) {
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
  const lt = Math.max(0, Math.min(1, (t - k0.t) / span));

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
 * Draw 3D Court Floor Force-Plate Grid, Baseline, and Net Vector
 */
function draw3DFloorGrid(ctx, cx, cy, scale) {
  ctx.save();

  // Floor Grid Tiles (-1.4m to +1.4m X, -0.8m to +1.4m Z)
  ctx.lineWidth = 1;
  for (let x = -1.2; x <= 1.21; x += 0.3) {
    const p0 = project3D([x, 0, -0.8], cx, cy, scale);
    const p1 = project3D([x, 0, 1.2], cx, cy, scale);
    ctx.strokeStyle = Math.abs(x) < 0.05 ? "rgba(56, 189, 248, 0.35)" : "rgba(148, 163, 184, 0.14)";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  for (let z = -0.8; z <= 1.21; z += 0.3) {
    const p0 = project3D([-1.2, 0, z], cx, cy, scale);
    const p1 = project3D([1.2, 0, z], cx, cy, scale);
    const isBaseline = Math.abs(z) < 0.05;
    ctx.strokeStyle = isBaseline ? "rgba(255, 255, 255, 0.85)" : "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = isBaseline ? 3.5 : 1;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  // Baseline Label
  const blPt = project3D([-1.15, 0, 0.02], cx, cy, scale);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "bold 11px monospace";
  ctx.fillText("ЗАДНЯЯ ЛИНИЯ (BASELINE)", blPt.x, blPt.y - 5);

  // Direction to Net Arrow on Floor
  const netA = project3D([0, 0.01, 0.65], cx, cy, scale);
  const netB = project3D([0, 0.01, 1.15], cx, cy, scale);
  draw2DArrow(ctx, netA.x, netA.y, netB.x, netB.y, "#38bdf8", 2.5);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("⚡ НАПРАВЛЕНИЕ К СЕТКЕ", netB.x - 65, netB.y - 8);

  ctx.restore();
}

function draw2DArrow(ctx, x1, y1, x2, y2, color, width) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 9 + width * 1.5;
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
 * Draw Volumetric Shaded 3D Capsule Limb
 */
function draw3DLimb(ctx, p1, p2, radiusPx, mainColor, highlightColor) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const r1 = radiusPx * p1.s;
  const r2 = radiusPx * p2.s * 0.82;

  ctx.save();
  const grad = ctx.createLinearGradient(
    (p1.x + p2.x) / 2 - nx * r1,
    (p1.y + p2.y) / 2 - ny * r1,
    (p1.x + p2.x) / 2 + nx * r1,
    (p1.y + p2.y) / 2 + ny * r1
  );
  grad.addColorStop(0, mainColor);
  grad.addColorStop(0.4, highlightColor);
  grad.addColorStop(1, "#0f172a");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.2;

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
 * Draw Full 3D Volumetric Mannequin (Pro or User) with Feet, Stance, Torso Blocks & Swing Ribbon
 */
function draw3DVolumetricAthlete(ctx, pose, keyframes, cx, cy, scale, theme, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. FOOTWORK TRAILS, STANCE LINE, WEIGHT RINGS & SHOE VECTORS ON FLOOR
  if (Viewer3D.layers.feetAndSteps) {
    // Draw Foot Movement Trails across keyframes
    ['footR', 'footL'].forEach((fKey) => {
      ctx.beginPath();
      keyframes.forEach((kf, idx) => {
        const pt = project3D([kf[fKey].ankle[0], 0.01, kf[fKey].ankle[2]], cx, cy, scale);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = theme.footTrail;
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Stance Line connecting Left and Right Heel/Ankle on floor
    const flFloor = project3D([pose.footL.ankle[0], 0.01, pose.footL.ankle[2]], cx, cy, scale);
    const frFloor = project3D([pose.footR.ankle[0], 0.01, pose.footR.ankle[2]], cx, cy, scale);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
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
      const groundPt = project3D([f.ankle[0], 0.01, f.ankle[2]], cx, cy, scale);
      const ringRadius = (12 + (w / 100) * 24) * groundPt.s;
      ctx.fillStyle = theme.glowRing;
      ctx.beginPath();
      ctx.ellipse(groundPt.x, groundPt.y, ringRadius, ringRadius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Weight % Label next to foot
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`${tag}: ${Math.round(w)}%`, groundPt.x - 24, groundPt.y + 20);
    });
  }

  // 2. 3D SWING PATH RIBBON (Racket Head Trajectory through 3D space)
  if (Viewer3D.layers.swingRibbon) {
    ctx.save();
    ctx.beginPath();
    for (let s = 0; s <= 24; s++) {
      const sampleT = s / 24;
      const sp = interpolate3DPose(keyframes, sampleT);
      const tipProj = project3D(sp.rTip, cx, cy, scale);
      if (s === 0) ctx.moveTo(tipProj.x, tipProj.y);
      else ctx.lineTo(tipProj.x, tipProj.y);
    }
    ctx.strokeStyle = theme.ribbon;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // Project all 3D anatomical points
  const P = {
    head: project3D(pose.head, cx, cy, scale),
    shR: project3D(pose.shR, cx, cy, scale),
    shL: project3D(pose.shL, cx, cy, scale),
    elR: project3D(pose.elR, cx, cy, scale),
    wrR: project3D(pose.wrR, cx, cy, scale),
    rTip: project3D(pose.rTip, cx, cy, scale),
    elL: project3D(pose.elL, cx, cy, scale),
    wrL: project3D(pose.wrL, cx, cy, scale),
    hipR: project3D(pose.hipR, cx, cy, scale),
    hipL: project3D(pose.hipL, cx, cy, scale),
    kneeR: project3D(pose.kneeR, cx, cy, scale),
    kneeL: project3D(pose.kneeL, cx, cy, scale),
    ankleR: project3D(pose.footR.ankle, cx, cy, scale),
    heelR: project3D(pose.footR.heel, cx, cy, scale),
    toeR: project3D(pose.footR.toe, cx, cy, scale),
    ankleL: project3D(pose.footL.ankle, cx, cy, scale),
    heelL: project3D(pose.footL.heel, cx, cy, scale),
    toeL: project3D(pose.footL.toe, cx, cy, scale)
  };

  // 3. 3D ARTICULATED SHOES & TOE DIRECTION ARROWS
  [
    { ankle: P.ankleR, heel: P.heelR, toe: P.toeR, raw: pose.footR },
    { ankle: P.ankleL, heel: P.heelL, toe: P.toeL, raw: pose.footL }
  ].forEach((shoe) => {
    // 3D Shoe Sole & Upper Polygon
    ctx.fillStyle = theme.shoeColor;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shoe.ankle.x - 5 * shoe.ankle.s, shoe.ankle.y);
    ctx.lineTo(shoe.heel.x - 6 * shoe.heel.s, shoe.heel.y + 4 * shoe.heel.s);
    ctx.lineTo(shoe.toe.x + 6 * shoe.toe.s, shoe.toe.y + 4 * shoe.toe.s);
    ctx.lineTo(shoe.toe.x + 4 * shoe.toe.s, shoe.toe.y - 4 * shoe.toe.s);
    ctx.lineTo(shoe.ankle.x + 5 * shoe.ankle.s, shoe.ankle.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Toe Orientation Vector Arrow
    if (Viewer3D.layers.feetAndSteps) {
      const yawRad = (shoe.raw.yaw * Math.PI) / 180;
      const arrowEnd3D = [
        shoe.raw.toe[0] + Math.sin(yawRad) * 0.22,
        0.02,
        shoe.raw.toe[2] + Math.cos(yawRad) * 0.22
      ];
      const arrowEnd2D = project3D(arrowEnd3D, cx, cy, scale);
      draw2DArrow(ctx, shoe.toe.x, shoe.toe.y, arrowEnd2D.x, arrowEnd2D.y, theme.accent, 2.2);
    }
  });

  // 4. VOLUMETRIC 3D LEGS (Depth-sorted)
  const legs = [
    { z: (P.hipR.z + P.kneeR.z) / 2, fn: () => {
      draw3DLimb(ctx, P.hipR, P.kneeR, 14, theme.main, theme.highlight);
      draw3DLimb(ctx, P.kneeR, P.ankleR, 11, theme.main, theme.highlight);
    }},
    { z: (P.hipL.z + P.kneeL.z) / 2, fn: () => {
      draw3DLimb(ctx, P.hipL, P.kneeL, 14, theme.main, theme.highlight);
      draw3DLimb(ctx, P.kneeL, P.ankleL, 11, theme.main, theme.highlight);
    }}
  ];
  legs.sort((a, b) => a.z - b.z).forEach(l => l.fn());

  // 5. VOLUMETRIC 3D PELVIS & RIBCAGE TORSO BLOCKS
  ctx.save();
  const torsoGrad = ctx.createLinearGradient(P.shL.x, P.shL.y, P.hipR.x, P.hipR.y);
  torsoGrad.addColorStop(0, theme.highlight);
  torsoGrad.addColorStop(0.6, theme.main);
  torsoGrad.addColorStop(1, "#0f172a");

  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P.shL.x, P.shL.y);
  ctx.lineTo(P.shR.x, P.shR.y);
  ctx.lineTo(P.hipR.x, P.hipR.y);
  ctx.lineTo(P.hipL.x, P.hipL.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center spine & chest plate lines for 3D orientation clarity
  const midSh = { x: (P.shL.x + P.shR.x) / 2, y: (P.shL.y + P.shR.y) / 2 };
  const midHip = { x: (P.hipL.x + P.hipR.x) / 2, y: (P.hipL.y + P.hipR.y) / 2 };
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midSh.x, midSh.y);
  ctx.lineTo(midHip.x, midHip.y);
  ctx.stroke();
  ctx.restore();

  // 6. PELVIS & SHOULDER 3D DIRECTION ARROWS (X-Factor Vectors)
  if (Viewer3D.layers.directionVectors) {
    const pelRad = (pose.pelvisYaw * Math.PI) / 180;
    const pelStart3D = pose.pelvisPos;
    const pelEnd3D = [
      pelStart3D[0] + Math.sin(pelRad) * 0.42,
      pelStart3D[1],
      pelStart3D[2] + Math.cos(pelRad) * 0.42
    ];
    const pS = project3D(pelStart3D, cx, cy, scale);
    const pE = project3D(pelEnd3D, cx, cy, scale);
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
    const cS = project3D(chStart3D, cx, cy, scale);
    const cE = project3D(chEnd3D, cx, cy, scale);
    draw2DArrow(ctx, cS.x, cS.y, cE.x, cE.y, "#ffffff", 2.5);
  }

  // 7. VOLUMETRIC 3D ARMS
  draw3DLimb(ctx, P.shL, P.elL, 10, theme.main, theme.highlight);
  draw3DLimb(ctx, P.elL, P.wrL, 8.5, theme.main, theme.highlight);
  draw3DLimb(ctx, P.shR, P.elR, 10.5, theme.main, theme.highlight);
  draw3DLimb(ctx, P.elR, P.wrR, 9, theme.main, theme.highlight);

  // 8. 3D ARTICULATED JOINTS (Spheres)
  [P.shR, P.shL, P.elR, P.wrR, P.elL, P.wrL, P.hipR, P.hipL, P.kneeR, P.kneeL, P.ankleR, P.ankleL].forEach(j => {
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(j.x, j.y, 5.5 * j.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  // 9. 3D HEAD WITH VISOR & GAZE DIRECTION RAY
  const headR = 17 * P.head.s;
  const headGrad = ctx.createRadialGradient(P.head.x - 4, P.head.y - 5, 2, P.head.x, P.head.y, headR);
  headGrad.addColorStop(0, theme.highlight);
  headGrad.addColorStop(1, theme.main);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Headband / Visor showing head orientation
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y - 2, headR * 0.95, -0.25, Math.PI + 0.25, true);
  ctx.stroke();

  // 10. 3D TENNIS RACKET, STRING BED & FACE NORMAL VECTOR
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
  const PThroat = project3D(throat3D, cx, cy, scale);
  const PHoop = project3D(centerHoop3D, cx, cy, scale);

  // Handle & Shaft
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 4 * P.wrR.s;
  ctx.beginPath();
  ctx.moveTo(P.wrR.x, P.wrR.y);
  ctx.lineTo(PThroat.x, PThroat.y);
  ctx.stroke();

  // 3D Racket Hoop with String Bed
  const rAngle = Math.atan2(P.rTip.y - PThroat.y, P.rTip.x - PThroat.x);
  const rLen = Math.hypot(P.rTip.x - PThroat.x, P.rTip.y - PThroat.y) / 2;
  ctx.save();
  ctx.translate(PHoop.x, PHoop.y);
  ctx.rotate(rAngle);
  ctx.fillStyle = theme.racketStrings;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(8, rLen), Math.max(6, 15 * PHoop.s), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // String-Bed Normal Vector (shows face angle!)
  if (Viewer3D.layers.directionVectors && pose.rFaceNormal) {
    const normEnd3D = [
      centerHoop3D[0] + pose.rFaceNormal[0] * 0.28,
      centerHoop3D[1] + pose.rFaceNormal[1] * 0.28,
      centerHoop3D[2] + pose.rFaceNormal[2] * 0.28
    ];
    const normEnd2D = project3D(normEnd3D, cx, cy, scale);
    draw2DArrow(ctx, PHoop.x, PHoop.y, normEnd2D.x, normEnd2D.y, "#bef264", 2);
  }

  // 11. 3D TENNIS BALL & FLOOR SHADOW
  if (pose.ball) {
    const ballP = project3D(pose.ball, cx, cy, scale);
    const ballFloor = project3D([pose.ball[0], 0.01, pose.ball[2]], cx, cy, scale);

    // Drop line from ball to floor so 3D depth of contact is unmistakable
    ctx.strokeStyle = "rgba(190, 242, 100, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ballP.x, ballP.y);
    ctx.lineTo(ballFloor.x, ballFloor.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Floor shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(ballFloor.x, ballFloor.y, 7 * ballFloor.s, 3.5 * ballFloor.s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing 3D Ball
    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.arc(ballP.x, ballP.y, 7.5 * ballP.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Athlete Tag Label above head
  ctx.fillStyle = theme.accent;
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(theme.label, P.head.x - 50, P.head.y - headR - 10);

  ctx.restore();
  return P;
}

/**
 * Main Render Function for Module 1 (3D Ghost + Uploaded Video Composite)
 */
function render3DOverlayStage() {
  const canvas = document.getElementById('overlay-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear background with stadium dark gradient
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
  bgGrad.addColorStop(0, "#111c2d");
  bgGrad.addColorStop(1, "#070b12");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const t = AppState.overlay.progress;
  const proPose = interpolate3DPose(stroke.proKeyframes, t);
  const userPose = interpolate3DPose(stroke.userKeyframes, t);

  const proTheme = {
    label: `⭐ ${stroke.proName.split('(')[0].trim()}`,
    main: "#d97706",
    highlight: "#fde047",
    accent: "#fbbf24",
    shoeColor: "#f59e0b",
    footTrail: "rgba(251, 191, 36, 0.7)",
    glowRing: "rgba(251, 191, 36, 0.25)",
    ribbon: "rgba(250, 204, 21, 0.45)",
    racketStrings: "rgba(251, 191, 36, 0.20)"
  };

  const userTheme = {
    label: "👤 Вы (Ghost-модель)",
    main: "#0284c7",
    highlight: "#7dd3fc",
    accent: "#38bdf8",
    shoeColor: "#0ea5e9",
    footTrail: "rgba(56, 189, 248, 0.7)",
    glowRing: "rgba(56, 189, 248, 0.25)",
    ribbon: "rgba(56, 189, 248, 0.40)",
    racketStrings: "rgba(56, 189, 248, 0.20)"
  };

  const baseScale = 235 * Viewer3D.cam.zoom;
  const centerY = h * 0.52 + Viewer3D.cam.panY;
  const centerX = w * 0.50 + Viewer3D.cam.panX;

  const userVid = document.getElementById('user-video-element');
  const proVid = document.getElementById('pro-video-element');

  if (AppState.overlay.mode === 'split') {
    // Left Half: Pro (Video or 3D)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) {
      drawVideoCover(ctx, proVid, 0, 0, w / 2, h);
    }
    if (!AppState.overlay.proVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, w * 0.25, centerY, baseScale * 0.88);
      draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, w * 0.25, centerY, baseScale * 0.88, proTheme, 0.95);
    }
    ctx.restore();

    // Right Half: User (Video or 3D)
    ctx.save();
    ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) {
      drawVideoCover(ctx, userVid, w / 2, 0, w / 2, h);
    }
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, w * 0.75, centerY, baseScale * 0.88);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, w * 0.75, centerY, baseScale * 0.88, userTheme, 0.95);
    }
    ctx.restore();

    // Center divider
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  } else if (AppState.overlay.mode === 'curtain') {
    const splitX = AppState.overlay.curtainX * w;

    // Left of curtain: Pro
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
    if (AppState.overlay.proVideoLoaded) drawVideoCover(ctx, proVid, 0, 0, w, h);
    draw3DFloorGrid(ctx, centerX, centerY, baseScale);
    draw3DVolumetricAthlete(ctx, proPose, stroke.proKeyframes, centerX, centerY, baseScale, proTheme, 0.95);
    ctx.restore();

    // Right of curtain: User
    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, w - splitX, h); ctx.clip();
    if (AppState.overlay.userVideoLoaded) drawVideoCover(ctx, userVid, 0, 0, w, h);
    if (!AppState.overlay.userVideoLoaded || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);
      draw3DVolumetricAthlete(ctx, userPose, stroke.userKeyframes, centerX, centerY, baseScale, userTheme, 0.95);
    }
    ctx.restore();

  } else {
    // GHOST OVERLAY MODE (Default)
    const proAlpha = 1.0 - AppState.overlay.alpha;
    const userAlpha = AppState.overlay.alpha;

    // Draw uploaded videos first if loaded
    if (AppState.overlay.userVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.proVideoLoaded ? Math.max(0.35, userAlpha) : 1.0;
      drawVideoCover(ctx, userVid, 0, 0, w, h);
      ctx.restore();
    }
    if (AppState.overlay.proVideoLoaded) {
      ctx.save();
      ctx.globalAlpha = AppState.overlay.userVideoLoaded ? proAlpha : 1.0;
      drawVideoCover(ctx, proVid, 0, 0, w, h);
      ctx.restore();
    }

    // Draw 3D Volumetric Ghost Arena on top
    if ((!AppState.overlay.userVideoLoaded && !AppState.overlay.proVideoLoaded) || Viewer3D.layers.show3DOverVideo) {
      draw3DFloorGrid(ctx, centerX, centerY, baseScale);

      // Draw User 3D Ghost (unless User Video is loaded and user prefers only Pro 3D Ghost over their video)
      const pUser = draw3DVolumetricAthlete(
        ctx, userPose, stroke.userKeyframes, centerX, centerY, baseScale, userTheme,
        AppState.overlay.userVideoLoaded ? Math.min(0.65, userAlpha) : Math.max(0.22, userAlpha)
      );

      // Draw Pro 3D Ghost
      const pPro = draw3DVolumetricAthlete(
        ctx, proPose, stroke.proKeyframes, centerX, centerY, baseScale, proTheme,
        Math.max(0.28, proAlpha)
      );

      // Draw 3D Delta Callouts (Contact offset & Elbow/Knee delta)
      draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, centerX, centerY, baseScale);
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

function draw3DDeltaCallouts(ctx, proPose, userPose, pPro, pUser, cx, cy, scale) {
  ctx.save();

  // Contact zone delta callout around T2 (t between 0.50 and 0.72)
  if (AppState.overlay.progress >= 0.48 && AppState.overlay.progress <= 0.74) {
    const bPro = project3D(proPose.ball, cx, cy, scale);
    const bUsr = project3D(userPose.ball, cx, cy, scale);

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
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(midX - 85, midY - 15, 175, 22);
    ctx.strokeStyle = "#ef4444";
    ctx.strokeRect(midX - 85, midY - 15, 175, 22);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`Δ Контакт: ${Math.round(proPose.contactOffsetCm - userPose.contactOffsetCm)} см вперёд`, midX - 78, midY);
  }

  // Knee Bend comparison tag
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(pPro.kneeR.x + 14, pPro.kneeR.y - 12, 155, 20);
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`Колени: ${Math.round(proPose.kneeBendDeg)}° vs ${Math.round(userPose.kneeBendDeg)}°`, pPro.kneeR.x + 18, pPro.kneeR.y + 2);

  ctx.restore();
}
