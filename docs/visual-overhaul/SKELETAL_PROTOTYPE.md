# #84 — Scratch-built Oakrest skinned humanoid

This branch introduces a true **weighted skinned humanoid** in Three.js: a 26-bone skeleton, one low-poly SkinnedMesh, skinned vertex blending, AnimationMixer-based animation clips and skeletal left/right-hand equipment sockets. Everything is authored in the Oakrest repository without external downloaded models or paid licences.

## Implemented

- Humanoid root, hips, spine, chest, neck, head, both shoulder/upper/lower arms/hands/thumbs/fingers, thighs, shins, feet and toes
- 19 authored skeletal clips: Idle, Ready, Walk, Run, StrafeLeft/Right, Backstep, SwordSlash, GreatswordStrike, DaggerCombo, BowDraw, CrossbowFire, StaffCast, WandCast, Guard, Hit, Dodge, Death, Woodcut
- Animatable left/right rigged weapon sockets, correctly left-hand-held bow and dual daggers, provisional low-poly sword/greatsword/dagger/axe/bow/crossbow/staff/wand props, disposal on item switching
- Standalone dev/local URL: /oakrest-dev/rig-lab.html after reviewed release, or /rig-lab.html with the local Python web server. Orbit camera, pose/bone views, crossfades and equipment selection.
- Live player and NPC factory, user saves, town, combat rules and public /oakrest/ remain unchanged.

## Limitations and pending quality work

The free Explosive sample and the candidate CC0 model files could not be retrieved through the available execution environment. This implementation builds its **own** rig and stand-in clips rather than claiming the sample pack has been obtained. Art proportions, joint seams, locomotion and combat choreography are **unapproved**. All 56 existing ability specifications now have individual **visual-only skeletal clips and timing maps**, but they are not yet wired to the live gameplay renderer or visually approved. Precise two-hand IK grip contact, bowstring/reload, equipment fitting, shields, enemy/NPC migrations, physical iPad Safari, independent QA and production-quality art review are pending.

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


## Full skeletal animation coverage added

- 56 distinct authored skeletal action clips (eight families × basic + four weapon skills + two shared skills), each keyed by weapon family and ability ID. Shared abilities retain independent silhouettes on sword/daggers/greatsword/bow/shortbow/crossbow/frost/ember.
- Additional general-purpose full-body visual states for turning, equip/unequip, shield block, stagger, knockback, recovery, interaction, speech, wave, pickup, crouch, mining, crafting and channeling. These animations do not create new gameplay mechanics or gathering stations.
- The skinned actor can play or sample any ability via playAbility(family, id) or sampleAbility(family, id, realAttack, actualTime). Pre-impact, contact and recovery are sampled from the authoritative action's start/impactAt/interval. Instant movement/defence/heal abilities show an immediate gesture rather than a fabricated anticipation.
- Visual-only skeletal-motion-controller chooses movement, strafe, backwards, turn, combat ready, hit, dodge, death and woodcut, with reaction priority. It does not modify navigation, hit detection, XP, cooldowns or local saves.
- /rig-lab.html now lets reviewers select and scrub the entire ability catalogue. Dedicated Chromium QA validates all 56 contact-state transitions plus representative screenshots; the source/geometry/clock checks run under the skeletal GitHub Action.

**Scope distinction:** "56 mapped clips" means concrete authored quaternion keyframes and temporal pose maps for every existing catalogue entry. It does **not** mean all those clips have been visually approved, that repeated multi-projectile damage mechanics are animated as unique actual game events, that two-handed IK/grips are solved, or that the new system has been connected to the live player/NPC renderer. Combat animation acceptance remains open pending per-ability in-world review and a physical iPad QA pass.

## Outstanding final-art criteria

- Tight wrist/finger/weapon handle fitting; true two-hand constraints for greatsword/staff/crossbow; bowstring and arrow/bolt release parts; shields and modular nine-slot equipment.
- Properly authored contact/footlock and movement blending on uneven terrain, ledges and obstacle collisions. No stand-in in-place animation may translate a combat root.
- Dedicated event-to-animation hooks in the actual gameplay renderer and cancellation mapping to the real combat journal; preserve original hero visuals as fallback.
- Human assessment of each silhouette, animation timings and quality; dedicated NPC and monster species motion; 60-FPS-class performance profiling on the user's physical iPad Air Safari.
- Independent QA/UX review, entire core/regression CI and tested shared-host /oakrest-dev/ release before claiming acceptance. Public Oakrest must not be updated as part of this draft.
