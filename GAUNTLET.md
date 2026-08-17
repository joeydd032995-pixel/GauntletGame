# GAUNTLET Quality Protocol

This repository uses an explicit specialist/critic workflow. No system is marked AAA-complete from code inspection alone, and no reference-game superiority claim is permitted without rendered evidence.

## Specialist lanes

- Rendering / PBR / anti-aliasing / post-processing
- Lighting / shadowing / contact grounding / atmospheric composition
- Character controller / collision / slope response / IK
- Animation graph / locomotion / motion matching / root motion
- Combat / enemy state machine / telegraphs / hit confirmation
- Camera / targeting / motion feel
- VFX / particles / decals / hit-stop / screen feedback
- World generation / environmental composition / streaming / LOD
- UI / HUD / encounter readability / accessibility
- Audio / spatial mix / combat layering
- Performance / GPU budgets / loading
- Automated build / browser / rendered-frame QA

## Critic states

1. **REJECTED** — incomplete, broken, placeholder-grade or unverified.
2. **PLAYABLE** — works, but evidence does not support benchmark quality.
3. **CANDIDATE** — implementation is integrated and ready for rendered QA.
4. **ACCEPTED** — passes build/runtime evidence, capture review and performance target.

## Pass 3 — forced upgrade

### Animation / motion matching / IK — CANDIDATE
- Mixer state graph with forced combat states and locomotion selection.
- Motion matching cost includes speed, acceleration, turn rate, grounded/combat state and directional intent.
- Transition hysteresis prevents locomotion clip chatter.
- Root translation is extracted from the animated hips and consumed by gameplay for attacks/evades.
- Foot IK is bind-pose-relative instead of cumulative; ankle slope alignment, shin compensation and hip lowering are damped against terrain samples.
- Hero clips now animate hips, opposing legs, knees, arms, attack anticipation/follow-through, evade, hit and death.

**Critic hold:** rendered motion evidence is required before foot sliding, transition quality or weight can be graded.

### Character art — CANDIDATE prototype
- Hero silhouette rebuilt with layered breastplate, waist armor, pauldrons, mantle, hood, cape, boots, weapon guard/pommel and higher subdivision.
- Physical materials use metal/roughness, clearcoat, sheen and emissive weapon response.
- Enemy silhouette gains chest armor, articulated legs and higher-fidelity materials.

**Critic hold:** these are still procedural original characters, not final authored production meshes. Do not call them final character art.

### Physics / controller — CANDIDATE
- Acceleration/braking separated from desired velocity.
- Air control, capped fall velocity, adaptive substeps, iterative penetration solve, velocity projection, slope slide and step-up behavior.
- Gameplay movement, root motion and enemy movement share the same authoritative character bodies.

**Critic hold:** needs recorded traversal across slopes/obstacles and input-latency/performance measurements.

### Terrain / world — CANDIDATE
- Terrain moved back onto Three.js physically based materials so it receives the real lighting/shadow pipeline.
- Slope/height/macro-noise vertex layering plus tiled micro albedo, bump and roughness breakup.
- Instanced chunk streamer builds/recycles nearby world sectors and adjusts shadow/detail LOD by distance.
- Arena ruins remain collidable hero props while streamed dressing expands the surrounding world.

**Critic hold:** repetition, pop-in and distant-composition quality must be judged from captures.

### Lighting / rendering / atmosphere — CANDIDATE
- ACES filmic output, SMAA, tuned bloom and adaptive exposure.
- 4096² primary soft-shadow map with normal bias, rim/fill light and dynamic contact-shadow decals.
- Multi-layer camera-relative fog, animated FBM density pockets and low-opacity volumetric light shafts.

**Critic hold:** screenshot comparison is mandatory; brightness, banding, fog sorting and shadow quality cannot be accepted by code inspection.

### Combat / VFX / enemy AI — CANDIDATE
- Melee has anticipation, root motion, slash layers, hit-stop, sparks, flash light, impact ring and camera impulse.
- Rift uses concentric ground waves, vertical beams, transient light and spatial audio.
- Enemy AI has chase → windup → strike → recovery, world-space danger telegraph, authored attack/hit/death clips and guarded damage reduction.
- HUD exposes windup state with a cast bar and visual warning.

**Critic hold:** readability and spectacle need captured combat frames/video.

### Audio — CANDIDATE
- WebAudio/Three listener-backed spatial combat mix.
- Procedural layered whoosh, impact transient/sub hit, rift harmonic rise, ambient noise/drone and adaptive combat/ambience gain.

**Critic hold:** subjective mix quality requires listening QA; browser autoplay correctly requires user interaction.

### UI/HUD — CANDIDATE
- Target health, resources, cooldowns, enemy state, cast telegraph, world danger disc and warning callout are synchronized to combat state.
- Responsive layout remains intact.

**Critic hold:** ultrawide/mobile/controller/accessibility captures remain outstanding.

## Automated critic evidence

Two GitHub Actions gates are required:

1. `Gauntlet Build Gate`: installs dependencies, builds the production Vite bundle and verifies output artifacts.
2. `Gauntlet Visual QA`: builds, launches production preview in Chromium, fails on `pageerror`/`console.error`, drives locomotion/melee/Rift/evade inputs, captures five 1920×1080 frames and records WebM gameplay evidence.

`gauntlet-visual-evidence` is the artifact that must be inspected before any visual lane can move from CANDIDATE to ACCEPTED.

## Current holistic verdict

**NOT ACCEPTED.** The implementation has advanced from systems-exist to integrated-candidate quality, but the Gauntlet still rejects every claim of superiority until successful browser captures are retrieved and judged against current reference footage/screenshots.
