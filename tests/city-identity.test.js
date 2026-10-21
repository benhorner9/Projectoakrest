import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,OAKREST_PATHS,buildOakrestTown} from '../src/town-world.js';
import {CITY_DISTRICTS} from '../src/city-identity.js';
import {createOakrestTownLife} from '../src/town-life.js';
import {blocked,moveOnGround,clearWorldObstacles,terrainHeight} from '../src/terrain.js';
import {OAKREST_SERVICES,townInteraction} from '../src/town-services.js';

test('Heartwood is an identifiable centrepiece and the city has distinct districts',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),city=buildOakrestTown(scene);
 try{
  const oak=scene.getObjectByName('Heartwood Oak'),south=scene.getObjectByName('Southgate'),north=scene.getObjectByName('Northgate');
  assert.ok(oak,'Heartwood Oak must be modelled and visible');
  assert.equal(oak.userData.cityLandmark,'heartwood-oak');
  assert.ok(oak.children.length>=17,'landmark must be more than a plain tree cylinder');
  assert.equal(south?.userData.cityLandmark,'southgate');
  assert.equal(north?.userData.cityLandmark,'northgate');
  assert.ok(CITY_DISTRICTS.length>=5);
  assert.ok(city.ambientCount>=18,'ambient flags, smoke, leaves, lanterns, birds animate');
  assert.ok(scene.getObjectByName('Green Quarter park'));
  assert.ok(scene.getObjectByName('Outer city wall'));
  assert.ok(scene.getObjectByName('Warden city square')===undefined,'no unrelated placeholder objects');
  assert.equal(blocked(0,39,.42),true,'Heartwood trunk must have solid collision');
  assert.equal(blocked(4,39,.34),false,'walk around landmark');
  city.update({x:0,z:35},2);
  assert.ok(scene.getObjectByName('Heartwood Oak').visible);
 }finally{clearWorldObstacles();}
});
test('every extended-city building remains physically enterable with navigable doorways',()=>{
 clearWorldObstacles();const city=buildOakrestTown(new THREE.Scene());
 try{
  assert.ok(OAKREST_BUILDINGS.length>=15);
  const facings=new Set(OAKREST_BUILDINGS.map(b=>b.face));
  assert.ok(facings.has('north')&&facings.has('south')&&facings.has('east')&&facings.has('west'));
  for(const b of OAKREST_BUILDINGS){
   const a={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2}[b.face];
   const f={x:Math.sin(a),z:Math.cos(a)};
   assert.equal(blocked(b.x,b.z,.32),false,'clear walking space in '+b.id);
   assert.equal(blocked(b.x+f.x*b.d/2,b.z+f.z*b.d/2,.32),false,'doorway is open in '+b.id);
   const outside={x:b.x+f.x*(b.d/2+1.35),z:b.z+f.z*(b.d/2+1.35)};
   const moved=moveOnGround({...outside,y:terrainHeight(outside.x,outside.z)},-f.x*2.75,-f.z*2.75,.32);
   assert.ok(Math.hypot(moved.x-outside.x,moved.z-outside.z)>2.25,'can enter '+b.id);
   assert.equal(city.inside(b.x,b.z),b.id);
  }
  assert.equal(blocked(0,86,.34),false,'northern gate must not seal the road');
  assert.equal(blocked(0,-13,.34),false,'southern gate must stay open');
  for(const s of OAKREST_SERVICES)assert.equal(townInteraction(s.npcX,s.npcZ)?.id,s.id);
  assert.ok(OAKREST_PATHS.some(route=>route.some(([x,z])=>x< -20&&z>65)),'Warden Hall road');
  assert.equal(townInteraction(-12,49)?.type,'notice','Heartwood noticeboard can be read');
  assert.equal(townInteraction(-13,42)?.type,'notice','Warden notices can be read');
 }finally{clearWorldObstacles();}
});
test('named city NPCs are visible and offer meaningful local dialogue',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene();buildOakrestTown(scene);
 const life=createOakrestTownLife(scene);
 try{
  assert.equal(life.staff,3,'preserve banker, merchant and forester');
  assert.ok(life.count>=13,'more residents than the original starter village');
  assert.ok(life.ambientStaff>=4,'guards, steward and gardeners');
  for(const [x,z] of [[-13,-7],[13,-7],[-29,76],[9,58]]){
   const npc=life.nearby(x,z);
   assert.equal(npc?.type,'citizen');
   assert.ok(npc.line.length>30);
  }
  const t=life.snapshot();for(let i=0;i<120;i++)life.update(.1,i*.1,{x:0,z:24},true);
  assert.ok(life.snapshot().filter((v,i)=>Math.hypot(v.x-t[i].x,v.z-t[i].z)>1).length>=5);
  assert.ok(life.snapshot().every(v=>!blocked(v.x,v.z,.22)),
   'residents must remain on walkable routes and cannot phase through obstacles');
 }finally{clearWorldObstacles();}
});
