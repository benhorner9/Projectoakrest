export {accuracyFor} from './osrs-combat-math.js';
/** Deterministic, renderer-free combat rules for Oakrest's levelled auto-attacks. */
export const COMBAT_ACQUIRE_RANGE=30;
export const COMBAT_LEASH_RANGE=38;
const bounded=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));

/** Weapon basic is a power rating, not a guaranteed amount of damage.
 * Level and equipped power increase the damage ceiling independently. */
export function maxHitFor(level,weaponPower,equipmentMultiplier=1) {
 const lv=bounded(level,1,99),power=bounded(weaponPower,0,200),gear=bounded(equipmentMultiplier,.1,3);
 if(power===0)return 0;
 return Math.max(1,Math.floor((3+power*.55+lv*(.15+power*.005))*gear));
}
/** First roll tests accuracy; only a successful roll consumes a damage roll.
 * RNG injection supports exact boundary tests and statistical simulations. */
export function rollHit({maxHit,accuracy,random=Math.random}){
 const maximum=Math.max(0,Math.floor(Number.isFinite(maxHit)?maxHit:0));
 const chance=bounded(accuracy,0,1);
 if(maximum===0||bounded(random(),0,1)>=chance)return {hit:false,damage:0};
 return {hit:true,damage:1+Math.floor(bounded(random(),0,1-Number.EPSILON)*maximum)};
}
export function maxHitForAction(basicMax,weaponPower,attackPower){
 if(!Number.isFinite(attackPower)||!Number.isFinite(weaponPower)||weaponPower<=0)return 0;
 return Math.max(1,Math.floor(basicMax*bounded(attackPower/weaponPower,.05,4)));
}
/** Target acquisition prefers the crosshair, then closer visible mobs.
 * No auto-retarget on death: the player must choose the next fight. */
export function acquireEnemy(enemies,origin,heading,visible=()=>true,maxRange=COMBAT_ACQUIRE_RANGE){
 let best=null,score=-Infinity;
 for(const enemy of enemies){
  if(enemy.dead||enemy.hp<=0||enemy.retreating)continue;
  const dx=enemy.x-origin.x,dz=enemy.z-origin.z,dist=Math.hypot(dx,dz);
  if(dist>.01&&dist<=maxRange&&visible(enemy)){
   const dot=(dx*heading.x+dz*heading.z)/dist;
   const scoreNow=dot*12-dist*.16;
   if(scoreNow>score){score=scoreNow;best=enemy;}
  }
 }
 return best;
}
export function targetValid(enemy,enemies,origin,maxRange=COMBAT_LEASH_RANGE){
 return Boolean(enemy&&enemies.includes(enemy)&&!enemy.dead&&!enemy.retreating&&enemy.hp>0&&
  Math.hypot(enemy.x-origin.x,enemy.z-origin.z)<=maxRange);
}
export function inAttackRange(origin,enemy,reach,clear=true){
 return Boolean(enemy&&reach>0&&clear&&Math.hypot(enemy.x-origin.x,enemy.z-origin.z)<=Math.max(.5,reach-.1));
}
