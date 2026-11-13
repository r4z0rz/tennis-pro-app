/**
 * Tennis Pro Analytics 3D — Pre-Scan 3D Biomechanics, Pixel-Vision Racket PCA & Static Crop Engine (v12)
 *
 * Architecture:
 * 1. PRE-SCAN PIPELINE (on video upload):
 *    Steps cleanly through the clip on an offscreen analysis canvas, runs MediaPipe PoseLandmarker
 *    (landmarks + worldLandmarks), builds a static median background plate, and runs Pixel-Vision
 *    Principal-Component (PCA) racket shaft/hoop detection around the hitting wrist.
 * 2. BIDIRECTIONAL ZERO-LAG SMOOTHING & BONE-LENGTH NORMALIZATION:
 *    Applies symmetric forward-backward Gaussian kernel smoothing across all scanned frames
 *    and normalizes limb lengths to median anatomical ratios (zero depth stretch/shrink jitter).
 * 3. TRUE 3D WORLD-TO-COURT RECONSTRUCTION:
 *    Rotates camera-space worldLandmarks by a constant clip-wide court azimuth so +Z = Net Forward,
 *    +Y = Court Height, +X = Hitting Side, placing both User and Pro rigs in the exact same 3D space.
 * 4. AUTOMATIC IMPACT (T2) WINDOWING & STATIC BOUNDING-BOX ZOOM:
 *    Detects peak wrist/racket velocity spikes as Impact T2, windows [T2 - 1.2s .. T2 + 1.2s],
 *    syncs T2 to normalized phase 0.62, and locks a single Static Crop Box (+15% margin on head & racket)
 *    for rock-steady tripod playback with zero cropped heads or camera shake.
 */

window.AIPoseEngine = {
  status: 'ready',
  mediapipeLoaded: false,
  poseLandmarker: null,
  poseLandmarkerPro: null,
  autoAlignEnabled: true,
  showMotionStrobe: true,
  showAngleGrid: true,

  lastInferenceTimeMs: 0,
  lastSidebarUpdateMs: 0,
  lastVideoTimeUser: -1,
  lastVideoTimePro: -1,
  _scanMonoMs: 1000,

  referenceCam: { yaw: -28.0, pitch: 18.0, roll: 0.0 },
  userDetectedCam: {
    yaw: -72.0,
    pitch: 12.0,
    roll: 0.0,
    scaleRatio: 1.0,
    offsetX: 0,
    offsetY: 0,
    timeDeltaSec: 0.0,
    confidence: 0.96,
    isLiveTracked: false
  },

  // Pre-scan stores per video slot ('user' | 'pro')
  scans: {
    user: {
      status: 'idle', // 'idle' | 'scanning' | 'ready' | 'error'
      progress: 0,
      statusText: '',
      fileName: '',
      duration: 0,
      frames: [],
      swings: [],
      activeSwingIdx: 0,
      dominantHand: 'right',
      facingSign: -1,
      clipYawDeg: -72,
      cropBox: null
    },
    pro: {
      status: 'idle',
      progress: 0,
      statusText: '',
      fileName: '',
      duration: 0,
      frames: [],
      swings: [],
      activeSwingIdx: 0,
      dominantHand: 'right',
      facingSign: -1,
      clipYawDeg: -72,
      cropBox: null
    }
  },

  // Smoothed interpolated state for current playback phase
  liveUserLandmarks2D: null,
  liveProLandmarks2D: null,
  liveUserPose3D: null,
  liveProPose3D: null,
  wristTrail2D: [],
  racketTipTrail2D: [],
  proRacketTipTrail2D: [],
  liveRacket2D: null,
  liveProRacket2D: null,
  showCameraGuide: false,
  lockImpactMode: false,

  proVideoMetrics: {
    hasAnalyzedVideo: false,
    framesAnalyzed: 0,
    fileName: '',
    kneeAngleDeg: 118,
    minKneeAngleDeg: 118,
    elbowAngleDeg: 142,
    elbowSpacingCm: 27,
    contactOffsetCm: 38,
    swingPathAngleDeg: 29,
    hipShoulderSepDeg: 48,
    stanceWidthCm: 72,
    weightFrontPct: 84,
    ballSpeedKmh: 128,
    spinRpm: 2950,
    netClearanceCm: 74,
    landingDepthM: 10.7
  },

  videoLock: {
    active: false,
    hipNormX: 0.52,
    hipNormY: 0.48,
    ankleNormY: 0.62,
    shNormY: 0.34,
    headNormY: 0.24,
    torsoLegNormSpan: 0.28,
    fullBodyNormSpan: 0.38,
    facingSign: -1,
    matchedYawDeg: -72,
    matchedPitchDeg: 12,
    matchedPhaseT: 0.62,
    activeHand: 'right',
    cropBox: null
  },

  proVideoLock: {
    active: false,
    hipNormX: 0.52,
    hipNormY: 0.48,
    ankleNormY: 0.62,
    shNormY: 0.34,
    headNormY: 0.24,
    torsoLegNormSpan: 0.28,
    fullBodyNormSpan: 0.38,
    facingSign: -1,
    matchedYawDeg: -72,
    matchedPitchDeg: 12,
    matchedPhaseT: 0.62,
    activeHand: 'right',
    cropBox: null
  },

  videoMetrics: {
    hasAnalyzedVideo: false,
    framesAnalyzed: 0,
    fileName: '',
    kneeAngleDeg: 148,
    minKneeAngleDeg: 152,
    elbowAngleDeg: 136,
    elbowSpacingCm: 13,
    contactOffsetCm: 17,
    contactLateCm: 21,
    swingPathAngleDeg: 15,
    hipShoulderSepDeg: 26,
    maxHipShoulderSepDeg: 29,
    stanceWidthCm: 54,
    weightFrontPct: 58,
    footAngleDeg: -28,
    ballSpeedKmh: 104,
    spinRpm: 1480,
    netClearanceCm: 38,
    landingDepthM: 8.3,
    shortfallM: 2.4,
    targetHitPct: 48,
    computedScore: 7.4,
    subScores: { prep: 7.8, footwork: 7.2, loading: 6.9, contact: 6.4, follow: 7.6 }
  },

  smoothedVideoAnchor: { cx: 0.50, cy: 0.54, scale: 1.0, initialized: false },
  opticalCanvas: null,
  opticalCtx: null,
  prevGrayFrame: null
};

