# Oakrest Classic — named World Atlas (Block 2, stage 1)

**Source of truth:** `src/classic-world-atlas.js` indexes live gameplay sources; it is not a second scene or fake map overlay. See [issue #162](https://github.com/benhorner9/Projectoakrest/issues/162) and [PR #191](https://github.com/benhorner9/Projectoakrest/pull/191).

## Game Director workflow — no code required

1. Open **Oakrest Classic** → **MAP** in the right sidebar.
2. Use the **AREA** dropdown to jump to an existing named region, or tap **Inspect map** and then tap that area on the full map. Inspect mode highlights a zone **without moving your character**. Press it again to resume ordinary **tap-to-walk**.
3. Read the zone name, its permanent ID, NPC/enemy counts and a short description.
4. Tap **Copy area brief** to get a location-specific human-readable prompt, or **Copy JSON** for a structured reference. If Safari prevents clipboard access, expand **Read or manually copy the brief** and select the text there.
5. Paste the reference into ChatGPT and say what you want changed. Example: "In `OAK-WD-002` Alderwood, make the woodland road more curved while preserving `adventure:cart` and the quest path."
6. The generated brief only *describes* the world. It **does not edit, save, or publish** gameplay code. A code change still needs a PR, CI, merge and verified development deployment.

## Immutable ID registry in this stage

| ID | Live area | Real map coordinates |
|---|---|---|
| `OAK-VL-001` | Oakrest Village / outskirts | x −53..53, z −24..86 |
| `OAK-WD-001` | Gate meadows | x −53..53, z 86..105 |
| `OAK-WD-002` | Alderwood | x −53..53, z 105..130 |
| `OAK-WD-003` | Whispering wood | x −53..53, z 130..150 |
| `OAK-WD-004` | The Last Watch | x −53..53, z 150..174 |
| `OAK-WD-005` | Hollow approach | x −53..53, z 174..210 |
| `OAK-DG-001` | The Root Vestibule | x −17..17, z 210..241 |
| `OAK-DG-002` | The Drowned Archive | x −17..17, z 241..269 |
| `OAK-DG-003` | The Broken Watch | x −17..17, z 269..297 |
| `OAK-DG-004` | The Heart Chamber | x −17..17, z 297..329 |

These are cartographic envelopes, **not collision polygons**. The village boundary includes potentially dangerous outer strips; the safe/combat rules still come from the original combat/navigation services and are not replaced by metadata. Unwalkable space outside dungeon chambers is not a new content zone. Existing world extent remains x −53..53, z −24..334.

## Entity references

The registry derives entity IDs from **existing authoritative data**:
- `service:bank`, `service:store`, `service:forester`, `service:trade-house`
- `building:bank` and other actual building IDs; `gate:north`, `gate:south`, `gate:east`, `gate:west`
- `adventure:cart`, `adventure:softwood`, `adventure:entrance`, `adventure:heart`, etc.
- `npc:guard` and other actual civilian/service actor IDs
- `spawn:moss-a`, `spawn:boar-a`, `spawn:tusk`, `spawn:hollow-keeper`, etc.

There is intentionally no `Bracken Boar Farm` entity, fence, gate, farmer or boar group here yet. Those belong to **Block 8** after terrain/collision/combat dependencies are ready. The currently placed `boar-a` at (1,91) has **not been moved** by the atlas migration.

### Compatibility, verification and limitations

- The five ordinary monster spawn definitions were moved into a read-only shared module, consumed by both combat and the Atlas. Their original IDs/positions/HP were preserved exactly.
- Region names shown by the location card, selected map highlights, area briefs and JSON use the same `CLASSIC_WORLD_ZONES`. Enemies, quests, inventory, skills, save schema, collisions and walking bounds remain authoritative in their existing runtime modules.
- The code exports read-only `worldZoneBlueprint()` JSON with `mode:'reference-only'` / `editable:false`. It cannot push to GitHub or write to the server and does not grant administrative privileges. No unauthenticated owner editor or fake publishing controls.
- `validateWorldAtlas()` rejects malformed boundaries, duplicate zone/entity IDs, invalid links, overlaps and entities outside known areas before later schema expansions are considered.
- Acceptance checks include `tests/classic-world-atlas.test.js` and `tests/browser-classic-world-atlas.cjs` across 1194×834, 1024×768 and 1180×600; all other mandatory Classic browser/CI gates still apply.
- Physical 13-inch iPad Air Safari hardware and sustained frame timing must be separately tested; Chromium/WebKit emulation is not hardware validation.

**Release contract:** Issue-scoped PR to `dev`, successful full CI and independent review or separately scoped waiver, exact-SHA Cellbound dev-only FTPS bridge, hosted build/asset integrity, public release byte-identity. A previously issued waiver for an earlier block is not a standing waiver.

## Later stages (not delivered in this stage)

**Block 3** improves the real terrain, city NPC life, building collision and pathways. **Block 8** implements the real Bracken Boar Farm and a secure, reviewable map-editing workflow. **Block 9** supplies owner account/authenticated publishing and durable server-backed progression. Those are not simulated by this atlas.
