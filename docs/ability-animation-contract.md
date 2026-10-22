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

`window.oakrestQA.animation` is available only under local or `/oakrest-dev/?qa=1` QA controls. It exposes `specs()`, `events()`, `pose(family,cue,windup,release)` and `active()`. This is a **development-only numerical inspector hook**, not yet the requested complete on-screen animation inspector.

## Further production work — not complete in this slice
- Rig improvements: independent upper/lower-body blends, grounded footwork, dual-wield, bowstring draw, crossbow reload, wand/staff contact attachments, death/hit reactions and smooth equipment transitions.
- Precisely trace real animated blade paths in hitboxes; current contact geometry is the existing deterministic swept arc. Exact weapon-tip contact and blocked swing visuals remain to be validated.
- Enhanced body/impact VFX and sound per skill, including obvious enemy root/slow/buff states; currently existing shared audiovisual primitives remain.
- Development-only **visual** inspector: 3D pose freeze/speed/select all skills, hitboxes, simulated opponent/PvP camera; the current QA hook is not a substitute.
- Browser/gameplay QA at actual iPad landscape viewing scale, WebKit, physical iPad Safari and frame/memory sampling; independent gameplay/QA approval.
- Video evidence of real in-game attacks and skill previews, and safe dev-only release pinned through the Cellbound hosting bridge.

## Quality and safe merge
Use `npm ci --ignore-scripts && npm run check && npm test && npm run build` and the combat-specific Chromium/WebKit/Greenwood suites on the **exact PR head**. An existing test passing is not physical iPad verification. No merge if required checks are missing/failed/incomplete. Merge only into `dev` after independent review, and deploy only via the isolated `/oakrest-dev/` bridge with the reviewed SHA. `/oakrest/` and `main` remain untouched.
