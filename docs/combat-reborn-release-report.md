# Project Oakrest — Combat Reborn delivery report

## Release identity
- Repository: benhorner9/Projectoakrest
- Starting dev commit: fda62e0fa6b9f4c5c1d055d4e53ea6d2a00a9f48
- Working branch: overhaul/combat-reborn
- Pull request: https://github.com/benhorner9/Projectoakrest/pull/6
- Reviewed implementation commit: e645a5e929755eb3800cf05ead525c8d2568868e
- Development target: https://playcellbound.com/oakrest-dev/
- Public target is excluded: https://playcellbound.com/oakrest/

## Retained systems
Character creator and appearance, legacy and character-local saves, independent discipline XP and combat levels, tutorial and Portal Realm, all fourteen weapon items/eight families, three equipment presets, nine worn slots, inventory Examine, reusable beginner arrows, shop starter sets, bank, Woodcutting, loot ownership and controller support. No data reset or save-schema replacement.

## Gameplay changes
Melee now uses time-windowed swept weapon capsules against enemy hit volumes. Strikes follow player displacement, freeze their committed direction, stop at cover, and track eligible targets separately to prevent unintended repeated damage. Swords and greatswords have different sweep width/commitment; directed strikes and daggers are narrower. Twin Strike uses two separate contacts. Greatsword hits stagger briefly and its heavy abilities now scale to the larger weapon.

Arrows and magic use first-contact segment collision, including target movement relative to the projectile. Fixed launch direction, normalized flight, finite range, impact/expiry cleanup, and environment collision are shared. Camera-centre aim is reconciled with the actual weapon origin; close obstruction is checked before release. Touch correction is limited, forward-only and sight-checked.

Frost retains slow/root/barrier skills and adds a visible three-second slowing field to Nova. Ember Firebolt explodes on contact with cover-checked splash; the direct target is excluded from an accidental second damage application. Flame Wave and Scattershot use travelling projectiles rather than instant cone damage.

Dodge has explicit startup, active invulnerability, recovery and cooldown. Ability dashes do not receive dodge invulnerability. Stun cancels interruptible actions; roots stop movement/mobile attacks; slows affect motion. Switching retains attack recovery and shared ability cooldowns; in-flight damage retains its original style and equipment multipliers.

## Physics and enemy behaviour
Analytic box/cylinder projectile obstruction replaces coarse sampling of solids; terrain contact is refined against the continuous height field. Character collision uses bounded movement substeps, body radius, wall sliding, slope checks and separation. A spatial grid narrows character obstacle queries.

Tutorial, portal and world collision layers match visible scenery. Large rocks, barrels, crates, carts, lamp posts and gate posts register solid shapes. Distant decorative mountain silhouettes are outside the playable boundary.

Enemy detection checks sight and range; notice and reacquisition delays are explicit. Pursuit and returning use bounded A* with collision-checked edges. There is no retreat-through-walls fallback. The final waypoint remains available until the creature reaches home. Mosslings perform collision-aware pounces, boars physically sweep their charge with damage confined to the displayed warning lane, and bandits face frozen cleave directions and reposition during recovery. Leashing cancels dangerous actions and statuses, heals consistently, and prevents immediate distant reacquisition.

Deep-wilderness loot now stays at its kill location. The older ±69/70 coordinate clamp was corrected to the current ±120 world boundary, with regression coverage for boars and bandits.

## Animation, audio and interface
Existing articulated rigs are retained. Arm sweeps and weapon trails share the contact window and reach. Hits trigger reactions, impact particles, damage numbers and restrained camera movement; misses do not generate hit particles. Frost fields conform to terrain. Effects, projectiles, floaters and audio voices are bounded and disposed.

Original procedural sounds cover swings, shots, magic, warnings, impacts, damage and deaths. Sound enable and volume persist independently of graphical quality, using Safari-compatible interaction unlocking.

The reticle now sits on the camera firing ray. Root, slow, stun and return states are visible. Ability recovery and dodge unavailability are shown; queued swaps are highlighted. Touch skills activate on press with click suppression, the joystick retains its owning pointer, and hiding the tab clears held input. iPad ability targets are larger. Existing keyboard/gamepad controls remain; Shift sprints and Space dodges.

