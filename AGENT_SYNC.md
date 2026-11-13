# AGENT_SYNC.md — Multi-Agent Technical Overview & State Synchronization Ledger

> **AUDIENCE**: AI Coding Agents working concurrently on `tennis-pro-app`.
> **PURPOSE**: Canonical single source of truth for system architecture, global contracts, coordinate math, resolved product decisions, completed changes, and open engineering tasks. Update the Changelog and Active State sections on every commit.

---

## 1. Repository & Deployment Topology

- **Local Workspace**: `C:\Users\r4z0r\.gemini\antigravity\scratch\tennis-pro-app`
- **Remote / Live URL**: `https://github.com/r4z0rz/tennis-pro-app` (`main` branch) → GitHub Pages at `https://r4z0rz.github.io/tennis-pro-app/`
- **Runtime Model**: Zero-build static frontend (vanilla browser JS loaded via ordered `<script>` tags + Tailwind CSS CDN + `@mediapipe/tasks-vision@0.10.14` dynamic ESM `import()`).
- **Script Load Order in `index.html`** (all globals live on `window`):
  1. `js/strokes3d.js?v=N` — Synthetic reference stroke keyframes (`window.ACECUE_STROKES`) & preset aliases.
  2. `js/ai_pose_align.js?v=N` — Pre-scan pipeline, Pixel-Vision PCA racket tracker, `worldLandmarks` 3D court reconstruction, bidirectional smoothing, T2 peak finder, static crop box, live metrics, and Cause-and-Effect strip renderer (`window.AIPoseEngine`).
  3. `js/viewer3d.js?v=N` — Upload entrypoints, 2D video viewport cropping (`drawCleanVideoCover`), X-ray video skeleton + tracked racket (`drawDirectVideo3DAthlete`), volumetric 3D rig renderer (`draw3DVolumetricAthlete`), AceCue divergence callouts, and `render3DOverlayStage()` (`window.Viewer3D`).
  4. `js/app.js?v=N` — App controller (`AppState`), UI event handlers, phase scrubber/playback loop (`appRenderLoop`), plus Modules 2–4 (Heatmap, Footwork, Flight Physics).

### Mandatory Workflow Invariants for All Agents
1. **Cache-Busting**: Increment `?v=N` on all 4 `<script src="js/...?v=N">` tags in `index.html` on every release commit so GitHub Pages browsers never execute mismatched cached scripts.
2. **Global Scope Coupling**: Scripts share global functions/variables directly (`AppState`, `Viewer3D`, `AIPoseEngine`, `ACECUE_STROKES`, `render3DOverlayStage`, `mapProgressToClipTime`, `recomputeSlotMetricsFromScan`). Never convert only one file to ES module `export`/`import` without converting all four or attaching exports to `window`.
3. **Mocked Node VM Verification**: Before committing, execute all 4 scripts via `vm.runInThisContext` in Node with mocked DOM/Canvas/Video elements (including `quadraticCurveTo`, `bezierCurveTo`, `ellipse`, `roundRect`, `getImageData`). Note PowerShell heredocs (`@' ... '@ | node -`) work reliably on Windows.
4. **Offline Mirror Bundle**: Standalone single-file HTML bundle lives at `C:\Users\r4z0r\.gemini\antigravity\brain\bb3fb55a-4108-469c-8d53-1a2765139830\tennis_pro_analytics.html` (inlines all 4 JS files into `index.html`). Keep in sync after major releases.

---

## 2. Canonical 3D Coordinate & Camera Mathematics

### Court-Space Coordinate Frame (`pose3D` & `strokes3d.js`)
- `+X`: Lateral right (from rear court perspective; dominant forehand hitting side when canonicalized). Left-handed players (`dominantHand === 'left'`) are mirrored across `X = 0` inside `convertWorldLandmarksToCourtPose3D()` so `pose3D.wrR -> pose3D.rTip` always aligns onto the canonical Pro rig in Mode 2.
- `+Y`: Vertical height in meters above court surface (`y = 0.00` court floor, sole rest at `y ≈ 0.02`, standard normalized standing height `1.74 m`).
- `+Z`: Forward court depth (`+Z` toward net, `-Z` behind baseline). Positive `contactOffsetCm` means forward of hip midpoint toward the net (`(hoopCenter[2] - hipCenter[2]) * 100`).

