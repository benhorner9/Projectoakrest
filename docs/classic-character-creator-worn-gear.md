# Oakrest Classic — identity, character creation and worn gear (24 Oct 2026)

## Direction
A player has one persistent base appearance: sex, hairstyle, hair colour, skin tone, starter outfit and outfit colour. These fields live on the **existing Oakrest character profile**, not in a new Classic-only save. The new Classic creator renders the *same sprite atlas as in-game characters* (eight facings) instead of the old 3D preview, with a compact iPad landscape panel. It shares the original three-slot browser roster and the dev/public `storageKey` namespace.

## Visual contract
1. Character creation choices define a permanent base outfit, visible under actual equipped gear in **all three combat styles**.
2. Switching Melee/Magic/Ranged changes **only** worn equipment from the nine canonical slots of the selected style. There is no default Melee red, Magic blue or Ranged green recolouring.
3. An empty armour/weapon slot never constructs fake armour, cloaks, weapons or arrows. All three empty styles have the same pixel silhouette when idle.
4. A shield, quiver, helm, leg protection, boots, jewellery or staff appears only when its own saved slot actually contains an item for that style.
5. Temporary simulation-issued training weapons are filtered out by the Classic presentation (`combat.persistentSave()`). These remain available in temporary practice combat logic but are **not owned, worn, or written** to the player's save. A later gameplay decision should determine whether every starter needs a purchased/earned weapon rather than a session practice loan.

## Character creation and save safety
- The new creator opens automatically only when neither a selected profile nor legacy character save exists. It can also be opened from Settings > Characters. Gameplay is paused behind the creator, and changing characters reloads the page.
- New characters use `createCharacter`, `safeAppearance`, `freshCharacterSave` and the existing canonical storage keys. No local data reset or save migration.
- Classic's starting area is directly in the village; it has no old 3D portal/tutorial. A brand-new Classic profile starts with **0 XP, 0 coins, no owned gear, empty slots**, and onboarding area `world` with the Oakrest portal marked active. This makes guarded Classic saving possible without forcing a player through the unrelated 3D route.
- Existing profiles are not rewritten by selecting them. Creation refuses existing save keys and restores roster/active pointers on write failure. New character slots can still only total three.
- Existing saves remain subject to Block 6 backup/compare-before-write controls and opt-in saving; nothing auto-enables persistence.

## QA
- Unit: `node --test tests/classic-characters.test.js`; `npm test`.
- Browser: `node tests/browser-classic-creator.cjs`; the test creates a new profile, changes pixel-preview options, swaps all three *empty* loadouts (equal sprite hashes), outfits only Melee, and checks that Magic and Ranged remain base clothing. Check the existing Classic combat/inventory/HUD tests too.
- Full gate: `npm run check`, `npm run build`, Classic CI, Core Gate, Greenwood QA, independent review.
- Manual iPad Air landscape: open creator from Settings; tap all palettes/selects and rotate; test 1180×600 and 1194×834; verify scroll area and that tapping controls does not move/attack behind menu. Return to the village, equip a piece in only Melee, then switch empty Magic/Ranged while facing four directions.
- **Not yet personally executed**: browser tests, CI, physical iPad, and hosted dev checksum. No deploy or merge is asserted by this PR.

## Dependency and rollback
Built on the unmerged Block 7 Classic HUD branch (PR #99), which itself depends on the ordered Blocks 1–6. Merge this feature only after reconciling those prerequisites. Revert the additive creator HTML/CSS/JS and sprite appearance changes to roll back; do not delete any existing browser character saves.