## Balancing
No new mana or ammunition economy was introduced. Starter monster health, level and XP rewards remain unchanged. Base weapon cadence/reach relationships remain, with stronger greatsword abilities and commitment, separate dagger contacts, useful crowd control, and an explicit dodge window.

| Family | Base damage | Attack cycle (s) | Windup (s) | Reach | Raw basic DPS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Iron Longsword | 19 | 0.95 | 0.26 | 3.1 | 20 |
| Twin Daggers | 9 | 0.4 | 0.09 | 2.1 | 22.5 |
| Heavy Greatsword | 39 | 1.7 | 0.55 | 3.7 | 22.9 |
| Frostwood Staff | 12 | 0.92 | 0.24 | 18 | 13 |
| Ember Wand | 13 | 0.75 | 0.18 | 17 | 17.3 |
| Oak Longbow | 22 | 1.4 | 0.46 | 30 | 15.7 |
| Heavy Crossbow | 39 | 2.05 | 0.67 | 12 | 19 |
| Hunter Shortbow | 13 | 0.68 | 0.17 | 16 | 19.1 |

DPS values are arithmetic catalogue comparisons, not measured player performance. They exclude misses, travel, combos, bleed, abilities, equipment, progression and enemy movement. Physical-iPad play and longer-term balance remain the next product-validation step.

## Test evidence
Final implementation QA run: https://github.com/benhorner9/Projectoakrest/actions/runs/39499729082 (both jobs successful).
- 141 unit tests passed, zero failed; source checks, production build and the build/cache regression passed.
- All 84 catalogue ability combinations passed, covering fourteen items and four slot positions.
- Eight automated combat/touch scenarios A–H passed in Chromium.
- Existing new-character/tutorial, town, shop/bank/Woodcutting, equipment, controller and iPad-sized creator checks passed.
- Built development-path release tests passed in Chromium and WebKit.
- Scenario G ran 129 simulated seconds, killed Mossling/boar/bandit/Mossling, collected 28 coins, changed weapons, respawned and reloaded the full save. An additional 30-second rendered effects check passed.
- No final automated failures remain. Earlier failing collision, charge-lane, return-waypoint and wilderness-drop assertions drove fixes before the final run.

The automated combat scenarios run the real simulation and rendering using controlled positioning and isolated save fixtures. They are not presented as uninterrupted manual gameplay.

| Scenario | Evidence and scope |
| --- | --- |
| A — Beginner melee | Low-level Mossling fight, damage, kill, discipline XP, physical drop creation and continuous dodge. Separate browser smoke covers new-character creation and tutorial completion; release tests cover acquiring starter sets. |
| B — Ranged | Actual projectile in flight, contact damage and deliberate miss. Relative movement, high speeds, cover and first-contact ordering are additionally tested in pure geometry cases. |
| C — Magic/weapons | All 84 catalogue ability combinations across the four slot positions; frost/ember and all weapon families; cooldown rejection and live-enemy root immobility. |
| D — Tribrid | Queued melee→magic→ranged transitions preserve shared attack recovery. Pure tests cover shared skill cooldown identity across families. |
| E — Multiple enemies | Mossling, boar and bandit independently acquire/wind up; leaving the area cancels attacks and all return to spawn. |
| F — Obstacles | Registered wall blocks melee and a continuous dodge stops before it. Unit tests cover houses, trees, fences, terrain, swept projectiles and obstacle navigation. |
| G — Repeated session | Repeated encounters with all starter enemy types, melee equipment changes, physical loot collection, repeated attacks, death/respawn and complete save reload; bounded render/effect check. |
| H — Touch/layout | Simultaneous joystick, attack-camera drag and style switch; controls resume after menus; controls fit and do not overlap at 1366×1024, 1024×1366, 844×390 and 390×844. |

## Performance
Paired comparison on the same GitHub Actions runner, using the original dev revision and final implementation:

| Measurement | Original dev | Combat Reborn |
| --- | ---: | ---: |
| Median rendered FPS | 2.069 | 2.143 |
| Median p95 frame time | 483.4 ms | 466.7 ms |
| CPU time per simulated second | 85.25 ms | 115.90 ms |
| Idle geometries / textures | 147 / 1 | 147 / 1 |
| Idle draw calls / triangles | ~359 / 189,224 | ~359 / 189,224 |

