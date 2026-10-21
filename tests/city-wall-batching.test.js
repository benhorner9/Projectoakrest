import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticCityWallPanels,buildCityIdentity} from '../src/city-identity.js';

test('instanced wall batches preserve transforms, materials and shadow flags',()=>{
 const group=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:0xaaaaaa});
 const original=[];
 for(let i=0;i<32;i++){
  const panel=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),stone);
  panel.position.set(i%2,2,i*3);panel.scale.set(1,4,2);
  panel.castShadow=true;panel.receiveShadow=true;
  group.add(panel);original.push(panel.position.toArray().join(','));
 }
 const originalBox=new THREE.Box3().setFromObject(group);
 const result=batchStaticCityWallPanels(group,24);
 assert.ok(result.instances>=30,'nearly all repeated boxes should be instanced');
 assert.ok(group.children.length<=6,'spatial batching should reduce 32 draws substantially');
 const recovered=[];
 for(const inst of group.children){
  assert.ok(inst.isInstancedMesh);
  assert.equal(inst.material,stone);
  assert.equal(inst.castShadow,true);
  assert.equal(inst.receiveShadow,true);
  const m=new THREE.Matrix4(),pos=new THREE.Vector3();
  for(let j=0;j<inst.count;j++){inst.getMatrixAt(j,m);pos.setFromMatrixPosition(m);recovered.push(pos.toArray().join(','));}
 }
 assert.deepEqual(recovered.sort(),original.sort(),'instancing must preserve every panel transform');
 const finalBox=new THREE.Box3().setFromObject(group);
 assert.ok(originalBox.min.distanceTo(finalBox.min)<1e-4);
 assert.ok(originalBox.max.distanceTo(finalBox.max)<1e-4);
});

test('animated or transparent wall-like meshes are never batched',()=>{
 const group=new THREE.Group(),opaque=new THREE.MeshStandardMaterial();
 for(let i=0;i<6;i++){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),opaque);mesh.position.z=i*.1;group.add(mesh);
  if(i===2)mesh.userData.animated=true;
 }
 const glass=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({transparent:true,opacity:.5}));
 group.add(glass);
 const result=batchStaticCityWallPanels(group);
 assert.equal(result.instances,5);
 assert.ok(group.children.includes(glass));
 assert.ok(group.children.some(x=>x.userData.animated));
 assert.throws(()=>batchStaticCityWallPanels(group,0),RangeError);
});

test('real outer city walls are draw-efficient while real collision logic remains separate',()=>{
 const scene=new THREE.Scene();buildCityIdentity(scene);
 const walls=scene.children.filter(child=>child.name==='Outer city wall');
 assert.equal(walls.length,2,'east and west walls still exist');
 for(const wall of walls){
  assert.ok(wall.children.some(obj=>obj.isInstancedMesh&&obj.userData.staticCityWall));
  assert.ok(wall.children.length<=20,'the 100+ stone panels should not each be a draw call');
 }
 assert.ok(scene.children.some(child=>child.name==='Heartwood Oak'),'landmark preserved');
});
