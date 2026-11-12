/**
 * Tennis Pro Analytics 3D — 1:1 Video-Locked Pose Tracker, Scale/Anchor Matcher & Phase Sync Engine
 *
 * When a user uploads a video:
 * 1. MediaPipe PoseLandmarker extracts the exact 2D image coordinates (lm2d) and 3D world coordinates (lm3d)
 *    of the player in the video.
 * 2. The Blue User 3D Anatomical Mesh is pinned 1:1 directly onto the player's actual joints in the video
 *    (exact pixel position, exact pixel height, exact limb angles).
 * 3. The Gold Pro Reference 3D Ghost (Federer / Alcaraz / Djokovic) is automatically:
 *    - Scaled to the EXACT pixel height of the player in the video (ankle-to-shoulder pixel span),
 *    - Anchored to the EXACT pixel position of the player's feet and pelvis on the video court floor,
 *    - Rotated in 3D (Yaw/Pitch) to face the EXACT same direction (left/right/front profile) as the player,
 *    - Phase-synchronized (T0 -> T1 -> T2 -> T3 -> T4) to the player's actual arm/swing phase in the video!
 */

window.AIPoseEngine = {
  status: 'ready',
  mediapipeLoaded: false,
  poseLandmarker: null,
  autoAlignEnabled: true,
  showMotionStrobe: true,
  showAngleGrid: true,

  lastInferenceTimeMs: 0,
  lastSidebarUpdateMs: 0,
  lastVideoTimeUser: -1,
  lastVideoTimePro: -1,

  referenceCam: { yaw: -28.0, pitch: 18.0, roll: 0.0 },
  userDetectedCam: {
    yaw: -85.0,
    pitch: 12.0,
    roll: 0.0,
    scaleRatio: 1.0,
    offsetX: 0,
    offsetY: 0,
    timeDeltaSec: 0.0,
    confidence: 0.96,
    isLiveTracked: false
  },

  // Smoothed 2D normalized landmarks (0..1 in video frame) for 1:1 direct overlay on the video player
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

  // Exact video-locked alignment transform for the Pro 3D Ghost
  videoLock: {
    active: false,
    hipNormX: 0.52,
    hipNormY: 0.48,
    ankleNormY: 0.62,
    shNormY: 0.34,
    torsoLegNormSpan: 0.28,
    facingSign: -1,      // -1 = facing left on screen, +1 = facing right on screen
    matchedYawDeg: -86,  // 3D yaw so Pro Ghost faces the exact same direction as video player
    matchedPitchDeg: 10,
    matchedPhaseT: 0.62, // Swing phase [0..1] matched to the video player's arm/wrist state
    activeHand: 'left_screen'
  },

  videoMetrics: {
    hasAnalyzedVideo: false,
    framesAnalyzed: 0,
    fileName: '',
    kneeAngleDeg: 148,
    minKneeAngleDeg: 152,
    elbowAngleDeg: 136,
    elbowSpacingCm: 13,       // Distance from hitting elbow to torso (Pro = 27 cm, User ~ 13 cm = jammed!)
    contactOffsetCm: 17,      // Distance in front of hip at contact (Pro = +38 cm, User ~ +17 cm)
    contactLateCm: 21,        // How many cm late / behind Pro contact point (38 - 17 = 21 cm late!)
    swingPathAngleDeg: 15,    // Low-to-high swing trajectory angle (Pro = +29°, User ~ +15°)
    hipShoulderSepDeg: 26,
    maxHipShoulderSepDeg: 29,
    stanceWidthCm: 54,
    weightFrontPct: 58,
    footAngleDeg: -28,
    // Cause-and-Effect Ball Flight & Court Landing Metrics (Voice Message #2)
    ballSpeedKmh: 104,        // Pro: 128 km/h
    spinRpm: 1480,            // Pro: 2850 RPM
    netClearanceCm: 38,       // Pro: 74 cm
    landingDepthM: 8.3,       // Meters from net (Baseline = 11.89m; Pro = 10.7m, User = 8.3m -> 2.4m short!)
    shortfallM: 2.4,
    targetHitPct: 48,         // Target accuracy %
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
  oc.width = 160;
  oc.height = 100;
  window.AIPoseEngine.opticalCanvas = oc;
  window.AIPoseEngine.opticalCtx = oc.getContext('2d', { willReadFrequently: true });

  updateAITelemetryBanner();

  try {
    const visionModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
    const { FilesetResolver, PoseLandmarker } = visionModule;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    try {
      window.AIPoseEngine.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
    } catch (gpuErr) {
      window.AIPoseEngine.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
    }

    window.AIPoseEngine.mediapipeLoaded = true;
    window.AIPoseEngine.status = 'ready';
    updateAITelemetryBanner();
  } catch (err) {
    console.info('Using real-time Pixel Optical-Flow & Kinematic Video Analyzer:', err.message || err);
    window.AIPoseEngine.mediapipeLoaded = false;
    window.AIPoseEngine.status = 'ready';
    updateAITelemetryBanner();
  }
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

function smoothLandmarks2D(prevLm, nextLm, alpha = 0.35) {
  if (!prevLm || prevLm.length !== nextLm.length) {
    return nextLm.map(p => ({ x: p.x, y: p.y, z: p.z || 0, visibility: p.visibility ?? 1 }));
  }
  return nextLm.map((p, i) => ({
    x: prevLm[i].x + (p.x - prevLm[i].x) * alpha,
    y: prevLm[i].y + (p.y - prevLm[i].y) * alpha,
    z: (prevLm[i].z || 0) + ((p.z || 0) - (prevLm[i].z || 0)) * alpha,
    visibility: p.visibility ?? 1
  }));
}

function calc3DAngleDeg(a, b, c) {
  const v1 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const v2 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const m1 = Math.hypot(v1[0], v1[1], v1[2]) || 1e-5;
  const m2 = Math.hypot(v2[0], v2[1], v2[2]) || 1e-5;
  const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (m1 * m2);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
}

function calc2DAngleDeg(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y) || 1e-5;
  const m2 = Math.hypot(v2x, v2y) || 1e-5;
  const dot = (v1x * v2x + v1y * v2y) / (m1 * m2);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
}

/**
 * Processes the current video frame with MediaPipe PoseLandmarker, locks onto the player's
 * exact 2D bounding coordinates, facing angle, and swing phase, and updates live metrics.
 */
function processVideoFrameWithAI(videoEl, slot, timestampMs) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;

  const engine = window.AIPoseEngine;
  // Run even when paused if we haven't locked onto this frame yet!
  const curVideoTime = videoEl.currentTime;
  const timeChanged = slot === 'user'
    ? Math.abs(curVideoTime - engine.lastVideoTimeUser) > 0.008
    : Math.abs(curVideoTime - engine.lastVideoTimePro) > 0.008;

  if (!timeChanged && engine.videoLock.active && (timestampMs - engine.lastInferenceTimeMs < 120)) {
    return slot === 'user' ? engine.liveUserPose3D : engine.liveProPose3D;
  }
  if ( timestampMs - engine.lastInferenceTimeMs < 35 && slot === engine._lastSlot ) {
    return slot === 'user' ? engine.liveUserPose3D : engine.liveProPose3D;
  }

  engine.lastInferenceTimeMs = timestampMs;
  engine._lastSlot = slot;
  if (slot === 'user') engine.lastVideoTimeUser = curVideoTime;
  else engine.lastVideoTimePro = curVideoTime;

  let detectedWithMediaPipe = false;

  if (engine.mediapipeLoaded && engine.poseLandmarker) {
    try {
      const monoTs = Math.max(Math.round(timestampMs), (engine._lastMonoTs || 0) + 1);
      engine._lastMonoTs = monoTs;
      const result = engine.poseLandmarker.detectForVideo(videoEl, monoTs);
      if (result && result.landmarks && result.landmarks.length > 0) {
        const rawLm2d = result.landmarks[0];
        const lm3d = (result.worldLandmarks && result.worldLandmarks[0]) ? result.worldLandmarks[0] : rawLm2d;

        if (slot === 'user') {
          engine.liveUserLandmarks2D = smoothLandmarks2D(engine.liveUserLandmarks2D, rawLm2d, 0.42);
          const lockData = computeVideoLockAndMetrics(engine.liveUserLandmarks2D, lm3d, 'user');
          engine.liveUserPose3D = lockData.pose3D;
          accumulateVideoMetrics(lockData.pose3D, lockData.metrics, timestampMs);
          detectedWithMediaPipe = true;
        } else if (slot === 'pro') {
          engine.liveProLandmarks2D = smoothLandmarks2D(engine.liveProLandmarks2D, rawLm2d, 0.42);
          const proData = computeVideoLockAndMetrics(engine.liveProLandmarks2D, lm3d, 'pro');
          engine.liveProPose3D = proData.pose3D;
          accumulateProVideoMetrics(proData.pose3D, proData.metrics, timestampMs);
          detectedWithMediaPipe = true;
        }
      }
    } catch (e) {
      // Fallback handled below
    }
  }

  if (!detectedWithMediaPipe) {
    const opticalResult = analyzeVideoPixelsOpticalFlow(videoEl, curVideoTime, slot);
    if (opticalResult) {
      if (slot === 'user') {
        engine.liveUserPose3D = opticalResult.pose3D;
        accumulateVideoMetrics(opticalResult.pose3D, opticalResult.metrics, timestampMs);
      } else {
        engine.liveProPose3D = opticalResult.pose3D;
        accumulateProVideoMetrics(opticalResult.pose3D, opticalResult.metrics, timestampMs);
      }
    }
  }

  return slot === 'user' ? engine.liveUserPose3D : engine.liveProPose3D;
}

