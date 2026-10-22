# Oakrest CC0 item art integration (issue #72)

The free **KayKit Adventurers** source accessories are included locally in `assets/kaykit-adventurers/` with the CC0 licence and source URL. Ten small mesh types cover relevant starter swords, greatsword, daggers, staff, wand, crossbow, axe, shield, quiver and arrows. Oakrest's stable item ID is the registry key; these files are only art. Do not rename gameplay item IDs or alter drop probabilities for visual changes.

## Current first pass
- Source-geometry SVG previews are used in bag, bank, shop, equipment and Examine for mapped items; the old local procedural SVG remains the fallback everywhere else. No colour-coded official item rarity.
- Matching GLTF meshes replace procedural **visual-only** held weapons and physical dropped items when local files load. Combat hits, projectile ownership, animation timing and player saves still use existing systems. Fallbacks remain if asset fetch fails.
- Nine-slot starter wearable equipment is represented with geometry attached to existing animated Oakrest joints; shield and quiver replace fallbacks with licensed 3D models. It is **not yet** a full interchangeable rigged 7-tier set.
- The shared-host build copies all self-hosted `assets/` and never fetches models from third-party servers.

## Verification and known limits
- Test `npm ci --ignore-scripts && npm run check && npm test && npm run build` plus Chromium and WebKit / physical iPad Safari. Review source-model scaling, orientation, hitbox telegraph readability, GPU memory and fallback loading in browser; these cannot be validated by Node unit tests alone.
- Test buy/equip/unequip of all three beginner sets, rapid Tab style changes, dual daggers, woodcutting axe, bank deposit/withdraw, killing a boar or bandit, floor drop pickup, reloading saved loot, and 28-slot inventory. No save migration.
- Bow/shortbow, armour tiers and many natural resource items still have original local procedural models/icons until dedicated matching CC0 models can be fitted and reviewed; do not claim total pack coverage.
- No automatic production publishing. Dev release only after conclusive green CI and reviewed merge, via Cellbound's pinned-commit bridge in `docs/development-deployment.md`.
