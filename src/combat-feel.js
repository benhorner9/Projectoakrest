/** Third-person combat geometry and enemy behaviours, kept outside Three.js for tests. */
export const ENEMY_PATTERNS={
 mossling:{kind:'pounce',windup:.55,cooldown:2.6,engage:3.1,damage:7,radius:1.75,description:'Mossling pounce'},
 boar:{kind:'charge',windup:.86,cooldown:3.8,engage:6.2,damage:12,length:6.0,width:1.2,chargeSpeed:10,description:'Boar charge'},
 bandit:{kind:'cleave',windup:.76,cooldown:3.25,engage:3.25,damage:16,radius:3.25,halfAngle:.69,description:'Bandit cleave'}
};
/** Levels and cautious, spawn-bound aggro behaviour for the starter creatures. */
export const ENEMY_COMBAT={
 dummy:{level:1,name:'Training Dummy',sight:0,leash:0,disengage:0,returnSpeed:0},
 mossling:{level:2,name:'Mossling',sight:5.8,leash:10,disengage:9,returnSpeed:3.6},
 boar:{level:5,name:'Field Boar',sight:6.9,leash:12,disengage:10,returnSpeed:4.2},
 bandit:{level:8,name:'Forest Bandit',sight:7.8,leash:14,disengage:12,returnSpeed:4.4}
};
export function enemyThreatTier(enemyLevel,playerCombatLevel){
 const gap=enemyLevel-playerCombatLevel;
 return gap>=3?'danger':gap<=-3?'easy':'even';
}
/** Pure state transition: starts pursuit close to spawn and forcibly leashes it. */
export function enemyBehaviour(type,monster,player,engaged=false){
 const spec=ENEMY_COMBAT[type];
 if(!spec||type==='dummy')return 'idle';
 const home=Math.hypot(monster.x-monster.startX,monster.z-monster.startZ);
 const heroHome=Math.hypot(player.x-monster.startX,player.z-monster.startZ);
 const playerDistance=Math.hypot(player.x-monster.x,player.z-monster.z);
 if(home>spec.leash || engaged&&(playerDistance>spec.disengage||heroHome>spec.leash))
   return 'retreat';
 if(engaged)return 'pursue';
 if(home>.35)return 'return';
 return playerDistance<=spec.sight&&heroHome<=spec.leash?'acquire':'idle';
}
export function isThreatened(kind,warning,target){
 const dx=target.x-warning.x,dz=target.z-warning.z;
 if(kind==='pounce')return Math.hypot(dx,dz)<=warning.radius;
 const dir=warning.direction||{x:0,z:-1};
 const along=dx*dir.x+dz*dir.z,side=Math.abs(dx*dir.z-dz*dir.x);
 if(kind==='charge')return along>=-.4&&along<=warning.length&&side<=warning.width;
 if(kind==='cleave')return along>=0&&Math.hypot(dx,dz)<=warning.radius&&along/Math.max(.001,Math.hypot(dx,dz))>=Math.cos(warning.halfAngle);
 return false;
}
export function combatAim(origin,heading,enemies,reach,halfAngle=.24){
 const cos=Math.cos(halfAngle);
 let best=null,bestScore=Infinity;
 for(const e of enemies){
  if(e.dead||e.hp<=0)continue;
  const dx=e.x-origin.x,dz=e.z-origin.z,dist=Math.hypot(dx,dz);
  if(dist<.1||dist>reach)continue;
  const dot=(dx*heading.x+dz*heading.z)/dist;
  if(dot<cos)continue;
  const score=(1-dot)*8+dist*.004;
  if(score<bestScore){best=e;bestScore=score;}
 }
 return best;
}
export const MATERIAL_DROPS={
 mossling:{id:'moss-fibre',title:'Moss Fibre',chance:.65},
 boar:{id:'boar-hide',title:'Boar Hide',chance:.78},
 bandit:{id:'bandit-token',title:'Bandit Token',chance:1}
};
export function grantMonsterMaterial(inventory,type,roll){
 const rule=MATERIAL_DROPS[type];
 if(!rule||!Number.isFinite(roll)||roll>=rule.chance)return null;
 if(!inventory.materials||typeof inventory.materials!=='object')inventory.materials={};
 const current=Number.isSafeInteger(inventory.materials[rule.id])?inventory.materials[rule.id]:0;
 inventory.materials[rule.id]=Math.min(9999,Math.max(0,current)+1);
 return rule.title;
}