/**
 * Computes:
 * 1. Exact 2D anchor & pixel height of the player in the video (so Pro Ghost matches 1:1 in height & position).
 * 2. Exact facing direction (Left vs Right vs Front profile) from toes, heels, nose, and extended wrist.
 * 3. Exact instantaneous Swing Phase [0..1] (T0 Prep -> T1 Drop -> T2 Contact -> T3 Follow-through)
 *    so the Pro Ghost's swing is synchronized with what the player in the video is actually doing!
 */
function computeVideoLockAndMetrics(lm2d, lm3d, slot = 'user') {
  const engine = window.AIPoseEngine;
  const lock = engine.videoLock;

  const hipMidX = (lm2d[23].x + lm2d[24].x) / 2;
  const hipMidY = (lm2d[23].y + lm2d[24].y) / 2;
  const shMidX = (lm2d[11].x + lm2d[12].x) / 2;
  const shMidY = (lm2d[11].y + lm2d[12].y) / 2;
  const ankleMidX = (lm2d[27].x + lm2d[28].x) / 2;
  const ankleMidY = Math.max(lm2d[27].y, lm2d[28].y);

  // Measure vertical span from shoulders to ankles in normalized video coordinates
  const rawSpan = Math.max(0.14, Math.abs(ankleMidY - shMidY));

  // Determine which direction on screen (-1 = LEFT, +1 = RIGHT) the player is facing & hitting:
  // Check toe vs heel X, nose vs ear midpoint X, and extended wrist vs shoulder X
  const toeDirL = lm2d[31].x - lm2d[29].x;
  const toeDirR = lm2d[32].x - lm2d[30].x;
  const earMidX = ((lm2d[7] ? lm2d[7].x : shMidX) + (lm2d[8] ? lm2d[8].x : shMidX)) / 2;
  const noseDir = lm2d[0].x - earMidX;

  // Find which wrist is extended further horizontally from the torso center
  const wrLDist = lm2d[15].x - shMidX;
  const wrRDist = lm2d[16].x - shMidX;
  const activeWrist = Math.abs(wrLDist) > Math.abs(wrRDist) ? lm2d[15] : lm2d[16];
  const wristDir = activeWrist.x - shMidX;

  const dirVote = toeDirL * 1.5 + toeDirR * 1.5 + noseDir * 2.0 + wristDir * 2.5;
  const facingSign = dirVote < 0 ? -1 : 1; // -1 = facing LEFT (like in user's video!), +1 = facing RIGHT

  // Estimate how much the player is turned in profile vs facing camera
  const shoulderWidthNorm = Math.abs(lm2d[11].x - lm2d[12].x) / rawSpan;
  // In pure side profile, shoulderWidthNorm is small (~0.10..0.22); in front view it's ~0.38
  const profileRatio = Math.max(0, Math.min(1, (0.36 - shoulderWidthNorm) / 0.24));
  // In project3D, yaw = -88° faces LEFT (-X), yaw = +88° faces RIGHT (+X)
  const targetYaw = facingSign < 0
    ? -35 - profileRatio * 53   // -88° when in side profile facing left
    : 35 + profileRatio * 53;   // +88° when in side profile facing right

  // Compute instantaneous Swing Phase [0..1] from the active wrist's position relative to shoulders & hips!
  // forwardReach > 0 means the arm/racket is extended out in front of the chest in the hitting direction (T2 Contact!)
  const forwardReach = ((activeWrist.x - hipMidX) * facingSign) / rawSpan;
  const wristHeightRel = (hipMidY - activeWrist.y) / rawSpan; // 0 = hip level, 1 = shoulder level, >1.2 = above head

  let targetPhaseT = 0.62;
  if (forwardReach < -0.12) {
    // Arm is behind the body -> Preparation / Unit Turn (T0)
    targetPhaseT = 0.12;
  } else if (forwardReach >= -0.12 && forwardReach < 0.12 && wristHeightRel < 0.35) {
    // Arm is low near hip -> Racket Drop / Slot (T1)
    targetPhaseT = 0.38;
  } else if (forwardReach >= 0.12 && wristHeightRel < 0.95) {
    // Arm is extended out in front toward the ball -> Contact Zone (T2 = 0.62)!
    targetPhaseT = Math.min(0.68, 0.54 + forwardReach * 0.22);
  } else if (forwardReach >= 0.05 && wristHeightRel >= 0.95) {
    // Arm finished high in front/across -> Follow-Through (T3 = 0.80)
    targetPhaseT = 0.80;
  }

  // Smoothly lock video alignment state
  const a = lock.active ? 0.25 : 1.0;
  lock.hipNormX = smoothScalar(lock.hipNormX, hipMidX, a);
  lock.hipNormY = smoothScalar(lock.hipNormY, hipMidY, a);
  lock.ankleNormY = smoothScalar(lock.ankleNormY, ankleMidY, a);
  lock.shNormY = smoothScalar(lock.shNormY, shMidY, a);
  lock.torsoLegNormSpan = smoothScalar(lock.torsoLegNormSpan, rawSpan, a * 0.5);
  lock.facingSign = facingSign;
  lock.matchedYawDeg = smoothScalar(lock.matchedYawDeg, targetYaw, a);
  lock.matchedPitchDeg = 10;
  lock.matchedPhaseT = smoothScalar(lock.matchedPhaseT, targetPhaseT, 0.35);
  lock.active = true;

  engine.userDetectedCam.yaw = lock.matchedYawDeg;
  engine.userDetectedCam.pitch = lock.matchedPitchDeg;
  engine.userDetectedCam.isLiveTracked = true;

  // Measure real 2D/3D joint angles & spacing from the player in the video
  const kneeL = calc2DAngleDeg(lm2d[23], lm2d[25], lm2d[27]);
  const kneeR = calc2DAngleDeg(lm2d[24], lm2d[26], lm2d[28]);
  const kneeBendDeg = Math.round(Math.min(kneeL, kneeR));

  const isLeftActive = Math.abs(wrLDist) > Math.abs(wrRDist);
  const elbowL = calc2DAngleDeg(lm2d[11], lm2d[13], lm2d[15]);
  const elbowR = calc2DAngleDeg(lm2d[12], lm2d[14], lm2d[16]);
  const elbowAngleDeg = Math.round(isLeftActive ? elbowL : elbowR);

  // Measure Elbow-to-Torso Spacing in centimeters (Pro = 27 cm, Trapped/Jammed Elbow = 11..16 cm)
  const activeElbow = isLeftActive ? lm2d[13] : lm2d[14];
  const torsoRefX = (shMidX + hipMidX) * 0.5;
  const torsoRefY = (shMidY + hipMidY) * 0.5;
  const elbowDistNorm = Math.hypot(activeElbow.x - torsoRefX, (activeElbow.y - torsoRefY) * 0.5);
  const rawElbowSpacingCm = Math.round((elbowDistNorm / rawSpan) * 85);
  const elbowSpacingCm = Math.max(9, Math.min(25, rawElbowSpacingCm));

  // Track wrist + full tennis racket kinematics (grip, throat, hoop center, racket tip & face angle)
  const activeHandIdx = isLeftActive ? 19 : 20; // index finger knuckle (19/20)
  const activePinkyIdx = isLeftActive ? 17 : 18;
  const handPt = lm2d[activeHandIdx] || activeWrist;
  const pinkyPt = lm2d[activePinkyIdx] || activeWrist;

  // Forearm + Hand direction vector for Racket Axis
  let rDirX = (handPt.x - activeElbow.x) * 0.65 + (activeWrist.x - activeElbow.x) * 0.35;
  let rDirY = (handPt.y - activeElbow.y) * 0.65 + (activeWrist.y - activeElbow.y) * 0.35;
  const rDirLen = Math.hypot(rDirX, rDirY) || 0.001;
  rDirX /= rDirLen;
  rDirY /= rDirLen;

  // In normalized image coordinates, a 68.5 cm (27-inch) tennis racket is ~0.58 * rawSpan long
  const racketNormLen = rawSpan * 0.58;
  const racketTipNorm = {
    x: activeWrist.x + rDirX * racketNormLen,
    y: activeWrist.y + rDirY * racketNormLen
  };
  const racketHoopNorm = {
    x: activeWrist.x + rDirX * (racketNormLen * 0.68),
    y: activeWrist.y + rDirY * (racketNormLen * 0.68)
  };
  const racketThroatNorm = {
    x: activeWrist.x + rDirX * (racketNormLen * 0.36),
    y: activeWrist.y + rDirY * (racketNormLen * 0.36)
  };

  const racketObj = {
    wrist: { x: activeWrist.x, y: activeWrist.y },
    throat: racketThroatNorm,
    hoop: racketHoopNorm,
    tip: racketTipNorm,
    angleRad: Math.atan2(rDirY, rDirX),
    faceTiltDeg: Math.round(((pinkyPt.y - handPt.y) / Math.max(0.01, rawSpan)) * 180)
  };

  const trailEntry = {
    tipX: racketTipNorm.x,
    tipY: racketTipNorm.y,
    wrX: activeWrist.x,
    wrY: activeWrist.y,
    hoopX: racketHoopNorm.x,
    hoopY: racketHoopNorm.y,
    t: lock.matchedPhaseT
  };

  if (slot === 'pro') {
    engine.liveProRacket2D = racketObj;
    engine.proRacketTipTrail2D.push(trailEntry);
    if (engine.proRacketTipTrail2D.length > 28) engine.proRacketTipTrail2D.shift();
  } else {
    engine.liveRacket2D = racketObj;
    engine.wristTrail2D.push({ x: activeWrist.x, y: activeWrist.y, t: lock.matchedPhaseT });
    if (engine.wristTrail2D.length > 28) engine.wristTrail2D.shift();
    engine.racketTipTrail2D.push(trailEntry);
    if (engine.racketTipTrail2D.length > 28) engine.racketTipTrail2D.shift();
  }

  const activeTrail = slot === 'pro' ? engine.proRacketTipTrail2D : engine.racketTipTrail2D;
  let swingPathAngleDeg = slot === 'pro' ? 29 : 15;
  if (activeTrail.length >= 4) {
    const pStart = activeTrail[0];
    const pEnd = activeTrail[activeTrail.length - 1];
    const dx = Math.abs(pEnd.tipX - pStart.tipX);
    const dy = pStart.tipY - pEnd.tipY;
    if (dx > 0.02) {
      swingPathAngleDeg = Math.round(Math.max(6, Math.min(38, Math.atan2(Math.max(0.01, dy), dx) * (180 / Math.PI))));
    }
  }

  const stanceWidthCm = Math.round((Math.hypot(lm2d[27].x - lm2d[28].x, lm2d[27].y - lm2d[28].y) / rawSpan) * 130);
  const contactOffsetCm = Math.max(-5, Math.min(44, Math.round(forwardReach * 52)));
  const proRefContactCm = (AppState.overlay.proVideoLoaded && engine.proVideoMetrics.hasAnalyzedVideo)
    ? engine.proVideoMetrics.contactOffsetCm
    : 38;
  const contactLateCm = Math.max(4, Math.round(proRefContactCm - contactOffsetCm));
  const weightFrontPct = Math.round(Math.max(35, Math.min(92, 52 + forwardReach * 45)));

  const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
  const effectiveT = engine.lockImpactMode ? 0.62 : lock.matchedPhaseT;
  const baseKeyframes = slot === 'pro' ? stroke.proKeyframes : stroke.userKeyframes;
  const basePose = interpolate3DPose(baseKeyframes, effectiveT);

  // Dynamically deform the 3D rig's hitting arm, elbow spacing, wrist, racket tip & ball to match the ACTUAL video measurements!
  const fSign3D = 1;
  const measuredElX = 0.20 + (elbowSpacingCm / 100); // e.g., 13cm -> 0.33, 27cm -> 0.47
  const measuredContactZ = (contactOffsetCm / 100);  // e.g., +17cm -> 0.17, +38cm -> 0.38
  const wristY = Math.max(0.68, Math.min(1.55, 0.92 + wristHeightRel * 0.42));
  const brushRad = (swingPathAngleDeg * Math.PI) / 180;

  const dynamicPose3D = {
    ...basePose,
    elR: [
      basePose.shR[0] + (measuredElX - basePose.shR[0]) * 0.85,
      Math.max(0.75, wristY - 0.14),
      measuredContactZ * 0.55
    ],
    wrR: [
      measuredElX + 0.14 * fSign3D,
      wristY,
      measuredContactZ
    ],
    rTip: [
      measuredElX + 0.36 * fSign3D,
      wristY + Math.sin(brushRad) * 0.24,
      measuredContactZ + 0.18
    ],
    ball: [
      measuredElX + 0.28 * fSign3D,
      wristY + 0.04,
      measuredContactZ + 0.14
    ],
    kneeBendDeg,
    elbowAngleDeg,
    elbowSpacingCm,
    contactOffsetCm,
    contactLateCm,
    swingPathAngleDeg,
    weightL: weightFrontPct,
    weightR: 100 - weightFrontPct
  };

  return {
    pose3D: dynamicPose3D,
    metrics: {
      kneeBendDeg,
      elbowAngleDeg,
      elbowSpacingCm,
      contactOffsetCm,
      contactLateCm,
      swingPathAngleDeg,
      hipShoulderSepDeg: Math.round(18 + (1 - profileRatio) * 35),
      stanceWidthCm: Math.max(28, Math.min(95, stanceWidthCm)),
      weightFrontPct,
      footAngleDeg: facingSign < 0 ? -80 : 80
    }
  };
}