### `project3D(pt3, cx, cy, scale, camOverride)` Convention (`js/viewer3d.js`)
```text
y_centered = pt3[1] - 0.88
x1 =  x * cos(yaw) + z * sin(yaw)
z1 = -x * sin(yaw) + z * cos(yaw)
y2 =  y_centered * cos(pitch) - z1 * sin(pitch)
z2 =  y_centered * sin(pitch) + z1 * cos(pitch)
persp = 4.4 / max(1.2, 4.4 - z2)
```
- **Camera yaw behavior**:
  - `yaw = 0°`: Behind baseline looking toward `+Z` net.
  - `yaw = -90°`: Side profile looking from right so player facing `+Z` faces screen-LEFT (`-X`).
  - `yaw = +90°`: Side profile looking from left so player facing `+Z` faces screen-RIGHT (`+X`).
- **Inverse MediaPipe `worldLandmarks` → Court Alignment** (`convertWorldLandmarksToCourtPose3D`):
  - MediaPipe `worldLandmarks` are camera-space metric coords (`+X` right, `+Y` down, `+Z` away from camera).
  - Flip `wyUp = -p.y`, compute constant clip azimuth `clipYawDeg = estimateClipCourtYawDeg(rawFrames)`, then rotate `(wx, wz)` by **`-clipYawRad`**:
    - `cx = wx * cos(yaw) - wz * sin(yaw)`
    - `cz = wx * sin(yaw) + wz * cos(yaw)`
  - Anchor lowest foot landmark (`idx >= 27`) to `y = 0.02`, scale uniformly by `1.74 / medianBodyHeight`, and enforce clip-median limb segment lengths (`enforceBoneLength3D`).

---

## 3. Global State Contracts & Interfaces

### `window.AIPoseEngine` (`js/ai_pose_align.js`)
- **Dual MediaPipe Landmarkers**: `poseLandmarker` (User) and `poseLandmarkerPro` (Pro), using `pose_landmarker_full/float16/1/pose_landmarker_full.task` in `VIDEO` mode with strictly monotonic timestamps `engine._scanMonoMs += 35` during offscreen canvas pre-scan (`prescanVideoClip`).
- **Pre-Scan Data Store `engine.scans[slot]` (`slot ∈ {'user', 'pro'}`)**:
  - `status`: `'idle' | 'scanning' | 'ready' | 'error'`
  - `progress`: `0..1`, `statusText`: human-readable progress string
  - `frames[]`: Sorted `{ time, lm2d[33], lm3d[33], racket2d, pose3D, wristSpeed }` after `smoothScannedFrames()` (`[0.12, 0.22, 0.32, 0.22, 0.12]` symmetric non-causal Gaussian pass).
  - `swings[]`: Peak wrist/racket velocity detections (`detectImpactSwings`) `{ index, t2Time, startTime, endTime, peakSpeed, label }`. Window `[t2Time - 1.2s .. t2Time + 1.2s]`.
  - `cropBox`: Static union bounding box over head-to-shoe + `racket2d.tip` across active swing (`computeStaticCropBox`), +15% margin on all sides (`{ minX, maxX, minY, maxY, cx, cy, spanW, spanH }`).
- **Normalized Swing Timeline Mapping**:
  - `mapProgressToClipTime(scan, progress)` & `mapClipTimeToProgress(scan, currentTime)`: Piecewise linear mapping where `[startTime .. t2Time] ↦ [0.00 .. 0.62]` and `[t2Time .. endTime] ↦ [0.62 .. 1.00]`. Both User and Pro clips always hit Impact `T2` at exact `progress = 0.62` regardless of individual clip lengths or timing.
