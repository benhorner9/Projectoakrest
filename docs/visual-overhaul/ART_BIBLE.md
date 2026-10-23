# Oakrest art bible — candidate foundation, revision 1

**Authority:** Game Director's 23 October 2026 definitive directive; initiative #82.
**Status:** Design standards recorded. Reference implementation is NOT artistically approved. Do not interpret this document as the completion of Phase 1.

## Identity and composition

A restrained, handcrafted, stylised medieval fantasy world. Clear silhouettes, intentional planes, warm daylight and grounded materials. Equipment progression reads through material and craftsmanship. No imposed rarity grades, coloured prestige borders, glowing high-tier recolours, copied commercial-game assets or unrelated new packs.

The player, an unarmed civilian, a creature, a furnished building, terrain and vegetation must be reviewed in one lighting environment. `visual-reference.html` is the executable comparison room. Its original body and building expose the current baseline honestly; neither is a final approved sculpt or architectural redesign. The original motion comparison is diagnostic, not another production avatar system.

## Scale, axes and anatomy

Preserve existing gameplay units while migrating artwork: +Y up, forward -Z, origin on the ground, rotations in radians, time in simulation seconds. Existing adult height is approximately 2.5 visual units; this is a compatibility constraint, not a claim that one game unit equals one metre. Do not rescale physics, reach, terrain, doors or speed to fit an asset.

Reference anchors: hips Y=1.00, shoulders Y=1.77 at X=±0.43, neck Y=1.94, head centre Y=2.15. Upper arms 0.40, forearms to palm 0.34. These anchors are the tested migration baseline. A future proportion revision must update the canonical contract and rerun equipment/interior/collision review together. Target more deliberate face planes, narrower shoulder clothing and articulated hands before final art approval; the current primitive head/pauldrons are below the final target.

Shoulder/elbow and hip/knee movement must follow anatomy. No scaling bones to reach a grip. Fingers wrap a handle; palms meet real geometry. A numeric hand-to-socket pass cannot approve wrist twist, silhouette or clipping.

## Material language

| Surface | Palette direction | Roughness target | Metalness |
|---|---|---:|---:|
| Iron / steel | desaturated blue-grey, warm edge highlights | .38–.60 | .55–.85 |
| Bronze / brass | muted warm ochre, restrained highlights | .45–.65 | .55–.80 |
| Cloth | muted moss, slate blue, russet, cream | .85–1.00 | 0 |
| Leather | walnut, saddle brown, weathered tan | .70–.90 | 0 |
| Timber | warm dark structural beams, lighter cut faces | .80–.95 | 0 |
| Stone / plaster | warm limestone, cool shadow faces | .90–1.00 | 0 |
| Grass / dirt | varied muted greens and umber | .95–1.00 | 0 |
| Water | subdued green-blue, readable banks | .20–.45 | 0 |

These are authoring targets; production materials are not yet all migrated. Existing generated surface textures remain useful. Similar surfaces must share lighting response, not merely similar colour. Use sRGB for colour maps and linear data for normals/roughness. Keep transparent surfaces and emissive areas small. Avoid photorealistic noisy textures on simple characters.

## Character and equipment silhouettes

Armour adds credible thickness over the canonical body. Hide covered body surfaces rather than piling intersecting shells. Preserve Helm, Amulet, Arrows, Chest, Legs, Weapon, Off-hand, Boots, Ring and three saved loadouts. Keep actual item IDs and requirements authoritative.

Melee tiers: Bronze → Iron → Steel → Verdite → Safferite → Cobalt → Pryrite. Cloth: Linen → Silk → Satin → Velvet. Ranged: Rawhide → Hardhide → Carapace → Dreadhide. These are design identities; do not fabricate items that do not exist in the current catalogue.

Sword: controlled one-hand stance. Greatsword: two grips on the same handle and heavy recovery. Daggers: compact alternating hands. Longbow: left bow hand, right string hand, full draw. Shortbow: compact draw and faster existing cadence. Crossbow: support beneath stock and a readable preparation/release. Staff: upright weight and expressive free hand. Wand: short shaft and focused casting. Shields need an actual forearm mount and clear guard; the candidate has not validated shield/two-hand compatibility.

## Architecture, interior and environment rules

Use one timber/plaster/limestone/slate language, with purpose-specific silhouettes. Square, paths, service thresholds and doorways define placement. Preserve varied orientations and all 16 actual building entrances. Exterior and interior share dimensions and structural thickness. Bank/shop/workshop function must be recognisable without relying solely on signs. Required reference views include a cutaway and full roof.

Separate camera-occluding surfaces from permanent structure. Keep roof/wall cutaway grouping and colliders aligned. Do not reintroduce decorative sealed facades. Preserve bank/shop staff and all existing functions while replacing art.

Vegetation uses related silhouettes at several scales. Maintain trunks/collision and open combat spaces. Detail clusters at landmarks, thresholds and paths; it must not create noise everywhere. Ambient motion is subtle, bounded and distance-budgeted.

## Animation and effects

Author complete bounded poses on the canonical rig. Imported rotations require rest-pose/axis calibration; never increase arbitrary additive weight to compensate for a mismatched skeleton. Movement, attack and interruption priorities are explicit. Civilian pose inputs cannot request combat stances. Upper-body constraints run after body pose; they never move the gameplay root.

Keep simulation start, release, contact and recovery times authoritative. An instantaneous ability has no invented anticipation delay. Silhouette, direction and timing distinguish defence, restraint, restoration and heavy attacks; colour is supplemental. Limit additive layers and particles. Every effect needs an origin, duration, bound and low-quality equivalent. Sound hooks observe real events and must never trigger duplicate damage.

## Rendering budgets and release gates

Provisional authoring limits, to be revised from physical device evidence: ≤15k triangles for an equipped hero, ≤8k for a near civilian, ≤20k for a near creature, one 1024 atlas per character set, prefer 256–512 icons/prop textures, ≤2 MiB per individual encoded asset, ≤8 MiB for one newly introduced bundle without an explicit budget review. These are gates for review, not claims that the game already meets them.

Aim at 16.7 ms/frame on the primary iPad. Report p50/p95/p99, long frames, draw calls, triangles, GPU-resource counts and actual hardware/browser. Do not cap the recorded frame interval to disguise stalls. Shadow/particle/texture quality may adapt; grips, silhouettes, release cues and input must not disappear.

Approve each foundation only after actual motion review, independent QA, coherent ensemble review and physical iPad evidence. Current visual approval, full asset migration and device signoff remain open.