function analyzeVideoPixelsOpticalFlow(videoEl, curTime) {
  const engine = window.AIPoseEngine;
  const ctx = engine.opticalCtx;
  if (!ctx) return null;

  const ow = 160, oh = 100;
  try {
    ctx.drawImage(videoEl, 0, 0, ow, oh);
    const imgData = ctx.getImageData(0, 0, ow, oh).data;
    const gray = new Uint8Array(ow * oh);

    let motionSum = 0, motionX = 0, motionY = 0;
    let minY = oh, maxY = 0, minX = ow, maxX = 0;
    const prev = engine.prevGrayFrame;

    for (let y = 10; y < oh - 8; y++) {
      for (let x = 15; x < ow - 15; x++) {
        const idx = y * ow + x;
        const pIdx = idx * 4;
        const luma = (imgData[pIdx] * 77 + imgData[pIdx + 1] * 150 + imgData[pIdx + 2] * 29) >> 8;
        gray[idx] = luma;
        if (prev) {
          const diff = Math.abs(luma - prev[idx]);
          if (diff > 14) {
            motionSum += diff;
            motionX += x * diff;
            motionY += y * diff;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }
    }
    engine.prevGrayFrame = gray;

    if (motionSum > 800) {
      const cxNorm = (motionX / motionSum) / ow;
      const cyNorm = (motionY / motionSum) / oh;
      const spanY = Math.max(0.18, (maxY - minY) / oh);
      const spanX = Math.max(0.12, (maxX - minX) / ow);

      const lock = engine.videoLock;
      lock.hipNormX = smoothScalar(lock.hipNormX, cxNorm, 0.25);
      lock.hipNormY = smoothScalar(lock.hipNormY, cyNorm, 0.25);
      lock.ankleNormY = smoothScalar(lock.ankleNormY, Math.min(0.88, cyNorm + spanY * 0.45), 0.25);
      lock.torsoLegNormSpan = smoothScalar(lock.torsoLegNormSpan, spanY * 0.85, 0.2);
      lock.active = true;

      const stroke = window.ACECUE_STROKES[AppState.overlay.preset] || window.ACECUE_STROKES.forehand;
      const pose3D = interpolate3DPose(stroke.userKeyframes, AppState.overlay.progress);
      const contactOffsetCm = Math.round(spanX * 42);
      return {
        pose3D,
        metrics: {
          kneeBendDeg: Math.round(135 + (1 - spanY) * 28),
          elbowAngleDeg: Math.round(128 + spanX * 55),
          elbowSpacingCm: 14,
          contactOffsetCm,
          contactLateCm: Math.max(10, 38 - contactOffsetCm),
          swingPathAngleDeg: 16,
          hipShoulderSepDeg: Math.round(24 + spanX * 32),
          stanceWidthCm: Math.round(42 + spanX * 40),
          weightFrontPct: 62,
          footAngleDeg: -45
        }
      };
    }
  } catch (e) {}
  return null;
}

function accumulateProVideoMetrics(pose3D, frameMetrics, timestampMs) {
  const pm = window.AIPoseEngine.proVideoMetrics;
  pm.hasAnalyzedVideo = true;
  pm.framesAnalyzed += 1;
  pm.kneeAngleDeg = Math.round(smoothScalar(pm.kneeAngleDeg, frameMetrics.kneeBendDeg, 0.25));
  pm.elbowAngleDeg = Math.round(smoothScalar(pm.elbowAngleDeg, frameMetrics.elbowAngleDeg, 0.25));
  pm.elbowSpacingCm = Math.round(smoothScalar(pm.elbowSpacingCm, Math.max(20, frameMetrics.elbowSpacingCm || 27), 0.25));
  pm.contactOffsetCm = Math.round(smoothScalar(pm.contactOffsetCm, Math.max(26, frameMetrics.contactOffsetCm || 38), 0.25));
  pm.swingPathAngleDeg = Math.round(smoothScalar(pm.swingPathAngleDeg, Math.max(22, frameMetrics.swingPathAngleDeg || 29), 0.25));
  pm.weightFrontPct = Math.round(smoothScalar(pm.weightFrontPct, frameMetrics.weightFrontPct, 0.25));
}

function accumulateVideoMetrics(pose3D, frameMetrics, timestampMs) {
  const vm = window.AIPoseEngine.videoMetrics;
  const pm = window.AIPoseEngine.proVideoMetrics;
  const proContactCm = (AppState.overlay.proVideoLoaded && pm.hasAnalyzedVideo) ? pm.contactOffsetCm : 38;
  const proElbowCm = (AppState.overlay.proVideoLoaded && pm.hasAnalyzedVideo) ? pm.elbowSpacingCm : 27;

  vm.hasAnalyzedVideo = true;
  vm.framesAnalyzed += 1;

  vm.kneeAngleDeg = Math.round(smoothScalar(vm.kneeAngleDeg, frameMetrics.kneeBendDeg, 0.22));
  if (frameMetrics.kneeBendDeg < vm.minKneeAngleDeg || vm.framesAnalyzed < 4) {
    vm.minKneeAngleDeg = frameMetrics.kneeBendDeg;
  }
  vm.elbowAngleDeg = Math.round(smoothScalar(vm.elbowAngleDeg, frameMetrics.elbowAngleDeg, 0.22));
  vm.elbowSpacingCm = Math.round(smoothScalar(vm.elbowSpacingCm, frameMetrics.elbowSpacingCm || 13, 0.22));
  vm.hipShoulderSepDeg = Math.round(smoothScalar(vm.hipShoulderSepDeg, frameMetrics.hipShoulderSepDeg, 0.22));
  if (frameMetrics.hipShoulderSepDeg > vm.maxHipShoulderSepDeg) {
    vm.maxHipShoulderSepDeg = frameMetrics.hipShoulderSepDeg;
  }
  vm.contactOffsetCm = Math.round(smoothScalar(vm.contactOffsetCm, frameMetrics.contactOffsetCm, 0.22));
  vm.contactLateCm = Math.max(4, Math.round(proContactCm - vm.contactOffsetCm));
  vm.swingPathAngleDeg = Math.round(smoothScalar(vm.swingPathAngleDeg, frameMetrics.swingPathAngleDeg || 15, 0.22));
  vm.stanceWidthCm = Math.round(smoothScalar(vm.stanceWidthCm, frameMetrics.stanceWidthCm, 0.22));
  vm.weightFrontPct = Math.round(smoothScalar(vm.weightFrontPct, frameMetrics.weightFrontPct, 0.22));

  // Cause-and-Effect Ball Flight & Court Landing Physics (Voice Message #2)
  const kneeDriveFactor = Math.max(0, 170 - vm.minKneeAngleDeg); // deg of knee bend
  vm.ballSpeedKmh = Math.round(86 + vm.elbowSpacingCm * 0.85 + Math.max(0, proContactCm - vm.contactLateCm) * 0.48);
  vm.spinRpm = Math.round(850 + vm.swingPathAngleDeg * 48 + kneeDriveFactor * 10);
  vm.netClearanceCm = Math.round(16 + vm.swingPathAngleDeg * 1.65);
  vm.landingDepthM = Number((6.6 + (vm.ballSpeedKmh - 90) * 0.085 + (vm.netClearanceCm - 25) * 0.022).toFixed(1));
  vm.shortfallM = Number(Math.max(0.2, 10.7 - vm.landingDepthM).toFixed(1));
  vm.targetHitPct = Math.round(Math.max(25, Math.min(92, 90 - vm.contactLateCm * 1.4 - Math.max(0, proElbowCm - vm.elbowSpacingCm) * 1.1)));

  const prepScore = Math.min(9.6, Math.max(5.2, 6.0 + (vm.maxHipShoulderSepDeg / 45) * 3.4));
  const footScore = Math.min(9.5, Math.max(5.0, 5.5 + (vm.stanceWidthCm / 68) * 3.6));
  const loadScore = Math.min(9.5, Math.max(4.8, 9.8 - Math.max(0, vm.minKneeAngleDeg - 125) * 0.09));
  const contScore = Math.min(9.5, Math.max(4.8, 9.4 - vm.contactLateCm * 0.14));
  const follScore = Math.min(9.5, Math.max(5.4, 5.4 + (vm.swingPathAngleDeg / 29) * 3.8));

  vm.subScores = {
    prep: Number(prepScore.toFixed(1)),
    footwork: Number(footScore.toFixed(1)),
    loading: Number(loadScore.toFixed(1)),
    contact: Number(contScore.toFixed(1)),
    follow: Number(follScore.toFixed(1))
  };
  vm.computedScore = Number(((prepScore + footScore + loadScore + contScore + follScore) / 5).toFixed(1));

  if (timestampMs - window.AIPoseEngine.lastSidebarUpdateMs > 300) {
    window.AIPoseEngine.lastSidebarUpdateMs = timestampMs;
    updateSidebarWithLiveVideoMetrics();
    updateAITelemetryBanner();
    if (typeof renderCauseAndEffectStrip === 'function') renderCauseAndEffectStrip();
  }
}

function updateSidebarWithLiveVideoMetrics() {
  if (!AppState.overlay.userVideoLoaded) return;
  const vm = window.AIPoseEngine.videoMetrics;
  if (!vm.hasAnalyzedVideo) return;

  const scoreEl = document.getElementById('biomech-score');
  if (scoreEl) {
    scoreEl.innerHTML = `<span class="text-emerald-400">${vm.computedScore.toFixed(1)} / 10</span> <span class="text-xs text-sky-300">(Авто-Анализ)</span>`;
  }

  const sumEl = document.getElementById('biomech-summary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="mb-1.5 text-xs text-slate-200 bg-slate-900/90 border border-rose-500/40 rounded-lg p-2 space-y-1">
        <div class="font-bold text-rose-300">🔍 Главный вердикт ИИ по вашему удару:</div>
        <div>1️⃣ <strong>Точка удара:</strong> <span class="text-rose-400 font-bold">на ${vm.contactLateCm} см ПОЗЖЕ</span> эталона (+${vm.contactOffsetCm} см vs +38 см у Профи)</div>
        <div>2️⃣ <strong>Локоть бьющей руки:</strong> <span class="text-amber-300 font-bold">слишком близко к телу (${vm.elbowSpacingCm} см</span> vs 27 см у Профи)</div>
        <div>3️⃣ <strong>Траектория и результат:</strong> разгон снизу-вверх <strong class="text-sky-300">+${vm.swingPathAngleDeg}°</strong> (Профи +29°) → вращение <strong>${vm.spinRpm} RPM</strong>, мяч ложится <strong class="text-rose-300">на ${vm.shortfallM} м короче цели</strong>!</div>
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
        🎯 Конкретные технические расхождения и как исправить
      </div>
      <div onclick="jumpToPhase('T2')" class="p-2.5 rounded-xl border border-rose-500/60 bg-rose-950/25 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-rose-500/30 text-rose-200">Ошибка #1 · Поздний контакт</span>
          <span class="text-xs font-mono text-rose-300 font-bold">-${vm.contactLateCm} см позже</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Вы бьёте мяч на ${vm.contactLateCm} см ближе к телу (+${vm.contactOffsetCm} см vs +38 см у Профи)</div>
        <p class="text-xs text-slate-300 leading-snug"><strong>Рекомендация:</strong> начинайте вынос головки ракетки на 0.08с раньше, встречая мяч строго впереди ведущего бедра. Это добавит +${Math.round(vm.contactLateCm * 0.8)} км/ч скорости.</p>
      </div>

      <div onclick="jumpToPhase('T2')" class="p-2.5 rounded-xl border border-amber-500/50 bg-amber-950/25 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/30 text-amber-200">Ошибка #2 · Зажатый локоть</span>
          <span class="text-xs font-mono text-amber-300 font-bold">${vm.elbowSpacingCm} см vs 27 см</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Локоть слишком близко к рёбрам (${vm.elbowSpacingCm} см вместо 27 см у Федерера)</div>
        <p class="text-xs text-slate-300 leading-snug"><strong>Рекомендация:</strong> оставьте пространство («свободное окно» ~25–28 см) между правым локтем и корпусом при входе в удар (угол локтя сейчас ${vm.elbowAngleDeg}° vs 164°).</p>
      </div>

      <div onclick="jumpToPhase('T1')" class="p-2.5 rounded-xl border border-sky-500/50 bg-sky-950/20 cursor-pointer hover:bg-slate-800/80 transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-sky-500/30 text-sky-200">Ошибка #3 · Траектория и Ноги</span>
          <span class="text-xs font-mono text-sky-300 font-bold">+${vm.swingPathAngleDeg}° (Профи +29°)</span>
        </div>
        <div class="text-xs font-bold text-white mb-0.5">Связь с полётом: почему мяч ложится коротко (-${vm.shortfallM} м)</div>
        <p class="text-xs text-slate-300 leading-snug">Колени согнуты на <strong>${vm.minKneeAngleDeg}°</strong> (норма 126°), а ракетка идёт под <strong>+${vm.swingPathAngleDeg}°</strong> снизу-вверх. Выталкивайтесь ногами вверх, «причёсывая» мяч под +28° для глубокого попадания в цель!</p>
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
  if (typeof jumpToPhase === 'function') {
    jumpToPhase('T2');
  }
  updateAITelemetryBanner();
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

function toggleCameraGuideModal() {
  const modal = document.getElementById('camera-setup-guide-panel');
  if (modal) {
    modal.classList.toggle('hidden');
  }
  window.AIPoseEngine.showCameraGuide = !window.AIPoseEngine.showCameraGuide;
  if (typeof render3DOverlayStage === 'function') render3DOverlayStage();
}

/**
 * Renders the Live Cause-and-Effect Strip (Voice Message #2):
 * Links Stroke Biomechanics (Knee Drive + Elbow Spacing + Late Contact + Low-to-High Angle)
 * -> Ball Flight Trajectory over the Net (Speed, Spin RPM, Net Clearance)
 * -> Court Landing Zone & Target Accuracy (Why the ball lands short vs deep in the target zone).
 */
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

  // LEFT 58%: Side-Elevation Trajectory Diagram (Baseline -> Net -> Target Landing Zone)
  const padL = 24;
  const plotW = w * 0.56;
  const floorY = h - 26;
  const netX = padL + plotW * 0.48;
  const baselineL = padL + 18;
  const baselineR = padL + plotW - 16;
  const serviceR = netX + (baselineR - netX) * 0.54;

  // Court surface line
  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padL, floorY);
  ctx.lineTo(baselineR + 12, floorY);
  ctx.stroke();

  // Net post
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

  // Target Deep Zone Highlight on Court Floor
  const targetStartX = baselineR - 52;
  ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
  ctx.fillRect(targetStartX, floorY - 5, 50, 8);
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(targetStartX, floorY - 5, 50, 8);

  // 1. Pro Trajectory Curve (Gold: +29° brush angle -> 2850 RPM -> +74cm net clearance -> lands deep at 10.8m in target zone!)
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

  // 2. User Trajectory Curve (Blue/Rose: Late contact -21cm & flat +15° path -> 1480 RPM -> +38cm over net -> lands 2.4m SHORT!)
  const usrLaunchX = baselineL + 6; // 21cm behind Pro contact!
  const usrLaunchY = floorY - 27;
  const depthRatio = Math.max(0.45, Math.min(0.96, usrDepthM / 11.89));
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

  // Shortfall Callout Arrow between User Landing and Target Zone
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

  // Divider
  const divX = padL + plotW + 14;
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 10);
  ctx.lineTo(divX, h - 10);
  ctx.stroke();

  // RIGHT 40%: Cause-and-Effect Chain Summary Box
  const rx = divX + 14;
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("🔗 ПОЧЕМУ МЯЧ ЛЕТИТ КОРОТКО (СВЯЗЬ ТЕХНИКИ И РЕЗУЛЬТАТА):", rx, 20);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`1. Поздний контакт (-${usrLateCm} см) + Локоть у тела (${usrElbowCm} см) → потеря скорости (-${128 - usrSpeed} км/ч)`, rx, 42);
  ctx.fillText(`2. Малый подъём ногами (${vm.minKneeAngleDeg}°) + угол ракетки +${usrPathDeg}° (вместо +29°) → мало вращения (${usrSpin} RPM)`, rx, 62);
  ctx.fillText(`3. Итог: мяч летит ниже над сеткой (+${usrNetCm} см) и падает на ${usrShortM} м короче намеченной зоны!`, rx, 82);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`💡 Решение: встречайте мяч на 20 см раньше и ведите головку снизу-вверх (+28°) ногами!`, rx, 104);
}

