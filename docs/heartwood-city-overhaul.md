# Oakrest — the Heartwood City

## Goal and non-negotiables

Oakrest is the first complete city of the game, not an all-skills lobby. The player should recognise it by its great oak, guarded stone gates, warmly lit limestone-and-timber buildings, and human-scale public places. Inspired by the *quality* of classic RuneScape city planning, not by copying Falador's map, models, text or signs. All buildings presented as usable have real accessible interiors.

No alteration of the public /oakrest deployment. Keep the bank's persisted vault and inventory grid, the general store, Forester's Lodge, loadouts, combat and the Portal Realm route.

## District sketch (not a pathfinding map)

\`\`\`
                           NORTH / FOREST ROAD
                                   |
                        [Northgate at z=86]
                                   |
               +-------------------+------------------+
               | Warden's Hall     |   Green park     |
               |  + archive/steward|     and pond      |
               |  x=-30, z=76     |   x=12..22,z=63   |
               |                   |                  |
               |  Woodcutting     [Garden Quarter]   |
               |  lodge -30,46     |  Workshop 29,58  |
               |                   |                  |
               +--------- [HEARTWOOD OAK] -----------+
               |      Historic market square         |
               |               z=39                  |
               | homes              |   homes         |
               |                    |                 |
               | OAKREST BANK ---- OLD WELL ---- SHOP|
               | -30,14          (6,19)         30,14|
               |               main road             |
               +---------- SOUTHGATE ----------------+
                           z=-13
                              |
                    PEACEFUL OUTSKIRTS
                              |
                    BEGINNER WILDERNESS
\`\`\`

### What the code changes

- **Heartwood Square:** living tree landmark with roots, distinct broad crown, benches, noticeboards, planted urns and warm lights. The ring remains traversable; trunk is solid.
- **Gate and walls:** twin freestanding guard towers at both entrances, green/bronze banners, pale stone battlements, stronger outer silhouettes. The old south-gate road remains open.
- **Extra accessible streets:** branch to the north civic hall, garden residence and terraced homes. An old civic hall is now fully enterable, like every other building.
- **Architectural storytelling:** differentiated bank/store/forester signs, window trim, distinct rooflines, bookshelves, fireplaces, furnishings and hall dais.
- **Population:** existing named banker, shopkeeper and forester; expanded resident routines, gate guards, steward and park gardener. Simple grounded dialogue and pauses give occupations a purpose.
- **Atmosphere:** low-poly birds, sparse chimney smoke, moving banners, fallen leaves, lanterns and small garden details. Animated meshes deliberately stay out of static geometry batching.
- **Visual continuity:** keep all established item screens, combat training, weather-free daytime lighting, menus, camera modes and saves.

## Manual walkthrough / acceptance checklist

1. Start a new character, reach Oakrest through the existing Portal Realm and see the Southgate and a clear route through it.
2. Follow the road north. Reach an unmistakable tree in Heartwood Square; walk around the trunk. No collision with invisible decorative clutter.
3. Observe residents walking and stopping. Speak to a guard, gardener and ordinary resident. NPCs must not clip through city buildings.
4. Enter the bank, withdraw/deposit and verify that items persist after reload. Do the same for shop purchases. Interactions happen at the actual indoor staff counters.
5. Enter and exit the residences, old guardhouse, new civic hall, forester and northern workshop. Roof hiding must work in both camera modes.
6. Walk from square to the civic hall and north gate, returning through the green district. Ensure pathways do not terminate in solid walls.
7. Travel to the training pines and gather logs. The starter skill cap and distributed-skilling design remain unchanged.
8. Leave south to the safe greenbelt and then fight a beginner enemy. No newly moved enemy spawns beside the gate.

## Automated QA

- **Source/unit:** npm run check; npm test, including city landmark, district metadata, entrances, collision, NPCs, town services.
- **Browser:** town integration test captures actual Chromium landscape screenshots at Southgate, square and Warden Hall. Existing bank/shop/Forester, movement, inventory, controller, onboarding, combat and reload tests remain required.
- **Performance:** run existing baseline-comparison browser script and review draw calls, geometries, FPS and runtime errors.
- **Build/release:** use only the reviewed dev merge commit in the separate Cellbound FTPS deployment bridge; target \`./oakrest-dev/\` only and compare public files before/after upload.

### Evidence limitations and follow-ups

Automatic software-rendered Chromium/WebKit screenshots and scripted tests cannot establish a true iPad Air Safari 60 FPS performance result or judge the subjective art direction. Physical iPad landscape and portrait testing remains a separate signoff. There is no true server-managed NPC day/night schedule or multiplayer simulation: deterministic local routines are implemented and can be expanded incrementally.

### Deferred, deliberately outside scope

Multiple new towns, universal profession services, advanced loot, endgame gear and dungeons, large quest chains, complex indoor upper floors and full persistent MMO NPC simulation. Complete the starter city's existing interactivity first.