- **Pixel-Vision PCA Racket Detector (`detectRacketPixelsInFrame`)**:
  - Computes median static background plate (`computeStaticBackgroundPlate`) across ~11 evenly spaced luma frames.
  - Searches circular ROI around hitting wrist (`0.25*forearm .. 2.85*forearm`), suppresses forearm shaft pixels behind wrist, scores foreground `|lum - bg|` + motion `|lum - prev|` + gradients, computes centroid elongation (`eigenRatio = lambda1 / lambda2 >= 1.9`) & wrist-anchored eigenvector + 92nd-percentile extent -> `{ wrist, throat, hoop, tip, dir, angleDeg, source: 'vision' | 'kinematic', eigenRatio }`.

### `pose3D` Schema (Required by `draw3DVolumetricAthlete` & Callouts)
```js
{
  pelvisPos: [x,y,z], pelvisYaw, chestYaw, headYaw,
  head: [x,y,z], shL, shR, elL, elR, wrL, wrR,
  hipL, hipR, kneeL, kneeR,
  footL: { ankle:[x,y,z], heel:[x,y,z], toe:[x,y,z], yaw },
  footR: { ankle:[x,y,z], heel:[x,y,z], toe:[x,y,z], yaw },
  rTip: [x,y,z], rFaceNormal: [nx,ny,nz], ball: [x,y,z],
  weightL, weightR, kneeBendDeg, elbowAngleDeg,
  elbowSpacingCm, contactOffsetCm, swingPathAngleDeg,
  stanceWidthCm, hipShoulderSepDeg
}
```

### Key DOM IDs (`index.html` ↔ JS)
- Video elements: `#user-video-element`, `#pro-video-element`
- Canvases: `#overlay-canvas` (`960x600`), `#cause-effect-canvas` (`960x122`)
- Controls: `#preset-selector`, `#video-scrubber`, `#swing-selector-wrap`, `#swing-selector`, `#video-calibration-bar`, `#btn-clear-video`, `#camera-setup-guide-panel`
- HUD & Sidebar: `#ai-align-status-badge`, `#ai-angle-metrics-text`, `#hud-phase-name`, `#hud-weight-transfer`, `#biomech-score`, `#biomech-summary`, `#discrepancy-list`, `#coach-tip-box`

---

## 4. Resolved Product & Architecture Decisions

Synthesized from the user's specification, 3 Russian audio notes from the father, and `/grill-me` (Branches 1–6):
1. **Core 2-in-1 Layout (`split` default)**: Left viewport = video comparison + AI skeleton & racket overlay; Right viewport = direct overlapping 3D kinematic rigs (Blue User over Gold Pro) with margin callout cards.
2. **Dual Real-Video Columns**: When both `user` and `pro` videos are uploaded in `split` mode, left pane divides vertically into **two full-height side-by-side columns** (`⭐ ПРОФИ | 📹 ВЫ`) instead of stacked rows so overhead finishes and heads keep maximum vertical headroom.
3. **Pre-Scan + Static Crop**: All clips pre-scan on upload (2–5s) instead of jittery live inference; camera framing uses a single rock-steady `cropBox` (+15% margin on head + racket arc) — zero dynamic camera panning/shaking.
4. **Racket Tracking**: Pixel-Vision PCA on background-subtracted/edge ROI around wrist, with wrist-knuckle fallback.
5. **T2 Sync + Fallbacks**: Auto-detect peak wrist/racket velocity as `T2` (`0.62`), extract `[T2 - 1.2s .. T2 + 1.2s]` window (with multi-swing dropdown), plus 1-click **`📍 Отметить T2 здесь`** nudge (`nudgeImpactT2Here()`) and hidden-by-default **`⚙️ Калибровка`** sliders.
6. **Cause-and-Effect Chain**: Always surface mechanics -> speed/RPM/net clearance -> court landing depth shortfall (`#cause-effect-canvas`).

---

## 5. Chronological Changelog