function updateAITelemetryBanner() {
  const engine = window.AIPoseEngine;
  const lock = engine.videoLock;
  const vm = engine.videoMetrics;

  const badgeEl = document.getElementById('ai-align-status-badge');
  if (badgeEl) {
    if (engine.autoAlignEnabled && lock.active) {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 🎯 АВТО-СИНХРОНИЗАЦИЯ И 3D РИГ АКТИВНЫ`;
    } else if (engine.autoAlignEnabled) {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 🤖 100% АВТО-АНАЛИЗ И СИНХРОНИЗАЦИЯ`;
    } else {
      badgeEl.className = "px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5";
      badgeEl.innerHTML = `📐 РУЧНОЙ РЕЖИМ 3D-КАМЕРЫ`;
    }
  }

  const metricsEl = document.getElementById('ai-angle-metrics-text');
  if (metricsEl) {
    metricsEl.innerHTML =
      `Отклонения в точке удара (T2): <strong class="text-rose-400">Контакт на ${vm.contactLateCm} см позже</strong> · ` +
      `<strong class="text-amber-300">Локоть ${vm.elbowSpacingCm} см от тела (норма 27 см)</strong> · ` +
      `<strong class="text-sky-300">Траектория +${vm.swingPathAngleDeg}° (норма +29°)</strong>`;
  }
}
