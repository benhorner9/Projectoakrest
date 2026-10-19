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
