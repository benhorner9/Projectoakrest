# Visual production pipeline

## Ownership and boundaries

`actors.js` remains the shared humanoid geometry/equipment factory. `createActor(false, {foundation:true})` enables the candidate only for explicit callers. The default game retains the baseline. Do not silently turn the candidate on before Phase 1–3 review. `visual-reference.html` runs separately from main.js and has no access to combat or save mutation APIs. For actual gameplay integration review, local/dev URLs may explicitly use `?qa=1&visual-foundation=1`; both flags are required, `/oakrest/` is rejected, and selection is never written into saves. This playtest runs real gameplay and its normal save operations; use an isolated test context/character.

Rig version `oakrest-humanoid-3` adds explicit wrists. Canonical joints: `rig`, `upperBody`, `head`, left/right `Arm`, `Elbow`, `Wrist`, `Hand`, `Leg`, `Knee`, `Ankle`. Stable names are prefixed `humanoid.`. Upper-body yaw is separate from the pelvis and legs. Arms and visual weapon control are siblings under `upperBody`; both wrists solve toward its grips. Ordinary off-hand props remain children of the left hand. This avoids a cyclic hand→weapon→same-hand constraint. Amulets/quivers follow the upper body; boots follow ankle pivots while greaves follow knees.

`humanoid-hands.js` provides one cached, mirrored mesh per hand with four three-segment fingers, an opposed thumb and relaxed/grip/string-hook morphs. Forearm length ends at `Wrist` (.34); `Hand` is the palm grip socket at local [0, -.08, 0]. The arm solver subtracts this offset in the weapon orientation before solving the wrist. Grip contact and wrist anatomy therefore have separate anchors. Equipment clearing never deletes skin, and morph weights belong to each actor rather than the cached geometry. Imported handle thickness and wrist twist still require visual review.

`foundation-reactions.js` layers a .65-second fall and .45-second visual recovery over the base pose, without changing the existing defeat/respawn rules. It rotates around the visual pelvis, folds the legs, retains hand constraints and aligns the resting body above sampled ground using visible body mesh bounds. Cape and weapon bounds are excluded from support so long props cannot lift the corpse. This is bounded authored motion, not a ragdoll or collision simulation; steep ground, resting prop contact and all armour combinations remain review cases. Reaction output is never fed back as the next base pose.

The candidate uses a complete bounded pose followed by reach-envelope correction and shared two-bone constraints for arms/legs. Bone lengths never change. Leg lengths remain .46/.40, ankle rest height .14, base shoe sole .025 above actor origin. Feet target actor-space ground after torso posing; only the visual pelvis is lowered for reach. The optional terrain sampler clamps visual steps to ±.18; it cannot change collision or root elevation. Shoes remain level: full slope-normal alignment, toe roll, uneven-surface sole sampling and obstacle-aware step placement are still pending. It is not a skinned glTF pipeline. Future skins must bind the same conventions or use an explicit rest-pose conversion, validated against the actual source rig.

`foundation-locomotion.js` separates movement weight, speed, phase, travel direction and turn response. At steady speed the stance trajectory cancels root travel; acceleration/deceleration ease into/out of it. The actual-game candidate supplies collision-resolved displacement and local travel direction, rather than joystick magnitude, so a blocked player does not keep running at requested speed. Facing always remains on the gameplay root. Stationary turn steps observe a commanded heading change; they never command one.

`visual-action-clock.js` samples the existing start/impact/interval. Anticipation transitions into a striking motion before impact and reaches contact exactly at impact. Bow draw stays separate and releases at impact. Weapon smoothing applies only to the entrance/recovery, never as a filter delaying contact. Instant abilities invent no pre-release interval. Sampling cannot emit gameplay events. The existing gameplay journal/audio remain authoritative.

`humanoid-shapes.js` owns reusable, project-authored cross-section geometry. Its ring coordinates fit existing joints; body, chest, thigh armour and boots share those dimensions. Geometry is cached and never disposed during equipment swaps. The reference civilian uses the same silhouette. These shapes are a model refinement, not certification of every outfit or an imported skinned mesh.

## Add a weapon

