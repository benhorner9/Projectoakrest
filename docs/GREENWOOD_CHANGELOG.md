# Greenwood overhaul — implementation changelog

Baseline: `ed8a1a1fd9a778779ae3c6e66f15400f5663a462` on `main`.
Original implementation branch: `overhaul/greenwood-gameplay-visuals`. Final tested QA refinements: `overhaul/greenwood-qa-refinements` ([PR #2](https://github.com/benhorner9/Projectoakrest/pull/2)).

## World and rendering

- Replaced the flat ground with a continuous height field, rolling wilderness, a winding dirt transition and vertex-coloured meadow/forest terrain. The existing village and encounter positions remain.
- Grounded characters, enemies, physical loot, scenery and attack telegraphs on the same height function. Substepped collision slides around cottages and the well; the camera shortens before obstructions and stays above ground.
- Rebuilt cottages with gabled roofs, roof seams, chimney courses, timber braces, plank doors, shuttered windows, flower boxes and stone steps.
- Replaced uniform conifers with varied branching broadleaf trees and layered pines; added irregular distant ridge silhouettes, gate details and a training ring. Existing market carts, crops, lanterns, creek, barrels and clutter remain integrated.
- Revised lighting, atmospheric depth and restrained meadow/teal/brass palette. Ground materials use inexpensive diffuse lighting; metal equipment retains material response.
- Replaced cone grass with crossed blade meshes. Reused instanced vegetation; corrected instance colour tinting. Static scenery is batched by material and 24-unit spatial cell so distant/offscreen groups can be culled.
- Terrain uses a 2-unit grid instead of an unnecessarily dense 1-unit grid. Added Low/Balanced/High settings with pixel-ratio limits and optional shadows, plus a live FPS/draw-call readout.
- Vendored pinned Three.js 0.180.0 and BufferGeometryUtils with MIT licensing. The build no longer depends on a runtime CDN. All new artwork is original procedural geometry; no copied game assets.

## Characters and animation

- Replaced the hero and bandit with reusable articulated rigs: shaped torso, neck/head/face, jointed arms and knees, hands, boots and a tapered moving cape.
- Armour visibly changes chest/shoulder coverage and clothing materials. Existing equipment requirements and per-style loadouts remain.
- Distinct procedural longsword, heavy sword, separate dual daggers, curved short/long bows, constructed crossbow and crystal magic staves.
- Added family-specific idle, windup, contact and recovery poses, blended running gait, knee bend, cape motion, restrained idle breathing and dodge lean. Mechanical impact time drives attack animation phase.
- Rebuilt mosslings with layered leaves/mushrooms and expressive faces; boars with four animated legs, tusks, ears and mane; training dummy with straw sack, target and face.
- Added enemy warning poses, hit reactions and visible death transitions before respawn. These are procedural animations, not motion-captured or skinned asset animations.

## Movement, combat and feedback

- Preserved damped acceleration, shortest-path heading, movement during attacks and the attack-button camera drag. Camera tracking now follows terrain and obstacles.
- Converted dodge and dash movement from instant position changes to continuous substepped travel, retaining dodge cooldown and invulnerability rules.
- Unified attack/ability animation and damage on the simulation clock. Background tabs pause simulation. Basic tapping cannot override recovery or a pending ability; style switches requested during windup execute after impact.
- Offensive abilities resolve after weapon windup; utility effects retain their immediate use. Preserved level unlocks and four customisable family slots.
- Added swept projectile collision to prevent fast projectiles tunnelling through targets. Enforced travel bounds; touch aim stays inside the forward cone. Closely aligned desktop targets receive vertical aim adjustment on hills while the player's horizontal aim stays unchanged.
- Captured projectile/bleed source style, level and armour bonus so switching weapons during flight does not change damage or XP ownership.
- Retained enemy detection and spawn leashes, cancelled queued threats on disengage, prevented attacks against returning enemies and added bandit lateral recovery movement.
- Upgraded spell colours, projectile shafts/tips/feathers, slash arcs and impacts. Effects have explicit cleanup. Added bounded synthesised combat/dodge/loot sound, unlocked by a user gesture and controlled in settings.
- Added gentle out-of-combat village recovery and clearer first-encounter instructions. Existing XP, Combat Level, physical loot pickup, death/respawn and progression rules remain.

## Interface and touch

- Unified vitals, level badges, combat style tabs, inventory, equipment, skill pages, notifications and controls with the Greenwood visual theme.
- Retained compact, non-blocking Equip / Inventory / Skills / Abilities pages and per-skill unlock details. Added readable equipment comparisons for damage, cycle time and reach.
- Retained left joystick, four-slot right-thumb arc, Attack drag, Swap, Dodge, pickup and simultaneous pointers. Refined sizes/positions for landscape tablet, portrait tablet, both phone orientations and desktop.
- Fixed desktop Escape releasing pointer lock so menus remain usable; clear held keys/pointers when focus is lost.

## Persistence and delivery

- Kept the `oakrest-v1` key and existing save migration path. A one-time `oakrest-before-greenwood` backup preserves the original raw save before loading. Storage/parse failure disables writing rather than overwriting the unreadable save.
- Kept earned XP, owned equipment, slotted abilities, coins, materials and physical ground loot in the existing format. Added compatibility/roundtrip tests.
- Added syntax/build scripts, a reproducible browser harness, performance comparison harness, evidence screenshots and release report. Vercel builds run rules tests and syntax checks before producing the static output.
- Production integration remains gated on preview verification. See the QA report for actual results and unresolved limitations.

## Concurrent branch integration

The remote branch advanced during this QA pass. Character creation, per-character saves, tutorial training, Portal Realm navigation, path-isolated development saves, world-solid collision and their CI smoke coverage from `fe22bd6` are preserved. The ranged elevation fix uses that version's active-area enemy list, so tutorial shots cannot target enemies in another area. Existing-character QA fixtures now seed their intended legacy profile explicitly; the independent fresh-character suite verifies tutorial/realm progression. These systems were present in the concurrent branch commits, not introduced by this refinement commit.
