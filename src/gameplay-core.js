/**
 * Block 1: renderer-agnostic combat/progression rules.
 *
 * Do not import Three.js, DOM, browser storage, or audio here. The existing
 * third-person shell and future 2.5D shell must receive identical results.
 * Keep effects such as toasts, HUD refreshes, HP presentation and saving in
 * the calling shell.
 */
import {XP_BY_MOB, levelFromXp, skillCatalogue, outgoingMultiplier} from './rules.js';
import {equipmentModifiers} from './equipment-slots.js';
import {maxHitFor} from './auto-combat.js';

/**
 * Snapshot the equipped style's damage inputs at attack time. Does not depend
 * on a model, weapon attachment, aim camera or render frame.
 */
export function combatSourceSnapshot(data, style, weapon) {
  const level=levelFromXp(data.xp[style]).level;
  const weaponBasic=weapon.basic;
  const power=outgoingMultiplier(data.armour[style],style)*equipmentModifiers(data,style).power;
  return {style,level,power,weaponBasic,maxHit:maxHitFor(level,weaponBasic,power)};
}

/**
 * Apply the same rewards formerly computed inside main.js.
 * Mutates only the persisted gameplay save, and returns events for the shell
 * to display. No save format, XP rate, level or quest threshold changes.
 */
export function awardMonsterVictory(data, type, sourceStyle, encounterXp=XP_BY_MOB[type]??0) {
  // Encounter XP can differ from the base monster family (Hollow bosses).
  // Reject invalid values; keep old callers and non-adventure balance intact.
  const val=Number.isSafeInteger(encounterXp)&&encounterXp>0&&encounterXp<=10000?encounterXp:0;
  if(!val)return {awarded:false};

  const oldLevel=levelFromXp(data.xp[sourceStyle]).level;
  const oldVital=levelFromXp(data.xp.vitality).level;
  data.xp[sourceStyle]=Math.min(200000000,data.xp[sourceStyle]+val);
  data.xp.vitality=Math.min(200000000,data.xp.vitality+Math.floor(val*.55));

  const newLevel=levelFromXp(data.xp[sourceStyle]).level;
  const newVital=levelFromXp(data.xp.vitality).level;
  const unlocked=newLevel>oldLevel
    ?skillCatalogue(sourceStyle,data.gear[sourceStyle])
      .filter(a=>a.requiredLevel>oldLevel&&a.requiredLevel<=newLevel)
      .map(a=>a.name)
    :[];

  data.defeated++;
  return {
    awarded:true,
    amount:val,
    style:sourceStyle,
    oldLevel,
    newLevel,
    oldVital,
    newVital,
    unlocked,
    vitalityHealthBonus:8*(newVital-oldVital),
    firstChallengeReached:data.defeated===3
  };
}
