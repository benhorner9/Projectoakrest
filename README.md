# Project Oakrest — Combat Prototype 0.1

A separate experimental low-poly third-person fantasy action RPG. No Cellbound files or services are reused.

## Currently implemented
- Small low-poly starter village, road, forest, training dummy, hostile mobs and respawns.
- Third-person camera; WASD movement, mouse look, sprint, dodge.
- iPad / touch joystick, camera swipe, attack, dodge and style/ability buttons.
- Melee / Magic / Ranged equipment presets, switch with Tab or 1/2/3.
- Two weapon families for each combat style, each with four distinct abilities (24 total).
- Cooldowns, damage, projectile collisions, shield, heal, slow, root, stun, bleed.
- Independent XP for each style, vitality/health, coins; browser-local saves.
- 7 automated gameplay rules tests. Not an online MMO yet.

## Run and test
Open a terminal in this repository and run `python3 -m http.server 5173`, then open `http://localhost:5173`. Internet connection required for the pinned Three.js CDN. Run `npm test` and `npm run check`.

## Deploy
The prototype is static, no server functions or build step. Import this GitHub repository into Vercel. Framework preset: Other, Build Command: blank; publish repository root with index.html and src/. The game uses an import map to load Three.js from jsDelivr.

## Controls
| Action | Desktop | Touch |
|---|---|---|
| Move | WASD | Left joystick |
| Aim | Mouse | Swipe right half |
| Attack | Left click | ATTACK |
| Four skills | Q E R F | Skill buttons |
| Combat style | Tab or 1 2 3 | Style buttons |
| Dodge | Shift / Space | DODGE |
| Weapon change | Button | Button |

## Future direction
Gear-progression dungeons, potentially style-restricted dungeons, are planned for later. First prove the single-village combat loop is fun. This is a prototype: no multiplayer, server-authoritative gameplay, account login or production asset pipeline yet. Test iPad performance and controls in a real browser before treating the client as ready.

## Mouse-free / iPad controls (0.2)
- Left joystick moves; drag the right side of the scene to look.
- Hold ATTACK for repeated basic attacks at your equipped weapon's attack speed.
- DODGE and SWAP have their own touch buttons; all four abilities and three combat-style buttons remain tappable.
- ⚙ opens the camera sensitivity slider and full input instructions.
- A keyboard without a mouse can use WASD to move, the left/right arrows to rotate the camera, J or Enter to attack, Tab to swap, Q/E/R/F for skills, and Space to dodge.

These are early controls: check comfort on real iPad hardware before considering them final.

## iPad / Safari zoom fix
Safari pinch, double-tap and multi-thumb page zoom are suppressed on the fullscreen gameplay surface without disabling taps, attacks or single-finger camera drag. The camera sensitivity slider remains usable.

## 0.3: MOBA-style mobile combat arc
Touchscreen players have four weapon skills arranged in a right-thumb arc around the large hold-to-attack button. SWAP cycles to the labelled next combat style and DODGE remains beside it. The three-style selector and weapon picker are compacted beneath the health bar; the left movement joystick stays near the bottom-left. Desktop mouse and keyboard controls retain their conventional skill bar.

## 0.4 — Ability progression, armour and equipment requirements
- Each combat style initially has one weapon ability slotted. Weapon abilities unlock at style levels 1, 3, 5, 8; universal style choices at levels 2 and 6.
- Tap **SKILLS** to choose from unlocked abilities and assign four positions per weapon family. Unassigned buttons are marked empty; the game saves builds locally.
- Weapons have minimum combat-style levels (starter 1, alternate family 4, upgraded weapon 6, upgraded alternate 9).
- Armour requires Vitality 1/3/6. Cloth favours mobility/magic, leather protects against physical attacks and benefits ranged combat, plate favours physical defence/melee at the cost of mobility. Each style remembers its armour separately.
- The touch Swap button is now closer to Attack and reacts on the touch press, so the left thumb can keep steering.
- These are test progression gates and starter gear. Loot drops, shops and a complete item economy come later; your existing XP and coins stay saved.

