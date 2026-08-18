# GAUNTLET — Refined OSRS / 07Scape Quality Protocol

The previous “beat modern World of Warcraft” target is permanently retired.

The only active visual target is **high-end Old School RuneScape / 07Scape**: a refined stylized experience that preserves OSRS readability, charm, silhouette discipline and combat clarity while materially improving authored asset quality, animation weight, terrain grounding, environmental richness and presentation polish.

No system is accepted from code inspection alone. Every major visual lane moves through **REJECTED → PLAYABLE → CANDIDATE → ACCEPTED** and requires rendered evidence. Structural CI success is never visual approval.

## Non-negotiable art direction

**Target shorthand:** refined OSRS → stronger silhouettes → richer authored environments → restrained stylized materials → readable combat poses → dense but intentional scenery.

Do not drift toward:
- modern WoW material language
- photorealism
- bloom-heavy cinematic fantasy
- procedural complexity as a substitute for authored design
- generic low-poly asset-pack presentation

## Evidence gates

- **Gauntlet Build Gate** — licensed/pinned asset acquisition + production Vite build + bundle verification.
- **Gauntlet Visual QA** — production Chromium preview, scripted idle/locomotion/melee/Rift/evade sequence, 1080p WebM, five required rendered frames, browser-error capture and render telemetry.
- **Gauntlet Character QA** — 15 required 2560×1440 character shots, hero/enemy turntables, authored-source telemetry, motion video, clip-map audit and structural critic.
- Missing assets, missing frames, browser/runtime errors, duplicate evidence, invalid motion coverage or visible procedural character geometry fail their relevant gate.
- Hybrid environment evidence is not captured until `__GAUNTLET_HYBRID_ENVIRONMENT__.ready === true`.

## Specialist / critic protocol

Work is organized into explicit specialist and harsh-critic lanes:
1. Character Asset
2. Animation & Motion
3. Environment & Hybrid Dressing
4. Terrain & Ground Material
5. Lighting, Atmosphere & Polish
6. UI/HUD & Overall Presentation

A specialist lane may implement changes but cannot declare acceptance. A harsh critic must inspect real screenshots/motion and compare against OSRS/07Scape readability, density, weight and presentation before any lane can become ACCEPTED.

## Current specialist state

### Character Asset — REJECTED

The old lofted/extruded visible character presentation has been replaced at runtime by authored skinned GLB presentation. Legacy procedural meshes are hidden only after authored installation succeeds.

The current CI-safe KayKit Knight/Barbarian tier is intentionally marked **scaffold-only**. It proves loading, rigging, animation and capture infrastructure, but its chunky generic low-poly look failed the visual critic and is ineligible for final approval.

The production ingest tier now targets the CC0 Quaternius ecosystem:
- Universal Base Characters
- Modular Character Outfits — Fantasy
- Universal Animation Library

`scripts/acquire-authored-characters.mjs` supports `GAUNTLET_QUATERNIUS_MANIFEST` for deterministic ingestion of locally acquired/composed production GLBs and compatible animation GLBs. The generated `public/assets/authored/character-source.json` records the active source tier and whether it is eligible for final visual review.

**Hard blocker:** Vanguard and Dread Warden must be installed from the production tier and then pass QHD/gameplay-camera visual review. Scaffold visuals cannot be accepted.

### Animation & Motion — CANDIDATE / NOT VISUALLY APPROVED

- Gameplay AnimationGraph, forced combat states, root motion, motion matching and terrain-aware foot IK remain intact.
- Authored presentation now maps visible clips by semantic state.
- Runtime can ingest compatible external animation GLBs from the active character-source profile.
- Character QA requires locomotion, combat, reaction and death mappings plus distinct clip diversity.

**Hold:** production-tier visible motion still needs real evidence for weight, anticipation, strike timing, recovery, planted feet and OSRS-like snappy readability.

### Environment & Hybrid Dressing — CANDIDATE / NOT VISUALLY APPROVED

The arena is transitioning from procedural/instanced-only dressing toward a hybrid model:
- authored CC0 hero props are pinned and acquired with provenance
- deterministic foreground/midground authored placements are loaded through `hybridEnvironment.js`
- background instancing remains for scalable density
- readiness/mesh/triangle/instance telemetry is exposed through `__GAUNTLET_HYBRID_ENVIRONMENT__`

Current authored baseline includes curated dungeon pillars, stacked crates and decorated barrels. These are not accepted merely because they load.

**Hold:** fresh captures must prove that authored hero pieces materially break repetition, create hierarchy and remove the “efficient but empty web demo” read.

### Terrain & Ground Material — CANDIDATE

Existing layered terrain and ground detail remain functional, but the new target requires more deliberate grass/dirt/stone zoning, edge variation, contact grounding and readable combat-space composition.

**Hold:** terrain remains below final refined-OSRS acceptance until the authored environment composition is visually established.

### Lighting, Atmosphere & Polish — CANDIDATE

Existing ACES/render pipeline, shadows, atmosphere and restrained post-processing remain operational.

**Direction:** remove the previous cyan/magenta cinematic-demo bias; favor clear stylized warm/cool separation, readable silhouettes, restrained emissive/bloom and atmospheric depth without fog soup.

### UI/HUD & Overall Presentation — CANDIDATE

The current HUD is functional but not final. It must become more crafted and in-universe while preserving immediate combat readability. Do not copy Jagex art assets.

## CI history after OSRS reset

- Authored-character CI initially failed before build because the pinned KayKit revision was invalid. The revision was corrected and binary-size/GLB validation was added.
- Build and Visual QA subsequently progressed successfully through the authored runtime.
- Character capture was hardened with stage-level watchdogs and guaranteed cleanup so a stalled screenshot/turntable/video finalization produces deterministic rejection instead of consuming the workflow timeout.
- Visual QA now waits for authored hybrid-environment readiness before accepting evidence.

## Acceptance rules

A high-end OSRS/07Scape claim requires all of the following:
- production-tier authored Vanguard and Warden assets
- production-tier visible authored/retargeted animation coverage
- zero visible procedural character meshes
- strong silhouettes at gameplay camera distance
- authored foreground/midground environmental identity plus intentional background density
- terrain and props visibly grounded
- restrained stylized materials and lighting
- readable combat poses and effects
- HUD clarity that fits the world
- fresh screenshots and motion reviewed by the harsh critic

Passing structural tests is necessary but insufficient.

## Current holistic verdict

**REJECTED — NOT READY TO MERGE.**

The infrastructure has crossed from procedural prototype toward a production-capable authored pipeline, but the visible character tier remains a rejected scaffold and the hybrid environment has not yet earned visual approval. No claim that Gauntlet matches or beats high-quality OSRS/07Scape is permitted until fresh production-tier captures support it.