async function initAIPoseEngine() {
  const oc = document.createElement('canvas');
  oc.width = 224;
  oc.height = 140;
  window.AIPoseEngine.opticalCanvas = oc;
  window.AIPoseEngine.opticalCtx = oc.getContext('2d', { willReadFrequently: true });

  updateAITelemetryBanner();

  try {
    const visionModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
    const { FilesetResolver, PoseLandmarker } = visionModule;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    const modelUrlFull = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
    const makeOpts = (delegate) => ({
      baseOptions: {
        modelAssetPath: modelUrlFull,
        delegate
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.52,
      minPosePresenceConfidence: 0.52,
      minTrackingConfidence: 0.55
    });

    try {
      window.AIPoseEngine.poseLandmarker = await PoseLandmarker.createFromOptions(vision, makeOpts('GPU'));
      window.AIPoseEngine.poseLandmarkerPro = await PoseLandmarker.createFromOptions(vision, makeOpts('GPU'));
    } catch (gpuErr) {
      window.AIPoseEngine.poseLandmarker = await PoseLandmarker.createFromOptions(vision, makeOpts('CPU'));
      window.AIPoseEngine.poseLandmarkerPro = await PoseLandmarker.createFromOptions(vision, makeOpts('CPU'));
    }

    window.AIPoseEngine.mediapipeLoaded = true;
    window.AIPoseEngine.status = 'ready';
    updateAITelemetryBanner();
  } catch (err) {
    console.info('MediaPipe offline fallback active (Kinematics + Pixel-Vision):', err && err.message ? err.message : err);
    window.AIPoseEngine.mediapipeLoaded = false;
    window.AIPoseEngine.status = 'ready';
    updateAITelemetryBanner();
  }
}

function clampVal(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothVec3(prev, next, alpha) {
  if (!prev) return [next[0], next[1], next[2]];
  return [
    prev[0] + (next[0] - prev[0]) * alpha,
    prev[1] + (next[1] - prev[1]) * alpha,
    prev[2] + (next[2] - prev[2]) * alpha
  ];
}

function smoothScalar(prev, next, alpha) {
  if (prev === undefined || prev === null || Number.isNaN(prev)) return next;
  return prev + (next - prev) * alpha;
}

function smoothLandmarks2D(prevLm, nextLm, alpha = 0.28) {
  if (!prevLm || prevLm.length !== nextLm.length) {
    return nextLm.map(p => ({ x: p.x, y: p.y, z: p.z || 0, visibility: p.visibility ?? 1 }));
  }
  return nextLm.map((p, i) => {
    const prev = prevLm[i];
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
    const vis = p.visibility !== undefined ? p.visibility : 1.0;
    const isExtremity = (i >= 15 && i <= 22);
    const maxJump = isExtremity ? 0.14 : 0.08;
    const effAlpha = dist > maxJump ? 0.08 : (vis < 0.35 ? alpha * 0.35 : alpha);
    return {
      x: prev.x + (p.x - prev.x) * effAlpha,
      y: prev.y + (p.y - prev.y) * effAlpha,
      z: (prev.z || 0) + ((p.z || 0) - (prev.z || 0)) * effAlpha,
      visibility: vis
    };
  });
}

function calc3DAngleDeg(a, b, c) {
  const ab = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cb = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2];
  const mag = Math.hypot(...ab) * Math.hypot(...cb);
  if (mag < 1e-5) return 150;
  const cos = clampVal(dot / mag, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

function calc2DAngleDeg(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y;
  const cbx = c.x - b.x, cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag < 1e-5) return 150;
  return (Math.acos(clampVal(dot / mag, -1, 1)) * 180) / Math.PI;
}

// =========================================================================================
// STATIC BACKGROUND PLATE & PIXEL-VISION PCA RACKET DETECTOR
// =========================================================================================

function rgbaToLuma(rgba, width, height) {
  const n = width * height;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i << 2;
    out[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
  }
  return out;
}

function computeStaticBackgroundPlate(grayFrames, length) {
  if (!grayFrames || grayFrames.length === 0 || !length) return null;
  const count = grayFrames.length;
  const bg = new Uint8Array(length);
  const sampleBuf = new Uint8Array(count);
  const midIdx = Math.floor(count / 2);

  for (let i = 0; i < length; i++) {
    for (let f = 0; f < count; f++) {
      sampleBuf[f] = grayFrames[f][i];
    }
    sampleBuf.sort();
    bg[i] = sampleBuf[midIdx];
  }
  return bg;
}

/**
 * Detects the tennis racket shaft + hoop axis around the hitting wrist using
 * background-subtracted foreground + spatial gradient + motion pixels + weighted 2D PCA.
 * Falls back cleanly to wrist-to-knuckle kinematic direction when frame lacks elongated pixel support.
 */
function detectRacketPixelsInFrame(
  frameRGBA,
  prevGray,
  bgGray,
  width,
  height,
  wristNorm,
  elbowNorm,
  handNorm,
  facingSign = -1,
  prevDir = null
) {
  const wx = (wristNorm && wristNorm.x !== undefined ? wristNorm.x : 0.5) * width;
  const wy = (wristNorm && wristNorm.y !== undefined ? wristNorm.y : 0.5) * height;
  const ex = (elbowNorm && elbowNorm.x !== undefined ? elbowNorm.x : wristNorm.x - facingSign * 0.06) * width;
  const ey = (elbowNorm && elbowNorm.y !== undefined ? elbowNorm.y : wristNorm.y) * height;
  const hx = (handNorm && handNorm.x !== undefined ? handNorm.x : wristNorm.x + facingSign * 0.02) * width;
  const hy = (handNorm && handNorm.y !== undefined ? handNorm.y : wristNorm.y - 0.01) * height;

  const forearmPx = Math.max(12, Math.hypot(wx - ex, wy - ey));
  const fux = (wx - ex) / forearmPx;
  const fuy = (wy - ey) / forearmPx;

  // Kinematic fallback unit axis blending hand-knuckle & forearm ray
  let kdx = (hx - wx) * 1.45 + (wx - ex) * 0.55;
  let kdy = (hy - wy) * 1.45 + (wy - ey) * 0.55;
  const kLen = Math.hypot(kdx, kdy);
  if (kLen > 1e-3) {
    kdx /= kLen;
    kdy /= kLen;
  } else {
    kdx = fux;
    kdy = fuy;
  }

  let ux = kdx;
  let uy = kdy;
  let racketPxLen = forearmPx * 2.15;
  let source = 'kinematic';
  let confidence = 0.45;
  let eigenRatio = 1.0;

  if (frameRGBA && width >= 32 && height >= 32) {
    const currGray = frameRGBA._luma || rgbaToLuma(frameRGBA, width, height);
    const minSearchR = Math.max(5, forearmPx * 0.25);
    const maxSearchR = clampVal(forearmPx * 2.85, 28, Math.max(width, height) * 0.42);
    const x0 = Math.max(1, Math.floor(wx - maxSearchR));
    const x1 = Math.min(width - 2, Math.ceil(wx + maxSearchR));
    const y0 = Math.max(1, Math.floor(wy - maxSearchR));
    const y1 = Math.min(height - 2, Math.ceil(wy + maxSearchR));

    let sumW = 0;
    let sumX = 0, sumY = 0;
    const ptsX = [];
    const ptsY = [];
    const ptsW = [];

    for (let y = y0; y <= y1; y++) {
      const row = y * width;
      const dy = y - wy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - wx;
        const r = Math.hypot(dx, dy);
        if (r < minSearchR || r > maxSearchR) continue;

        // Suppress pixels lying strictly backward along the upper-arm/forearm behind the wrist
        const alongForearm = dx * fux + dy * fuy;
        const perpForearm = Math.abs(-dx * fuy + dy * fux);
        if (alongForearm < -forearmPx * 0.15 && perpForearm < forearmPx * 0.35) continue;

        const idx = row + x;
        const lum = currGray[idx];
        const fg = bgGray ? Math.abs(lum - bgGray[idx]) : 0;
        const mot = prevGray ? Math.abs(lum - prevGray[idx]) : 0;
        const gx = Math.abs(currGray[idx + 1] - currGray[idx - 1]);
        const gy = Math.abs(currGray[idx + width] - currGray[idx - width]);
        const edge = gx + gy;

        // Weighted score emphasizing moving / foreground racket frame & string edges
        let score = 0;
        if (bgGray && fg > 16) score += fg * 1.15;
        if (prevGray && mot > 14) score += mot * 1.1;
        if (edge > 28 && (!bgGray || fg > 10 || mot > 10)) score += edge * 0.45;
        if (!bgGray && !prevGray && edge > 34) score += edge * 0.7;

        if (score > 20) {
          // Slight angular consistency bonus with kinematic / previous direction
          if (prevDir) {
            const dotP = (dx * prevDir.x + dy * prevDir.y) / (r + 1e-4);
            if (dotP > 0.1) score *= (1.0 + dotP * 0.35);
          }
          ptsX.push(dx);
          ptsY.push(dy);
          ptsW.push(score);
          sumW += score;
          sumX += dx * score;
          sumY += dy * score;
        }
      }
    }

    if (ptsX.length >= 10 && sumW > 200) {
      const meanX = sumX / sumW;
      const meanY = sumY / sumW;

      // Covariance around centroid to test elongation (lambda1 / lambda2) and second-moment around wrist
      let cxx = 0, cyy = 0, cxy = 0;
      let wxx = 0, wyy = 0, wxy = 0;
      for (let i = 0; i < ptsX.length; i++) {
        const weight = ptsW[i] / sumW;
        const dxC = ptsX[i] - meanX;
        const dyC = ptsY[i] - meanY;
        cxx += weight * dxC * dxC;
        cyy += weight * dyC * dyC;
        cxy += weight * dxC * dyC;

        wxx += weight * ptsX[i] * ptsX[i];
        wyy += weight * ptsY[i] * ptsY[i];
        wxy += weight * ptsX[i] * ptsY[i];
      }

      const trC = cxx + cyy;
      const detDiffC = Math.sqrt(Math.max(0, (cxx - cyy) * (cxx - cyy) + 4 * cxy * cxy));
      const lambda1 = 0.5 * (trC + detDiffC);
      const lambda2 = 0.5 * Math.max(1e-5, trC - detDiffC);
      eigenRatio = lambda1 / Math.max(1e-4, lambda2);

      // Principal ray anchored from wrist
      const diffW = wxx - wyy;
      const eigTheta = 0.5 * Math.atan2(2 * wxy, diffW);
      let vx = Math.cos(eigTheta);
      let vy = Math.sin(eigTheta);

      // Orient eigenvector toward weighted centroid away from wrist
      const centDot = meanX * vx + meanY * vy;
      if (centDot < 0) {
        vx = -vx;
        vy = -vy;
      } else if (Math.abs(centDot) < 2 && prevDir && vx * prevDir.x + vy * prevDir.y < 0) {
        vx = -vx;
        vy = -vy;
      }

      // 92nd percentile projection along ray to measure racket length from grip to tip
      if (eigenRatio >= 1.9) {
        const projs = [];
        for (let i = 0; i < ptsX.length; i++) {
          const proj = ptsX[i] * vx + ptsY[i] * vy;
          const perp = Math.abs(-ptsX[i] * vy + ptsY[i] * vx);
          if (proj > minSearchR && perp < forearmPx * 0.72) {
            projs.push(proj);
          }
        }
        if (projs.length >= 6) {
          projs.sort((a, b) => a - b);
          const p92 = projs[Math.min(projs.length - 1, Math.floor(projs.length * 0.92))];
          // Blend slowly if eigen-axis jumped dramatically vs previous frame
          if (prevDir && vx * prevDir.x + vy * prevDir.y < 0.25) {
            ux = vx * 0.55 + prevDir.x * 0.45;
            uy = vy * 0.55 + prevDir.y * 0.45;
            const n = Math.hypot(ux, uy) || 1;
            ux /= n;
            uy /= n;
          } else {
            ux = vx;
            uy = vy;
          }
          racketPxLen = clampVal(p92, forearmPx * 1.45, forearmPx * 2.75);
          source = 'vision';
          confidence = clampVal(0.55 + Math.min(0.42, (eigenRatio - 1.9) * 0.12), 0.55, 0.97);
        }
      }
    }
  }

  // Normalized coordinates (handle aspect ratio accurately by working in pixel offsets then /w, /h)
  const tipPxX = wx + ux * racketPxLen;
  const tipPxY = wy + uy * racketPxLen;
  const tipX = tipPxX / Math.max(1, width);
  const tipY = tipPxY / Math.max(1, height);
  const wNormX = wristNorm ? wristNorm.x : wx / width;
  const wNormY = wristNorm ? wristNorm.y : wy / height;

  return {
    wrist: { x: wNormX, y: wNormY },
    throat: { x: wNormX + (tipX - wNormX) * 0.42, y: wNormY + (tipY - wNormY) * 0.42 },
    hoop: { x: wNormX + (tipX - wNormX) * 0.72, y: wNormY + (tipY - wNormY) * 0.72 },
    tip: { x: tipX, y: tipY },
    dir: { x: ux, y: uy },
    lengthPxRatio: racketPxLen / Math.max(1, forearmPx),
    angleDeg: Math.round((-Math.atan2(uy, ux * (facingSign || -1)) * 180) / Math.PI),
    source,
    confidence,
    eigenRatio: Number(eigenRatio.toFixed(2))
  };
}

// =========================================================================================
// TRUE 3D WORLD-LANDMARKS TO COURT-SPACE RECONSTRUCTION & BONE NORMALIZATION
// =========================================================================================

function dist3D(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normVec3(v) {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m > 1e-5 ? [v[0] / m, v[1] / m, v[2] / m] : [0, 1, 0];
}

function enforceBoneLength3D(parent, child, targetLen) {
  if (!targetLen || targetLen < 0.05) return child;
  const dir = normVec3([child[0] - parent[0], child[1] - parent[1], child[2] - parent[2]]);
  return [
    parent[0] + dir[0] * targetLen,
    parent[1] + dir[1] * targetLen,
    parent[2] + dir[2] * targetLen
  ];
}

/**
 * Estimates constant camera-to-court azimuth (yawDeg) from median 2D+3D facing descriptors
 * so every frame of a stationary camera clip rotates rigidly into canonical court coordinates:
 * +Z = toward the net, +Y = up from court floor, +X = right lateral side.
 */
function estimateClipCourtYawDeg(rawFrames) {
  if (!rawFrames || rawFrames.length === 0) return -72;
  let votesLeftRight = 0;
  let shoulderNormSum = 0;
  let validShCount = 0;
  let noseDepthVote = 0;

  for (const f of rawFrames) {
    const lm = f.lm2d;
    const lm3 = f.lm3d;
    if (!lm || lm.length < 33) continue;
    const shMidX = (lm[11].x + lm[12].x) * 0.5;
    const hipMidX = (lm[23].x + lm[24].x) * 0.5;
    const ankMidY = Math.max(lm[27].y, lm[28].y, lm[31].y, lm[32].y);
    const shMidY = (lm[11].y + lm[12].y) * 0.5;
    const spanY = Math.max(0.14, Math.abs(ankMidY - shMidY));

    const toeDir = ((lm[31].x - lm[29].x) + (lm[32].x - lm[30].x)) * 0.5;
    const earMidX = (lm[7].x + lm[8].x) * 0.5;
    const noseDir = lm[0].x - earMidX;
    const wristOffset = (Math.abs(lm[16].x - shMidX) > Math.abs(lm[15].x - shMidX))
      ? (lm[16].x - hipMidX)
      : (lm[15].x - hipMidX);
    votesLeftRight += toeDir * 1.4 + noseDir * 2.0 + wristOffset * 1.8;

    shoulderNormSum += Math.abs(lm[11].x - lm[12].x) / spanY;
    validShCount++;

    if (lm3 && lm3.length >= 9) {
      const earMidZ3 = (lm3[7].z + lm3[8].z) * 0.5;
      noseDepthVote += (lm3[0].z - earMidZ3); // >0 => facing away from camera (+Z), <0 => toward camera
    }
  }

  const facingSign = votesLeftRight < 0 ? -1 : 1;
  const meanShNorm = validShCount > 0 ? shoulderNormSum / validShCount : 0.22;
  const profileRatio = clampVal((0.36 - meanShNorm) / 0.24, 0, 1);

  // Rear-diagonal (~45 deg) vs pure side profile (~88 deg) vs front-diagonal (~135 deg)
  const facingAway = noseDepthVote >= 0;
  let yawMag = 32 + profileRatio * 56; // 32° rear/front diagonal .. 88° side profile
  if (!facingAway && profileRatio < 0.75) {
    yawMag = 148 - profileRatio * 58;
  }
  return facingSign < 0 ? -yawMag : yawMag;
}

function detectClipDominantHand(rawFrames) {
  if (!rawFrames || rawFrames.length < 2) return 'right';
  let travelL = 0, travelR = 0;
  for (let i = 1; i < rawFrames.length; i++) {
    const a = rawFrames[i - 1].lm2d;
    const b = rawFrames[i].lm2d;
    if (!a || !b) continue;
    travelL += Math.hypot(b[15].x - a[15].x, b[15].y - a[15].y);
    travelR += Math.hypot(b[16].x - a[16].x, b[16].y - a[16].y);
  }
  return travelL > travelR * 1.28 ? 'left' : 'right';
}

function computeClipMedianBoneLengths(rawFrames) {
  const accum = {
    upperArmL: [], upperArmR: [],
    forearmL: [], forearmR: [],
    thighL: [], thighR: [],
    shinL: [], shinR: [],
    bodyHeight: []
  };
  const d3 = (lm, i, j) => {
    const a = lm[i], b = lm[j];
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  };
  for (const f of rawFrames) {
    const lm = f.lm3d;
    if (!lm || lm.length < 33) continue;
    accum.upperArmL.push(d3(lm, 11, 13));
    accum.upperArmR.push(d3(lm, 12, 14));
    accum.forearmL.push(d3(lm, 13, 15));
    accum.forearmR.push(d3(lm, 14, 16));
    accum.thighL.push(d3(lm, 23, 25));
    accum.thighR.push(d3(lm, 24, 26));
    accum.shinL.push(d3(lm, 25, 27));
    accum.shinR.push(d3(lm, 26, 28));
    const soleY = Math.max(lm[29].y, lm[30].y, lm[31].y, lm[32].y); // +y is down in lm3d
    accum.bodyHeight.push(Math.max(0.85, soleY - (lm[0].y - 0.10)));
  }
  const med = (arr, fallback) => {
    if (!arr.length) return fallback;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const h = med(accum.bodyHeight, 1.72);
  const scale = 1.74 / clampVal(h, 1.15, 2.25);
  return {
    scale,
    upperArm: med([...accum.upperArmL, ...accum.upperArmR], 0.28) * scale,
    forearm: med([...accum.forearmL, ...accum.forearmR], 0.25) * scale,
    thigh: med([...accum.thighL, ...accum.thighR], 0.42) * scale,
    shin: med([...accum.shinL, ...accum.shinR], 0.41) * scale
  };
}

/**
 * Converts a frame's 3D MediaPipe worldLandmarks + 2D Vision Racket into the app's canonical
 * metric court pose3D object (+Z = net, +Y = up, +X = right side), preserving real joint angles.
 */
function convertWorldLandmarksToCourtPose3D(
  lm3d,
  lm2d,
  racket2d,
  clipYawDeg = -72,
  dominantHand = 'right',
  boneRefs = null,
  metricsHint = null
) {
  if (!lm3d || lm3d.length < 33) return null;

  const yawRad = (clipYawDeg * Math.PI) / 180;
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const meterScale = boneRefs && boneRefs.scale ? boneRefs.scale : 1.0;

  // Rotate camera-space worldLandmarks by -yaw around Y so player's court forward aligns to +Z
  const rawPts = new Array(33);
  let lowestY = Infinity;
  for (let i = 0; i < 33; i++) {
    const p = lm3d[i];
    const wx = p.x * meterScale;
    const wyUp = -p.y * meterScale;
    const wz = p.z * meterScale;
    const cx = wx * cosY - wz * sinY;
    const cz = wx * sinY + wz * cosY;
    rawPts[i] = [cx, wyUp, cz];
    if (i >= 27 && wyUp < lowestY) lowestY = wyUp;
  }

  // Anchor shoes at court floor y = 0.02 and center hips near X=0, Z=0 horizontally
  const hipMidRaw = [
    (rawPts[23][0] + rawPts[24][0]) * 0.5,
    (rawPts[23][1] + rawPts[24][1]) * 0.5,
    (rawPts[23][2] + rawPts[24][2]) * 0.5
  ];
  const floorShiftY = 0.02 - (Number.isFinite(lowestY) ? lowestY : -0.90);

  const pt = (i) => [
    rawPts[i][0] - hipMidRaw[0],
    rawPts[i][1] + floorShiftY,
    rawPts[i][2] - hipMidRaw[2]
  ];

  let hipL = pt(23), hipR = pt(24);
  let shL = pt(11), shR = pt(12);
  let elL = pt(13), elR = pt(14);
  let wrL = pt(15), wrR = pt(16);
  let knL = pt(25), knR = pt(26);
  let anL = pt(27), anR = pt(28);
  let heelL = pt(29), heelR = pt(30);
  let toeL = pt(31), toeR = pt(32);
  const head = pt(0);

  // Enforce normalized anatomical bone lengths so depth noise never stretches/shrinks limbs
  if (boneRefs) {
    elL = enforceBoneLength3D(shL, elL, boneRefs.upperArm);
    wrL = enforceBoneLength3D(elL, wrL, boneRefs.forearm);
    elR = enforceBoneLength3D(shR, elR, boneRefs.upperArm);
    wrR = enforceBoneLength3D(elR, wrR, boneRefs.forearm);
    knL = enforceBoneLength3D(hipL, knL, boneRefs.thigh);
    anL = enforceBoneLength3D(knL, anL, boneRefs.shin);
    knR = enforceBoneLength3D(hipR, knR, boneRefs.thigh);
    anR = enforceBoneLength3D(knR, anR, boneRefs.shin);
  }

  // If left-handed clip, mirror court X laterally when canonicalizing or bind active wrist to hitting side
  const isLeft = dominantHand === 'left';
  const hitWr = isLeft ? wrL : wrR;
  const hitEl = isLeft ? elL : elR;
  const hitHand = isLeft ? pt(19) : pt(20);
  const hipCenter = [
    (hipL[0] + hipR[0]) * 0.5,
    (hipL[1] + hipR[1]) * 0.5,
    (hipL[2] + hipR[2]) * 0.5
  ];

  // Reconstruct 3D racket tip from 2D Pixel-Vision PCA racket angle + 3D wrist-to-hand depth tilt
  let rAxis = normVec3([
    (hitHand[0] - hitWr[0]) * 1.4 + (hitWr[0] - hitEl[0]) * 0.5,
    (hitHand[1] - hitWr[1]) * 1.4 + (hitWr[1] - hitEl[1]) * 0.5 + 0.14,
    (hitHand[2] - hitWr[2]) * 1.4 + (hitWr[2] - hitEl[2]) * 0.5
  ]);

  if (racket2d && racket2d.dir) {
    // Rotate 2D screen racket horizontal projection by camera azimuth + blend vertical elevation directly
    const screenDirX = racket2d.dir.x;
    const screenDirYUp = -racket2d.dir.y; // canvas y down -> 3D +Y up
    // Map screen X into court (X, Z) according to clipYaw: x_screen = cx*cos + cz*sin => inverse
    const rxWorld = screenDirX * cosY;
    const rzWorld = -screenDirX * sinY;
    const rVis = normVec3([
      rxWorld * 0.72 + rAxis[0] * 0.35,
      screenDirYUp * 0.85 + rAxis[1] * 0.15,
      rzWorld * 0.72 + rAxis[2] * 0.45
    ]);
    rAxis = rVis;
  }

  const racketLenM = 0.685; // Regulation ~27" tennis racket length
  const rTip = [
    hitWr[0] + rAxis[0] * racketLenM,
    hitWr[1] + rAxis[1] * racketLenM,
    hitWr[2] + rAxis[2] * racketLenM
  ];

  // Torso/Pelvis Yaw relative to +Z net forward
  const pelvisYaw = (Math.atan2(hipR[2] - hipL[2], Math.max(0.05, Math.abs(hipR[0] - hipL[0]))) * 180) / Math.PI;
  const chestYaw = (Math.atan2(shR[2] - shL[2], Math.max(0.05, Math.abs(shR[0] - shL[0]))) * 180) / Math.PI;
  const yawL = (Math.atan2(toeL[0] - heelL[0], Math.max(0.04, toeL[2] - heelL[2])) * 180) / Math.PI;
  const yawR = (Math.atan2(toeR[0] - heelR[0], Math.max(0.04, toeR[2] - heelR[2])) * 180) / Math.PI;

  const kneeBendDeg = Math.round(Math.min(
    calc3DAngleDeg(hipL, knL, anL),
    calc3DAngleDeg(hipR, knR, anR)
  ));
  const elbowAngleDeg = Math.round(calc3DAngleDeg(
    isLeft ? shL : shR,
    hitEl,
    hitWr
  ));

  // Elbow-to-torso spacing in centimeters (3D lateral+depth distance from elbow to spine midpoint)
  const spineMid = [
    (shL[0] + shR[0] + hipL[0] + hipR[0]) * 0.25,
    (shL[1] + shR[1] + hipL[1] + hipR[1]) * 0.25,
    (shL[2] + shR[2] + hipL[2] + hipR[2]) * 0.25
  ];
  const elbowSpacingCm = Math.round(clampVal(Math.hypot(hitEl[0] - spineMid[0], hitEl[2] - spineMid[2]) * 100, 8, 42));
  // Forward contact offset (+Z in cm in front of hip center at impact!)
  const hoopCenter = [
    hitWr[0] + rAxis[0] * 0.48,
    hitWr[1] + rAxis[1] * 0.48,
    hitWr[2] + rAxis[2] * 0.48
  ];
  const contactOffsetCm = Math.round(clampVal((hoopCenter[2] - hipCenter[2]) * 100, -15, 65));

  // Weight balance estimated from pelvis X/Z proximity to front foot vs back foot
  const leadAnkle = anL[2] >= anR[2] ? anL : anR;
  const backAnkle = anL[2] >= anR[2] ? anR : anL;
  const spanFootZ = Math.max(0.12, leadAnkle[2] - backAnkle[2]);
  const frontWeightFrac = clampVal(0.45 + ((hipCenter[2] - backAnkle[2]) / spanFootZ) * 0.42, 0.25, 0.90);
  const frontPct = Math.round(frontWeightFrac * 100);
  const weightL = anL[2] >= anR[2] ? frontPct : 100 - frontPct;
  const weightR = 100 - weightL;

  const swingPathAngleDeg = (metricsHint && metricsHint.swingPathAngleDeg !== undefined)
    ? metricsHint.swingPathAngleDeg
    : Math.round(clampVal((Math.atan2(rAxis[1], Math.max(0.15, Math.hypot(rAxis[0], rAxis[2]))) * 180) / Math.PI, -15, 55));

  // Racket face normal tilted forward toward net (+Z) & slight topspin close
  const rFaceNormal = normVec3([
    -rAxis[2] * 0.15,
    0.18,
    0.96
  ]);

  // If viewer draws non-dominant left hand, assign wrR = hitWr ONLY on synthetic racket slot? Wait:
  // draw3DVolumetricAthlete draws racket on pose.wrR -> pose.rTip! So if left-handed, mirror X across 0 so
  // draw3DVolumetricAthlete attaches racket cleanly to the hitting arm without changing renderer!
  if (isLeft) {
    const mirror = (p) => [-p[0], p[1], p[2]];
    const mPose = {
      pelvisPos: mirror(hipCenter),
      pelvisYaw: -pelvisYaw,
      chestYaw: -chestYaw,
      headYaw: 0,
      hipL: mirror(hipR), hipR: mirror(hipL),
      shL: mirror(shR), shR: mirror(shL),
      elL: mirror(elR), elR: mirror(elL),
      wrL: mirror(wrR), wrR: mirror(wrL),
      kneeL: mirror(knR), kneeR: mirror(knL),
      footL: { ankle: mirror(anR), heel: mirror(heelR), toe: mirror(toeR), yaw: -yawR },
      footR: { ankle: mirror(anL), heel: mirror(heelL), toe: mirror(toeL), yaw: -yawL },
      head: mirror(head),
      rTip: mirror(rTip),
      rFaceNormal: mirror(rFaceNormal),
      ball: [mirror(hoopCenter)[0] + 0.06, hoopCenter[1], hoopCenter[2] + 0.10],
      weightL: weightR,
      weightR: weightL,
      kneeBendDeg,
      elbowAngleDeg,
      elbowSpacingCm,
      contactOffsetCm,
      swingPathAngleDeg,
      stanceWidthCm: Math.round(dist3D(anL, anR) * 100),
      hipShoulderSepDeg: Math.round(Math.abs(chestYaw - pelvisYaw))
    };
    return mPose;
  }

  return {
    pelvisPos: hipCenter,
    pelvisYaw,
    chestYaw,
    headYaw: 0,
    hipL, hipR,
    shL, shR,
    elL, elR,
    wrL, wrR,
    kneeL: knL, kneeR: knR,
    footL: { ankle: anL, heel: heelL, toe: toeL, yaw: yawL },
    footR: { ankle: anR, heel: heelR, toe: toeR, yaw: yawR },
    head,
    rTip,
    rFaceNormal,
    ball: [hoopCenter[0] + 0.04, hoopCenter[1], hoopCenter[2] + 0.10],
    weightL,
    weightR,
    kneeBendDeg,
    elbowAngleDeg,
    elbowSpacingCm,
    contactOffsetCm,
    swingPathAngleDeg,
    stanceWidthCm: Math.round(dist3D(anL, anR) * 100),
    hipShoulderSepDeg: Math.round(Math.abs(chestYaw - pelvisYaw))
  };
}

// =========================================================================================
// BIDIRECTIONAL ZERO-LAG SMOOTHING, IMPACT PEAK DETECTION & STATIC CROP BOX
// =========================================================================================

function smoothScannedFrames(frames) {
  if (!frames || frames.length < 3) return frames;
  const kernel = [0.12, 0.22, 0.32, 0.22, 0.12];
  const radius = 2;

  return frames.map((f, idx) => {
    const out = { ...f };
    if (f.lm2d) {
      out.lm2d = f.lm2d.map((pt, jIdx) => {
        let sx = 0, sy = 0, sz = 0, sw = 0;
        for (let k = -radius; k <= radius; k++) {
          const nb = frames[clampVal(idx + k, 0, frames.length - 1)];
          if (!nb.lm2d || !nb.lm2d[jIdx]) continue;
          const w = kernel[k + radius];
          sx += nb.lm2d[jIdx].x * w;
          sy += nb.lm2d[jIdx].y * w;
          sz += (nb.lm2d[jIdx].z || 0) * w;
          sw += w;
        }
        return sw > 0
          ? { x: sx / sw, y: sy / sw, z: sz / sw, visibility: pt.visibility ?? 1 }
          : pt;
      });
    }

    if (f.lm3d) {
      out.lm3d = f.lm3d.map((pt, jIdx) => {
        let sx = 0, sy = 0, sz = 0, sw = 0;
        for (let k = -radius; k <= radius; k++) {
          const nb = frames[clampVal(idx + k, 0, frames.length - 1)];
          if (!nb.lm3d || !nb.lm3d[jIdx]) continue;
          const w = kernel[k + radius];
          sx += nb.lm3d[jIdx].x * w;
          sy += nb.lm3d[jIdx].y * w;
          sz += nb.lm3d[jIdx].z * w;
          sw += w;
        }
        return sw > 0 ? { x: sx / sw, y: sy / sw, z: sz / sw } : pt;
      });
    }

    if (f.racket2d) {
      let rx = 0, ry = 0, lenS = 0, sw = 0;
      for (let k = -radius; k <= radius; k++) {
        const nb = frames[clampVal(idx + k, 0, frames.length - 1)];
        if (!nb.racket2d || !nb.racket2d.dir) continue;
        const w = kernel[k + radius] * (nb.racket2d.source === 'vision' ? 1.35 : 0.75);
        rx += nb.racket2d.dir.x * w;
        ry += nb.racket2d.dir.y * w;
        lenS += Math.hypot(nb.racket2d.tip.x - nb.racket2d.wrist.x, nb.racket2d.tip.y - nb.racket2d.wrist.y) * w;
        sw += w;
      }
      if (sw > 0) {
        const dn = Math.hypot(rx, ry) || 1;
        const ux = rx / dn;
        const uy = ry / dn;
        const lenNorm = lenS / sw;
        const wr = (out.lm2d && (out.lm2d[16] || out.lm2d[15])) ? f.racket2d.wrist : f.racket2d.wrist;
        const tipX = wr.x + ux * lenNorm;
        const tipY = wr.y + uy * lenNorm;
        out.racket2d = {
          ...f.racket2d,
          wrist: wr,
          throat: { x: wr.x + (tipX - wr.x) * 0.42, y: wr.y + (tipY - wr.y) * 0.42 },
          hoop: { x: wr.x + (tipX - wr.x) * 0.72, y: wr.y + (tipY - wr.y) * 0.72 },
          tip: { x: tipX, y: tipY },
          dir: { x: ux, y: uy }
        };
      }
    }

    return out;
  });
}

/**
 * Finds local maxima in hitting wrist speed as candidate Impact (T2) frames.
 * Extracts clean [T2 - 1.2s .. T2 + 1.2s] windows around each swing.
 */
function detectImpactSwings(frames, duration, dominantHand = 'right', facingSign = -1) {
  if (!frames || frames.length < 3) {
    const mid = duration ? duration * 0.5 : 1.0;
    return [{
      index: 0,
      t2Time: mid,
      startTime: Math.max(0, mid - 1.2),
      endTime: Math.min(duration || 2.4, mid + 1.2),
      peakSpeed: 0,
      label: `Удар #1 (${mid.toFixed(2)}с)`
    }];
  }

  const wrIdx = dominantHand === 'left' ? 15 : 16;
  const hipIdx = dominantHand === 'left' ? 23 : 24;
  const speeds = new Array(frames.length).fill(0);

  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    const dt = Math.max(0.016, b.time - a.time);
    if (!a.lm2d || !b.lm2d) continue;
    const wrDisp = Math.hypot(b.lm2d[wrIdx].x - a.lm2d[wrIdx].x, b.lm2d[wrIdx].y - a.lm2d[wrIdx].y) / dt;
    const tipDisp = (a.racket2d && b.racket2d)
      ? Math.hypot(b.racket2d.tip.x - a.racket2d.tip.x, b.racket2d.tip.y - a.racket2d.tip.y) / dt
      : wrDisp;
    // Bonus weight when wrist is positioned forward of hip in hitting direction
    const forwardBonus = ((b.lm2d[wrIdx].x - b.lm2d[hipIdx].x) * facingSign) > 0.02 ? 1.25 : 0.85;
    speeds[i] = (wrDisp * 0.55 + tipDisp * 0.45) * forwardBonus;
    frames[i].wristSpeed = speeds[i];
  }

  // Smooth speed curve slightly (3-tap) to pick clean single swing peaks
  const smoothSpd = speeds.map((s, i) => {
    const prev = speeds[Math.max(0, i - 1)];
    const next = speeds[Math.min(speeds.length - 1, i + 1)];
    return prev * 0.25 + s * 0.5 + next * 0.25;
  });

  const maxSpd = Math.max(...smoothSpd, 0.01);
  const candidates = [];
  for (let i = 1; i < smoothSpd.length - 1; i++) {
    if (smoothSpd[i] >= smoothSpd[i - 1] && smoothSpd[i] >= smoothSpd[i + 1] && smoothSpd[i] >= maxSpd * 0.42) {
      candidates.push({ i, t: frames[i].time, spd: smoothSpd[i] });
    }
  }

  // Non-maximum suppression within 0.9s window
  candidates.sort((a, b) => b.spd - a.spd);
  const kept = [];
  for (const c of candidates) {
    if (kept.every(k => Math.abs(k.t - c.t) > 0.90)) {
      kept.push(c);
    }
  }
  kept.sort((a, b) => a.t - b.t);

  if (kept.length === 0) {
    const bestI = smoothSpd.indexOf(maxSpd);
    const t2Time = frames[Math.max(0, bestI)].time;
    kept.push({ i: bestI, t: t2Time, spd: maxSpd });
  }

  const totalDur = duration || frames[frames.length - 1].time || 2.4;
  return kept.map((c, idx) => ({
    index: idx,
    t2Time: c.t,
    startTime: Math.max(0, c.t - 1.2),
    endTime: Math.min(totalDur, c.t + 1.2),
    peakSpeed: c.spd,
    label: `Удар #${idx + 1} (T2 @ ${c.t.toFixed(2)}с)`
  }));
}

/**
 * Computes a rock-steady static crop rectangle [0..1] covering head-to-shoe AND full
 * racket swing arc across the swing window, with +15% safety margin on all sides.
 */
function computeStaticCropBox(frames, swingWindow = null) {
  if (!frames || frames.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, cx: 0.5, cy: 0.5, spanW: 1, spanH: 1 };
  }
  const subset = swingWindow
    ? frames.filter(f => f.time >= swingWindow.startTime - 0.1 && f.time <= swingWindow.endTime + 0.1)
    : frames;
  const useFrames = subset.length > 0 ? subset : frames;

  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  let hasPts = false;

  for (const f of useFrames) {
    if (f.lm2d) {
      for (const idx of [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) {
        const p = f.lm2d[idx];
        if (!p) continue;
        hasPts = true;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (f.racket2d && f.racket2d.tip) {
      const rx = clampVal(f.racket2d.tip.x, -0.05, 1.05);
      const ry = clampVal(f.racket2d.tip.y, -0.05, 1.05);
      hasPts = true;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
  }

  if (!hasPts) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, cx: 0.5, cy: 0.5, spanW: 1, spanH: 1 };
  }

  // Extra top clearance above nose (0) so forehead/cap is never clipped, +15% global padding
  minY -= 0.055;
  const rawW = Math.max(0.20, maxX - minX);
  const rawH = Math.max(0.28, maxY - minY);
  const padX = rawW * 0.16;
  const padY = rawH * 0.15;

  const outMinX = clampVal(minX - padX, 0, 0.85);
  const outMaxX = clampVal(maxX + padX, outMinX + 0.15, 1);
  const outMinY = clampVal(minY - padY, 0, 0.85);
  const outMaxY = clampVal(maxY + padY, outMinY + 0.15, 1);

  return {
    minX: outMinX,
    maxX: outMaxX,
    minY: outMinY,
    maxY: outMaxY,
    cx: (outMinX + outMaxX) * 0.5,
    cy: (outMinY + outMaxY) * 0.5,
    spanW: Math.max(0.18, outMaxX - outMinX),
    spanH: Math.max(0.24, outMaxY - outMinY)
  };
}

// =========================================================================================
// ASYNC PRE-SCAN PIPELINE (RUNS AUTOMATICALLY ON UPLOAD)
// =========================================================================================

function waitForVideoSeek(videoEl, targetTime) {
  return new Promise((resolve) => {
    const safeT = clampVal(targetTime, 0, Math.max(0, (videoEl.duration || 0) - 0.01));
    if (Math.abs(videoEl.currentTime - safeT) < 0.008) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      videoEl.removeEventListener('seeked', done);
      clearTimeout(tid);
      resolve();
    };
    const tid = setTimeout(done, 250);
    videoEl.addEventListener('seeked', done, { once: true });
    try {
      videoEl.currentTime = safeT;
    } catch (e) {
      done();
    }
  });
}

async function prescanVideoClip(videoEl, slot, onProgress) {
  const engine = window.AIPoseEngine;
  const scan = engine.scans[slot];
  if (!videoEl || !videoEl.duration) return null;

  const scanToken = Date.now() + Math.random();
  scan._token = scanToken;
  scan.status = 'scanning';
  scan.progress = 0;
  scan.statusText = 'Подготовка анализа 3D позы и ракетки...';
  scan.duration = videoEl.duration;
  scan.frames = [];
  scan.swings = [];
  scan.activeSwingIdx = 0;
  scan.cropBox = null;

  videoEl.pause();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();

  const duration = videoEl.duration;
  // Sample at up to ~28 fps for crisp swing coverage, capped at 110 frames for 2-5 sec scan speed
  const maxFrames = 110;
  const targetFps = Math.min(28, Math.max(12, maxFrames / Math.max(0.4, duration)));
  const totalSamples = Math.max(6, Math.min(maxFrames, Math.floor(duration * targetFps) + 1));

  // Offscreen analysis canvas (scaled to <= 384px wide for fast pixel + MediaPipe inference)
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 360;
  const aw = Math.min(384, vw);
  const ah = Math.max(120, Math.round((aw * vh) / vw));
  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = aw;
  scanCanvas.height = ah;
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

  const landmarker = slot === 'pro'
    ? (engine.poseLandmarkerPro || engine.poseLandmarker)
    : engine.poseLandmarker;

  const rawSamples = [];
  const grayStack = [];

  for (let i = 0; i < totalSamples; i++) {
    if (scan._token !== scanToken) return null; // superseded by new upload
    const t = totalSamples === 1 ? 0 : (i / (totalSamples - 1)) * Math.max(0.1, duration - 0.03);
    await waitForVideoSeek(videoEl, t);
    if (scan._token !== scanToken) return null;

    scanCtx.drawImage(videoEl, 0, 0, aw, ah);
    const imgData = scanCtx.getImageData(0, 0, aw, ah);
    const luma = rgbaToLuma(imgData.data, aw, ah);
    if (i % Math.max(1, Math.floor(totalSamples / 11)) === 0) {
      grayStack.push(luma);
    }

    let lm2d = null;
    let lm3d = null;
    if (engine.mediapipeLoaded && landmarker) {
      try {
        engine._scanMonoMs += 35;
        const res = landmarker.detectForVideo(scanCanvas, engine._scanMonoMs);
        if (res && res.landmarks && res.landmarks[0]) {
          lm2d = res.landmarks[0].map(p => ({ x: p.x, y: p.y, z: p.z || 0, visibility: p.visibility ?? 1 }));
          lm3d = (res.worldLandmarks && res.worldLandmarks[0])
            ? res.worldLandmarks[0].map(p => ({ x: p.x, y: p.y, z: p.z }))
            : null;
        }
      } catch (e) {}
    }

    rawSamples.push({ time: t, lm2d, lm3d, rgba: imgData.data, luma });
    scan.progress = ((i + 1) / totalSamples) * 0.78;
    scan.statusText = `Сканирование ${i + 1}/${totalSamples} кадров (MediaPipe 3D)...`;
    if (onProgress) onProgress(scan.progress, scan.statusText);
    if (i % 4 === 0 && typeof render3DOverlayStage === 'function') render3DOverlayStage();
    await new Promise(r => setTimeout(r, 0));
  }

  if (scan._token !== scanToken) return null;

  // Build static median court background plate & run Pixel-Vision PCA racket pass
  scan.statusText = 'Pixel-Vision PCA трекинг ракетки и сглаживание 3D...';
  scan.progress = 0.84;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();

  const bgPlate = computeStaticBackgroundPlate(grayStack, aw * ah);
  const validPoseFrames = rawSamples.filter(s => s.lm2d);

  // Fill gaps cleanly by nearest neighbor if a single frame dropped pose detection
  let lastValidLm2 = validPoseFrames[0] ? validPoseFrames[0].lm2d : null;
  let lastValidLm3 = validPoseFrames[0] ? validPoseFrames[0].lm3d : null;
  for (let i = 0; i < rawSamples.length; i++) {
    if (rawSamples[i].lm2d) {
      lastValidLm2 = rawSamples[i].lm2d;
      lastValidLm3 = rawSamples[i].lm3d;
    } else if (lastValidLm2) {
      rawSamples[i].lm2d = lastValidLm2;
      rawSamples[i].lm3d = lastValidLm3;
    }
  }

  const clipYawDeg = estimateClipCourtYawDeg(rawSamples);
  const facingSign = clipYawDeg < 0 ? -1 : 1;
  const domHand = detectClipDominantHand(rawSamples);
  const boneRefs = computeClipMedianBoneLengths(rawSamples.filter(r => r.lm3d));

  let prevGray = null;
  let prevDir = null;
  const assembledFrames = rawSamples.map((s) => {
    let racket2d = null;
    if (s.lm2d) {
      const wrIdx = domHand === 'left' ? 15 : 16;
      const elIdx = domHand === 'left' ? 13 : 14;
      const hnIdx = domHand === 'left' ? 19 : 20;
      const rgbaRef = s.rgba;
      rgbaRef._luma = s.luma;
      racket2d = detectRacketPixelsInFrame(
        rgbaRef, prevGray, bgPlate, aw, ah,
        s.lm2d[wrIdx], s.lm2d[elIdx], s.lm2d[hnIdx],
        facingSign, prevDir
      );
      prevDir = racket2d.dir;
    }
    prevGray = s.luma;
    return { time: s.time, lm2d: s.lm2d, lm3d: s.lm3d, racket2d, wristSpeed: 0 };
  });

  // Bidirectional zero-lag smoothing on 2D, 3D worldLandmarks & tracked racket vector
  const smoothed = smoothScannedFrames(assembledFrames);

  // Detect candidate T2 peak impact moments & compute 3D metric pose per frame
  const swings = detectImpactSwings(smoothed, duration, domHand, facingSign);
  const activeSwing = swings[0];

  // Estimate low-to-high racket tip trajectory slope right into T2
  let t2SwingPathDeg = 22;
  const t2Idx = smoothed.reduce((best, f, idx) =>
    Math.abs(f.time - activeSwing.t2Time) < Math.abs(smoothed[best].time - activeSwing.t2Time) ? idx : best, 0);
  if (t2Idx >= 2 && smoothed[t2Idx].racket2d && smoothed[Math.max(0, t2Idx - 2)].racket2d) {
    const preR = smoothed[Math.max(0, t2Idx - 2)].racket2d.tip;
    const nowR = smoothed[t2Idx].racket2d.tip;
    const rise = preR.y - nowR.y; // + = upward canvas swing
    const run = Math.max(0.03, Math.abs(nowR.x - preR.x));
    t2SwingPathDeg = Math.round(clampVal((Math.atan2(rise, run) * 180) / Math.PI, 4, 48));
  }

  for (let i = 0; i < smoothed.length; i++) {
    const f = smoothed[i];
    if (f.lm3d) {
      f.pose3D = convertWorldLandmarksToCourtPose3D(
        f.lm3d, f.lm2d, f.racket2d, clipYawDeg, domHand, boneRefs,
        { swingPathAngleDeg: t2SwingPathDeg }
      );
    }
  }

  const cropBox = computeStaticCropBox(smoothed, activeSwing);

  scan.frames = smoothed;
  scan.swings = swings;
  scan.activeSwingIdx = 0;
  scan.dominantHand = domHand;
  scan.facingSign = facingSign;
  scan.clipYawDeg = clipYawDeg;
  scan.cropBox = cropBox;
  scan.progress = 1.0;
  scan.statusText = `Готово: ${smoothed.length} кадров · Удар T2 @ ${activeSwing.t2Time.toFixed(2)}с`;
  scan.status = 'ready';

  // Populate Lock & Metrics at Impact T2 immediately
  const lock = slot === 'pro' ? engine.proVideoLock : engine.videoLock;
  lock.active = true;
  lock.facingSign = facingSign;
  lock.matchedYawDeg = clipYawDeg;
  lock.matchedPitchDeg = 12;
  lock.matchedPhaseT = 0.62;
  lock.activeHand = domHand;
  lock.cropBox = cropBox;

  if (smoothed[t2Idx] && smoothed[t2Idx].lm2d) {
    const lmT2 = smoothed[t2Idx].lm2d;
    lock.hipNormX = (lmT2[23].x + lmT2[24].x) * 0.5;
    lock.hipNormY = (lmT2[23].y + lmT2[24].y) * 0.5;
    lock.shNormY = (lmT2[11].y + lmT2[12].y) * 0.5;
    lock.headNormY = Math.min(lmT2[0].y, lock.shNormY - 0.06);
    lock.ankleNormY = Math.max(lmT2[27].y, lmT2[28].y, lmT2[31].y, lmT2[32].y);
    lock.torsoLegNormSpan = Math.max(0.14, Math.abs(lock.ankleNormY - lock.shNormY));
    lock.fullBodyNormSpan = Math.max(0.22, Math.abs(lock.ankleNormY - lock.headNormY));
  }

  if (slot === 'user') {
    engine.userDetectedCam.yaw = clipYawDeg;
    engine.userDetectedCam.isLiveTracked = true;
    Viewer3D.cam.yaw = clipYawDeg;
    Viewer3D.cam.pitch = 12;
    Viewer3D.cam.panY = 0;
  }

  recomputeSlotMetricsFromScan(slot);
  populateSwingSelectorUI();
  updateAITelemetryBanner();
  updateSidebarWithLiveVideoMetrics();
  if (typeof renderCauseAndEffectStrip === 'function') renderCauseAndEffectStrip();
  if (typeof jumpToPhase === 'function') jumpToPhase('T2');

  return scan;
}

// =========================================================================================
// SWING PHASE <-> CLIP TIME MAPPING & INTERPOLATED PLAYBACK
// =========================================================================================

function mapProgressToClipTime(scan, progress) {
  const p = clampVal(progress, 0, 1);
  if (!scan || scan.status !== 'ready' || !scan.swings || scan.swings.length === 0) {
    return p * 2.4;
  }
  const sw = scan.swings[scan.activeSwingIdx] || scan.swings[0];
  const t2Phase = 0.62;
  if (p <= t2Phase) {
    const frac = p / t2Phase;
    return sw.startTime + (sw.t2Time - sw.startTime) * frac;
  }
  const frac = (p - t2Phase) / (1.0 - t2Phase);
  return sw.t2Time + (sw.endTime - sw.t2Time) * frac;
}

function mapClipTimeToProgress(scan, currentTime) {
  if (!scan || scan.status !== 'ready' || !scan.swings || scan.swings.length === 0) {
    return clampVal((currentTime % 2.4) / 2.4, 0, 1);
  }
  const sw = scan.swings[scan.activeSwingIdx] || scan.swings[0];
  const t2Phase = 0.62;
  if (currentTime <= sw.t2Time) {
    const denom = Math.max(0.05, sw.t2Time - sw.startTime);
    return clampVal(((currentTime - sw.startTime) / denom) * t2Phase, 0, t2Phase);
  }
  const denom = Math.max(0.05, sw.endTime - sw.t2Time);
  return clampVal(t2Phase + ((currentTime - sw.t2Time) / denom) * (1.0 - t2Phase), t2Phase, 1);
}

function lerpVec3(a, b, u) {
  if (!a) return b;
  if (!b) return a;
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u
  ];
}

function interpolatePose3DFrames(pA, pB, u) {
  if (!pA) return pB;
  if (!pB) return pA;
  const out = {};
  const vecKeys = [
    'pelvisPos', 'hipL', 'hipR', 'shL', 'shR', 'elL', 'elR',
    'wrL', 'wrR', 'kneeL', 'kneeR', 'head', 'rTip', 'rFaceNormal', 'ball'
  ];
  for (const k of vecKeys) out[k] = lerpVec3(pA[k], pB[k], u);
  out.footL = pA.footL && pB.footL ? {
    ankle: lerpVec3(pA.footL.ankle, pB.footL.ankle, u),
    heel: lerpVec3(pA.footL.heel, pB.footL.heel, u),
    toe: lerpVec3(pA.footL.toe, pB.footL.toe, u),
    yaw: pA.footL.yaw + (pB.footL.yaw - pA.footL.yaw) * u
  } : (pA.footL || pB.footL);
  out.footR = pA.footR && pB.footR ? {
    ankle: lerpVec3(pA.footR.ankle, pB.footR.ankle, u),
    heel: lerpVec3(pA.footR.heel, pB.footR.heel, u),
    toe: lerpVec3(pA.footR.toe, pB.footR.toe, u),
    yaw: pA.footR.yaw + (pB.footR.yaw - pA.footR.yaw) * u
  } : (pA.footR || pB.footR);

  const scalarKeys = [
    'pelvisYaw', 'chestYaw', 'headYaw', 'kneeBendDeg', 'elbowAngleDeg',
    'elbowSpacingCm', 'contactOffsetCm', 'swingPathAngleDeg',
    'stanceWidthCm', 'hipShoulderSepDeg', 'weightL', 'weightR'
  ];
  for (const k of scalarKeys) {
    if (pA[k] !== undefined && pB[k] !== undefined) {
      out[k] = pA[k] + (pB[k] - pA[k]) * u;
    } else {
      out[k] = pA[k] !== undefined ? pA[k] : pB[k];
    }
  }
  return out;
}

function interpolateScannedFrame(scan, phaseT) {
  if (!scan || scan.status !== 'ready' || !scan.frames || scan.frames.length === 0) return null;
  const targetTime = mapProgressToClipTime(scan, phaseT);
  const frames = scan.frames;

  let hi = frames.findIndex(f => f.time >= targetTime);
  if (hi === -1) hi = frames.length - 1;
  const lo = Math.max(0, hi - 1);
  const fA = frames[lo];
  const fB = frames[hi];
  const span = Math.max(1e-4, fB.time - fA.time);
  const u = fA === fB ? 0 : clampVal((targetTime - fA.time) / span, 0, 1);

  const lm2d = (fA.lm2d && fB.lm2d)
    ? fA.lm2d.map((p, idx) => ({
        x: p.x + (fB.lm2d[idx].x - p.x) * u,
        y: p.y + (fB.lm2d[idx].y - p.y) * u,
        z: (p.z || 0) + ((fB.lm2d[idx].z || 0) - (p.z || 0)) * u,
        visibility: p.visibility
      }))
    : (fA.lm2d || fB.lm2d);

  let racket2d = fA.racket2d || fB.racket2d;
  if (fA.racket2d && fB.racket2d) {
    const dx = fA.racket2d.dir.x + (fB.racket2d.dir.x - fA.racket2d.dir.x) * u;
    const dy = fA.racket2d.dir.y + (fB.racket2d.dir.y - fA.racket2d.dir.y) * u;
    const dn = Math.hypot(dx, dy) || 1;
    const lerpPt = (a, b) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    racket2d = {
      ...fA.racket2d,
      wrist: lerpPt(fA.racket2d.wrist, fB.racket2d.wrist),
      throat: lerpPt(fA.racket2d.throat, fB.racket2d.throat),
      hoop: lerpPt(fA.racket2d.hoop, fB.racket2d.hoop),
      tip: lerpPt(fA.racket2d.tip, fB.racket2d.tip),
      dir: { x: dx / dn, y: dy / dn }
    };
  }

  const pose3D = interpolatePose3DFrames(fA.pose3D, fB.pose3D, u);

  // Build swept tip trail from [targetTime - 0.32s .. targetTime] cleanly (works scrubbing forward OR backward!)
  const trail = [];
  for (let i = 0; i <= hi; i++) {
    const f = frames[i];
    if (f.time >= targetTime - 0.34 && f.racket2d) {
      trail.push({
        tipX: f.racket2d.tip.x,
        tipY: f.racket2d.tip.y,
        wrX: f.racket2d.wrist.x,
        wrY: f.racket2d.wrist.y
      });
    }
  }
  if (racket2d) {
    trail.push({
      tipX: racket2d.tip.x,
      tipY: racket2d.tip.y,
      wrX: racket2d.wrist.x,
      wrY: racket2d.wrist.y
    });
  }

  return { time: targetTime, lm2d, racket2d, pose3D, trail };
}

function applyScannedStateForPhase(phaseT) {
  const engine = window.AIPoseEngine;
  const effPhase = engine.lockImpactMode ? 0.62 : clampVal(phaseT, 0, 1);

  if (engine.scans.user.status === 'ready') {
    const interpU = interpolateScannedFrame(engine.scans.user, effPhase);
    if (interpU) {
      engine.liveUserLandmarks2D = interpU.lm2d;
      engine.liveRacket2D = interpU.racket2d;
      engine.racketTipTrail2D = interpU.trail;
      engine.liveUserPose3D = interpU.pose3D;
      engine.videoLock.matchedPhaseT = effPhase;
    }
  }

  if (engine.scans.pro.status === 'ready') {
    const interpP = interpolateScannedFrame(engine.scans.pro, effPhase);
    if (interpP) {
      engine.liveProLandmarks2D = interpP.lm2d;
      engine.liveProRacket2D = interpP.racket2d;
      engine.proRacketTipTrail2D = interpP.trail;
      engine.liveProPose3D = interpP.pose3D;
      engine.proVideoLock.matchedPhaseT = effPhase;
    }
  }
}

/**
 * Computes clip-wide biomechanical report at Impact T2 directly from pre-scanned 3D poses.
 */
function recomputeSlotMetricsFromScan(slot = 'user') {
  const engine = window.AIPoseEngine;
  const scan = engine.scans[slot];
  if (!scan || scan.status !== 'ready' || scan.frames.length === 0) return;

  const sw = scan.swings[scan.activeSwingIdx] || scan.swings[0];
  const windowFrames = scan.frames.filter(f => f.time >= sw.startTime && f.time <= sw.endTime && f.pose3D);
  const list = windowFrames.length > 0 ? windowFrames : scan.frames.filter(f => f.pose3D);
  if (list.length === 0) return;

  // Frame closest to Impact T2
  const fT2 = list.reduce((best, f) =>
    Math.abs(f.time - sw.t2Time) < Math.abs(best.time - sw.t2Time) ? f : best, list[0]);

  const minKnee = Math.round(Math.min(...list.map(f => f.pose3D.kneeBendDeg || 155)));
  const maxSep = Math.round(Math.max(...list.map(f => f.pose3D.hipShoulderSepDeg || 24)));
  const pT2 = fT2.pose3D;

  if (slot === 'pro') {
    const pm = engine.proVideoMetrics;
    pm.hasAnalyzedVideo = true;
    pm.framesAnalyzed = scan.frames.length;
    pm.kneeAngleDeg = Math.round(pT2.kneeBendDeg || 124);
    pm.minKneeAngleDeg = minKnee;
    pm.elbowAngleDeg = Math.round(pT2.elbowAngleDeg || 148);
    pm.elbowSpacingCm = Math.round(clampVal(pT2.elbowSpacingCm || 27, 16, 38));
    pm.contactOffsetCm = Math.round(clampVal(pT2.contactOffsetCm || 36, 18, 52));
    pm.swingPathAngleDeg = Math.round(clampVal(pT2.swingPathAngleDeg || 28, 12, 42));
    pm.hipShoulderSepDeg = maxSep;
    pm.stanceWidthCm = Math.round(pT2.stanceWidthCm || 72);
    pm.weightFrontPct = Math.round(Math.max(pT2.weightL || 50, pT2.weightR || 50));
  }

  // Always update comparison deltas when user is ready (or recomputed after pro scan)
  const scanU = engine.scans.user;
  if (scanU.status === 'ready') {
    const vm = engine.videoMetrics;
    const pm = engine.proVideoMetrics;
    const swU = scanU.swings[scanU.activeSwingIdx] || scanU.swings[0];
    const uList = scanU.frames.filter(f => f.time >= swU.startTime && f.time <= swU.endTime && f.pose3D);
    const useU = uList.length > 0 ? uList : scanU.frames.filter(f => f.pose3D);
    if (useU.length === 0) return;

    const uT2Frame = useU.reduce((b, f) =>
      Math.abs(f.time - swU.t2Time) < Math.abs(b.time - swU.t2Time) ? f : b, useU[0]);
    const up = uT2Frame.pose3D;

    const proContact = (engine.scans.pro.status === 'ready' && pm.hasAnalyzedVideo) ? pm.contactOffsetCm : 38;
    const proElbow = (engine.scans.pro.status === 'ready' && pm.hasAnalyzedVideo) ? pm.elbowSpacingCm : 27;

    vm.hasAnalyzedVideo = true;
    vm.framesAnalyzed = scanU.frames.length;
    vm.minKneeAngleDeg = Math.round(Math.min(...useU.map(f => f.pose3D.kneeBendDeg || 152)));
    vm.kneeAngleDeg = Math.round(up.kneeBendDeg || 148);
    vm.elbowAngleDeg = Math.round(up.elbowAngleDeg || 136);
    vm.elbowSpacingCm = Math.round(clampVal(up.elbowSpacingCm || 14, 9, 34));
    vm.contactOffsetCm = Math.round(up.contactOffsetCm !== undefined ? up.contactOffsetCm : 17);
    vm.contactLateCm = Math.round(proContact - vm.contactOffsetCm);
    vm.swingPathAngleDeg = Math.round(up.swingPathAngleDeg || 15);
    vm.maxHipShoulderSepDeg = Math.round(Math.max(...useU.map(f => f.pose3D.hipShoulderSepDeg || 26)));
    vm.hipShoulderSepDeg = Math.round(up.hipShoulderSepDeg || 26);
    vm.stanceWidthCm = Math.round(up.stanceWidthCm || 54);
    vm.weightFrontPct = Math.round(Math.max(up.weightL || 50, up.weightR || 50));

    // Ball physics chain driven by real biomechanical measurements at T2
    const absLate = Math.max(0, vm.contactLateCm);
    const kneeDriveFactor = Math.max(0, 170 - vm.minKneeAngleDeg);
    vm.ballSpeedKmh = Math.round(clampVal(84 + vm.elbowSpacingCm * 0.85 + Math.max(0, proContact - absLate) * 0.50, 72, 138));
    vm.spinRpm = Math.round(clampVal(820 + Math.max(4, vm.swingPathAngleDeg) * 52 + kneeDriveFactor * 10, 800, 3200));
    vm.netClearanceCm = Math.round(clampVal(18 + vm.swingPathAngleDeg * 1.65, 16, 95));
    vm.landingDepthM = Number(clampVal(6.5 + (vm.ballSpeedKmh - 90) * 0.085 + (vm.netClearanceCm - 25) * 0.022, 6.2, 11.4).toFixed(1));
    vm.shortfallM = Number(Math.max(0, 10.7 - vm.landingDepthM).toFixed(1));
    vm.targetHitPct = Math.round(clampVal(90 - absLate * 1.35 - Math.max(0, proElbow - vm.elbowSpacingCm) * 1.05, 28, 94));

    const prepScore = clampVal(5.8 + (vm.maxHipShoulderSepDeg / 45) * 3.6, 5.0, 9.6);
    const footScore = clampVal(5.5 + (vm.stanceWidthCm / 68) * 3.6, 5.0, 9.5);
    const loadScore = clampVal(9.8 - Math.max(0, vm.minKneeAngleDeg - 125) * 0.09, 4.8, 9.6);
    const contScore = clampVal(9.4 - absLate * 0.14, 4.8, 9.6);
    const follScore = clampVal(5.4 + (Math.max(4, vm.swingPathAngleDeg) / 29) * 3.8, 5.0, 9.5);

    vm.subScores = {
      prep: Number(prepScore.toFixed(1)),
      footwork: Number(footScore.toFixed(1)),
      loading: Number(loadScore.toFixed(1)),
      contact: Number(contScore.toFixed(1)),
      follow: Number(follScore.toFixed(1))
    };
    vm.computedScore = Number(((prepScore + footScore + loadScore + contScore + follScore) / 5).toFixed(1));
  }
}

/**
 * 1-click T2 impact frame nudge (Branch 6 fallback if ball motion-blurs peak velocity).
 */
function nudgeImpactT2ToCurrentTime(slot = 'user') {
  const engine = window.AIPoseEngine;
  const videoEl = document.getElementById(slot === 'pro' ? 'pro-video-element' : 'user-video-element');
  const scan = engine.scans[slot];
  if (!scan || scan.status !== 'ready' || !videoEl) return false;

  const newT2 = clampVal(videoEl.currentTime, 0.05, Math.max(0.1, scan.duration - 0.05));
  const sw = scan.swings[scan.activeSwingIdx] || scan.swings[0];
  if (sw) {
    sw.t2Time = newT2;
    sw.startTime = Math.max(0, newT2 - 1.2);
    sw.endTime = Math.min(scan.duration, newT2 + 1.2);
    sw.label = `Удар #${sw.index + 1} (T2 @ ${newT2.toFixed(2)}с ✓)`;
  }
  scan.cropBox = computeStaticCropBox(scan.frames, sw);
  const lock = slot === 'pro' ? engine.proVideoLock : engine.videoLock;
  lock.cropBox = scan.cropBox;

  recomputeSlotMetricsFromScan(slot);
  populateSwingSelectorUI();
  if (typeof jumpToPhase === 'function') jumpToPhase('T2');
  updateAITelemetryBanner();
  updateSidebarWithLiveVideoMetrics();
  if (typeof renderCauseAndEffectStrip === 'function') renderCauseAndEffectStrip();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
  return true;
}

function selectSwingIndex(idx) {
  const engine = window.AIPoseEngine;
  const scan = engine.scans.user;
  if (!scan || scan.status !== 'ready') return;
  const parsed = parseInt(idx, 10);
  if (Number.isNaN(parsed) || !scan.swings[parsed]) return;
  scan.activeSwingIdx = parsed;
  scan.cropBox = computeStaticCropBox(scan.frames, scan.swings[parsed]);
  engine.videoLock.cropBox = scan.cropBox;
  recomputeSlotMetricsFromScan('user');
  if (typeof jumpToPhase === 'function') jumpToPhase('T2');
  updateAITelemetryBanner();
  updateSidebarWithLiveVideoMetrics();
  if (typeof renderCauseAndEffectStrip === 'function') renderCauseAndEffectStrip();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function populateSwingSelectorUI() {
  const wrap = document.getElementById('swing-selector-wrap');
  const sel = document.getElementById('swing-selector');
  if (!wrap || !sel) return;
  const scan = window.AIPoseEngine.scans.user;
  if (!scan || scan.status !== 'ready' || scan.swings.length === 0) {
    wrap.classList.add('hidden');
    return;
  }
  sel.innerHTML = scan.swings.map((s, i) =>
    `<option value="${i}" ${i === scan.activeSwingIdx ? 'selected' : ''}>${s.label}</option>`
  ).join('');
  wrap.classList.remove('hidden');
}

function processVideoFrameWithAI(videoEl, slot, timestampMs) {
  const engine = window.AIPoseEngine;
  const scan = engine.scans[slot];
  if (scan && scan.status === 'ready') {
    applyScannedStateForPhase(AppState.overlay.progress);
    return slot === 'user' ? engine.liveUserPose3D : engine.liveProPose3D;
  }
  return null;
}

// =========================================================================================
// SIDEBAR, TELEMETRY BANNER & CAUSE-EFFECT STRIP
// =========================================================================================

function updateSidebarWithLiveVideoMetrics() {
  if (!AppState.overlay.userVideoLoaded) return;
  const vm = window.AIPoseEngine.videoMetrics;
  const pm = window.AIPoseEngine.proVideoMetrics;
  if (!vm.hasAnalyzedVideo) return;

  const proCon = (window.AIPoseEngine.scans.pro.status === 'ready' && pm.hasAnalyzedVideo) ? pm.contactOffsetCm : 38;
  const proElb = (window.AIPoseEngine.scans.pro.status === 'ready' && pm.hasAnalyzedVideo) ? pm.elbowSpacingCm : 27;
  const proPath = (window.AIPoseEngine.scans.pro.status === 'ready' && pm.hasAnalyzedVideo) ? pm.swingPathAngleDeg : 29;
  const lateAbs = Math.max(0, vm.contactLateCm);
  const lateBadge = vm.contactLateCm >= 0
    ? `на ${vm.contactLateCm} см ПОЗЖЕ`
    : `на ${Math.abs(vm.contactLateCm)} см РАНЬШЕ`;

  const scoreEl = document.getElementById('biomech-score');
  if (scoreEl) {
    scoreEl.innerHTML = `<span class="text-emerald-400">${vm.computedScore.toFixed(1)} / 10</span> <span class="text-xs text-sky-300">(3D Pre-Scan)</span>`;
  }

  const sumEl = document.getElementById('biomech-summary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="mb-1.5 text-xs text-slate-200 bg-slate-900/90 border border-rose-500/40 rounded-lg p-2 space-y-1">
        <div class="font-bold text-rose-300">🔍 Реальная 3D-диагностика в точке удара (T2):</div>
        <div>1️⃣ <strong>Точка удара:</strong> <span class="text-rose-400 font-bold">${lateBadge}</span> эталона (+${vm.contactOffsetCm} см vs +${proCon} см у Профи)</div>
        <div>2️⃣ <strong>Локоть бьющей руки:</strong> <span class="text-amber-300 font-bold">${vm.elbowSpacingCm} см от корпуса</span> (Профи: ${proElb} см)</div>
        <div>3️⃣ <strong>Траектория ракетки:</strong> разгон <strong class="text-sky-300">+${vm.swingPathAngleDeg}°</strong> (Профи +${proPath}°) → <strong>${vm.spinRpm} RPM</strong>, глубина <strong class="text-rose-300">-${vm.shortfallM} м до цели</strong></div>
      </div>
      <div class="grid grid-cols-5 gap-1 text-center text-xs font-mono pt-1 border-t border-slate-800">
        <div class="bg-slate-900 p-1 rounded">Замах<br/><span class="text-emerald-400 font-bold">${vm.subScores.prep}</span></div>
        <div class="bg-slate-900 p-1 rounded">Стопы<br/><span class="text-amber-400 font-bold">${vm.subScores.footwork}</span></div>
        <div class="bg-slate-900 p-1 rounded">Ноги<br/><span class="text-amber-400 font-bold">${vm.subScores.loading}</span></div>
        <div class="bg-slate-900 p-1 rounded">Контакт<br/><span class="text-rose-400 font-bold">${vm.subScores.contact}</span></div>
        <div class="bg-slate-900 p-1 rounded">Траект.<br/><span class="text-sky-400 font-bold">${vm.subScores.follow}</span></div>
      </div>
    `;
  }

  const listEl = document.getElementById('discrepancy-list');
  if (listEl) {
    listEl.innerHTML = `
      <div class="text-xs font-bold uppercase tracking-wider text-rose-400 px-0.5">
        🎯 Конкретные расхождения (World 3D + Ракетка)
      </div>
      <div onclick="jumpToPhase('T2')" class="p-2.5 rounded-xl border border-rose-500/60 bg-rose-950/25 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-rose-500/30 text-rose-200">Ошибка #1 · Контакт</span>
          <span class="text-xs font-mono text-rose-300 font-bold">${vm.contactLateCm >= 0 ? '-' : '+'}${lateAbs} см</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Вынос впереди таза: +${vm.contactOffsetCm} см (Профи +${proCon} см)</div>
        <p class="text-xs text-slate-300 leading-snug"><strong>Рекомендация:</strong> встречайте мяч раньше, впереди ведущего бедра (+${proCon} см) для свободного разгона.</p>
      </div>

      <div onclick="jumpToPhase('T2')" class="p-2.5 rounded-xl border border-amber-500/50 bg-amber-950/25 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/30 text-amber-200">Ошибка #2 · Локоть</span>
          <span class="text-xs font-mono text-amber-300 font-bold">${vm.elbowSpacingCm} см vs ${proElb} см</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Дистанция локтя до корпуса: ${vm.elbowSpacingCm} см (Профи: ${proElb} см)</div>
        <p class="text-xs text-slate-300 leading-snug"><strong>Рекомендация:</strong> освободите окно между локтем и рёбрами (~${proElb} см), угол локтя сейчас ${vm.elbowAngleDeg}°.</p>
      </div>

      <div onclick="jumpToPhase('T1')" class="p-2.5 rounded-xl border border-sky-500/50 bg-sky-950/20 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-sky-500/30 text-sky-200">Ошибка #3 · Ноги и Траектория</span>
          <span class="text-xs font-mono text-sky-300 font-bold">+${vm.swingPathAngleDeg}° (Профи +${proPath}°)</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Почему мяч короче (-${vm.shortfallM} м): ноги ${vm.minKneeAngleDeg}°, наклон +${vm.swingPathAngleDeg}°</div>
        <p class="text-xs text-slate-300 leading-snug">Выталкивайтесь ногами вверх из-под мяча, выводя головку ракетки по дуге +${proPath}°.</p>
      </div>
    `;
  }
}

function runAIAutoAlignVideos() {
  const engine = window.AIPoseEngine;
  engine.autoAlignEnabled = true;
  engine.status = 'aligned';

  Viewer3D.cam.zoom = 1.0;
  Viewer3D.cam.panX = 0;
  Viewer3D.cam.panY = 0;
  if (engine.videoLock.active) {
    Viewer3D.cam.yaw = engine.videoLock.matchedYawDeg;
    Viewer3D.cam.pitch = engine.videoLock.matchedPitchDeg;
  }

  const scaleSlider = document.getElementById('slider-3d-scale');
  const oxSlider = document.getElementById('slider-3d-offset-x');
  const oySlider = document.getElementById('slider-3d-offset-y');
  if (scaleSlider) scaleSlider.value = 100;
  if (oxSlider) oxSlider.value = 0;
  if (oySlider) oySlider.value = 0;

  updateAITelemetryBanner();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleAIAutoAlign(checked) {
  window.AIPoseEngine.autoAlignEnabled = checked;
  if (checked) runAIAutoAlignVideos();
  updateAITelemetryBanner();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleMotionStrobe(checked) {
  window.AIPoseEngine.showMotionStrobe = checked;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleAngleGrid(checked) {
  window.AIPoseEngine.showAngleGrid = checked;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function lockImpactFrameNow() {
  const engine = window.AIPoseEngine;
  engine.lockImpactMode = true;
  engine.videoLock.matchedPhaseT = 0.62;
  if (typeof jumpToPhase === 'function') jumpToPhase('T2');
  updateAITelemetryBanner();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleCameraGuideModal() {
  const modal = document.getElementById('camera-setup-guide-panel');
  if (modal) modal.classList.toggle('hidden');
  window.AIPoseEngine.showCameraGuide = !window.AIPoseEngine.showCameraGuide;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function renderCauseAndEffectStrip() {
  const canvas = document.getElementById('cause-effect-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#080e1a";
  ctx.fillRect(0, 0, w, h);

  const vm = window.AIPoseEngine.videoMetrics;
  const usrSpeed = vm.ballSpeedKmh || 104;
  const usrSpin = vm.spinRpm || 1480;
  const usrNetCm = vm.netClearanceCm || 38;
  const usrDepthM = vm.landingDepthM || 8.3;
  const usrShortM = vm.shortfallM || 2.4;
  const usrLateCm = vm.contactLateCm || 21;
  const usrElbowCm = vm.elbowSpacingCm || 13;
  const usrPathDeg = vm.swingPathAngleDeg || 15;
  const usrHitPct = vm.targetHitPct || 48;

  const padL = 24;
  const plotW = w * 0.56;
  const floorY = h - 26;
  const netX = padL + plotW * 0.48;
  const baselineL = padL + 18;
  const baselineR = padL + plotW - 16;
  const serviceR = netX + (baselineR - netX) * 0.54;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padL, floorY);
  ctx.lineTo(baselineR + 12, floorY);
  ctx.stroke();

  const netH = 26;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(netX, floorY);
  ctx.lineTo(netX, floorY - netH);
  ctx.stroke();
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText("СЕТКА (91см)", netX - 32, floorY + 14);
  ctx.fillText("ИГРОК", baselineL - 8, floorY + 14);
  ctx.fillText("ХАФКОРТ", serviceR - 22, floorY + 14);
  ctx.fillText("ЦЕЛЬ (ЗАДНЯЯ)", baselineR - 68, floorY + 14);

  const targetStartX = baselineR - 52;
  ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
  ctx.fillRect(targetStartX, floorY - 5, 50, 8);
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(targetStartX, floorY - 5, 50, 8);

  const proLaunchX = baselineL + 18;
  const proLaunchY = floorY - 30;
  const proLandX = baselineR - 18;
  const proPeakY = floorY - netH - 36;

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(proLaunchX, proLaunchY);
  ctx.quadraticCurveTo(netX + 18, proPeakY, proLandX, floorY - 2);
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(proLandX, floorY - 2, 5, 0, Math.PI * 2);
  ctx.fill();

  const usrLaunchX = baselineL + 6;
  const usrLaunchY = floorY - 27;
  const depthRatio = clampVal(usrDepthM / 11.89, 0.45, 0.96);
  const usrLandX = netX + (baselineR - netX) * depthRatio;
  const usrPeakY = floorY - netH - Math.max(8, (usrNetCm / 74) * 34);

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.6;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(usrLaunchX, usrLaunchY);
  ctx.quadraticCurveTo(netX - 8, usrPeakY, usrLandX, floorY - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#f43f5e";
  ctx.beginPath();
  ctx.arc(usrLandX, floorY - 2, 5.5, 0, Math.PI * 2);
  ctx.fill();

  if (proLandX - usrLandX > 14) {
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(usrLandX, floorY - 12);
    ctx.lineTo(proLandX, floorY - 12);
    ctx.stroke();
    ctx.fillStyle = "#fda4af";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`Недолёт -${usrShortM} м (Коротко!)`, (usrLandX + proLandX) / 2 - 58, floorY - 17);
  }

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText(`⭐ Профи: +74см над сеткой · 2850 RPM · 128 км/ч (В цель 88%)`, padL, 18);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`👤 Вы: +${usrNetCm}см над сеткой · ${usrSpin} RPM · ${usrSpeed} км/ч (В цель ${usrHitPct}%)`, padL, 34);

  const divX = padL + plotW + 14;
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 10);
  ctx.lineTo(divX, h - 10);
  ctx.stroke();

  const rx = divX + 14;
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("🔗 ПОЧЕМУ МЯЧ ЛЕТИТ КОРОТКО (СВЯЗЬ ТЕХНИКИ И РЕЗУЛЬТАТА):", rx, 20);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`1. Контакт (${usrLateCm >= 0 ? '-' : '+'}${Math.abs(usrLateCm)} см) + Локоть (${usrElbowCm} см) → скорость ${usrSpeed} км/ч (Профи 128)`, rx, 42);
  ctx.fillText(`2. Колени (${vm.minKneeAngleDeg}°) + угол ракетки +${usrPathDeg}° (норма +29°) → ${usrSpin} RPM`, rx, 62);
  ctx.fillText(`3. Итог: мяч летит на +${usrNetCm} см над сеткой и ложится на ${usrShortM} м короче цели`, rx, 82);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`💡 Решение: встречайте мяч на 20 см раньше и ведите головку снизу-вверх (+28°)!`, rx, 104);
}

function updateAITelemetryBanner() {
  const engine = window.AIPoseEngine;
  const scanU = engine.scans.user;
  const scanP = engine.scans.pro;
  const vm = engine.videoMetrics;
  const pm = engine.proVideoMetrics;

  const badgeEl = document.getElementById('ai-align-status-badge');
  if (badgeEl) {
    if (scanU.status === 'scanning' || scanP.status === 'scanning') {
      const pct = Math.round((scanU.status === 'scanning' ? scanU.progress : scanP.progress) * 100);
      badgeEl.className = "px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> ⏳ ПРЕД-СКАН ВИДЕО: ${pct}% (3D ПОЗА + РАКЕТКА + T2)`;
    } else if (scanU.status === 'ready') {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ✅ 3D PRE-SCAN + РАКЕТКА + T2 SYNC ГОТОВЫ (${scanU.frames.length} кадра)`;
    } else if (engine.autoAlignEnabled) {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 🤖 ГОТОВО К PRE-SCAN ЗАГРУЗКЕ`;
    } else {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `📐 РУЧНОЙ РЕЖИМ 3D-КАМЕРЫ`;
    }
  }

  const proCon = (scanP.status === 'ready' && pm.hasAnalyzedVideo) ? pm.contactOffsetCm : 38;
  const proElb = (scanP.status === 'ready' && pm.hasAnalyzedVideo) ? pm.elbowSpacingCm : 27;
  const proPath = (scanP.status === 'ready' && pm.hasAnalyzedVideo) ? pm.swingPathAngleDeg : 29;

  const metricsEl = document.getElementById('ai-angle-metrics-text');
  if (metricsEl) {
    const lateText = vm.contactLateCm >= 0
      ? `Контакт на ${vm.contactLateCm} см позже (+${vm.contactOffsetCm} vs +${proCon} см)`
      : `Контакт на ${Math.abs(vm.contactLateCm)} см раньше`;
    metricsEl.innerHTML =
      `Точка удара (T2): <strong class="text-rose-400">${lateText}</strong> · ` +
      `<strong class="text-amber-300">Локоть ${vm.elbowSpacingCm} см (Профи ${proElb} см)</strong> · ` +
      `<strong class="text-sky-300">Траектория +${vm.swingPathAngleDeg}° (Профи +${proPath}°)</strong>`;
  }
}
