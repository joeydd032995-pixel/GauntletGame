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
- **Environment Gauntlet Critic** — requires three streamed tree species, active near/far tree LODs, clustered multi-type undergrowth, five terrain layers, non-trivial micro height/normal response, and five unique rendered gameplay frames. Structural success still returns `STRUCTURAL_PASS_VISUAL_REVIEW_REQUIRED`, never art acceptance.
- Missing assets, missing frames, browser/runtime errors, duplicate evidence, invalid motion coverage or visible procedural character geometry fail their relevant gate.
- Hybrid environment evidence is not captured until `__GAUNTLET_HYBRID_ENVIRONMENT__.ready === true`.
- Environment evidence additionally waits for `__GAUNTLET_GROUND_DETAIL__`, `__GAUNTLET_TERRAIN_MATERIAL__`, and three-species `__GAUNTLET_STREAMING_ENVIRONMENT__` telemetry.

## Specialist / critic protocol

Work is organized into explicit specialist and harsh-critic lanes:
1. Character Asset
2. Animation & Motion
3. Tree & Canopy
4. Foliage & Undergrowth
5. Terrain Material & Layering
6. Environment Cohesion & Performance
7. Lighting, Atmosphere & Polish
8. UI/HUD & Overall Presentation

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

### Tree & Canopy — CANDIDATE / NOT VISUALLY APPROVED

The single generic streamed tree has been replaced with a deterministic three-species kit:
- **Frontier Oak** — broad, irregular branched trunk and clustered rounded leaf-card masses.
- **Silver Ash** — taller/narrower trunk architecture and vertically biased canopy silhouette.
- **Ashen Pine** — tiered conifer crown with a clearly separate evergreen silhouette.

Each species has its own bark/leaf palette, proportions and crown architecture. Streamed trees now use near-detail crowns and lower-cost far crown hulls rather than simply hiding the canopy at distance. Species, active tree count and near/far LOD state are exposed through `__GAUNTLET_STREAMING_ENVIRONMENT__`.

**Hold:** screenshots must prove the three species read distinctly at gameplay distance, avoid card-cloud noise, and materially exceed the old repeated crown silhouette.

### Foliage & Undergrowth — CANDIDATE / NOT VISUALLY APPROVED

Near-field dressing is no longer one grass-clump population scattered around a ring. `GroundDetail` now contains separate instanced populations for:
- multi-blade grass clumps
- ferns
- broadleaf ground plants
- flowers
- pebbles

Placement uses ten deterministic density clusters with protected combat-lane clearance. Scale and color variation are constrained by plant family rather than unconstrained random noise. Runtime density telemetry is exposed through `__GAUNTLET_GROUND_DETAIL__`.

**Hold:** screenshots must still prove that density feels intentional rather than procedural, the foreground is richer without becoming cluttered, and flowers/ferns remain readable instead of collapsing into texture noise.

### Environment & Hybrid Dressing — CANDIDATE / NOT VISUALLY APPROVED

The arena uses a hybrid model:
- authored CC0 hero props are pinned and acquired with provenance
- deterministic foreground/midground authored placements are loaded through `hybridEnvironment.js`
- background instancing remains for scalable density
- readiness/mesh/triangle/instance telemetry is exposed through `__GAUNTLET_HYBRID_ENVIRONMENT__`

Current authored baseline includes curated dungeon pillars, stacked crates, decorated barrels, broken walls, doorway pieces and stairs. Shared stone and foliage materials have been regraded toward a warmer, matte refined-OSRS palette with reduced generic PBR sheen/noise.

**Hold:** fresh captures must prove that authored hero pieces, upgraded vegetation and material regrading form one coherent world and remove the “efficient but empty web demo” read.

### Terrain & Ground Material — CANDIDATE / NOT VISUALLY APPROVED

Terrain now has an explicit five-layer stylized stack:
- grass
- dirt
- worn path
- rock
- moss

The layer composition includes a meandering worn corridor, arena wear, slope-driven rock, sheltered moss, macro breakup, 384px generated micro detail repeated at higher frequency, stronger normal/bump response and a very small geometry-level micro-height perturbation. Telemetry is exposed through `__GAUNTLET_TERRAIN_MATERIAL__`.

**Hold:** the harsh critic must verify that the ground reads as layered and grounded in actual screenshots, does not become noisy or photorealistic, and keeps the combat lane legible.

### Environment Cohesion & Performance — CANDIDATE / NOT VISUALLY APPROVED

- Tree detail is instanced per species and swaps near/far crown representation by chunk distance.
- Undergrowth remains instanced and clustered around intentional density anchors.
- Central combat readability is explicitly protected from high plant density.
- Shared stone/foliage materials use restrained matte response and lower environment-map intensity.
- The existing adaptive resolution governor and renderer telemetry remain active.

**Hold:** final rendered frames and telemetry must demonstrate that the density increase does not cause unacceptable frame time, draw-call pressure, foliage aliasing, or silhouette collapse.

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
- Environment Gauntlet introduced multi-species tree LOD telemetry, clustered ground-cover telemetry and layered-terrain telemetry into the visual evidence package.
- The environment critic now rejects missing tree variety, insufficient near-field plant density, missing terrain layers, absent near/far LOD states, low-information screenshots or duplicate evidence frames.

## Acceptance rules

A high-end OSRS/07Scape claim requires all of the following:
- production-tier authored Vanguard and Warden assets
- production-tier visible authored/retargeted animation coverage
- zero visible procedural character meshes
- strong silhouettes at gameplay camera distance
- at least three cohesive but visually distinct tree species
- dense but intentionally clustered near-field undergrowth with a protected combat lane
- clearly readable grass/dirt/path/rock/moss terrain layering and convincing contact grounding
- authored foreground/midground environmental identity plus intentional background density
- restrained stylized materials and lighting
- readable combat poses and effects
- HUD clarity that fits the world
- fresh screenshots and motion reviewed by the harsh critic

Passing structural tests is necessary but insufficient.

## Current holistic verdict

**REJECTED — NOT READY TO MERGE.**

The environment branch has materially replaced the old single-species/simple-instancing presentation with a multi-species, clustered, layered refined-OSRS environment pipeline. None of those lanes are visually accepted until the newest five-frame evidence set is inspected directly. Character production tier also remains an independent hard blocker. No claim that Gauntlet matches or beats high-quality OSRS/07Scape is permitted until fresh rendered evidence supports it.
