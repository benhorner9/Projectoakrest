# Repository visual audit — 23 October 2026

Baseline: `dev` 530bed9ee6f810f4e683af174cce33cdf2ef0171. Hosted build marker observed: e78024717a74fcd47a0b618dd3c9aa4f9c5d4dff. PR #81 restored the exact pre-Quaternius source tree while retaining opposed combat rolls. This audit does not infer a deployed overhaul from that rollback marker.

| Asset/system | Source of truth | Decision | Evidence / work required |
|---|---|---|---|
| Hero / bandit body | `src/actors.js` | Improve | Procedural joints; one factory retained. Primitive head, shoulder volumes and armour need art revision. |
| Imported joint curves | `src/kaykit-clips.js`, `kaykit-motion.js` | Adapt or retire after migration | First-frame-relative deltas layered onto different axes/body; not a fully retargeted skeleton. Current live path retained until replacement acceptance. |
| Humanoid candidate | `rig-contract.js`, `foundation-motion.js`, `weapon-handling.js` | Review | Same actor factory, named joints, weapon control and two-bone constraints. Explicit opt-in reference only. |
| Procedural weapon families | `actors.js:equipActor` | Improve | Reference fixes bow grip/string alignment, two-hand contacts and shorter wand. Production geometry preserved. |
| 10 accessory glTFs / atlases | `assets/kaykit-adventurers/` | Adapt | Held loader uses one normalized-height pivot offset across unrelated meshes. Seven candidate source transforms are now explicit in `held-asset-profiles.js`, including the different crossbow axis; human handle fitting and live migration remain required. Do not approve from icon appearance. |
| Imported item icons | `assets/kaykit-adventurers/icons/` | Retain / review | Actual mesh-derived SVGs; existing IDs maintained. Need common framing and full equipped/ground comparison. |
| Procedural icons / ground items | `items.js`, `item-visuals.js` | Improve | Existing per-item registry and fallbacks retained. No new rarity colour system. |
| Armour / nine slot ornaments | `character-equipment-art.js` | Improve | Rigid attachments and overlapping shells; full deformation/clipping matrix outstanding. |
| Civilian bodies | `town-life.js:person` | Replace after rig gate | Separate simpler body builder; current unarmed routines retained. Canonical unarmed reference proves API direction, not production migration. |
| Creatures | `actors.js:createCreature/animateCreature` | Improve | Boar/mossling procedural anatomy; boar legs currently use index-phase motion and need diagonal-gait/contact review. |
| Town / 16 interiors | `town-world.js`, `building-art.js`, bank/trade art modules | Improve | Real shell/interior/cutaway code used by reference. Retain functioning entrances and collision boundaries. No new village rebuild yet. |
| Streets / landmarks | `town-layout.js`, `city-identity.js`, `town-ground.js` | Retain / improve | Existing coherent layout; detail and material cohesion review after character approval. |
| Terrain / trees / props | `terrain.js`, `environment.js`, `visual-world.js`, `woodcutting-art.js` | Improve | Preserve terrain authority and resource collision. Need slope/foot contact review and controlled LOD. |
| Lighting / materials | `visual-fidelity.js`, `visual-world.js`, `main.js` | Consolidate after approval | Multiple material factories use different shading/metalness conventions. Reference uses shared scene lighting; live materials not yet migrated. |
| Ability / VFX / audio | `ability-animation.js`, `animation-language.js`, `combat-visuals.js`, `ability-audio.js` | Retain and improve | 56 existing family/basic/shared specifications; coverage is metadata, not proof every ability looks correct. |
| Controls / camera / HUD | `main.js`, controls/UI modules | Retain | No gameplay redesign authorised. Actual iPad input/indoor matrix remains required. |
| Quaternius character, monster and village overlays | Reverted by #81 | Keep removed | Not present on current tree. Do not reimport automatically. |
| KayKit full-body character overlays | Reverted by #77 | Keep removed | Not the same as retained accessory glTFs or derived motion curves. |

## Licensing and provenance

Retained accessory models: Kay Lousberg / KayKit Adventurers free set, source and original CC0 text in `assets/kaykit-adventurers/SOURCE.md` and `LICENSE.txt`. Local CC0 permits commercial use/modification/redistribution; credit is good provenance practice. Modifications: selected geometry, normalized clones, generated SVG portraits. No new third-party art was added by #82.

Retained motion curves: KayKit Character Animations FREE 1.1, derived rotation channels, source/mirror provenance documented in `docs/kaykit-combat-animations.md`. The original GLBs are not in this tree, and the current curve provenance is not a reproducible binary-source manifest. **Before final pipeline acceptance, pin source hashes and preserve a local licence record for these derived curves.** Do not represent documentation of a source as validation of every future imported asset.

Three.js vendor runtime retains its bundled licence notice; package dependency pinned to 0.180.0. New foundation code is project-authored. Existing procedural art remains repository code. Generated audit manifest records bytes and SHA-256 for current files, not independent ownership of historical art.

`node scripts/audit-visual-assets.mjs` validates local glTF paths/byte counts, asset budgets, catalogue visuals, rig contracts and ability metadata and writes a reproducible review inventory. It does not approve aesthetics, licensing of unprovided source binaries, skinned retargeting, all loader extensions or future WebKit support.
