# Classic overhaul — Block 2 combat

Owner: Gameplay. Issue #130. Baseline: dev `3d777e487279a042b478e03b9cde31a5ec1f42d2` (Block 1).

## Implemented behavior

The active Classic route retains its existing world, characters, ownership, skill and reward registries. The legacy 3D route remains available and is covered by its existing CI. No save schema or XP reward changes are introduced.

- A pure fixed-step clock advances movement, projectiles and combat at 60 Hz. Basic attacks and enemy attack scheduling use 600 ms boundaries. Render frames no longer clamp elapsed time to 60 ms and thereby slow gameplay at low FPS. Frames longer than one second are treated as suspension, with no deferred attack burst; backgrounding also cancels pursuit.
- Target selection gives immediate feedback and approaches a collision-safe position with actual weapon range and line of sight. A first attack may wait up to the next 600 ms beat. Manual movement, a ground destination, dodge or Escape cancels pursuit and pending windup without refunding recovery.
- Style changes update owned equipment, appearance and the four equipped ability slots immediately. They cancel pending attacks and queued abilities, preserve committed attack deadlines and per-family ability cooldowns, and impose a short 120 ms transition before a new action can start.
- Commands validate target, range, line of sight, ownership and resources, then validate again at release. Rejected starts neither pay supplies nor start cooldowns. A cancelled committed windup retains recovery/cooldown but does not spend supplies. Released projectiles remain committed.
- Accuracy, levelled maximum hit, equipment power, enemy guard and weaknesses use the existing calculation functions. Each action captures its source when it starts, so changing equipment cannot change damage in flight. Misses display zero-damage labels.
- Ranged basics use one field arrow. Rapid Shot uses three. Scattershot uses one per reachable target rather than repeatedly hitting the selected enemy. A ranged evasive roll needs no ammunition. Every magic cast, including defensive spells, uses one scroll of its weapon's school. Empty supplies stop basic pursuit with feedback.
- Projectiles track only their intended living target and spawn generation. They collide with scenery, enforce travel range and cannot transfer damage to a replacement creature. Multi-strike, bleed execute, splash, control, shielding, healing and movement abilities retain their registered mechanics.
- Enemies have explicit idle, patrol (when registered), aggro, investigate, chase, attack, recover, return, death and respawn behavior. Passive definitions retaliate only after being hit. Lost sight, leash, death and safe-zone rules cancel attacks; returning creatures use cached paths and recover at spawn if blocked. Cancelled warning animations no longer look like attack releases. Defeat grants XP, drops and quest events once; respawn increments a life identifier.
- Combat availability and failure reasons are reflected in the existing action bar. Displayed weapon interval is the actual Classic interval; raw weapon strength is labelled power rather than damage.

## Cadence and balance

Classic rounds existing intervals upward to whole 600 ms ticks, avoiding any automatic attack speed increase. Original registered power, accuracy, XP, loot and resource values are unchanged. This is an intentional cadence change; it is not a claim that final six-block balance testing is complete.

| Weapon | Previous interval | Classic interval |
| --- | ---: | ---: |
| Longsword | 1.15 s | 1.2 s |
| Daggers | 0.40 s | 0.6 s |
| Greatsword | 1.70 s | 1.8 s |
| Frost staff | 1.12 s | 1.2 s |
| Ember wand | 0.75 s | 1.2 s |
| Longbow | 1.60 s | 1.8 s |
| Crossbow | 2.05 s | 2.4 s |
| Shortbow | 0.68 s | 1.2 s |

Fast weapon throughput changes most, and wand/staff cadence now coincides. Final progression and economy tuning belongs to Block 6. The complete fresh-character quest/dungeon journey is retained as a practical regression against progression becoming impossible.

## Validation at implementation

- `npm ci --ignore-scripts`, syntax checks, 390 unit tests, build plus two cache/asset checks, and visual audit (36 assets, 10 glTF models, 69 icons, 56 animation specifications; zero errors).
- Fifteen new pure regressions cover frame partitions, tick intervals, suspension, target/wall/range rejection, release costs, style/equipment/target changes, burst/scatter, utility supply rules, projectile source style, defeat/respawn, passive retaliation, patrol, leash and reachable combat approach.
- At simulated 60, 30, 10 and 5 FPS, twelve seconds of combat produces exactly identical event arrays, state and save snapshots.
- Chromium: new touch combat journey, free combat/retreat, navigation, Classic smoke, camera, HUD, saves, touch controls, feedback, and all eight adventure quests including four dungeon rooms, midway reload and repeat reward prevention.
- The new combat journey is included in Rebirth CI and the First Adventure WebKit job. Core, Greenwood, Classic, First Adventure, Rebirth and visual workflow results must pass before integration.
- The legacy 3D auto-combat browser closes during startup in this local container, as on the unchanged baseline. Its required hosted CI run must pass; this is not reported as a local pass.

A Node v24.22.1 measurement of 60 simulated seconds / 3,600 steps, with the full adventure registry and practice-target combat, took a median 8.19 ms and maximum 25.02 ms across twelve runs (median 0.00228 ms/step). This is a narrow simulation CPU benchmark without rendering or an active dungeon battle. It is not an FPS or iPad performance measurement.

Physical iPad Safari testing is unavailable in this environment. Desktop Chromium touch emulation and desktop WebKit checks do not replace physical-device playability, frame pacing or long-session signoff.

## Integration and rollback

PR targets dev only. Preserve every critical CI gate. User direction to proceed to Block 2 followed the explicit separate-review gate explanation; no independent GitHub reviewer approval is claimed. Final PR delivery notes record the actual CI, merge and hosting outcomes.

After integration, pin the merged SHA in the existing Cellbound bridge. The bridge verifies uploaded assets, hosted gameplay and unchanged production fingerprints. Revert the PR through dev and repin the last verified bridge commit to roll back; no save migration is required. No production deployment is authorized.
