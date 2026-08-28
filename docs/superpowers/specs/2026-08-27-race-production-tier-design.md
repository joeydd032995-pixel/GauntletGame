# Gauntlet Race Production-Tier Upgrade Design

Date: 2026-08-27
Branch: `sol/environment-gauntlet`
Target art direction: premium refined Old School RuneScape / 07Scape

## Objective

Replace the current low-detail articulated race proxies with deterministic production-tier stylized GLBs while preserving the existing race identities, Higgsfield Character Element IDs, runtime loading contract, selector/hotkeys, persistence, animation reactions, and telemetry.

The new assets must prioritize silhouette, proportion, material separation, and deliberate secondary forms rather than subdivision for its own sake. Near-camera hero models should land primarily in the 6K-8K triangle range, with mid and far LODs generated from the same source recipe.

## Non-goals

This pass does not modify terrain, foliage, environment systems, combat behavior, camera, VFX, enemy AI, physics, or unrelated animation systems. It does not introduce skinned humanoid rigs. The output remains articulated rigid-part GLTF/GLB content designed for later replacement by skinned production meshes.

## Existing Runtime Contract to Preserve

The current race system provides:

- Manifest-driven GLB lookup from `/assets/races/manifest.json`.
- `window.__GAUNTLET_RACES__` telemetry and runtime API.
- Race selection through UI buttons and hotkeys 5-9.
- `localStorage` persistence using `gauntlet.race`.
- `?race=` URL override.
- Cached `GLTFLoader` loading.
- Rigid-part reactions for locomotion, attack, Rift, Guard/Parry, Dodge, Hit, and Death.
- Locked Higgsfield Character Element IDs.

The runtime currently animates `torso`, `head`, `upper_arm_L/R`, `forearm_L/R`, `thigh_L/R`, and `shin_L/R`. The upgraded generator must preserve these nodes while also exposing the expanded canonical hierarchy.

## Canonical Part Hierarchy

Every hero model must expose, where applicable:

- `pelvis`
- `torso`
- `chest_band`
- `abdomen`
- `head`
- `crest`
- `shoulder_L`, `shoulder_R`
- `arm_L`, `arm_R`
- `upper_arm_L`, `upper_arm_R` as compatibility aliases or equivalent animated nodes
- `forearm_L`, `forearm_R`
- `hand_L`, `hand_R`
- `hip_L`, `hip_R`
- `thigh_L`, `thigh_R`
- `shin_L`, `shin_R`
- `foot_L`, `foot_R`
- `belt`

Optional race-specific secondary nodes may be added without changing the stable animation interface.

## Asset Architecture

### Generator

Replace the primitive-heavy implementation in `scripts/build-race-proxies.mjs` with a deterministic stylized asset generator built on Three.js geometry and `GLTFExporter`.

The generator will provide reusable helpers for:

- Beveled plates and armor slabs.
- Tapered multi-segment limbs.
- Faceted lathed forms.
- Swept and segmented curved shapes.
- Extruded ridges and silhouette fins.
- Controlled asymmetric deformation.
- Rune channels and graphic geometric accents.
- Race-specific head construction.
- Material assignment and material metadata.
- Triangle counting and required-node validation.
- LOD generation from a shared race recipe.

Randomness, if used for controlled asymmetry, must be seeded per race and LOD so rebuilds are deterministic.

### LODs

Each race will produce three GLBs:

- Hero LOD: near-camera presentation.
- Mid LOD: normal gameplay distance.
- Far LOD: distant presentation.

Target ranges:

| Race | Hero | Mid | Far |
| --- | ---: | ---: | ---: |
| Cairnborn | 7K-8K | 3K-4K | 0.9K-1.3K |
| Brinesworn | 6K-7K | 3K-3.5K | 0.8K-1.2K |
| Myceliad | 7K-8K | 3K-4K | 0.9K-1.3K |
| Veylkin | 6K-7K | 2.8K-3.5K | 0.8K-1.2K |
| Echoed | 6.5K-7.5K | 3K-4K | 0.9K-1.3K |

Hero assets must never fall below 3,000 triangles. Triangle count is a validation boundary, not a quality metric by itself; geometry must be concentrated in visible silhouette and form improvements.

## Race Designs

### Cairnborn

Silhouette: broad, heavy, grounded, visibly stone-built.

Geometry priorities:

- Large faceted stone torso and pelvis mass.
- Layered slate plates with controlled overlap.
- Strong shoulder and forearm mass.
- Carved faceplate and brow forms.
- Recessed or raised rune-channel geometry.
- Asymmetric replacement-stone detail.
- Small lichen/crystal accents used sparingly.

Materials:

- Basalt/granite primary body.
- Slate secondary plates.
- Bronze or aged metal inlays.
- Cool emissive rune accent.
- Muted moss/lichen tertiary accent.

### Brinesworn

Silhouette: tall, athletic, narrow-waisted, transformed coastal humanoid rather than fish-person.

Geometry priorities:

- Longer limbs with tapered cylindrical/faceted construction.
- Mineralized skin ridges.
- Fin-like ears with thickness and edge definition.
- Shell/mineral shoulder structures.
- Layered maritime harness and belt pieces.
- Distinct facial plane treatment supporting sea-glass eyes.

Materials:

- Desaturated sea-green skin.
- Dark tide cloth.
- Weathered leather.
- Salt-steel/mineral armor.
- Pearl/coral accents.

### Myceliad

Silhouette: most non-human of the five while retaining a playable humanoid articulation contract.

Geometry priorities:

