# Block 4 progression and farming evidence

Candidate base: `9252471234af51f71b37de8f119dc35a14c92fec` (current dev when implementation started). Issue #167.

## Method and limits

`node scripts/measure-progression.mjs docs/balance/block4-after.json` runs 40 seeded fights for each of 36 combinations (1,440 fights): three styles, starter level 1, starter level 6, upgraded level 6, and four encounter definitions. The actual fixed-step Classic simulation resolves attacks, hits, XP, food, potions and ammunition. The signature ability is used when available. A single enemy is relocated to a clear common arena. The player stays close and follows only to remain in range; it does not dodge, kite, use other abilities or switch for weaknesses. The Keeper retains its phases but is tested without room gates or other guardians.

XP/hour is a **kill-time-only projection**, excluding respawns, travel, gathering, deaths and player decisions. Food use is a stationary-fighting stress case, not a recommended play pattern. No hardware/performance claim. A first harness location was obstructed and produced no attacks; those invalid results were discarded. The corrected controller has a zero-win guard and per-style real-combat regression.

Before and after use the same harness against the base and candidate respectively. Their combat rows are identical because this change does not alter damage, hit rates, cooldowns, combat XP, equipment requirements or the 600 ms schedule. All 1,440 scenarios per version won with the supplied consumable reserves.

## Early combat, level 1 starter weapons

| Enemy | Style | Mean kill seconds | Kill-only style XP/hour | Scrolls / arrows | Rations | Tonics |
|---|---|---:|---:|---:|---:|---:|
| moss-a | melee | 14.29 | 7558 | 0.00 | 0.03 | 0 |
| moss-a | magic | 15.33 | 7045 | 14.60 | 0.03 | 0 |
| moss-a | ranged | 19 | 5684 | 11.82 | 0 | 0 |
| boar-a | melee | 31.39 | 5276 | 0.00 | 0.42 | 0 |
| boar-a | magic | 35.34 | 4686 | 33.67 | 0.65 | 0 |
| boar-a | ranged | 38.46 | 4306 | 23.45 | 0.7 | 0 |
| bandit-a | melee | 57.17 | 4723 | 0.00 | 2.55 | 0 |
| bandit-a | magic | 63.68 | 4240 | 60.52 | 2.73 | 0 |
| bandit-a | ranged | 79.53 | 3395 | 48.05 | 3.67 | 0 |

Mosslings pay 30 style XP and 16 Health XP. Boars pay 46/25; bandits 75/41; Keeper 350/192. Existing combat level thresholds are 110 total XP for level 2, 265 for level 3, and 1,000 for level 6: for example, 4, 9 and 34 mossling victories respectively if training only that style. This is a count projection, not a natural-duration progression claim.

## Preparation correction

Starter frost consumes 14.60 scrolls per mossling versus 11.82 arrows. A former 30-scroll batch required 2 reeds plus a log; 30 arrows need only a log. Magic therefore spent more supplies and more gathering inputs. Frost and ember recipes now yield **60 scrolls** for the same inputs and 18 XP. This halves gathering inputs per spell without accelerating Inscription XP per input. Frost is the measured representative; ember uses the same existing three-input batch architecture and follows the same supply-yield correction, not an inferred damage rebalance.

As a transparent projection, a ten-minute single-mossling camp with 12-second respawns needs about 321 frost scrolls or 229 arrows at these starter means. Rounded to full crafts: frost preparation falls from 11 batches (22 reeds + 11 logs) to 6 (12 reeds + 6 logs); arrows stay at 8 batches (8 logs). Travel, misses between attempts, tree depletion, food gathering and player delays are additional.

Five-batch crafting multiplies inputs, output, XP and forge duration exactly; it saves repeated input, not simulation time. Five-resource Mining/Foraging runs preserve per-resource time and the 3-second deposit recovery. Moving away, damage, cancellation, full stacks or a full bag stop work. Woodcutting rates and progression are unchanged.

## Equipment payoff at level 6

| Encounter | Style | Starter seconds | Upgrade seconds | Faster |
|---|---|---:|---:|---:|
| bandit-a | melee | 35.01 | 27.72 | 20.8% |
| bandit-a | magic | 40.27 | 35.38 | 12.1% |
| bandit-a | ranged | 45.79 | 40.32 | 11.9% |
| hollow-keeper | melee | 213.61 | 176.48 | 17.4% |
| hollow-keeper | magic | 240 | 220.27 | 8.2% |
| hollow-keeper | ranged | 288.41 | 243.49 | 15.6% |

The existing Forged Longsword, Runic Frost Staff and Reinforced Longbow already improve real kill times. The change makes their farming goals, level requirements, bag/bank material counts and basic-hit improvement visible. It does not change their power. Bank-owned equipment is recognised and duplicate crafting remains forbidden.

Ranged is slower in this close, stationary test, but its 30 m starter reach and movement advantage are not represented. This evidence does not justify removing that tradeoff or changing global XP/hit rates. Broader natural play and physical iPad feel remain acceptance work.

## Useful resources and repeat rewards

- Boar hides: existing Hardened Leather (Fieldcraft 3) and Bronze Arrows equipment quiver (Fletching 2). The quiver bonus and consumable ammunition remain separate.
- Moss fibre: existing Apprentice Robes (Inscription 2), Apprentice Focus (Inscription 2, plus one Hollow shard), scrolls and tonics.
- Bronze bars + one shard: existing shared Wayfarer Amulet (Blacksmithing 3). One owned amulet can serve all three loadouts.
- Bandits now offer Ember Wand at 19%, and Runic Frost Staff/Reinforced Longbow at 9% each, matching existing crossbow/forged-sword opportunities. Rows roll independently. Old weights and coin values are unchanged. Once those additional items are owned, expected additional duplicate salvage is 2.96 coins per bandit; no rarity/pity scheme was introduced.
- Five guaranteed bandit tokens buy one supply pack from Elowen: 30 arrows, 60 frost scrolls, 60 ember scrolls, or 3 rations. This consumes existing tokens, grants no combat/profession XP, and has atomic bag/cap checks.
- Hollow still guarantees one heart + four shards at the heartstone, with six additional shards available by picking up guardian drops. Its three existing upgraded-weapon recipes each use one heart and four shards; new focus/amulet recipes give collected spare shards a purpose. Once-per-clear watch contracts remain 2 shards for 35 coins + 3 rations. No completion or quest reward is made repeat-claimable.

## Validation and release boundary

Regression coverage includes all three styles and power gains, each new equipment recipe, each bounty, craft batch count/cost/output/XP, interruption, deposit recovery, capacity and stack caps, bank ownership, duplicate salvage, repeat rewards and reload. Desktop and 1194×834 touch-emulated browser flows use real buttons for batch crafting, seven equipment recipes, gathering, bounty redemption, reward goals and separate-character save protection. Full First Adventure and equipment/bank flows are retained.

Local check/test/build and browser outcomes are recorded in the PR; CI must run on the exact published candidate before integration. No new save fields or namespaces. UI structure, nine slots and eight quick slots are retained. New UI is rendered only when its existing panel/dialogue is opened; no new render-loop effects or assets.

Independent engineering/UX/QA review and physical iPad Safari signoff are not manufactured by this authoring session. Deployment must use the Cellbound shared-host bridge after reviewed dev integration. A successful candidate CI is not hosted verification. Production is outside this assignment.

Rollback: revert the Block 4 change; all item IDs and saves predate this feature. Existing earned items remain compatible. Reverting restores old recipe yields and removes new exchanges/recipes/guidance without deleting player resources.
