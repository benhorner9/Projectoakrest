# Oakrest Animation Contract — Phase 1/2 foundation

Status: **implementation slice, NOT full cinematic milestone**. Tracks #66. Read [AGENTS.md](../AGENTS.md) and the project [deployment rules](development-deployment.md) before integrating or releasing.

## Existing simulation truth preserved
`LOADOUTS` in `src/rules.js` remains the sole weapon-speed and skill-balance source. `src/main.js` remains the gameplay-clock authority: a basic attack begins at `t`, releases at `t + min(interval * .70, windup)`, and cannot begin again until `t + interval`. Skill release timing remains `pendingAbility.impactAt`; shared recovery remains `max(.4, windup + .28)`. Shields, heals, dashes and backward dashes have **zero actual wind-up**, and therefore **do not offer an honest pre-effect opponent tell today**. Their action pose follows the instantaneous effect. Giving them a true anticipatory cast would alter gameplay and needs separate gameplay approval.

`src/ability-animation.js` produces a full in-game action spec for every family/weapon variant/learned skill. It reads the actual loadout data rather than creating a rival gameplay table. `src/animation-language.js` maps the action's stable `motionCue` onto the existing actor rig joints. The pose is visual-only. Only existing simulation functions `resolveBasicAttack`, `resolveAbility`, `updateStrikes`, and projectile collision decide effects.

## Baseline weapon families
| Style | Family | Distinguishing basic | Weapon abilities (level 1/3/5/8) |
| --- | --- | --- | --- |
| Melee | Sword | Measured shoulder winding and swing | Heavy Slash (overhand); Cleave (wide coil); Guard Break (tight forward brace); Counterguard (cross-body defence) |
| Melee | Daggers | Alternating quick, low strikes | Quick Slice (low); Twin Strike (two-blade cross); Shadow Step (low forward rush); Open Wound (committed stab) |
| Melee | Greatsword | Two-handed heavy overhead preparation | Heavy Slash (high blade); Cleave (wide two-hand); Guard Break (shoulder brace); Counterguard (two-handed defensive guard) |
| Ranged | Longbow | Deliberate full draw | Piercing Arrow (held draw); Rapid Shot (compact quick draw); Pinning Shot (planted held draw); Retreating Shot (rearward weight shift) |
| Ranged | Shortbow | Compact fast bow snap | Piercing Arrow; Rapid Shot; Pinning Shot; Retreating Shot (each shares mechanics with the longbow but has shortbow body tempo and weapon silhouette) |
| Ranged | Crossbow | Braced mechanical discharge | Crack Shot (recoil brace); Scattershot (wide horizontal angle); Snare Bolt (deliberate low aim); Roll Back (crossbow tucked rearward) |
| Magic | Frost staff | Controlled staff release | Ice Shard (narrow channel); Frost Nova (spread arms); Frozen Binding (hand closure); Ice Barrier (protective forearms) |
| Magic | Ember wand | Short wrist-focused casting | Firebolt (wand flare); Flame Wave (lateral sweep); Blink (directional compression); Warmth (inward heal) |

Shared abilities also have their own poses: **Melee** Battle Rush / Second Wind; **Magic** Arcane Bolt / Phase Step; **Ranged** Evasive Roll / Focus Shot. Each base family contains 7 specification entries (basic + 4 weapon skills + 2 shared) = **56 family/action specifications**. Upgraded weapons and Woodcutting axe equipment resolve their family via existing `LOADOUTS[style][weapon].family`, rather than spawning divergent skill definitions.

Each spec records: style and compatibility, stable ID, starting family pose, anticipation duration and body tell, release motion, authoritative event timestamp and effect origin, follow-through, recovery, interruptions, current VFX and audio source, and hardware fallback. No artificial item rarity/tiers or gameplay rule changes are introduced.

## Gameplay event observation
`createAnimationEventJournal()` records `attack_start`, `release`, `projectile_spawn`, `contact_window_start`, `contact_window_end`, `ability_effect`, `recovery_end` and `interrupted` along with action IDs and simulation-clock timestamps. Twin Strike uses distinct second-window IDs. Only a **successful in-world projectile creation** produces `projectile_spawn`. Event keys deduplicate within the bounded journal window. The journal **observes** gameplay functions; it never authorises collision, hit chance, damage, cooldown or invulnerability.