- **`v8` (`be1dc29`)**: Implemented 2-in-1 `split` default screen, `lockImpactFrameNow()`, Camera Setup Guide (`45° / 4.5m`), AceCue callout cards (`contactLateCm`, `elbowSpacingCm`, `swingPathAngleDeg`), and `#cause-effect-canvas`.
- **`v9` (`a03b4e8`)**: Added 2D forearm-vector racket mesh (`liveRacket2D`), swept tip ribbon, and stroboscopic 3D ghost rackets.
- **`v10` (`c310da6`)**: Enabled tracking for `'pro'` uploaded video slot (`liveProLandmarks2D`, `liveProPose3D`, `proVideoMetrics`).
- **`v11` (`d8cd3b2`)**: Split MediaPipe into dual `PoseLandmarker` instances (`poseLandmarker`, `poseLandmarkerPro` using `pose_landmarker_full`), separated `proVideoLock` vs `videoLock`, added outlier clamping and headroom safety.
- **`v12` (`f78c1f8`)**: Major architectural overhaul — replaced live laggy inference with async `prescanVideoClip`, added `detectRacketPixelsInFrame` (PCA + median background plate), true `convertWorldLandmarksToCourtPose3D` (court azimuth rotation + anatomical bone normalization), bidirectional zero-lag `smoothScannedFrames`, multi-swing `detectImpactSwings`, static `cropBox`, side-by-side full-height columns for 2 videos, deterministic dual-video playback sync (`mapProgressToClipTime`), swing selector, and 1-click `nudgeImpactT2Here()`.
- **`v13` (current pending commit)**:
  - Fixed viewport column bounding bug in `drawCleanVideoCover` / `drawDirectVideo3DAthlete` by returning `{ viewX, viewY, viewW, viewH }` and clamping the `🎾 РАКЕТКА` badge cleanly inside each column (`vxMin .. vxMax`) so two-column side-by-side labels never clip across the center seam or negative `dx`.
  - Replaced hardcoded `+38 см` / `27 см` / `+29°` baseline strings and negative-sign formatting in `drawAceCueBiomechanicalCallouts` with live dynamic `proVideoMetrics` comparisons and early/late sign handling.
  - Fixed `onPresetChange(val)` in `js/app.js` so switching reference stroke presets while a user video is loaded recomputes/preserves live video comparison metrics instead of resetting the sidebar to static placeholder data.

---

## 6. Known Limitations & Next Engineering Priorities (For Synced Agents)

1. **Browser E2E Verification with Real MP4/MOV Clips**: All `v12`/`v13` logic is verified in Node VM with synthetic frames/PCA bars, and MediaPipe is loaded via CDN in browser. Need live headless Chrome / manual verification with real portrait & landscape tennis videos (e.g., iPhone 60fps MOV/MP4) to validate:
   - `prescanVideoClip` seek speed & MediaPipe GPU/CPU fallback across long clips (>10s).
   - Accuracy of `estimateClipCourtYawDeg` on pure front vs 45° rear vs 90° side angles.
2. **Stroke-Specific `T2` Heuristics**: Currently `detectImpactSwings` weights horizontal forward wrist extension + peak wrist/tip speed. For **Serve (`serve`)**, `T2` happens at **peak upward vertical reach** (`wristY` minimum near `headY - height`); adding stroke-aware T2 scoring in `detectImpactSwings(frames, dur, domHand, facingSign, preset)` will improve Serve & Smash auto-detection.
3. **True `worldLandmarks` Azimuth Refinement**: Currently uses 2D horizontal/profile cues (`shoulderWidthNorm`, toe/nose dirVote, `noseDepthVote`) to pick clip yaw `32°..88°`. Can be upgraded by fitting horizontal principal axis of pelvis/feet trajectory directly from 3D `worldLandmarks` `(X, Z)` across `[T0..T2]`!
4. **Hoop-Center Ball Localization Refinement**: `rFaceNormal` and `pose3D.ball` are currently projected forward `+0.10m` from racket hoop center; could track the actual yellow-green optic ball pixel blob around `t2Time ± 0.12s` during pre-scan to pinpoint true ball contact frame to `±1` frame!
