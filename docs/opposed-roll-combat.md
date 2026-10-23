# Oakrest opposed-roll combat (23 October 2026)

Issue: #78. **Scope**: combat-math refinement, not a replacement of Oakrest combat and not a port of RuneScape's source/assets.

## Formula and integration

Each spatially validated player hit compares an integer attack rating against the enemy's defence rating, following the familiar two-branch RuneScape-like probability curve. The formula is independently authored. Higher skill, weapon power and current equipped style's offensive modifiers improve attack rating. Enemy level and a small monster-specific guard improve defence rating. The resulting PvE accuracy is clamped to 16–97% (Oakrest-specific anti-frustration tuning). The training dummy always connects to keep the onboarding tutorial usable. A failed accuracy roll displays **0**, while a successful hit draws a uniform **1–maximum** damage roll.

The existing maximum-hit scaling, weapon windup/cooldown, melee sweeps, travelling projectiles, line-of-sight checks, style swapping, enemy telegraphs, dodge timing, monster loot, XP and saved character schema are unchanged. Oakrest stays real-time: **no 600 ms tick or click-to-fight RuneScape control scheme**.

NPC-to-player blows use the same opposed roll with the defender's **Vitality** and equipped physical armour/slot guard. Armour continues to reduce damage after a successful hit. No new equipment items or armour requirements have been added.

## Balance and QA

Tuning constants live in `src/osrs-combat-math.js` so they can be adjusted against measured real-game kill times. Level-1 sword vs level-2 mossling has approximately 65–70% accuracy; tougher level-8 bandits are less reliable for beginners. Chance is never 100% against normal enemies, but misses are not unbounded. The first RNG draw is hit/miss; a successful hit alone consumes a second damage RNG draw. Existing damage maxima are retained to minimise disruption.

Run `npm run check && npm test && npm run build`, and, once browser dependencies are available, the existing `browser-smoke.cjs`, `browser-auto-combat.cjs`, `browser-combat-reborn.cjs` and `browser-release.cjs` suites. Verify touch combat, locked targets, enemy warnings and tutorial dummy on a physical iPad Safari before final signoff. Check actual beginner kill times and XP/hour before treating tuning as balanced.

Deployment: PR into `dev` only after all required CI passes; then use the existing Cellbound shared-host bridge **only after the FTP safety hold is lifted** and pin the reviewed Oakrest commit. **Never** publish the public `/oakrest/` path. Merging code is not itself evidence of a working deployed build.
