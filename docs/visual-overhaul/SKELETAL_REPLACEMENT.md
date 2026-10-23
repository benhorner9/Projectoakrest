# Oakrest #84 — free skeletal rig and animation evaluation

**Decision:** stop developing the procedural pivot-based humanoid as the intended final character animation solution. Evaluate a genuine skinned humanoid before buying any package. Keep the accepted Oakrest renderer as the game default and preserve saves. No new rig or external animation content is imported or deployed by this change.

## Free starting sources (verified from publishers, 23 October 2026)

1. **Plewr — 3D Rigged Character Model:** https://plewr.itch.io/3d-rigged-character — downloadable **characterRIGGED.glb**, approx. 993 kB, stated **CC0**. A simple real skeletal mesh suitable as first retarget smoke-test. Artwork has NOT been approved for the final Oakrest player.
2. **Grab3D — Character Mixer:** https://grab3d.com/tools/character-mixer/ — **CC0**, modular knight/wizard presets, standard GLB exports with one 19-bone skinned humanoid and Idle/Walk/Run/Wave/Jump. Shares a skeleton within this creator's styles but **is not Mixamo-rigged**; retargeting is required. This is the more useful *aesthetic* candidate if character generation/export is accessible.
3. **Explosive — RPG Animations GLB FREE:** https://store.godotengine.org/asset/explosive-llc/rpg-character-animations-pack-free/ — free 12.49 MB download, **MIT** listed by Godot Asset Store. Also available via publisher $0 checkout: https://www.explosive.ws/products/rpg-animations-glb-free-for-godot-blender. **The 64-sample version focuses on unarmed directional locomotion and punches/kicks/blocks/dodge/death**; sword, bow, crossbow, wand and staff variety belongs to the paid set and is **not validated by this sample**. Publisher flags Godot asset release unstable. Preserve exact licence supplied with downloaded package.
4. Blender retarget workflow background: https://github.com/scotmcp/explosive.ws-to-godot (tool MIT; does not license or provide the commercial animations).

## Actual acquisition status

The rig and free animation file downloads require retrieving binary GLB/zip content from third-party download services. The implementing environment could verify publisher pages but **could not retrieve the binaries**. Neither file has been imported to the Oakrest repository. Do not fabricate source assets, pretend an animation has been tested or silently use a mismatched Quaternius pack. The Game Director can download and supply `characterRIGGED.glb` and the Explosive free sample ZIP for a full browser rig/clip evaluation; alternatively export the chosen Grab3D character as `.glb`. Asset sources and licence files must be preserved before code integration.

## New repository-side test gate

`node scripts/audit-skeletal-assets.mjs path/to/characterRIGGED.glb [path/to/sample.glb]`

This *offline* tool parses glTF 2.0 GLBs, checks actual `skins` and JOINTS/WEIGHTS mesh attributes, identifies essential humanoid bone names and lists clip targets. With two GLBs it compares normalized joint labels and reports whether explicit retargeting is required. It **does not** inspect skin-weight quality, motion resemblance, rest-pose axes, animation timing or spatial weapon grip, and does not claim that exact bone names imply drop-in compatibility. Avoid committing third-party files before verifying licence, size and compatibility.

## Migration acceptance

- Demonstrate a proper skinned rig in Three.js (`THREE.SkinnedMesh`, GLTFLoader, AnimationMixer) and live retargeted clips against its **actual skeleton** rather than applying them to Oakrest's procedural `Group` pivots.
- Audit left/right hands, feet and head bones, bind pose and proportions. Distinguish handed combat grips (swords, daggers, greatsword, short/longbow, crossbow, staff/wand, shields). Attach weapons to real skeletal hands and verify fingers/forearms visually.
- Map all **56 existing animation/ability metadata entries** to actual combat cues and timing. The 64 free unarmed clips cannot establish complete paid combat coverage; no paid purchase without director approval.
- Prototype only on the issue #84 test branch, keep save keys/combat authority untouched, show iPad landscape reference and actual gameplay video before authorising default actor/NPC replacement.
- Run source/unit/build/Chromium and independent QA and physical iPad review before dev integration; public release remains separate.
