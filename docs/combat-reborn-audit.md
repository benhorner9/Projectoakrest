# Combat Reborn audit and implementation contract

Baseline: dev fda62e0fa6b9f4c5c1d055d4e53ea6d2a00a9f48. Working branch: overhaul/combat-reborn. PR: https://github.com/benhorner9/Projectoakrest/pull/6.

## Existing systems retained

Character creation, independent browser-local characters, dev/public storage separation, tutorial/portal journey, progression and combat-level formula, all fourteen weapon catalogue entries, nine equipment positions and three saved loadouts, reusable beginner arrows, inventory Examine, starter sets, bank, Woodcutting, drops, controller support and shared-host build workflow remain in place.

## Audit findings

| System | Baseline implementation | Defect and disposition |
| --- | --- | --- |
| Attack initiation and recovery | main.js doBasic, pendingBasic, pendingAbility, attackUntil; attack-rules.js | Preserve windup/recovery; sweep active contact separately. Dodge cancels unreleased/active strikes while recovery and cooldown costs remain. |
| Melee | main.js nearTarget/enemiesNear and rules.js meleeTarget | Distance/cone selection could hit through cover. Replaced runtime damage paths with timed swept radial capsules, one contact per eligible target per strike, broad sword/greatsword and narrow dagger profiles. |
| Projectiles | main.js shoot and projectile loop; gameplay-math.js segmentHit | Old query returned closest-point time rather than first entry; target order could be incorrect around cover. Use analytic first entry and relative-motion target sweep. |
| Projectile aiming | horizontal forward plus broad touch targeting | Camera centre ray determines aim point; actual hand/muzzle origin fires a fixed normalized vector. Touch forgiveness is limited to about five degrees and requires clear sight. Reticle corrected from 46% height to 50%. |
| World collision | terrain.js static/dynamic footprints, sampled segments | Analytic finite cylinders and boxes for solid segments; sampled height field with refined terrain contact; spatial-grid movement queries. Main-world collision previously remained active in isolated scenes; collision layers now match scene visibility. |
| Movement | smoothMotion plus substepped moveOnGround | Retain acceleration/slide/grounding; add slope gate and actor separation. Dodge retains radius-aware swept movement. Shift is sprint, Space dodge. |
| Enemy pursuit/return | combat-feel.js enemyBehaviour, main.js updateEnemy/returnEnemyHome | Returning monsters explicitly walked through blocked geometry. Remove bypass; use bounded A* and collision-checked movement in both directions. Failure does not grant a collision shortcut. |
| Detection and attacks | distance/leash checks plus warning shapes | Add sight checks, notice delay and reacquisition delay. Telegraph direction freezes; bandits face it during windup. Mossling pounces and boar charges move through the same grounded collision rules. |
| Status effects | timers applied in hitEnemy | Stun cancels windup/charge/pounce; roots stop mobile attacks and movement; slows affect approach speed. Persistent frost field refreshes slow inside its visible, cover-checked area. Labels disclose current effects. |
| Switching | queued style and per-family ability key | Recovery survives switches; release queue waits for active melee contacts. Shared skills now share one cooldown across families. Equipment cannot change under an active contact. |
| Animation/effects | actors.js articulated rigs, combat-visuals.js, rings and particles | Keep rigs; add contact-window arm sweep and matching reach trail, hit reactions, bounded effects and disposal, distinct persistent field. Impact feedback follows real hit events. |
| Audio | original procedural Web Audio oscillator | Keep original asset-free audio; add bounded voices, weapon/monster/player cues, persistent enable/volume controls, interaction unlock. |
| Input and UI | controls.js, main.js, mobile-combat.css | Preserve simultaneous pointers; ability press acts immediately, follow-up click suppressed. Prevent second pointer stealing joystick; clear held keys on tab hiding. Add unavailable/queued states and larger iPad abilities. |

## Combat rules

- Sword and greatsword basic sweeps may hit multiple enemies once each; daggers and directed hit/execute abilities stop after one target. Twin Strike has two separately swept half-damage contacts.
- Greatsword basics apply a short 0.22-second stagger; heavy ability damage/reach scales to its weapon family. Other base damage/cadence values remain available for comparison.
- Arrows are straight, finite-range projectiles. There is no homing and no ammunition consumption.
- Firebolt has a 2.1-unit cover-checked explosion: the direct target receives the direct hit, surrounding eligible enemies receive 45% damage. A collision with scenery can also explode on its near side.
- Frost Nova hits once and leaves three seconds of visible slowing ground. Its continuing effect slows; it does not silently repeat damage.
- Dodge lasts 0.32 seconds, with 0.035-second startup, 0.16-second invulnerability and recovery afterwards. Cooldown is two seconds. Ability dashes do not inherit dodge invulnerability.
- Switch delay is 0.12 seconds after any committed contact; shared attack recovery is never reset. Projectiles retain their launch discipline, level and equipment multiplier.
- Root prohibits movement and mobile attacks. It does not prohibit a stationary bandit swing. Stun cancels interruptible attacks. Returning enemies clear harmful timers and heal once at disengagement.
- Existing scene limits and continuous height field remain authoritative. There is no rigid-body physics dependency.

## Validation method and limitations

No usable local shell/browser environment was available in the Work session. Source changes were made on the dedicated GitHub branch; geometry tests also ran in the available JavaScript isolate. Full Node, build, Chromium and WebKit release tests run in GitHub Actions.

browser-combat-reborn.cjs exercises the actual game engine, controls, hit resolution, enemy updates, saves and rendering using isolated fixtures and controlled positioning. Its A–G labels describe automated integration coverage, not an uninterrupted human playthrough. A separate touch scenario verifies simultaneous movement, attack-camera dragging, switching and layout bounds. Videos/screenshots and JSON diagnostics are uploaded with the CI artifacts.

Physical iPad Air hardware, Safari audio output, subjective comfort and long-duration manual balance assessment cannot be certified from Linux emulation. Do not present software-rendered CI FPS as iPad performance. The paired benchmark compares the starting dev commit and current code on the same runner.

No public branch, public game directory or public character data is an allowed release target. Deployment must use the established Cellbound deployment bridge pinned to the reviewed dev commit.
