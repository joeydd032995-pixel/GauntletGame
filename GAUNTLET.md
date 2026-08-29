# GAUNTLET Quality Protocol

No system is marked AAA-complete from code inspection alone. No World of Warcraft / Old School RuneScape superiority claim is permitted without rendered evidence. Every system moves through **REJECTED → PLAYABLE → CANDIDATE → ACCEPTED**.

## Evidence gates

- **Gauntlet Build Gate** — production Vite build + bundle verification.
- **Gauntlet Visual QA** — production preview in Chromium, scripted locomotion/melee/Rift/evade sequence, WebM recording, five required 1920×1080 extracted frames, browser error capture, and render telemetry.
- Visual QA now runs on every `sol/**` push and pull-request update.
- A missing/empty evidence frame fails the gate.

## Rendered critic history

### Early black-frame rejection
The first real Chromium artifact showed the HUD over an almost black 3D scene. Cause: double-dark terrain modulation combined with an excessive headless render budget (4096² shadow, 49 chunks, 18 atmosphere layers, 16 point lights, transmission). **REJECTED.**

### Run 9 rejection
Usable video showed combat obstructed by streamed vegetation, primitive character art, and melee/Rift effects becoming broad overexposed wedges. **REJECTED.** Arena carve-out, VFX hierarchy and render budgets were rebuilt.

### Run 14 rejection
The runtime passed end-to-end, but screenshots showed a rigid cape card, floating-looking enemy lower body, box-ring ruins and visibly primitive characters. **REJECTED.** Enemy IK naming, cloth segmentation, materials and arena geometry were rebuilt.

### Run 19 / 23 rejection
Mapped PBR materials and character shells improved technical response, but rendered characters still read as procedural mannequins and player/target composition lacked separation. **REJECTED.** Target-aware shoulder camera, armor shell, authored-material pipeline and VFX signatures were rebuilt.

### Run 29 / 37 rejection
Frames exposed stick-like grass, rock-mass foliage, repeated generated ruins, fake geometric light-shaft bands, weak parallax and incomplete fifth-frame evidence. **REJECTED.** Light shafts were removed, ruins moved to irregular extruded architecture, grass to multi-blade clumps, foliage to leaf-card clusters, camera parallax increased, and evidence extraction now uses the actual video tail for the final frame.

## Current specialist state

### Animation / motion matching / root motion / IK — CANDIDATE
- AnimationMixer state graph with forced combat states.
- Motion matcher scores speed, acceleration, angular speed, direction, grounded state and combat context with transition hysteresis.
- Root motion extracted from animated hips and consumed by gameplay attacks/evades.
- Bind-pose-relative foot IK with terrain-normal ankle alignment, shin compensation and hip lowering.
- Enemy leg naming standardized so the same terrain-aware solver reaches both feet.

**Hold:** motion/video review is still required for foot sliding, turn quality and combat weight.

### Physics / controller — CANDIDATE
- Capsule-style character body, explicit acceleration/braking, air control, capped fall speed, adaptive substeps, iterative penetration solve, slope response, step-up and terrain grounding.
- Player, root motion and enemy steering share authoritative physics state.

**Hold:** needs traversal stress capture and latency/performance measurements.

### Camera — CANDIDATE
- Spring-damped target-aware shoulder framing.
- Combat target look blend and dynamic distance.
- Terrain occlusion sampling and camera impulse.
- Stronger shoulder/parallax offset after rendered overlap rejection.

**Hold:** needs fresh five-frame evidence after the latest parallax pass.

### Character art — REJECTED
- Current procedural shell has mapped steel/dark/gold armor, cloth, helmet, cuirass, tabard/cape sections, greaves, gauntlets and enemy armor shell.
- A production `CharacterAssetPipeline` now supports GLTFLoader + Draco + KTX2 + Meshopt, animation aliasing, material/normal-map inspection, triangle/material reporting, required-bone validation and runtime replacement.

**Hard blocker:** the current procedural characters still visibly lose to authored production MMO character assets. This lane cannot become ACCEPTED until a real original rigged GLTF character passes the validator and rendered critic.

### Terrain — CANDIDATE
- PBR MeshPhysicalMaterial path with slope/height/macro masks.
- Generated albedo, roughness, bump and true tangent-space normal maps.
- Darker grass/dirt/rock/moss grade after pale/beige frame rejection.
- Terrain receives the real Three.js shadow/light pipeline.

**Hold:** needs newest evidence for material breakup and repetition.

### World / environment — CANDIDATE
- Arena carve-out prevents streamed trees entering the combat core.
- Ruins rebuilt from beveled irregular ExtrudeGeometry walls, broken columns, arches, slabs and mapped rubble.
- Near-field detail uses instanced multi-blade grass clumps and pebbles outside the core telegraph zone.
- Tree trunks include branches; canopies now use alpha-tested leaf-card clusters with negative space instead of solid green rock masses.
- Streaming predicts player velocity ~0.7s forward and unloads with hysteresis.

**Hold:** latest foliage/architecture pass has not yet passed rendered critic.

### Rendering / lighting / atmosphere — CANDIDATE
- ACES filmic, SMAA, restrained bloom, adaptive exposure, 2048² PCF soft key shadow, contact-shadow decals, dusk sky, rim/fill setup.
- Camera-relative multi-layer FBM fog.
- Geometric fake light shafts removed after visible banding rejection.
- Adaptive resolution governor tracks rolling frame time and changes pixel ratio within 0.9–1.5.
- Runtime telemetry records FPS/frame time, resolution scale, draw calls, triangles, lines/points, textures and geometries.

**Hold:** current leaf-card and environment geometry must pass visual + telemetry gate together.

### Combat / VFX — CANDIDATE
- Sever changed from broad white crescent to narrow Catmull-Rom weapon trail/core.
- Impact stack: controlled sparks, transient light, compact ring, hit-stop and camera impulse.
- Rift changed to ground-first rings/rune geometry with restrained vertical accents and light.
- Enemy telegraph remains world-space and HUD-visible.

**Hold:** fresh combat frames needed after the latest camera/environment changes.

### Enemy AI / authored enemy animation — CANDIDATE
- Chase → windup → strike → recovery state machine.
- Preferred-range control, circling/flank-direction changes, retreat when crowded, target-velocity lead and variable heavy/fast attack patterns.
- Authored attack/hit/death animation clips and world telegraph timing.

**Hold:** no navmesh-level world pathing yet; encounter motion needs new video review.

### Audio — CANDIDATE
- HRTF spatialization and inverse-distance falloff.
- Master compression + limiting.
- Combat ducking of ambience/music.
- Layered impact/weapon/Rift synthesis, ambience/wind layers and convolution reverb send.
- Occlusion-ready low-pass stage.

**Hold:** listening QA and world occlusion integration remain required; procedural audio is not yet a final content library.

### UI / HUD — CANDIDATE
- Player/target resources, cooldowns, state label, cast/windup bar, world danger telegraph, warning callout and low-health feedback.
- Responsive layout.

**Hold:** ultrawide/mobile/controller/accessibility captures remain outstanding.

### Performance / streaming — CANDIDATE
- Chunk pooling, instancing, near/mid shadow/detail LOD, predictive preloading and unload hysteresis.
- Adaptive render-resolution governor and recorded renderer telemetry.

**Hold:** new leaf-card foliage must remain inside a defensible frame/draw-call budget.

## Current holistic verdict

**NOT ACCEPTED.** The branch is materially more advanced and has real build/browser/render evidence, but the current procedural character asset remains an explicit hard rejection and the latest environment/foliage/camera pass is still under visual QA. No blind-comparison victory is claimed.