Simulation CPU increased about 36% (30.65 ms per simulated second, approximately 0.51 ms extra per 60 Hz step) while rendered performance was similar in this software-GPU environment. This is a cost of the additional collision/navigation work and remains a hardware profiling item. The repeated-session final effect count was 1; final geometry count was 163 versus 148 initially after camera/render warmup. The bounded-effects assertion passed; this short sample does not establish the absence of long-session memory growth.

The renderer in CI uses SwiftShader on Linux without the target iPad GPU. Its low FPS is not an estimate of iPad performance. Simulation costs and same-run baseline comparisons are reported separately. Stable 60 FPS on an iPad Air has not been demonstrated.

## Deployment and production protection
PR #6 was merged into **dev** as `830ba49aab063c46aa8e4079608d9d153c07807d`. The tested source commit is `e645a5e929755eb3800cf05ead525c8d2568868e`.

The established shared-host bridge in benhorner9/Cellbound, branch `deploy/oakrest-dev-20261020`, was updated at `f0a491a870582ac0b1531283e5863800ef8187e8` to deploy that exact merge revision. [Deployment run 39501225111](https://github.com/benhorner9/Cellbound/actions/runs/39501225111) completed successfully on 2026-10-20 at approximately 21:35 UTC.

- Secure shared-host upload was confined to `./oakrest-dev/`; no Vercel deployment.
- All **52 hosted development files** matched the tested build, including the stamped release metadata.
- Actual hosted browser checks passed for inventory, equipment restrictions, nine slots, equip/unequip, bank, starter sets, save reload, isolated public storage, movement, combat, landscape and portrait.
- Hosted contact checks confirmed `combat-reborn-1`: melee reduced target HP 1200→1181; ranged 1181→1159; magic 1159→1146.
- The public before/after comparison passed: **27 public file hashes matched**, with missing paths unchanged.
- Public `main` remained `ed8a1a1fd9a778779ae3c6e66f15400f5663a462`. No public character data or settings were edited; browser checks used isolated development save contexts.
- [Hosted build, screenshots and verification evidence](https://github.com/benhorner9/Cellbound/actions/runs/39501225111/artifacts/12299343284) is available until 2027-01-18.

This delivery report is added to the overhaul branch after deployment as documentation. It does not change the deployed code revision.

## Outstanding issues and limitations
No unresolved critical or high-severity defect was observed in the completed automated coverage. This is not a claim that every possible combat situation is defect-free.

| Item | Status / severity |
| --- | --- |
| Physical iPad Air 13-inch Safari comfort, audio and thermal performance | Unverified release-validation requirement; no physical device was available. WebKit and touch emulation passed. |
| Stable 60 FPS on target hardware | Unverified; software-rendered CI cannot certify this target. |
| Sustained memory, battery and heat soak | Unverified beyond the 129-second simulation and 30-second rendered stability sample. |
| Subjective weapon feel and equal/higher-level encounter balance | Automated mechanics passed; human play and broader balance review remain necessary. |
| Every mandatory scenario as uninterrupted manual play | Unavailable. The report distinguishes controlled real-game automation from human playthroughs. |
| Screenshot/video visual review | Captured as CI artifacts; manual inspection was unavailable in this execution environment. |
| Local shell/runtime | Unavailable. Full source/build/browser validation ran successfully in GitHub Actions instead. |

These limitations mean the development release is available for hardware validation; full iPad gameplay sign-off is still outstanding. No production release is authorized or performed.

## Evidence and next steps
- [Final combat, touch and performance QA run](https://github.com/benhorner9/Projectoakrest/actions/runs/39499729082)
- [Combat screenshots, gameplay recordings and JSON evidence](https://github.com/benhorner9/Projectoakrest/actions/runs/39499729082/artifacts/12300081389)
- [Chromium and WebKit built-release evidence](https://github.com/benhorner9/Projectoakrest/actions/runs/39499729082/artifacts/12300020769)

The two QA artifacts above expire on 2027-01-18 under the current retention policy. Download them before expiry if long-term visual evidence is required.

Use the development URL for the next physical iPad Air Safari pass: verify both landscape orientations, simultaneous fingers, target aiming at different elevations, audible warnings, subjective weapon timing and a sustained encounter session while reading the in-game diagnostics. Broader dungeon, boss and PvP content remains future work; this release does not claim those modes were tested.
