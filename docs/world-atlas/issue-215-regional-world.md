# Oakrest Realm: regional world expansion — issue #215

**Source:** The Game Director's 30 October 2026 illustrative map. This is a geography reference, *not* the actual painted texture, an instruction to rename the game, or a separate 3D world.

## Layout

| Type | Names | Game status |
| --- | --- | --- |
| Capital | Oakrest City (existing Oakrest Village) | All original services, quests, walls, gated exits, story and dungeon preserved |
| Additional cities | Ironhold, Seabreach, Sunmere, Frostgate | Walkable exteriors, houses, landmarks and atlas/map pins; no new bank/shop interiors yet |
| Towns | Brambleford, Willowfen, Redbrook | Walkable exteriors, roads, houses and map pins; no town-specific merchants yet |
| Farms | Fenstead Farm, Goldenfield Farm | Real decorative crop plots and map pins; Farming harvesting not yet implemented |

The centres share one continuous graph of **15 canonical spline routes**. Four existing capital gates remain the only wall openings. New region bounds (X -385..385, Z -280..505) are the same in navigation and both maps. The original village's old x/z footprints, target and spawn IDs remain unchanged, including Warden's Hollow. Terrain is physically drawn in the Classic Three.js scene, not faked with a map image. New house/tree collision is applied to movement, AI line of sight, and pathing.

### Monster camps

Eight visible territories: goblin encampment, wolf den, bandit camp, spider nest, skeleton ruins, Blackmarsh creatures, boar grounds, mossling grove.

- **Playable enemies now:** bandits, boars, mosslings — using the *existing* real combat AI, XP, drops, attacks and leash rules. Six new regional spawns have stable IDs and bounded habitats.
- **Locations only, clearly labelled Later:** goblins, wolves, spiders, skeletons and swamp monsters. Creating real enemy combat species, models, AI, drops and balance will be separate gameplay work. No fake combat labels or reskinned bandits masquerading as new species.

### Gathering

- **Playable:** Ironhold's copper/tin mining seams, Eldertree softwood, and Blackmarsh reeds. Four actual target IDs use the pre-existing timed gathering transactions, inventory caps and XP rules (existing skill requirements still apply).
- **Locations only, marked Future skill:** Silverlake fishing, Eastwind hunting, Willowfen herb beds, and both farms' crop harvesting. These require distinct skill transactions, progression, tools, assets, resource life cycles and harvest/drop rules before they can be called functional.

### Release conditions and known limitations

- This is an **initial traversable world and atlas expansion**, not a completed ten-city MMO. Shops, banks, interiors, NPC routines and quests at remote hubs are future issues.
- Large world navigation, real enemy territories, legacy quest flow, save compatibility, map projection, landscape 13-inch iPad Safari performance and browser controls must be tested before any deployment.
- In particular, **PR #207's east/west map correction is not yet merged into dev** at the start of this branch; do not silently overwrite its map-projection work or claim that issue fixed as part of #215. Reconcile both PRs before release.
- No new item IDs, recipe definitions, character save schema or combat timing is introduced.
- Merge to `dev` only after complete passing required CI and independent review plus physical iPad Safari sign-off, or an **explicit issue-specific waiver**.
- The Cellbound deployment bridge must then be pinned to the **exact merged dev commit**, upload only `/oakrest-dev/`, verify hosted hashes and ensure `/oakrest/` is unchanged. A merge is not a deployment.
