# #84 — Scratch-built Oakrest skinned humanoid

This branch introduces a true **weighted skinned humanoid** in Three.js: a 26-bone skeleton, one low-poly SkinnedMesh, skinned vertex blending, AnimationMixer-based animation clips and skeletal left/right-hand equipment sockets. Everything is authored in the Oakrest repository without external downloaded models or paid licences.

## Implemented

- Humanoid root, hips, spine, chest, neck, head, both shoulder/upper/lower arms/hands/thumbs/fingers, thighs, shins, feet and toes
- 19 authored skeletal clips: Idle, Ready, Walk, Run, StrafeLeft/Right, Backstep, SwordSlash, GreatswordStrike, DaggerCombo, BowDraw, CrossbowFire, StaffCast, WandCast, Guard, Hit, Dodge, Death, Woodcut
- Animatable left/right rigged weapon sockets, correctly left-hand-held bow and dual daggers, provisional low-poly sword/greatsword/dagger/axe/bow/crossbow/staff/wand props, disposal on item switching
- Standalone dev/local URL: /oakrest-dev/rig-lab.html after reviewed release, or /rig-lab.html with the local Python web server. Orbit camera, pose/bone views, crossfades and equipment selection.
- Live player and NPC factory, user saves, town, combat rules and public /oakrest/ remain unchanged.

## Limitations and pending quality work

The free Explosive sample and the candidate CC0 model files could not be retrieved through the available execution environment. This implementation builds its **own** rig and stand-in clips rather than claiming the sample pack has been obtained. Art proportions, joint seams, locomotion and combat choreography are **unapproved**. It does not yet map all 56 in-game abilities to animation timestamps. Precise two-hand IK grip contact, bowstring/reload, equipment fitting, shields, enemy/NPC migrations, physical iPad Safari, independent QA and production-quality art review are pending.

## QA commands

- npm ci --ignore-scripts
- npm run check
- npm test
- npm run build
- npx playwright install chromium
- node tests/browser-skeletal-lab.cjs

Browser evidence saves to qa/skeletal-lab/. Browser captures are not a calibrated art-quality or iPad performance pass.

## Release gate

Keep the old in-game character model as the default until we visually approve the new rig and map real combat timing safely. PR is a draft, targets dev, and requires independent QA and real iPad acceptance before any game-default replacement. Do not treat this prototype as a completed combat migration.
