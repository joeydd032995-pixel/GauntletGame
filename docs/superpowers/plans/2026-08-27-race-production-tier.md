# Gauntlet Race Production-Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all five primitive race proxies with deterministic refined-OSRS hero/mid/far GLBs while preserving race identity and the complete runtime contract.

**Architecture:** Keep the manifest-driven Three.js race layer as the stable integration boundary. Replace the primitive generator with race-specific deterministic geometry recipes, emit three GLBs per race, extend manifest metadata, then add distance LOD switching and QA gates without modifying non-character systems.

**Tech Stack:** JavaScript/Node.js, Three.js, GLTFExporter/GLTFLoader, Vite, Playwright/GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-race-production-tier-design.md`

## Global Constraints

- Art target is premium refined Old School RuneScape / 07Scape only.
- Hero LOD for every race must be >= 3,000 triangles; intended hero range is approximately 6K-8K where useful.
- Preserve exact Higgsfield Character Element IDs and five race keys.
- Preserve `window.__GAUNTLET_RACES__`, selector, hotkeys 5-9, `gauntlet.race`, `?race=`, and animation reactions.
- Preserve current compatibility pivots and expose the expanded canonical hierarchy.
- Generated content remains `productionMesh:false`, `rigType:"articulated-rigid-part"`.
- Do not modify environment, combat, physics, camera, VFX, enemy AI, or unrelated systems.

---

### Task 1: Generator Contract and Validation

**Files:**
- Modify: `scripts/build-race-proxies.mjs`
- Modify: `.github/workflows/gauntlet-build.yml`

**Interfaces:**
- Consumes: existing race keys and locked Element IDs.
- Produces: deterministic `buildRace(key,lod)` geometry, `measure(root)`, required-pivot validation, and hero/mid/far GLBs.

- [ ] **Step 1: Add failing generator assertions**

Add validation constants for the five exact race keys, locked Element IDs, canonical required pivots, and minimum hero triangle count `3000`. Make the script throw when any generated race violates them.

- [ ] **Step 2: Run generator and confirm current implementation fails the new production gate**

Run: `npm run assets:races`

Expected: FAIL because the current proxy output does not provide the required production-tier LOD contract and/or hero triangle floor.

- [ ] **Step 3: Introduce deterministic generator primitives**

Implement focused helpers for faceted tapered limbs, beveled armor/plates, lathed profile forms, extruded fins/ridges, controlled asymmetric offsets, and triangle measurement. Keep helpers deterministic; any variation must use a seeded PRNG keyed by race and LOD.

- [ ] **Step 4: Emit canonical articulation hierarchy**

Build each humanoid base with `pelvis`, `torso`, `chest_band`, `abdomen`, `head`, `crest`, `shoulder_L/R`, `arm_L/R`, compatibility `upper_arm_L/R`, `forearm_L/R`, `hand_L/R`, `hip_L/R`, `thigh_L/R`, `shin_L/R`, `foot_L/R`, and `belt` nodes. Place rotation pivots at anatomical/articulation boundaries rather than mesh centers.

- [ ] **Step 5: Extend Build Gate checks**

Require fifteen GLBs, exact five Element IDs, three LOD entries per race, hero triangles >=3000, canonical part metadata, and `productionMesh:false`.

- [ ] **Step 6: Commit generator foundation**

Commit message: `Build production-tier race generator foundation`

---

### Task 2: Cairnborn and Brinesworn Production Recipes

**Files:**
- Modify: `scripts/build-race-proxies.mjs`

**Interfaces:**
- Consumes: Task 1 geometry helpers and canonical hierarchy.
- Produces: race-specific Cairnborn and Brinesworn hero/mid/far scenes.

- [ ] **Step 1: Add race silhouette assertions**

Require named race-specific secondary nodes: Cairnborn stone plates/rune channels/faceplate and Brinesworn mineral ridges/fin ears/harness. Assert their hero triangle counts land inside or above their intended quality bands without violating the 3K floor.

- [ ] **Step 2: Build Cairnborn recipe**

Use broad faceted torso/pelvis forms, layered overlapping stone plates, heavier forearms/calves, carved faceplate/brow, geometric rune channels, asymmetric replacement stone, and restrained lichen/crystal accents. Preserve clean stone/slate/bronze/rune material separation.

- [ ] **Step 3: Build Brinesworn recipe**

Use longer tapered limbs, narrow waist, stronger facial planes, mineralized ridges, thickened fin ears, shell/mineral shoulder structures, layered maritime harness/belt, and sea-glass eye accents. Keep the silhouette humanoid rather than piscine.

- [ ] **Step 4: Generate and inspect metrics**

Run: `npm run assets:races`

Expected: Cairnborn and Brinesworn hero GLBs >=3000 triangles with valid canonical pivots and deterministic manifest metrics.

- [ ] **Step 5: Commit**

Commit message: `Upgrade Bastion Compact race geometry`

---

### Task 3: Myceliad, Veylkin, and Echoed Production Recipes

**Files:**
- Modify: `scripts/build-race-proxies.mjs`

**Interfaces:**
- Consumes: Task 1 geometry helpers and hierarchy.
- Produces: remaining three race-specific hero/mid/far scenes.

- [ ] **Step 1: Add secondary-form assertions**

Require Myceliad crown/gills/root forms, Veylkin sensory crests/mantle/membranes, and Echoed asymmetric faction/relic forms.

- [ ] **Step 2: Build Myceliad recipe**

Use root-tapered limbs, uneven fungal torso mass, a substantial mushroom crown with separate underside/gill geometry, shelf fungi, grown bark/root armor, and controlled asymmetric spore details.

- [ ] **Step 3: Build Veylkin recipe**

Use narrow elongated proportions, larger sensory crests, defined moth mantle geometry, layered vestigial membranes with thickness/support forms, elongated hands/feet, and restrained luminous eyes.

- [ ] **Step 4: Build Echoed recipe**

Use mismatched Bastion/Verdant shoulder and torso language, offset relic structures parented to safe articulation nodes, asymmetric head/iris treatment, and restrained hero-only duplicate-silhouette geometry.

- [ ] **Step 5: Generate and validate all five**

Run: `npm run assets:races`

Expected: all fifteen GLBs export, all hero GLBs >=3000 triangles, all canonical pivots exist, exact Element IDs remain unchanged.

- [ ] **Step 6: Commit**

Commit message: `Upgrade Verdant and Echoed race geometry`

---

### Task 4: Manifest Production Metadata

**Files:**
- Modify: `scripts/build-race-proxies.mjs`
- Generated: `public/assets/races/manifest.json`
- Modify/Create: `public/assets/races/README.md` if generated documentation is maintained there.

**Interfaces:**
- Produces per race: `url`, `heroUrl`, `midUrl`, `farUrl`, `triangles:{hero,mid,far}`, `parts`, `materials`, `silhouetteNotes`, `generatorVersion`, `productionMesh:false`, `rigType`.

- [ ] **Step 1: Add manifest schema validation in generator**

Assert legacy `url===heroUrl`, all three LOD URLs exist, triangle values are positive and match measured geometry, parts contain canonical names, and material metadata is non-empty.

- [ ] **Step 2: Generate manifest from measured scenes**

Never hard-code triangle counts. Derive counts by traversing each generated scene before export.

- [ ] **Step 3: Add rebuild notes**

Document `npm run assets:races`, generated-file locations, non-skinned status, LOD contract, exact stable runtime interface, and future skinned replacement requirements.

- [ ] **Step 4: Run generation twice and compare manifest**

Run `npm run assets:races` twice. Expected: byte-equivalent manifest content and identical geometry metrics.

- [ ] **Step 5: Commit**

Commit message: `Extend race manifest for production LOD assets`

---

### Task 5: Runtime LOD Loader Without API Regression

**Files:**
- Modify: `src/systems/raceCharacters.js`

**Interfaces:**
- Consumes manifest `heroUrl/midUrl/farUrl` and canonical pivots.
- Preserves API: `{setRace,update,snapshot,layer,status}`.
- Adds telemetry: `lod`, `lodDistances`, `lodReady`, and non-fatal `lodError`.

- [ ] **Step 1: Add runtime contract checks**

Add internal validation that the loaded hero contains required compatibility pivots and that race switching still reports `status.ready=true` only after a usable hero is attached.

- [ ] **Step 2: Load hero first**

Keep `entry.url || entry.heroUrl` backward compatibility, attach hero immediately, tune materials, capture pivots, and preserve current event/persistence behavior.

- [ ] **Step 3: Load mid/far after hero readiness**

Load optional LOD scenes asynchronously. A mid/far failure must set `lodError` but must not clear or invalidate the hero model.

- [ ] **Step 4: Add deterministic distance switching**

Use conservative camera/hero distance thresholds supplied to the update path or derived from world camera access already available to the character layer. Only one LOD scene is visible at a time. Re-capture corresponding canonical pivots after a swap so animation reactions remain active.

- [ ] **Step 5: Preserve animation reactions**

Verify locomotion, attack, Rift, guard/parry, dodge, hit, and death continue to modify the same stable pivot names for every active LOD.

- [ ] **Step 6: Commit**

Commit message: `Add race character LOD runtime`

---

### Task 6: Character Runtime QA and Dedicated Race Captures

**Files:**
- Modify: `qa/capture.mjs`
- Modify: `.github/workflows/gauntlet-build.yml`
- Modify character-specific QA/critic file only if an existing one owns race validation.

**Interfaces:**
- Consumes `window.__GAUNTLET_RACES__` and manifest telemetry.
- Produces five dedicated 1080p hero-LOD runtime frames plus machine-readable race metrics.

- [ ] **Step 1: Harden race readiness wait**

Wait on `snapshot().ready===true`, matching `current`, `triangles>=3000`, and hero LOD telemetry rather than a fixed timeout alone.

- [ ] **Step 2: Capture each race**

Switch sequentially to Cairnborn, Brinesworn, Myceliad, Veylkin, and Echoed and save dedicated 1080p frames. Keep the existing gameplay-state captures after the five race frames.

- [ ] **Step 3: Add switching/persistence assertions**

Exercise `setRace`, selector state, hotkey mapping, `localStorage`, and `?race=` initialization in automated browser QA. Fail on identity mismatch or missing telemetry.

- [ ] **Step 4: Exercise animation states**

For each race, verify required pivot rotations change from base values for representative locomotion and action states. Validate attack, Rift, guard/parry, dodge, hit, and death paths at least once across the suite.

- [ ] **Step 5: Run build and Visual QA workflows**

Expected: Build Gate SUCCESS and Visual QA SUCCESS with uploaded `gauntlet-visual-evidence` artifact.

- [ ] **Step 6: Directly inspect five screenshots**

Reject technical success if any race remains primitive/blockout-level, loses race-specific silhouette, has muddy material separation, or drifts from refined OSRS/07Scape.

- [ ] **Step 7: Commit**

Commit message: `Validate production-tier race runtime`

---

### Task 7: Final Regression and Evidence Report

**Files:**
- Modify character documentation only if validation reveals documentation drift.

**Interfaces:**
- Produces final verified geometry table and evidence references.

- [ ] **Step 1: Verify generated file inventory**

Confirm 15 GLBs plus manifest and documentation exist under `public/assets/races/` after deterministic acquisition.

- [ ] **Step 2: Verify no unrelated systems changed**

Compare implementation start SHA against final head and ensure modifications are limited to race generator, race runtime, character QA/build checks, generated race metadata/docs, and approved design/plan documentation.

- [ ] **Step 3: Verify workflows at final head**

Require successful Build Gate and Visual QA runs for the exact final commit SHA. Inspect failure logs and fix before claiming completion.

- [ ] **Step 4: Produce final report**

Report exact hero/mid/far triangle counts per race, generated files, material/silhouette changes, runtime compatibility results, workflow run IDs, screenshot evidence, and remaining gap that these are articulated rigid-part assets rather than skinned production meshes.