## 0.5 — Skill levels and attack-to-look
- SKILLS → LEVELS shows Melee, Ranged, Magic, Vitality with current level, XP this level, remaining XP to the next level, progress and total XP. Displays MAX LEVEL at 99.
- Holding ATTACK auto-attacks. Sliding the same right thumb left/right turns the camera while Attack and the left joystick continue; pointer capture retains the drag even outside the attack circle. Releasing stops auto-attack.

## 0.6 — In-world character dropdown
The previous full-screen build overlay was replaced by a compact non-modal menu directly attached to the character combat controls. It does not pause rendering or combat. MENU opens four tabs: **Equip** (weapons/armour by current style), **Inventory** (items actually owned, with equip shortcuts), **Skills** (Melee/Ranged/Magic/Vitality levels and progress) and **Abilities** (select and slot unlocked combat skills).
Tap a skill in Skills to open a small detail sheet inside the menu with a level-by-level milestone list showing the abilities that can be learned and weapons/armour that can be worn. Back returns to the menu without covering the game.
Prototype ownership rule: three basic weapons and Traveller Wraps start in inventory; other prototype training weapons and armour are awarded automatically at relevant level milestones. Existing saved XP automatically receives its earned gear, without wiping existing progress. True monster loot, trading, shops and crafting remain future work.

## Combat 2.0 starter-village refinement
- Mosslings mark a small pounce area; boars mark a straight charge lane then rush; bandits warn before a directional cleave. Their warning shapes lock in place at windup, so sidestepping or dodging works. Stuns interrupt warnings.
- Melee attacks have a short three-strike animation/damage rhythm and enemies briefly react to hits; ranged and magic get distinct launch effects. Touch projectile fire gets a small cone of aim forgiveness, never omnidirectional auto-targeting.
- Enemy hits trigger a short red edge flash; dodge cooldown is shown on the button; 3 monster types have individual warning timings.
- Existing enemy victories still give coins and XP and can also award Moss Fibre, Boar Hide or Bandit Tokens in the Inventory menu. Materials are saved with existing character progress but cannot yet be crafted into anything.
- All changes stay in the existing starter village and do not change combat/armour level requirements.

## 0.7 — Real weapon attack speed, wind-up, range and recoveries
Basic attacks now have a weapon-defined start-to-start interval, visible wind-up (impact occurs after the wind-up), and a real recovery clock. Rapid taps cannot bypass the timer; holding ATTACK repeats only when ready. Dodging during wind-up cancels the unreleased hit without refunding its attack recovery. Swapping styles waits for the current wind-up to finish; overall recovery remains shared across styles.
Starter comparison: Twin Daggers 9 dmg / 0.40s / 2.1 range; Iron Longsword 19 / 0.95s / 3.1; Heavy Greatsword 39 / 1.70s / 3.7 (level 7); Hunter Shortbow 13 / 0.68s / 16 (level 3); Oak Longbow 22 / 1.40s / 30; Heavy Crossbow 39 / 2.05s / 12. Frost and Ember magic retain their own rates.
Ranged basic attacks and projectile abilities can no longer travel past their equipped weapon's defined range. The mobile Attack button now displays remaining recovery time and a circular progress ring. The Equip and Inventory views list basic damage, seconds per attack, and reach.

## Visual polish pass 1 — world, lighting and character silhouettes
Procedural low-poly environment upgrade using instanced grass, roadside pebbles, wildflowers, larger rocks, creek, market cart, crops, barrels, crates, directional lighting, sunset sky dome and ambient motes. Cabins have additional foundation, timber frames, roofs and warm windows. Player gains cloak, belt, armour plate, bracers and boots; mosslings, boars and bandits gain readable unique detailing. Materials stay entirely code-generated, with no external textures or large file downloads. The sky and ambient particles animate independently of the core simulation and don't block touch controls.

