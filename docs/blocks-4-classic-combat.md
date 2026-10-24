# Oakrest — Block 4: real 2.5D combat integration (isolated sandbox)

**Issue:** #92. **Base:** Block 3 PR #91 at `5bb70fb5881aa3bfc91bfcb361a3f089562beca3`. Dependent on earlier Block 1 #87, Block 2 #89, Block 3 #91 integration/review.

## What actually runs
`src/classic-combat.js` is a separate renderer-free combat adapter fed by the existing Oakrest rules rather than a second custom balance model: `rules.js` (weapons, weapon interval/windup, XP, combat style loadouts and equipped ability slots), `auto-combat.js` and `osrs-combat-math.js` (accuracy/hit/damage), `attack-rules.js` (windup/cadence/projectile travel), `combat-physics.js` (ability cooldown IDs and dodge invulnerability), `combat-feel.js` (monster types, warning windows, leash and aggro), `equipment-slots.js` (gear modifiers), and the exact `gameplay-core.js` extraction from PR #87. The `gameplay-core.js` file is identical to Block 1's version; reconcile it when #87 integrates.

`src/classic-combat-view.js` renders enemy sprite silhouettes, health, combat levels, travelling arrows/magic and frozen red warning shapes. `classic-prototype.js` owns only player input, target/tap controls, camera, feedback and combat hotbar, using the new controller.

**Controls:** Tap an enemy (or J/ATTACK to acquire nearby), tap again to choose another. Press J/STOP to disengage; Tab cycles the full saved melee/magic/ranged presets (queued while an attack recovers); Q/E/R/F or the four touch buttons use equipped skills; Space or DODGE invokes cooldown-based invulnerability and a collision checked dodge. WASD, tap-to-move and touch joystick from Block 3 remain. Auto-attack attempts are gated by weapon reach, visibility, attack windup/cooldown, player health and equipped weapon ownership.

**Playable sample:** a training dummy near the north lane and mosslings, a boar and bandit just outside town. All use existing monster levels and behaviour timing. Monsters warn and damage with a predictable evasion opportunity and return to their home on leash/safe-town retreat.

## Save contract
The preview **always clones** the loaded character save. Combat XP, vitality increases, defeat counts and HP are transient inside the Classic controller. It does NOT call browser storage writes, pick up loot or permanently grant equipment. The unmodified original character and the 3D game at `index.html` remain authoritative until a reviewed release migrates gameplay. This is deliberately not claiming persistent player progression, full loot economy or shared-world combat.

This avoids corrupting existing players while validating the new renderer. Real save, crafting-scroll enforcement, loot/economy and permanent banking UI integration remain future steps once Classic combat is signed off.

## QA / acceptance
- Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`.
- `tests/classic-combat.test.js` asserts weapon intervals, delayed hit, projectile travel, independent combat styles, true equipped abilities/cooldowns, threat areas, safe/return behaviour, dodge cooldown and nonmutation of the caller save.
- Enhanced `tests/browser-classic.cjs` checks live rendered battle, target HUD, loadout switching and unchanged localStorage. Dedicated Classic workflow and existing main-game smoke/Greenwood remain mandatory.
- Browser CI is not a physical iPad Safari test. Manual iPad Air landscape hit-target sizes, performance and gesture handling still require validation.
- No merging of any stacked PR with failed/missing/cancelled critical CI. No shared-host publishing without an explicit reviewed dev release; public `/oakrest/` unchanged.

## Known limitations / future blocks
- This sandbox adapts enemy movement/attack patterns into an elevated-camera prototype rather than importing the entire intertwined main.js combat loop. Detailed enemy charge/pounce locomotion, full spell-scroll economic consumption, persistent XP/loot and PvP require further integration and verification.
- Block 5: persistent equipment and inventory/bank interfaces once the new view is signed off. Any permanent save write must occur only after data contract review and migration tests.
- Rollback by reverting Block 4 PR; the earlier Classic navigation/view and original 3D game remain separately recoverable.
