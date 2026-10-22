import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,OAKREST_PATHS,reservedTownGround,roadCrossSections} from '../src/town-layout.js';
import {terrainHeight,blocked,clearWorldObstacles,moveOnGround} from '../src/terrain.js';
import {buildOakrestCityPaths,buildOakrestCityMeadows} from '../src/town-ground.js';
import {buildOakrestTown} from '../src/town-world.js';

test('all city roads get complete layered cobbles and terrain-following mortar',()=>{
 const scene=new THREE.Scene(),result=buildOakrestCityPaths(scene);
 assert.equal(scene.children.length,3,'two continuous road strips and one pooled stones draw');
 assert.ok(result.stoneCount>900,'main streets should have many detailed cobblestones');
 assert.ok(result.segments>100);
 for(const mesh of scene.children){
  assert.ok(mesh.geometry.index.count>1000,mesh.name+' must cover multiple streets');
  assert.equal(mesh.material.vertexColors,true);
  assert.equal(mesh.material.transparent,false);
  assert.equal(mesh.userData.animated,true,'do not re-batch the coloured surface');
  const vertex=mesh.geometry.getAttribute('position'),colour=mesh.geometry.getAttribute('color');
  assert.equal(vertex.count,colour.count);
  for(let i=0;i<vertex.count;i+=Math.max(1,Math.floor(vertex.count/350))){
   const x=vertex.getX(i),y=vertex.getY(i),z=vertex.getZ(i);
   assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z),'no broken cobble vertices');
   const delta=y-terrainHeight(x,z);
   assert.ok(delta>=.02&&delta<.059,'paving lies directly on real land, not floating '+delta);
  }
 }
 const distinct=new Set();
 const colour=result.stones.geometry.getAttribute('color');
 for(let i=0;i<colour.count;i+=4)distinct.add(colour.getX(i).toFixed(3)+','+colour.getY(i).toFixed(3));
 assert.ok(distinct.size>=5,'individual stones must vary visibly');
 for(const path of OAKREST_PATHS){
  assert.ok(roadCrossSections(path,5.4).length>=2);
 }
});

test('town meadows grow only in safe grassland, away from paths, buildings and obstacles',()=>{
 clearWorldObstacles();const scene=new THREE.Scene();buildOakrestTown(scene);
 try{
  const grass=scene.getObjectByName('Oakrest city meadow grass');
  const flowers=scene.getObjectByName('Oakrest city wildflowers');
  assert.ok(grass?.isInstancedMesh&&flowers?.isInstancedMesh);
  assert.ok(grass.count>=500,'real green spaces should have deliberate ground cover');
  assert.ok(flowers.count>=85,'city grassland needs scattered flowers');
  const matrix=new THREE.Matrix4(),pos=new THREE.Vector3();
  for(const field of [grass,flowers]){
   for(let i=0;i<field.count;i++){
    field.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);
    assert.equal(reservedTownGround(pos.x,pos.z),false,'plant in paving/building: '+pos.x+','+pos.z);
    assert.equal(blocked(pos.x,pos.z,.19),false,'plant intersects a registered collider');
    const land=terrainHeight(pos.x,pos.z);
    assert.ok(pos.y>=land-.002&&pos.y<land+.41,'plant root height inconsistent with terrain');
   }
  }
 }finally{clearWorldObstacles();}
});

test('new road and meadow visuals do not change any house access or player collision',()=>{
 clearWorldObstacles();const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  assert.equal(town.buildings,16);
  assert.ok(town.groundFinish.pavingStones>900);
  assert.ok(town.groundFinish.grassTufts>500);
  for(const b of OAKREST_BUILDINGS){
   const a={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2}[b.face];
   const fx=Math.sin(a),fz=Math.cos(a);
   const doorway={x:b.x+fx*b.d/2,z:b.z+fz*b.d/2};
   assert.equal(blocked(doorway.x,doorway.z,.30),false,b.id+' doorway must remain open');
   const start={x:doorway.x+fx*1.3,z:doorway.z+fz*1.3};
   const moved=moveOnGround({...start,y:terrainHeight(start.x,start.z)},-fx*2.7,-fz*2.7,.30);
   assert.ok(Math.hypot(moved.x-start.x,moved.z-start.z)>2,b.id+' interior blocked by paving');
   assert.ok(scene.getObjectByName(b.id+' removable roof'),b.id+' structural building missing');
  }
 }finally{clearWorldObstacles();}
});