## Visual polish pass 1 — combat and presentation
Added transient slash-arc and impact-ring meshes, per-projectile glow and cleanup; target bars now have more contrast and colour-coded foes. UI uses a cohesive forest/brass visual theme across HP, XP, quest, skills, ability cluster, joystick, progression menu, notifications, introductory screen and camera controls. Fight effects are short-lived, cleanup meshes to avoid memory leaks, and respect iPad touch hit areas. Reduced motion users get simpler HUD animation.

## 0.9 — Smoother controls and physical monster drops
- Movement is damped at a frame-independent rate: softer starts/stops, eased visual facing, stride-driven walk animations, more natural camera follow and slight enemy idle sway. Joystick and attack direction stay responsive.
- Mosslings, boars and bandits drop visible hovering coin pouches and occasionally materials or equipment on death. Coins/materials are only credited when picked up. XP and quest progression still happen on kill. Walk within 3.3 world units and use the **PICK UP** touch button or **G** on desktop.
- Ground drops are saved in local character storage and restored on reload (up to 36 oldest-first). Equipment stays in inventory even if its level requirement is not met; duplicates convert to 8 coins.
- Migrating an existing save preserves earned milestone equipment. After migration, new equipment is obtained from loot instead of appearing automatically at level-up.

Inventory items discovered ahead of their gear requirements now visibly show their level lock and cannot be equipped until the appropriate skill is trained. On portrait phones, the pickup prompt sits above the action pad rather than colliding with the ability buttons.

## Combat levels and bounded enemy aggression
- Overall Combat Level is now derived (1–99) from strongest Melee/Ranged/Magic skill (65%), Vitality (25%) and the two other offensive skills (5% each). It isn't a separately trainable skill. Shown in the HP HUD and character menu; updates immediately when XP is gained.
- Starter NPC levels: training dummy 1, mossling 2, field boar 5, forest bandit 8. Each gets a world-space level/name label close to the player and its level in the target HUD. Colours indicate relative danger.
- Each enemy has its own detection range, chase/abandon range and absolute leash radius from spawn. When the player flees too far the mob cancels queued damage and charges, resets HP and returns quickly to its spawn before it can re-aggro. No more endless trains of mobs after you leave their area.

## Character creation and browser-local character slots (development)
- On the first visit with no existing save, the game opens character creation. Choose a name, Male/Female, six hairstyles, hair colour, skin tone, clothing design and clothing colour; inspect the avatar in a live 3D preview.
- Up to three independently saved characters per browser and game environment. Choose **CHARACTERS** on the title screen to load another character or create an additional one. Names are unique within this browser's three slots.
- Newly created characters begin at Level 1 with zero coins, an empty inventory, no weapons and no armour. Clothing choices are cosmetic and give no protection. Unarmed Melee is available for the current prototype; Magic and Ranged require equipment.
- The original `oakrest-v1` save is preserved, and a **Continue Original Save** option remains available. New characters are stored separately as `oakrest-character-save-<id>`, with a small roster and active-character pointer. At `/oakrest-dev` all keys are namespaced to protect public progress.
- Saves are browser-local only: different devices or browsers do not yet share characters, and clearing browser storage deletes local characters. Accounts and online persistence come later.
- The dedicated tutorial and Portal Realm onboarding are **not part of this block**; the current starter village remains the temporary gameplay entry point.
- QA: `npm test`, `npm run check`, `npm run build`, `node tests/browser-smoke.cjs`. Browser testing in CI is Chromium emulation, not physical iPad testing.
- Deployment note: commit this code to the GitHub development branch and deploy it through the shared-hosting pipeline for `playcellbound.com/oakrest-dev`; no Vercel deployment is required or intended for this workflow.