`window.oakrestQA.animation` is available only under local or `/oakrest-dev/?qa=1` QA controls. It exposes `specs()`, `events()`, `pose(family,cue,windup,release)` and `active()`. The additional opt-in visual inspector is available only at `?qa=1&animation=1` on localhost or `/oakrest-dev/`. It uses `createActor`, `equipActor` and `animateActor` in an **isolated, development-only Three.js renderer**. Developers can select style, family and ability; preview at 25/50/100/150% speed; freeze/scrub; simulate locomotion; display a contrasting real-rig opponent at a representative iPad preview camera distance; toggle a minimal effect independently of body motion; inspect actual animated hand origin; and show an explicitly approximate melee reach wedge. The inspector also shows preview event timestamps calculated from the actual ability specifications, separately from the real-game event journal. Preview actions cannot hit enemies, change save data or alter combat timing. Real-game event data remains available through the QA journal. The preview does **not yet** reproduce complete production VFX/SFX, physical swept collision, genuine networked players or the exact in-game multiplayer camera. The opponent preview is a stand-in for visual silhouette comparisons. Avoid measuring production FPS with the extra QA renderer enabled.

## Further production work — not complete in this slice
- Rig improvements: independent upper/lower-body blends, grounded footwork, dual-wield, bowstring draw, crossbow reload, wand/staff contact attachments, death/hit reactions and smooth equipment transitions.
- Precisely trace real animated blade paths in hitboxes; current contact geometry is the existing deterministic swept arc. Exact weapon-tip contact and blocked swing visuals remain to be validated.
- Enhanced body/impact VFX and sound per skill, including obvious enemy root/slow/buff states; currently existing shared audiovisual primitives remain.
- Complete the **visual** inspector: physically exact weapon-path hitboxes, independent production VFX/SFX toggles, network-equivalent opponent/camera states and exact contact-window overlays; the 3D inspector provides real rig poses, a comparative opponent, independent minimal FX and estimated reach.
- Browser/gameplay QA at actual iPad landscape viewing scale, WebKit, physical iPad Safari and frame/memory sampling; independent gameplay/QA approval.
- Video evidence of real in-game attacks and skill previews, and safe dev-only release pinned through the Cellbound hosting bridge.

## Quality and safe merge
Use `npm ci --ignore-scripts && npm run check && npm test && npm run build` and the combat-specific Chromium/WebKit/Greenwood suites on the **exact PR head**. An existing test passing is not physical iPad verification. No merge if required checks are missing/failed/incomplete. Merge only into `dev` after independent review, and deploy only via the isolated `/oakrest-dev/` bridge with the reviewed SHA. `/oakrest/` and `main` remain untouched.

## Phase 2 weapon-body enhancements
The rig has retained and reusable bowstring geometry (drawn along the real existing windup clock), a crossbow catch that slides with windup/release, and a staff or wand focus that responds to casting energy. The main animation system now changes raised magic/ranged combat poses into a restrained resting carry when no target or attack is active, keeping peaceful Oakrest town idles nonaggressive. These pose mechanics share the same actor rig, character appearance and equipment as live gameplay and do not allocate geometry each frame.

**Animation event note:** each separately created arrow/bolt from multishot and spread skills receives a unique `projectile_spawn`, `projectile_spawn_2`, etc. trace marker. Collision/hit logic remains unchanged. QA checks real Three.js actor geometry in `tests/weapon-animation-rig.test.js` and the development renderer in `tests/browser-animation-inspector.cjs`. The Chromium inspector test gates the core and Greenwood workflows; a WebKit inspector job additionally records non-gating compatibility diagnostics.

## Outstanding visuals
This is an improved **procedural low-poly rig**, not externally authored skeletal motion-capture. Full cinematic-quality authored locomotion/attacks, physically exact weapon-contact alignment and 60 FPS on a physical iPad require further iteration and device testing. Do not label the whole 19-section production milestone as accepted just because this foundational PR merges.
