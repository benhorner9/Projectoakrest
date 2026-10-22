import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,OAKREST_PATHS,reservedTownGround,roadCrossSections} from '../src/town-layout.js';
import {terrainHeight,blocked,clearWorldObstacles,moveOnGround} from '../src/terrain.js';
import {buildOakrestCityPaths,buildOakrestCityMeadows,cityRoadColour,cityRoadDistance} from '../src/town-ground.js';
import {buildOakrestTown} from '../src/town-world.js';

test('every crossroads has one non-overlapping, softly edged road surface',()=>{
 const scene=new THREE.Scene(),result=buildOakrestCityPaths(scene);
 assert.equal(scene.children.length,1,'intersections must NEVER overlap independent road meshes');
 assert.equal(result.roadLayers,1,'all routes share one global paving canvas');
 assert.ok(result.stoneCount>900,'keep continuous visible civic stones');
 assert.ok(result.segments>20,'retain authored road sections');
 const paving=scene.children[0];
 assert.equal(paving.name,'Oakrest continuous civic paving');
 assert.ok(paving.isMesh&&paving.material.map?.isDataTexture);
 assert.ok(paving.material.transparent&&paving.material.alphaTest>0,'verges should blend into terrain');
 assert.ok(paving.geometry.index.count>1000);
 assert.equal(paving.userData.animated,true,'world scenery batching must not alter the paving');
 const vertices=paving.geometry.getAttribute('position');
 const uvs=paving.geometry.getAttribute('uv');
 assert.equal(vertices.count,uvs.count);
 for(let i=0;i<vertices.count;i+=Math.max(1,Math.floor(vertices.count/250))){
  const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
  assert.ok(Math.abs(y-terrainHeight(x,z)-.053)<.001,
   'paving terrain should not float: '+(y-terrainHeight(x,z)));
 }
 const texture=paving.material.map;
 assert.equal(texture.image.width,1024);
 assert.equal(texture.image.height,1024);
 assert.equal(texture.image.data.length,1024*1024*4);
 const centre=new Uint8Array(4),outside=new Uint8Array(4),verge=new Uint8Array(4);
 cityRoadColour(0,19,centre);
 cityRoadColour(41,38,outside);
 cityRoadColour(2.43,19,verge);
 assert.equal(centre[3],255,'main crossroads should be fully paved');
 assert.equal(outside[3],0,'grassland must not be paved');
 assert.ok(verge[3]>0&&verge[3]<255,'grass/paving edges should feather');
 assert.ok(cityRoadDistance(0,19)<.1,'city crossroads follows original routes');
 const tones=new Set();
 for(let x=-2;x<=2;x+=.17)for(let z=17;z<=20;z+=.23){
  cityRoadColour(x,z,centre);tones.add(centre.slice(0,3).join(','));
 }
 assert.ok(tones.size>=6,'stone and subtle mortar should remain readable');
 for(const route of OAKREST_PATHS)for(let k=1;k<route.length;k++){
  const a=route[k-1],b=route[k];
  assert.ok(cityRoadDistance((a[0]+b[0])*.5,(a[1]+b[1])*.5)<1e-4,
   'all authored paths must remain surfaced');
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
