/** Lightweight, event-driven combat contact cues for Oakrest Classic.
 * Rendering only: never changes attack timing, damage, pathfinding or saves.
 * Instanced meshes cap draw calls and effects regardless of combat frequency.
 */
import * as THREE from 'three';

export const IMPACT_LIFETIME=.32;
export const IMPACT_LIMIT=10;
export const combatImpactKind=event=>
 event?.type==='hit'?'hit':event?.type==='hurt'?'hurt':event?.type==='evade'?'evade':null;
export function hitRecoilStrength(until,time,duration=.18){
 const portion=Math.max(0,Math.min(1,(until-time)/duration));
 return Math.sin(Math.PI*portion);
}
export const combatImpactScale=damage=>
 Math.min(1.35,.75+Math.max(0,Number(damage)||0)/45);
export function combatImpactPosition(event,snapshot,player){
 const kind=combatImpactKind(event);
 if(kind==='hurt')return player&&Number.isFinite(player.x)&&Number.isFinite(player.z)?player:null;
 if(kind==='hit'||kind==='evade'){
  const enemy=snapshot?.monsters?.find(e=>e.id===event.id);
  return enemy&&Number.isFinite(enemy.x)&&Number.isFinite(enemy.z)?enemy:null;
 }
 return null;
}
const PALETTE={
 melee:new THREE.Color('#ffe2ad'),
 ranged:new THREE.Color('#f3d7a0'),
 magic:new THREE.Color('#9bcff4'),
 hurt:new THREE.Color('#f39a7b'),
 evade:new THREE.Color('#acdec0')
};
/** Two draw calls regardless of hit count, with a fixed effect budget.
 * Hit effects sit around the enemy torso, never on gameplay collision geometry. */
export function createClassicCombatImpacts(scene,{reducedMotion=false}={}){
 const ringGeometry=new THREE.RingGeometry(.23,.31,20);
 const sparkGeometry=new THREE.TetrahedronGeometry(.095,0);
 const ringMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,
  transparent:true,opacity:.8,depthWrite:false,toneMapped:false});
 const sparkMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,
  transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
 const rings=new THREE.InstancedMesh(ringGeometry,ringMaterial,IMPACT_LIMIT);
 const sparks=new THREE.InstancedMesh(sparkGeometry,sparkMaterial,IMPACT_LIMIT*4);
 rings.count=0;sparks.count=0;
 rings.frustumCulled=false;sparks.frustumCulled=false;
 rings.renderOrder=6;sparks.renderOrder=6;
 scene.add(rings,sparks);
 const impacts=[],dummy=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0);
 function onEvent(event,snapshot,player){
  if(reducedMotion)return false;
  const kind=combatImpactKind(event),position=combatImpactPosition(event,snapshot,player);
  if(!kind||!position||!Number.isFinite(event.time))return false;
  if(impacts.length>=IMPACT_LIMIT)impacts.shift();
  impacts.push({x:position.x,z:position.z,time:event.time,
   style:kind==='hurt'||kind==='evade'?kind:PALETTE[event.style]?event.style:'melee',
   power:combatImpactScale(event.damage)});
  return true;
 }
 function update(time,camera){
  // Keep the oldest active hit only until its visible window expires.
  while(impacts.length&&time-impacts[0].time>=IMPACT_LIFETIME)impacts.shift();
  rings.count=impacts.length;sparks.count=impacts.length*4;
  if(!impacts.length)return;
  for(let i=0;i<impacts.length;i++){
   const effect=impacts[i],age=Math.max(0,time-effect.time),
    progress=Math.min(1,age/IMPACT_LIFETIME),fade=Math.max(.02,1-progress),
    tint=PALETTE[effect.style],spread=(.74+progress*.85)*effect.power;
   dummy.position.set(effect.x,1.57+progress*.25,effect.z);
   dummy.quaternion.copy(camera.quaternion);
   dummy.scale.setScalar(spread*fade);
   dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);
   rings.setColorAt(i,color.copy(tint).multiplyScalar(fade));
   for(let j=0;j<4;j++){
    const index=i*4+j,angle=j*Math.PI/2+i*1.7;
    dummy.position.set(effect.x+Math.cos(angle)*progress*.9*effect.power,
     1.44+Math.sin(angle*2)*.22+progress*.5,
     effect.z+Math.sin(angle)*progress*.9*effect.power);
    dummy.quaternion.setFromAxisAngle(up,angle+progress);
    dummy.scale.setScalar((.85+.22*j)*fade*effect.power);
    dummy.updateMatrix();sparks.setMatrixAt(index,dummy.matrix);
    sparks.setColorAt(index,color.copy(tint).multiplyScalar(fade));
   }
  }
  rings.instanceMatrix.needsUpdate=true;sparks.instanceMatrix.needsUpdate=true;
  if(rings.instanceColor)rings.instanceColor.needsUpdate=true;
  if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;
 }
 return {onEvent,update,active:()=>impacts.length,dispose(){
  scene.remove(rings,sparks);
  ringGeometry.dispose();sparkGeometry.dispose();ringMaterial.dispose();sparkMaterial.dispose();
 }};
}
