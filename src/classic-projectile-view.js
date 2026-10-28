import * as THREE from 'three';
/** Shared geometry and a reusable bounded pool: no per-shot geometry uploads.
 * Arrow/bolt position and direction come directly from fixed-step simulation. */
export const CLASSIC_PROJECTILE_VIEW_LIMIT=32;
export function createClassicProjectileView(scene){
 const shapes={shard:new THREE.OctahedronGeometry(.22),shaft:new THREE.CylinderGeometry(.035,.035,.65,5),
  tip:new THREE.ConeGeometry(.10,.22,5),orb:new THREE.SphereGeometry(.17,8,6),
  tail:new THREE.ConeGeometry(.12,.65,6)};
 const materials={wood:new THREE.MeshBasicMaterial({color:'#c6a46a'}),
  steel:new THREE.MeshBasicMaterial({color:'#e8e2cf'}),
  gold:new THREE.MeshBasicMaterial({color:'#f3d48e'}),
  frost:new THREE.MeshBasicMaterial({color:'#a5ddec'}),
  ember:new THREE.MeshBasicMaterial({color:'#f3b06e'})};
 const pool=[],up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
 function allocate(){
  const root=new THREE.Group(),shaft=new THREE.Mesh(shapes.shaft,materials.wood),
   tip=new THREE.Mesh(shapes.tip,materials.steel),orb=new THREE.Mesh(shapes.orb,materials.frost),
   tail=new THREE.Mesh(shapes.tail,materials.frost),shard=new THREE.Mesh(shapes.shard,materials.frost);
  shard.scale.set(.7,2.3,.7);
  tip.position.y=.40;tail.position.y=-.4;tail.rotation.z=Math.PI;
  orb.scale.y=1.5;root.add(shaft,tip,orb,tail,shard);scene.add(root);
  const node={root,shaft,tip,orb,tail,shard};pool.push(node);return node;
 }
 function update(projectiles){
  const count=Math.min(CLASSIC_PROJECTILE_VIEW_LIMIT,projectiles.length);
  while(pool.length<count)allocate();
  for(let i=0;i<pool.length;i++){
   const n=pool[i],p=projectiles[i];n.root.visible=i<count;
   if(i>=count)continue;
   const magic=p.style==='magic',piercing=p.effect==='piercing-arrow';
   n.root.userData.effect=p.effect||'basic';n.root.scale.set(piercing?1.3:1,piercing?1.7:1,piercing?1.3:1);
   n.tip.material=piercing?materials.gold:materials.steel;
   n.shaft.visible=n.tip.visible=!magic;n.tail.visible=magic;
   n.shard.visible=magic&&p.effect==='ice-shard';n.orb.visible=magic&&!n.shard.visible;
   n.orb.material=n.tail.material=p.family==='ember'?materials.ember:materials.frost;
   direction.set(p.direction?.x||0,0,p.direction?.z||0);
   if(direction.lengthSq()<.001)direction.set(0,0,1);
   n.root.quaternion.setFromUnitVectors(up,direction.normalize());
   n.root.position.set(p.x,1.55,p.z);
  }
 }
 return {update,stats:()=>({allocated:pool.length,visible:pool.filter(n=>n.root.visible).length,effects:pool.filter(n=>n.root.visible).map(n=>n.root.userData.effect)}),
  dispose(){for(const n of pool)scene.remove(n.root);pool.length=0;
   for(const g of Object.values(shapes))g.dispose();
   for(const m of Object.values(materials))m.dispose();}};
}
