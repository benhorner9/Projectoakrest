# KayKit Combat Animation Integration (Issue #68)

**Target:** Oakrest `dev` and `/oakrest-dev/` only. No public release is authorised.

## Assets and licence
- Creator: **Kay Lousberg**.
- Pack: **KayKit Character Animations — FREE 1.1** (not the paid SOURCE tier).
- Official source: https://kaylousberg.itch.io/kaykit-character-animations
- Licence: **Creative Commons Zero (CC0 1.0)** — free use including commercial projects and redistribution. Original licence: https://creativecommons.org/publicdomain/zero/1.0/
- Original Rig_Medium GLB files independently available from https://github.com/NoLimitNexus/game-models/tree/main/library/animations; licence notice there: https://github.com/NoLimitNexus/game-models/blob/main/licenses/kaykit-character-animations.txt. The content is KayKit-originated, not authored by the mirror.
- Provenance of `src/kaykit-clips.js`: extracted **rotation channels** from free Rig_Medium CombatMelee, CombatRanged, MovementBasic, MovementAdvanced, and General GLBs; quaternion-slerped to 16 FPS; stored as rounded per-joint rotation **deltas relative to each source clip's first frame**. These are derived CC0 animation curves, not original full mesh/rig archives and not algorithmically invented animations. No runtime third-party fetch.

## Why not import the meshes or full GLBs directly?
Oakrest's playable characters currently use independent procedural `THREE.Group` shoulder, elbow, hip, knee and head pivots, not KayKit's skinned bones. Direct `AnimationMixer` playback would animate an invisible KayKit skeleton and not the player. A full skinned-character replacement would discard appearance/equipment customisation and needs separate design approval. This implementation transfers **actual KayKit joint motion** into the existing rig; it retains all equipped 3D items and the current character save format.

## Production integration
- `src/kaykit-motion.js` maps sword / dagger / greatsword / bow / shortbow / crossbow / frost / ember onto licensed clips, then chooses melee/block, bow-draw/release, crossbow aim/shoot, spell and reaction motion according to the existing `attackAnimation` clock and stable `abilityKind` visual cues.
- `src/actors.js` runs original procedural weapon-family poses and their unique ability poses, then adds a bounded KayKit motion layer to existing shoulder/elbow/leg/torso/head joints. The previous additive layer is exactly undone before the next frame, preventing frame-to-frame drift. The underlying appearance parts and handed equipment are unchanged.
- Basic locomotion uses licensed KayKit run/walk cycles; dodge, hurt and death use corresponding response clips. Tree chopping stays with the existing woodcutting motion.
- Imported curves are animation-only. **Never** derive hit registration, damage, movement, i-frames, projectile creation, aim or cooldowns from visual clip timelines. Original `pendingAbility.impactAt`, `pendingBasic.impactAt` and `attackUntil` remain authoritative. No extra pre-impact tell is fabricated for zero-windup skills.
- Zero new glTF loads at runtime. No extra renderer / GPU skeleton per actor and no per-frame data-file downloads. Asset payload is one local ~140 KB JS module copied into the static release and hashed like other source modules.

## QA, acceptance and limitations
- `?qa=1&animation=1` inspector on localhost or `/oakrest-dev/` shows the **real Oakrest rig**, can enable/disable the KayKit overlay and displays action timing without doing damage.
- Check one-hand / dual wield / two-hand / bow / crossbow / staff-wand basic and skills on *real* iPad Safari landscape and desktop, including visible release, arm-held items, contact origins, correct reload, enemy reaction, FPS during multiple actors, saved character appearance, target auto-combat, style swapping, idle/locomotion/camera.
- Unit tests cover licensed clip validity, family mappings, timing selection, reversible offsets, and existing rig preservation. Browser combat and screenshot validation are additionally required; passing unit tests isn't visual signoff.
- **Limitation:** Retargeting skeleton rotations onto rigid primitive joints doesn't introduce skinned finger animation, root-motion displacement, foot IK, collision-linked blade tracing or exact source-body silhouettes. This is a material animation improvement, not final animation completion.
- Rollback: revert the branch/PR or disable the additive pose call; no saves or gameplay data need migration. Production `/oakrest/` remains untouched.

## Deployment
Follow `docs/development-deployment.md`: merge reviewed PR to `dev`, update Cellbound bridge `deploy/oakrest-dev-20261020` to pin reviewed SHA, require successful workflow and hosted `build-meta.json` verification; never equate merge with upload. Physically test iPad before final signoff.
