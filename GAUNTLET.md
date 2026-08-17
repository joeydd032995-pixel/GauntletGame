# GAUNTLET Quality Protocol

This repository uses an explicit specialist/critic workflow. No system is marked AAA-complete from code inspection alone.

## Specialist lanes

- Rendering / PBR / shaders
- Lighting / shadowing / atmospheric composition
- Character controller / grounding / IK
- Animation state machine / locomotion / combat timing
- Combat / ability architecture / hit confirmation
- Camera / targeting / motion feel
- VFX / particles / decals / screen-space feedback
- World generation / authored environment / streaming
- Physics / collision / traversal
- UI / HUD / accessibility / input
- Audio / music / spatial mix
- Performance / GPU budgets / memory / loading
- QA / input edge cases / browser matrix

## Critic gates

Every lane is graded on four states:

1. **REJECTED** — incomplete, placeholder-grade, visibly web-demo quality, broken, or unverified.
2. **PLAYABLE** — feature works but does not meet visual/feel benchmark.
3. **CANDIDATE** — polished enough for rendered-frame and capture comparison.
4. **ACCEPTED** — passes an evidence-backed comparison rubric and performance target.

No blind-comparison claim is permitted without actual captures from both references and Gauntlet under comparable scenes.

## Current pass: v0 vertical slice

### Rendering / lighting — PLAYABLE
- ACES filmic tonemapping
- soft PCF shadows
- hemisphere + key/rim lighting
- exponential fog
- bloom post-processing
- procedural non-flat material textures

**Critic rejection:** terrain lacks multi-layer splat mapping, macro/micro normal detail, contact shadows, volumetric fog, temporal AA, and authored hero assets.

### Character / controller — PLAYABLE
- weighted acceleration via frame-smoothed third-person motion
- sprint resource
- evade burst
- terrain grounding
- camera-relative controls

**Critic rejection:** procedural body is not shippable character art; no skeletal animation, foot IK, slope adaptation, turn-in-place, motion matching, or root-motion attacks.

### Combat / VFX — PLAYABLE
- melee hit window
- ranged/area rift ability
- enemy health state
- additive impact/rift effects
- cooldown feedback

**Critic rejection:** hit reactions, animation anticipation/follow-through, decals, distortion, trails, audio, camera impulse, enemy attacks, targeting, and ability depth are insufficient.

### World — PLAYABLE
- deformed terrain
- dense deterministic forest/rocks
- ruin ring
- emissive world crystals
- atmospheric particles

**Critic rejection:** procedural dressing is repetitive and lacks authored landmarks, biome transition logic, traversal affordances, distant vistas, streaming sectors, and navmesh-backed encounters.

### UI — CANDIDATE
- target frame
- player resources
- action bar/cooldowns
- objective/zone cards
- responsive layout

**Critic rejection:** requires usability capture at 16:9, ultrawide, and mobile widths plus controller input glyphs and accessibility settings.

## Next non-negotiable pass

1. Replace procedural hero/enemy geometry with original rigged GLTF characters and authored animation clips.
2. Add animation graph, root motion, foot IK, hit-stop, camera impulse, trails and layered impact VFX.
3. Replace single terrain material with layered PBR terrain shader (albedo/normal/roughness/AO macro breakup).
4. Add cascaded/contact shadow strategy and volumetric atmosphere.
5. Add collision/physics and enemy combat AI.
6. Produce actual rendered captures before any benchmark judgment.
