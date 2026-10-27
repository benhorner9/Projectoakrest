/** Oakrest Classic combat movement policy. Movement does not require a
 * permanent target lock: a small adjustment stays in combat, but a deliberate
 * long ground click or sustained outward movement breaks attack intent.
 * These are input decisions; the enemy's aggro and leash remain separate.
 */
export const COMBAT_GROUND_REPOSITION_DISTANCE=3.25;
export const COMBAT_MANUAL_RETREAT_DISTANCE=1.45;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);

/** Attack-on-click approach still stops inside the actual weapon reach. */
export function combatApproachPoint(player,enemy,reach){
 const dx=enemy.x-player.x,dz=enemy.z-player.z;
 const length=Math.hypot(dx,dz);
 if(!Number.isFinite(length)||!Number.isFinite(reach)||reach<=0)return null;
 const standOff=Math.max(.75,reach-.45);
 if(length<=standOff)return null;
 return {x:enemy.x-dx/length*standOff,z:enemy.z-dz/length*standOff};
}
/** A nearby ground tap repositions; a long tap is an immediate escape order.
 * Explicit interactions and Escape still cancel without a threshold.
 */
export function breaksPlayerAttackIntent(movement,{player,target,destination}={}){
 if(!target||movement?.kind!=='path')return false;
 if(!validPoint(player)||!validPoint(destination))return false;
 return distance(player,destination)>COMBAT_GROUND_REPOSITION_DISTANCE;
}
/** Continuous away travel—not a single joystick touch—signals retreat.
 * Accumulates outward travel against the target from real movement samples.
 * Circle-strafing maintains distance, while returning toward a target cancels
 * earlier retreat progress. A chasing enemy cannot prevent deliberate escape.
 */
export function createClassicCombatMovementIntent({retreatDistance=COMBAT_MANUAL_RETREAT_DISTANCE}={}){
 let outwardTravel=0;
 const reset=()=>{outwardTravel=0;};
 function step({movement,start,end,target}={}){
  if(movement?.kind!=='manual'||!validPoint(start)||!validPoint(end)||!validPoint(target)){
   reset();return false;
  }
  const dx=end.x-start.x,dz=end.z-start.z,travel=Math.hypot(dx,dz);
  if(travel<.0001)return false;
  const ex=start.x-target.x,ez=start.z-target.z,radius=Math.hypot(ex,ez);
  if(radius<.15){outwardTravel=0;return false;}
  const outward=(dx*ex+dz*ez)/radius;
  outwardTravel=Math.max(0,outwardTravel+outward);
  if(outwardTravel>=retreatDistance){reset();return true;}
  return false;
 }
 return {step,reset,get outwardTravel(){return outwardTravel;}};
}
