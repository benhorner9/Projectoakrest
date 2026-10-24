# First Adventure — implementation and acceptance record

Implements #102 on Classic PR #101 (`38d2341`), including its full Blocks 1–7,
character appearance, fortified village and orbit-camera dependency chain.
The playable route is `/oakrest-dev/classic.html`. The original `index.html`
and production are not replaced by this feature branch.

## Playable content

Start with Elowen at (5, 48). Eight sequential quests connect the bank/shop/
forester, three-style training, crafting, a broken cart investigation, a
fight-or-craft guardian decision, the abandoned watch, preparation and the
Hollow. Accept and turn in quests through dialogue; the journal records each
objective and its next location. Training awards owned starter weapons once.

The northern region has resource deposits, two woodland difficulties, a
ruined watch, two optional discoveries and a physical dungeon entrance.
Resource props, paths, walls, actors and minimap use the same coordinates.
Navigation checks complete A* edges, fixing a tree-grazing route failure.

Mining, Blacksmithing, Fletching and Inscription use the existing long-tail
Woodcutting XP curve. Existing Woodcutting uses its established axes, success
rolls, depletion and respawn. Forge bars, weapons, shield, helm and mail; make
ammunition, two spell-scroll families, restoration seals and rations. All
resources are regular inventory/Examine/bank items. Darrin buys surplus timber.
Every Classic magic cast consumes its school's scroll, including defensive
abilities; ranged attacks consume ammunition (three for Rapid Shot).

Warden's Hollow has four chambers, six guardians including an elite and a
three-phase boss, three restorative ward gates, and refuge exits. Weak styles
give a 25% damage-ceiling bonus without immunities. Boss attacks change from
a warned charge to a marked circle to a frontal cleave. First-time and repeat
clears award a heart plus shards; hearts improve existing level-6 weapon
families. Watch supply contracts are limited to one per clear.

Death retains belongings and cleared chambers. Re-entry resumes the run
without consuming another seal. Living enemies reset on re-entry. Completing
the heartstone is idempotent; the next run costs a new seal and clears only
the old dungeon's ground drops. Restoring each chamber ward heals once.

## Saves

An additive, bounded `adventure` field stores quest flags, profession XP,
discoveries, clear records and current run. Existing IDs, equipment slots,
combat XP, save keys and roster ownership are retained. New Classic characters
automatically enable the existing backup/conflict-protected saver; established
practice-only characters keep opt-in behaviour until starting the adventure.
No save is cleared. Do not downgrade an adventure save through an older build
that strips unknown fields; retain the original backup or export first.

## Validation and limits

- Full fresh-character simulation completes all eight quests with actual
  harvesting, crafting, damage, scroll/ammunition consumption, ward unlocking,
  a mid-dungeon save/reload and final turn-in. No injected quest completion or
  monster deaths in that scenario. QA positioning and accelerated simulation
  time are used; this is not a natural-duration human playthrough.
- Separate tests cover all interaction routes, actual death/recovery/re-entry,
  reward idempotency, replay reset, bank/material preservation and interrupted
  crafting. Existing Classic save, creator, HUD, minimap and camera regressions
  remain required.
- `tests/browser-adventure.cjs` creates a new character through the real UI,
  completes the first three quests with real combat/crafting, reloads its save,
  checks all eight journal entries, captures the new region, and checks 1366×1024,
  1180×820 and 1180×600 layouts. It can target the development host with
  `OAKREST_CLASSIC_URL`. This is Chromium touch emulation, not iPad approval.
- The deterministic full new-character dungeon test took about 21 simulated
  minutes. Seeded starter-weapon combat probes for all three styles can clear
  the dungeon; resource use varies greatly by style and positioning. The
  low-level mage can require hundreds of scrolls, and melee needs food. The
  journal explains resupply/re-entry. These are tuning measurements, not
  proof of an enjoyable or balanced natural first clear.
- **Not accepted yet:** 2–4 hours of first-time play, physical iPad Safari
  performance/control quality, independent engineering/gameplay/QA review,
  and natural human timing/balance for all three paths. Terrain uses flat
  walkable surfaces with woodland/creek/ruin dressing; it does not add a new
  elevation/physics system. Enemy sprites reuse the Classic families.
- Public deployment is forbidden. A successful build or PR is not evidence of
  hosted deployment; verify the bridge result, hosted metadata and file hashes.

Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`,
`node tests/browser-adventure.cjs`, and existing Classic/legacy browser suites.
Screenshots are generated under `qa/first-adventure/` and retained in CI.
