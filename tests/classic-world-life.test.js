import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {citizenRoutine} from '../src/classic-world-life.js';
import {CLASSIC_NPCS,solidAt} from '../src/classic-presentation.js';
import {batchClassicStatics} from '../src/classic-static-batch.js';
test('citizen routines stay traversable and within canonical interaction reach',()=>{
 for(const npc of CLASSIC_NPCS)for(let t=0;t<60;t+=.2){
  const p=citizenRoutine(npc,t,{x:0,z:150});
  assert.ok(Math.hypot(p.x-npc.x,p.z-npc.z)<1,npc.id);
  if(['citizen','guard'].includes(npc.role))assert.equal(solidAt(p.x,p.z,.1),false,npc.id);
  else assert.deepEqual([p.x,p.z],[npc.x,npc.z]);
  const near=citizenRoutine(npc,t,npc);assert.equal(near.moving,false);
 }
});
test('static batches retain cutaways and interaction anchors and world transforms',()=>{
 const root=new THREE.Group(),roof=new THREE.Group(),target=new THREE.Group();
 roof.userData.dynamic=true;target.userData.interactId='grove:test';root.add(roof,target);
 const g=new THREE.BoxGeometry(),m=new THREE.MeshBasicMaterial();
 for(let i=0;i<5;i++){const x=new THREE.Mesh(g,m);x.position.x=i;root.add(x);}
 const roofMesh=new THREE.Mesh(g,m),targetMesh=new THREE.Mesh(g,m);roof.add(roofMesh);target.add(targetMesh);
 const result=batchClassicStatics(root);assert.equal(result.objectsReplaced,5);assert.equal(result.batches,1);
 assert.equal(roofMesh.parent,roof);assert.equal(targetMesh.parent,target);
 const batch=root.children.find(x=>x.isInstancedMesh),matrix=new THREE.Matrix4();
 batch.getMatrixAt(4,matrix);assert.equal(matrix.elements[12],4);
 roof.visible=false;assert.equal(batch.visible,true);
});
