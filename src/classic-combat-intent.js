/** RuneScape-inspired Classic combat: attack by selecting a creature, move to
 * leave combat. This pure policy has no camera, DOM or save dependencies.
 */
export function combatApproachPoint(player,enemy,reach){
 const dx=enemy.x-player.x,dz=enemy.z-player.z;
 const distance=Math.hypot(dx,dz);
 if(!Number.isFinite(distance)||!Number.isFinite(reach)||reach<=0)return null;
 // Stop a little inside reach; never move to the NPC's occupied centre.
 const standOff=Math.max(.75,reach-.45);
 if(distance<=standOff)return null;
 return {x:enemy.x-dx/distance*standOff,z:enemy.z-dz/distance*standOff};
}
export function breaksPlayerAttackIntent(movement){
 return movement?.kind==='manual';
}
