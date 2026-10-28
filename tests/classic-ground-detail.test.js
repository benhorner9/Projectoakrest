import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {classicDetailAllowed,generateClassicGroundDetails} from '../src/classic-ground-detail.js';
import {addClassicGroundDetails} from '../src/classic-ground-detail-mesh.js';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from '../src/classic-town-plan.js';
import {OAKREST_BUILDINGS,OAKREST_WELL} from '../src/town-layout.js';

test('decorative Classic vegetation is deterministic and cannot invade movement areas',()=>{
 const first=generateClassicGroundDetails(),second=generateClassicGroundDetails();
 assert.deepEqual(first,second);
 const entries=Object.values(first).flat();
 assert.ok(entries.length>100,'visible world accents should be distributed');
 for(const item of entries)assert.ok(classicDetailAllowed(item.x,item.z));
 for(const path of CLASSIC_ROADS)for(const [x,z] of path)assert.equal(classicDetailAllowed(x,z),false);
 for(const plaza of CLASSIC_PLAZAS)assert.equal(classicDetailAllowed(plaza.x,plaza.z),false);
 for(const b of OAKREST_BUILDINGS)assert.equal(classicDetailAllowed(b.x,b.z),false);
 assert.equal(classicDetailAllowed(OAKREST_WELL.x,OAKREST_WELL.z),false);
 assert.equal(classicDetailAllowed(NaN,0),false);
});

test('ground foliage is three instanced, bounded meshes rather than many draw calls',()=>{
 const group=new THREE.Group(),counts=addClassicGroundDetails(group);
 assert.ok(counts.grass>0&&counts.flowers>0&&counts.stones>0);
 assert.equal(group.children.length,3);
 for(const mesh of group.children){
  assert.equal(mesh.isInstancedMesh,true);
  assert.ok(mesh.count>0);
  assert.ok(mesh.boundingSphere?.radius>0);
  assert.equal(mesh.castShadow,false);
 }
});
