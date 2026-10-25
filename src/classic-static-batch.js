import * as THREE from 'three';
/** Batch repeated static geometry only. Roof cutaways and interaction anchors
 * retain their original objects. No change to collision or picking targets. */
export function batchClassicStatics(root){
 root.updateMatrixWorld(true);
 const groups=new Map(),inverse=root.matrixWorld.clone().invert();
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;
  for(let p=o;p&&p!==root;p=p.parent)if(p.userData.dynamic||p.userData.interactId)return;
  const key=o.geometry.uuid+':'+o.material.uuid;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 let removed=0,batches=0;
 for(const items of groups.values()){
  if(items.length<3)continue;
  const mesh=new THREE.InstancedMesh(items[0].geometry,items[0].material,items.length);
  for(const [i,item] of items.entries())mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,item.matrixWorld));
  mesh.computeBoundingSphere();root.add(mesh);
  for(const item of items)item.removeFromParent();
  removed+=items.length;batches++;
 }
 return {objectsReplaced:removed,batches};
}