1. Use the actual current item ID/family. Do not change reach, damage, timing or ownership.
2. Author mesh pivot at the primary palm grip; forward -Z. Specify secondary grip, nock, muzzle and appropriate asset scale in `WEAPON_PROFILES` or an explicit per-asset adapter.
3. Fit palms around handle geometry; sockets cannot float away from the mesh. For bows, both tips, nock, arrow and string must share coordinates. Draw hand follows the nock. Staff/wand have different shaft lengths.
4. Test all relevant idle/movement/attack/interrupt/death frames, all loadouts, shield compatibility and async re-equip. Validate actual world-space contact, not just parent names.
5. Review side/front/rear and normal gameplay-distance motion; preserve evidence. `held-asset-profiles.js` records explicit source scales, pivots and rotations for seven retained meshes; the reference checkbox exercises them without enabling them in gameplay. Blades/staff/wand point along source +Y; crossbow points +Z. Candidate adapters preserve the source origin and still require human handle/contact fitting. Imported reload parts and magical focus animation are not yet separated from the static source meshes. The current live generic `height*.23` adapter is not certified by the candidate solver.
6. Reuse one asset definition for equipped/drop/icon views with separate documented view transforms. Dispose owned geometry/materials; never dispose shared templates.

## Add an ability

Use `ability-animation.js` metadata for compatibility, pose, anticipation/tell, active event, origin, follow-through, recovery, interruption, VFX/audio and low-quality fallback. Current specifications enumerate 8 families × (basic + four weapon skills + two shared skills) = 56 entries. Shared mechanics appear per compatible family intentionally.

The candidate reference samples existing timing; it does not claim distinct final choreography for all 56 entries. A new skill needs genuinely distinguishable body motion, not only a new label pointing at the same swing. Instant effects remain instant. Simulation emits release/contact/cancel events; visuals and audio observe them. Never move damage into an animation callback.

## Add characters, armour, creatures or buildings

Humanoid variation uses shared proportions/rig/materials and retains saved appearance. Civilian callers supply explicit civilian behaviour and no combat equipment. Armour must be checked over underlying body surfaces across every pose. Non-humanoid anatomy needs its own locomotion and attack origins; do not retarget a human gait onto a boar.

Environment assets conform to Art Bible scale/materials, architectural modules and collision openings. `buildHouse` is exported so the reference exercises the actual shell/interior builder. It registers colliders within the isolated reference page; do not run it in an existing gameplay scene merely to draw a thumbnail.

## Import and provenance gates

Prefer self-hosted glTF 2 / GLB. Apply transforms in the authoring tool; preserve source file, licence, creator, original URL, source hash, export version, modifications, triangle/material/texture counts and sockets. Retarget bones explicitly. Compression is allowed only after decoder is locally bundled and Chromium/WebKit/iPad fallback tested. Current hand-written accessory loader does not support arbitrary glTF features, interleaved/sparse accessors, skinned animation, Draco or KTX2. Do not point it at an arbitrary new model.

The audit rejects missing/traversing paths, wrong binary lengths, unsupported file sizes and missing item visual definitions. Additional formats need explicit capability validators. No unlicensed release dependencies. Pin immutable source versions; do not download a pack's latest branch during a release build.

## Verification and release

- `npm ci --ignore-scripts`; `npm run check`; `npm test`; `npm run audit:visuals`; `npm run build`.
- `node tests/browser-visual-foundation.cjs`: actual candidate scene, 56 metadata entries, family/state samples, screenshot/video artifacts, resource growth, save isolation and measured frame intervals.
- `node tests/browser-held-assets.cjs`: loads all seven actual retained weapon sources, captures them, checks profile selection, stale asynchronous replacement and procedural fallback. This does not certify anatomical grip quality.
- `node tests/browser-foundation-gameplay.cjs`: opt-in actual-game candidate; movement/style switching, eight weapon-family clocks, interruption and save roundtrip to the default renderer. Its CI job is separate so the reference test cannot stand in for gameplay integration.
- Run original smoke/town/equipment/auto-combat/creator/controller and full repository CI before integration.
- Review screenshots AND moving sequences. Positive contact tests do not certify character anatomy or art direction.
- Run physical iPad Safari test procedure in QA report. Desktop touch emulation cannot satisfy it.
- PR into `dev`, independent review, all critical CI conclusive. Preserve rollback SHA. Only then pin reviewed SHA in Cellbound dev bridge; verify upload, hosted build marker and runtime assets. Never promote public `/oakrest/` under this directive.

Current candidate must be replaced/refined or accepted through these gates before migration of the live player, NPCs and town. A reference page existing is not the completed visual overhaul.