## Part 3 — Opening Journey: tutorial and Portal Realm
- New characters only enter the safe standalone **The First Steps** training ground. Older characters and legacy `oakrest-v1` saves continue from their existing world and are not reset.
- Practise on a real training dummy using all **three** direct-action styles. Hits must connect to complete each style; Tab, 1/2/3, touch style buttons and SWAP work. The practice sword, staff and bow are temporary visual loadouts and never enter the player's inventory.
- The Skills Instructor section gives an explicit overview of Health, Melee, Magic, Ranged, gathering, crafting and Inscription. Gathering/crafting systems remain future features, but the introduction has a fully working acknowledgement step.
- Claim a single **Teleportation Scroll**; the item count is stored in onboarding progression and shown in Inventory. Using it consumes one and transfers the character to a separate, navigable 3D **Portal Realm**.
- The realm shows one active gateway to **Oakrest**, with additional locked gateways. Approach the active gateway and use the on-screen interaction button (or E on desktop) to travel to the existing Oakrest starter settlement. This existing village is the provisional first-city arrival point until the main-city overhaul.
- Tutorial progress, scroll balance, current world (tutorial/realm/world) and activated city portal are saved per character. Reloading during onboarding resumes the appropriate stage without granting free repeat scrolls.
- Independent scenes are built from bundled Three.js without outside images, video assets or new infrastructure. Gameplay is functional on touch and desktop; iPad Safari requires manual device validation.
- Validate with `npm test`, `npm run check`, `npm run build` and `node tests/browser-smoke.cjs`. Browser smoke covers real attack connections, skills, receiving/consuming the scroll, city portal interaction and saved completion.
- No Vercel deployment is needed or intended. Shared-host deployment of `/oakrest-dev` is a separate step and **not confirmed** by a GitHub commit or CI green check.

## Part 4 — Item Catalogue, Item Art & Monster Drop Editor
- Central stable IDs in `src/items.js` for existing currency, all current weapons, armour, materials and the tutorial travel scroll. Every registered item has a unique, bundled SVG inventory icon; the matching physical ground model is generated in `src/item-visuals.js`, with no external image hosting. Equipped variants that share a weapon family also have distinct colour/rune detail.
- Existing save data keeps its original `kind`, `itemId`, `style` and `amount` fields; canonical IDs are a non-destructive view over the old format. Existing drops and inventories remain readable.
- Monster drop rules are in `src/drop-tables.js`. Every row is rolled independently on every kill; chances are percentages from 0 to 100 (two decimals), **without pity guarantees, required total of 100, or forced drops**. Default tables retain existing coin/material/rare-gear odds. An empty table can drop nothing.
- On `/oakrest-dev` or localhost only, open the in-game **Controls & Camera** menu, then **Edit Monster Drops (Dev)** to select a monster, add/remove item rows, edit probabilities, reset to defaults, save changes or view the full item catalogue. Invalid IDs, duplicate entries and invalid probabilities are rejected.
- Editor changes are stored **only in the current browser's development localStorage** using the environment-specific key `oakrest-dev-drop-tables-v1`. Saving an editor change alters subsequent monster kills in that browser, not drops for other visitors, devices or a future multiplayer server. Public `/oakrest` deliberately has no editor and uses built-in default tables. Persisted developer overrides can be cleared using the editor reset/save controls; storage migration is not needed.
- Run `npm run check`, `npm test`, `npm run build` and `node tests/browser-smoke.cjs`. New tests cover the full item catalogue, unique artwork, physical models, legacy save compatibility, edited tables, 1% independent odds with no pity, invalid entries and local UI save/reload.
- Not yet covered: new metal/robe/leather tier catalogues, custom boss items, merchant/bank screens, server-authoritative drop editing and distribution across players. These are future content/online features.
- **Hosting:** no Vercel delivery is requested. The shared-host `playcellbound.com/oakrest-dev` deployment must be independently verified; GitHub CI success is not proof it is live. Production branch stays untouched.
