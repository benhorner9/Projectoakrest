# Combat Redefined — development implementation (October 2026)

Target: `dev` only. Production remains separate.

## Player loop
- Press ATTACK once (desktop click, keyboard J/Enter, controller A/Cross, or touch button) to target an enemy within 30 units that has unobstructed line of sight. A second press stops attacking. Touch a visible enemy name/level label to select it directly.
- Ordinary attacks repeat at the equipped weapon's **original attack cadence**, respecting animation windup, real geometry and projectile travel/collisions. The character can reposition while attacking. Automatic pursuit uses collision-aware paths only when the player isn't manually steering.
- The selected monster remains locked during Melee/Magic/Ranged preset switches, each retaining its independently equipped weapon, armour and slotted abilities. Cooldowns and recovery still apply; switching cannot reset the attack timer for extra DPS.
- Lock clears if the target dies, leashes/retreats, moves too far, the player dies, changes character, or manually disengages. No arbitrary auto-hop to another target.
- Target indicators display live level, HP and target. Locked ranged/magic basics aim at enemy world hit volume (actual projectiles still collide with cover, terrain and the monster), rather than requiring repetitive camera reticle alignment.
- Skills remain explicit four-button actions with existing cooldowns, dodge, buffs, mobility and target effects. Stuns, slows, roots, shields and bleed are retained.

## Damage model
Pure math lives in `src/auto-combat.js`. `weapon.basic` is now a **weapon power rating**, not a guaranteed hit amount.

```
maxHit = max(1, floor((3 + weaponPower*0.55 + level*(0.15 + weaponPower*0.005)) * gearMultiplier))
accuracy = clamp(0.72 + (styleLevel-enemyLevel)*0.0038 + (weaponPower-19)*0.0012 - enemyGuard, 0.16, 0.97)
```

An independent accuracy roll determines whether a basic or direct-damage ability **misses for 0**; on success it rolls **1 through maxHit inclusive**. Specials/abilities scale the max-hit ceiling relative to the base weapon's power, capped at 4×. Enemy attacks likewise use an accuracy roll and 1..base-damage ceiling, with existing player defence mitigation applied after a successful hit. Dodge still evades before damage rolls. Bleed ticks are guaranteed periodic damage after a successful application.

The current formula is **initial tuning**, not final economy/endgame balance. Separate per-weapon accuracy and power stats, resistance by combat style, enemy balance and long-term 1–99 XP rates need dedicated tuning and player telemetry. No arbitrary item rarity tiers are introduced.

## QA
- `npm run check`, `npm test`, `npm run build`
- `node tests/browser-auto-combat.cjs` (continuous target attack, style changes, touch toggling and stop)
- Existing `node tests/browser-combat-reborn.cjs` and `node tests/browser-smoke.cjs` adjusted to make a fair retry when an accuracy roll returns zero.
- CI release paths exercise built assets in Chromium and WebKit; physical iPad Safari requires real-device verification.

## Known limits
- No network authority/multiplayer. The combat maths is client-side; this is a single-player prototype.
- Magic scroll consumption and crafted ammo economy are **not** implemented by this combat PR. A future crafting/inventory transaction must atomically consume the scroll for every spell cast, including automatic casts, before enabling ammo-restricted magic globally. Do not silently spend teleport scrolls.
- Current weapon families/ability animations are existing prototype content; this PR doesn't promise final sound, UI art or calibrated PvE economics.
- Do **not** publish to `/oakrest/`. Development deployment uses the separate protected shared-host bridge described in `docs/development-deployment.md`.
