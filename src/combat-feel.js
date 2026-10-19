/** Third-person combat geometry and enemy behaviours, kept outside Three.js for tests. */
export const ENEMY_PATTERNS={
 mossling:{kind:'pounce',windup:.55,cooldown:2.6,engage:3.1,damage:7,radius:1.75,description:'Mossling pounce'},
 boar:{kind:'charge',windup:.86,cooldown:3.8,engage:6.2,damage:12,length:6.0,width:1.2,chargeSpeed:10,description:'Boar charge'},
 bandit:{kind:'cleave',windup:.76,cooldown:3.25,engage:3.25,damage:16,radius:3.25,halfAngle:.69,description:'Bandit cleave'}
};
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
