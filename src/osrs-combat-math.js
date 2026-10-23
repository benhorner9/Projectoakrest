/** RuneScape-inspired opposed attack/defence rolls for Oakrest PvE.
 * This is an original adaptation of the publicly documented two-roll idea,
 * NOT Jagex code, animation, data or the RuneScape 0.6-second game tick.
 * Keep contact, movement, style swapping and recovery in Oakrest's action engine.
 */
const clamp=(number,min,max)=>Math.max(min,Math.min(max,Number.isFinite(number)?number:min));

/** Higher skill, weapon power and equipped bonuses improve attack consistency.
 * A base attack bonus keeps starter monsters approachable without guaranteeing hits.
 * Values are Oakrest tuning parameters rather than RuneScape item statistics. */
export function attackRating(level,weaponPower,gearMultiplier=1){
 const skill=Math.floor(clamp(level,1,99))+8;
 const power=clamp(weaponPower,0,200);
 const accuracyBonus=45+(power-19)*1.4;
 return Math.floor(skill*(64+accuracyBonus)*clamp(gearMultiplier,.5,2));
}

/** Defensive skill and armour/monster guard oppose the attack roll.
 * Guard is a fraction (e.g. .08), not an OSRS item stat. */
export function defenceRating(level,guard=0){
 const skill=Math.floor(clamp(level,1,999))+8;
 return Math.floor(skill*(64+clamp(guard,0,.45)*180));
}

/** Two-branch RuneScape-style opposed roll curve (inclusive integer rolls).
 * Evenly matched rolls have approximately a 50% chance to connect. */
export function opposedHitChance(attack,defence){
 const a=Math.max(0,Math.floor(Number.isFinite(attack)?attack:0));
 const d=Math.max(0,Math.floor(Number.isFinite(defence)?defence:0));
 if(a===0)return 0;
 return a>d?1-(d+2)/(2*(a+1)):a/(2*(d+1));
}

/** Keep the existing PvE floor/ceiling to prevent impossible fights or 100% hits.
 * The core attack/defence comparison is symmetrical for all three player styles. */
export function accuracyFor(level,enemyLevel,weaponPower,enemyGuard=0,gearMultiplier=1){
 return clamp(opposedHitChance(
  attackRating(level,weaponPower,gearMultiplier),
  defenceRating(enemyLevel,enemyGuard)
 ),.16,.97);
}
