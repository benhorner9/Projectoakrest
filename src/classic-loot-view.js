/** Classic 2.5D in-world item renderer; reuses the existing Oakrest item models. */
import * as THREE from 'three';
import {makeWorldItemModel} from './item-visuals.js';
import {itemFromDrop} from './items.js';
export function createClassicGroundLoot(scene){
 const roots=new Map();
 const base=new THREE.Group();scene.add(base);
 const scale=.92;
 function update(drops,time){
  const ids=new Set((drops||[]).map(d=>d.id));
  for(const [id,group] of roots)if(!ids.has(id)){
   base.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose?.();});
   roots.delete(id);
  }
  for(const drop of drops||[]){
   if(!roots.has(drop.id)){
    const root=makeWorldItemModel(drop,{classic:true});
    if(!root)continue;
    const item=itemFromDrop(drop);
    root.userData.lootId=drop.id;
    root.userData.lootKind=item.shape;
    const marker=new THREE.Mesh(new THREE.RingGeometry(.62,.75,20),
      new THREE.MeshBasicMaterial({color:item.accent,transparent:true,opacity:.5,
       side:THREE.DoubleSide,depthWrite:false}));
    marker.rotation.x=-Math.PI/2;marker.position.y=.04;
    root.add(marker);root.position.set(drop.x,.19,drop.z);
    root.scale.setScalar(scale);
    base.add(root);roots.set(drop.id,root);
   }
   const group=roots.get(drop.id);
   if(group)group.position.y=.2+.042*Math.sin(time*2.1+drop.x);
  }
 }
 function hitObjects(){
  const list=[];
  for(const [id,group] of roots)group.traverse(child=>{
   if(child.isMesh&&!child.userData.decorativeOnly&&child.geometry?.type!=='RingGeometry')list.push({id,object:child});
  });
  return list;
 }
 return {update,hitObjects,dispose:()=>{
  for(const [id,group] of roots){base.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});}
  scene.remove(base);roots.clear();
 }};
}