- Root-like tapered limbs.
- Uneven fungal torso massing.
- Large mushroom crown with readable top and underside.
- Dedicated gill geometry.
- Shelf fungi and grown armor plates.
- Controlled asymmetry across shoulders and torso.
- Spore-node accents that remain visually clean.

Materials:

- Fungal skin primary.
- Root/bark secondary.
- Distinct cap material.
- Pale gill surfaces.
- Restrained luminous spore accents.

### Veylkin

Silhouette: tall, narrow, nocturnal, with a distinctive crest/mantle profile.

Geometry priorities:

- Elongated limbs and hands/feet.
- Strong sensory crest shapes.
- Defined moth-like shoulder mantle.
- Layered vestigial membranes with thickness and support geometry.
- Narrow torso and head proportions that do not read as generic elf anatomy.

Materials:

- Muted skin tones.
- Violet/gray veilcloth.
- Matte moth mantle.
- Restrained moon-metal accents.
- Luminous eye treatment.

### Echoed

Silhouette: deliberately asymmetric and temporally unstable without becoming visually noisy.

Geometry priorities:

- Mismatched Bastion/Verdant armor language left to right.
- Offset relic structures.
- Controlled floating or displaced secondary pieces parented safely to articulation nodes.
- Asymmetric head/iris details.
- Subtle duplicate-silhouette geometry at hero LOD only where readability allows.

Materials:

- Neutral cloth and skin base.
- Bastion plate on one side.
- Verdant fiber on the other.
- Spectral blue and impossible-violet relic accents.

## Materials and Surface Response

All assets remain in a stylized PBR-lite presentation using `MeshStandardMaterial` or compatible exported materials.

Rules:

- Strong primary, secondary, and accent color separation.
- Flat or faceted shading where it improves OSRS-style readability.
- Roughness variation should distinguish stone, cloth, organic matter, shell, metal, and spectral accents without photoreal micro-surface noise.
- Metalness is reserved for explicit metal/relic elements.
- Emissive treatment remains restrained and localized.
- Avoid noisy texture maps unless later proven necessary. Geometry and material blocking must carry the visual read first.

## Manifest Schema Extension

`public/assets/races/manifest.json` will retain existing identity fields and add structured production metadata.

Each race entry should include:

- `key`
- `label`
- `faction`
- `elementId`
- `productionMesh: false`
- `rigType: articulated-rigid-part`
- `heroUrl`, `midUrl`, `farUrl`
- Legacy `url` pointing to the hero LOD for backward compatibility
- `triangles.hero`, `triangles.mid`, `triangles.far`
- `parts`
- `materials`
- `silhouetteNotes`
- `generatorVersion`

The manifest must preserve the exact locked Higgsfield Element IDs.

## Runtime LOD Integration

`src/systems/raceCharacters.js` will remain the only character-system integration point.

The loader will:

1. Load the hero LOD by default.
2. Preload or lazily load mid/far LODs after the active race becomes ready.
3. Select LOD from camera-to-hero distance using conservative thresholds.
4. Keep only one visible LOD at a time.
5. Preserve the same articulation state across LOD swaps by matching canonical pivot names.
6. Preserve the existing `setRace`, `update`, `snapshot`, `layer`, and `status` API surface.

If LOD loading fails, the hero LOD remains active and the failure is exposed through telemetry without breaking gameplay.

## Validation

### Generator Validation

The build script must fail if:

- Fewer or more than five races are emitted.
- Any hero LOD has fewer than 3,000 triangles.
- Any required compatibility pivot is missing.
- Any locked Element ID changes.
- Any LOD GLB fails to export.
- Manifest triangle counts disagree with generated geometry measurements.

### Runtime Validation

Automated QA must verify:

- All five races can load and become ready.
- Hotkeys 5-9 still select the intended race.
- Selector-driven switching still works.
- `localStorage` persistence remains functional.
- `?race=` initialization remains functional.
- Locomotion, attack, Rift, Guard/Parry, Dodge, Hit, and Death produce non-zero articulation on expected pivots.
- `window.__GAUNTLET_RACES__` telemetry remains available and includes active race and LOD data.

### Visual Evidence

The visual-QA pipeline must capture a dedicated 1080p runtime frame for every race using the hero LOD. Technical success does not equal visual acceptance. Each image must be directly inspected against the locked refined OSRS/07Scape target.

Reject the pass if any race still reads as:

- Primitive blockout geometry.
- Generic humanoid with decorative attachments.
- Repetitive cylindrical limbs without authored massing.
- Muddy or weakly separated materials.
- Insufficiently differentiated from another race.

## Expected Files Touched

Primary implementation scope:

- `scripts/build-race-proxies.mjs`
- `src/systems/raceCharacters.js`
- `public/assets/races/manifest.json` through deterministic generation
- Generated hero/mid/far GLBs under `public/assets/races/`
- Character-specific QA/build checks under existing GitHub workflows and QA scripts
- Documentation describing generated asset contract

No non-character gameplay or environment system should be modified.

## Completion Criteria

This pass is complete only when:

1. Five deterministic hero GLBs exist at 3K+ triangles, with the intended target ranges achieved where visually justified.
2. Mid and far LOD GLBs exist for all five races.
3. Canonical and compatibility pivot names are preserved.
4. Exact Element IDs and race identities remain unchanged.
5. Manifest metadata records actual geometry/material/part information.
6. Runtime switching, persistence, URL selection, telemetry, and animation reactions pass automated validation.
7. Build Gate succeeds.
8. Visual QA captures all five races at 1080p.
9. Direct visual inspection confirms a material improvement over the current primitive proxies and no drift away from refined OSRS/07Scape.
