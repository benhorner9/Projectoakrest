# KayKit character art — source and licensing

Four **FREE tier** character models are staged by \`scripts/fetch-kaykit-character-assets.mjs\` from two official public KayKit repositories. The script validates each byte count and immutable Git blob SHA-1 before bundling. Only the resulting **built site** serves the models; no third-party runtime/CDN request is made.

- Adventurers Knight/Rogue/Mage: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 (commit \`672074b73ba276876a19e8816ecdc5241817ab47\`).
- Skeleton_Warrior: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 (commit \`15b62b9bad122f72926c10fb14d622c73819fa54\`).
- Original CC0 licences: see each repository's LICENSE.txt. Created by Kay Lousberg. Free for commercial use; attribution optional. Do not claim original authorship or resell source pack.
- Source path, size and SHA-1 for each model are encoded in \`src/character-asset-catalog.js\`. No paid EXTRA or SOURCE tier assets are used.

## Honest limitations and fallback
- This is a **visual compatibility pass**, not full skeletal retargeting of all 9 equipment slots. The existing Oakrest rig remains the authority for held weapons, shields, ability tells, movement collision, gameplay timing and saved appearance.
- KayKit Knight/Rogue/Mage are preset **cosmetic body silhouettes** selected from the character's outfit choice; custom skin/hair/body details remain intact in saved character data and visible again when character models are switched off. These presets do **not** currently fully express personal hair/skin/sex selections.
- The forest humanoid hostile uses Skeleton_Warrior cosmetics but retains the existing bandit mechanics/level/drops and target name. No new enemy, item economy or XP change.
- Other enemies and villagers retain original procedural art, because an arbitrary skeleton rig is not a good substitute for a boar or mossling.
- Settings → **KayKit character models** turns the appearance overlay off immediately to restore original personal character appearance and combat readability.
- Missing/failed/slow asset downloads keep the original playable mesh. Do not remove the fallback, automatic collisions, or established character rigs.

## Quality gates
\`npm ci --ignore-scripts && npm run check && npm test && npm run build\`, built Chromium/WebKit tests for model load, direct style swap, animation, enemy contact/loot, town interiors and player save identity. Physical iPad Safari landscape is required before final visual/animation sign-off, especially weapon hand alignment, skeletal skin orientation, silhouette and frame-time.
