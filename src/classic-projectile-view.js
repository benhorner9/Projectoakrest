import {classicAbilityProfile} from './classic-ability-profiles.js';
import * as THREE from 'three';
/** Shared geometry and a reusable bounded pool: no per-shot geometry uploads.
 * Arrow/bolt position and direction come directly from fixed-step simulation. */
export const CLASSIC_PROJECTILE_VIEW_LIMIT=32;
export const classicProjectileArtKind=p=>p?.style!=='magic'?(p?.effect==='piercing-arrow'?'piercing':'arrow'):
 p?.effect==='ice-shard'?'ice-shard':p?.family==='ember'?'ember':p?.name==='Arcane Bolt'?'arcane':'frost';
export function createClassicProjectileView(scene,{reducedMotion=false}={}){
 const shapes={shard:new THREE.OctahedronGeometry(.22),shaft:new THREE.CylinderGeometry(.035,.035,.65,5),
  tip:new THREE.ConeGeometry(.10,.22,5),orb:new THREE.SphereGeometry(.17,8,6),
  tail:new THREE.ConeGeometry(.12,.65,6),halo:new THREE.RingGeometry(.22,.32,12)};
 const materials={wood:new THREE.MeshBasicMaterial({color:'#c6a46a'}),
  steel:new THREE.MeshBasicMaterial({color:'#e8e2cf'}),
  gold:new THREE.MeshBasicMaterial({color:'#f3d48e'}),
  frost:new THREE.MeshBasicMaterial({color:'#a5ddec'}),
  ember:new THREE.MeshBasicMaterial({color:'#f3b06e'}),
  arcane:new THREE.MeshBasicMaterial({color:'#cab8eb'}),
  frostGlow:new THREE.MeshBasicMaterial({color:'#a6e9f0',side:THREE.DoubleSide,transparent:true,opacity:.78,depthWrite:false}),
  emberGlow:new THREE.MeshBasicMaterial({color:'#ffb46b',side:THREE.DoubleSide,transparent:true,opacity:.78,depthWrite:false}),
  arcaneGlow:new THREE.MeshBasicMaterial({color:'#cdb8ef',side:THREE.DoubleSide,transparent:true,opacity:.78,depthWrite:false})};
 const pool=[],up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
 function allocate(){
  const root=new THREE.Group(),shaft=new THREE.Mesh(shapes.shaft,materials.wood),
   tip=new THREE.Mesh(shapes.tip,materials.steel),orb=new THREE.Mesh(shapes.orb,materials.frost),
   tail=new THREE.Mesh(shapes.tail,materials.frost),shard=new THREE.Mesh(shapes.shard,materials.frost),
   halo=new THREE.Mesh(shapes.halo,materials.frostGlow);
  shard.scale.set(.7,2.3,.7);
  tip.position.y=.40;tail.position.y=-.4;tail.rotation.z=Math.PI;
  orb.scale.y=1.5;halo.rotation.x=-Math.PI/2;halo.position.y=-.2;
  root.add(shaft,tip,orb,tail,shard,halo);scene.add(root);
  const node={root,shaft,tip,orb,tail,shard,halo};pool.push(node);return node;
 }
 function update(projectiles,time=0){
  const count=Math.min(CLASSIC_PROJECTILE_VIEW_LIMIT,projectiles.length);
  while(pool.length<count)allocate();
  for(let i=0;i<pool.length;i++){
   const n=pool[i],p=projectiles[i];n.root.visible=i<count;
   if(i>=count)continue;
   const profile=classicAbilityProfile(p.name);
   const magic=p.style==='magic',piercing=p.effect==='piercing-arrow';
   const kind=classicProjectileArtKind(p);
   n.root.userData.effect=p.effect||'basic';n.root.userData.visualKind=kind;
   n.root.scale.set(piercing?1.3:1,piercing?1.7:1,piercing?1.3:1);
   if(profile?.length)n.root.scale.y=profile.length;
   n.tip.material=piercing?materials.gold:materials.steel;
   n.shaft.visible=n.tip.visible=!magic;n.tail.visible=magic;
   n.shard.visible=magic&&(p.effect==='ice-shard'||profile?.shape==='binding');n.orb.visible=magic&&!n.shard.visible;
   n.halo.visible=magic;
   n.orb.material=n.tail.material=kind==='ember'?materials.ember:kind==='arcane'?materials.arcane:materials.frost;
   n.halo.material=kind==='ember'?materials.emberGlow:kind==='arcane'?materials.arcaneGlow:materials.frostGlow;
   n.shard.material=kind==='ember'?materials.ember:materials.frost;
   if(!reducedMotion){n.shard.rotation.y=time*3;n.halo.scale.setScalar(.94+.10*Math.sin(time*8+i));}
   else {n.shard.rotation.y=0;n.halo.scale.setScalar(1);}
   direction.set(p.direction?.x||0,0,p.direction?.z||0);
   if(direction.lengthSq()<.001)direction.set(0,0,1);
   n.root.quaternion.setFromUnitVectors(up,direction.normalize());
   n.root.position.set(p.x,1.55,p.z);
  }
 }
 return {update,stats:()=>({allocated:pool.length,visible:pool.filter(n=>n.root.visible).length,effects:pool.filter(n=>n.root.visible).map(n=>n.root.userData.effect),
   visualKinds:pool.filter(n=>n.root.visible).map(n=>n.root.userData.visualKind)}),
  dispose(){for(const n of pool)scene.remove(n.root);pool.length=0;
   for(const g of Object.values(shapes))g.dispose();
   for(const m of Object.values(materials))m.dispose();}};
}
