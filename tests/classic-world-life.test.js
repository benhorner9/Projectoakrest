import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {citizenRoutine} from '../src/classic-world-life.js';
import {CLASSIC_NPCS,solidAt} from '../src/classic-presentation.js';
import {batchClassicStatics} from '../src/classic-static-batch.js';
test('stationary staff remain anchored and working citizens traverse unobstructed paths',()=>{
 for(const npc of CLASSIC_NPCS)for(let t=0;t<60;t+=.2){
  const p=citizenRoutine(npc,t,{x:0,z:150});
  if(npc.route?.length>=2){
   assert.equal(solidAt(p.x,p.z,.1),false,npc.id+' patrol must avoid scenery');
   const xs=npc.route.map(q=>q[0]),zs=npc.route.map(q=>q[1]);
   assert.ok(p.x>=Math.min(...xs)-.01&&p.x<=Math.max(...xs)+.01,npc.id+' x in route');
   assert.ok(p.z>=Math.min(...zs)-.01&&p.z<=Math.max(...zs)+.01,npc.id+' z in route');
   assert.equal(citizenRoutine(npc,t,npc).moving,p.moving,'player proximity must not fake a walk cycle');
  }else{
   assert.deepEqual([p.x,p.z],[npc.x,npc.z],npc.id+' is stationary');
   assert.equal(p.moving,false,npc.id);
   assert.equal(citizenRoutine(npc,t,npc).moving,false);
  }
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
