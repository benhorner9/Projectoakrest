import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,roadQuads,localBuildingPosition} from '../src/town-layout.js';
import {OAKREST_SERVICES,townInteraction} from '../src/town-services.js';
import {buildOakrestTown} from '../src/town-world.js';
import {createOakrestTownLife} from '../src/town-life.js';
import {buildCityIdentity} from '../src/city-identity.js';
import {blocked,clearWorldObstacles,moveOnGround,terrainHeight} from '../src/terrain.js';
import {batchScenery} from '../src/environment.js';
const house=OAKREST_BUILDINGS.find(x=>x.id==='trade-house');
const service=OAKREST_SERVICES.find(s=>s.id==='trade-house');

test('large Trade House is distinct from the bank and properly registered for later auction trading',()=>{
 assert.ok(house,'city Trade House missing');
 assert.equal(house.kind,'trade');
 assert.ok(house.w*house.d>OAKREST_BUILDINGS.find(b=>b.id==='bank').w*OAKREST_BUILDINGS.find(b=>b.id==='bank').d);
 assert.equal(house.face,'west');
 assert.equal(service.attendant,'Tessa the Trade Steward');
 assert.equal(service.kind,'trade');
 assert.equal(townInteraction(service.npcX,service.npcZ)?.id,service.id);
});
test('Trade House walls, doorway and near-by streets retain full navigable collision',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  assert.equal(town.buildings,OAKREST_BUILDINGS.length);
  const b=house;
  // Building footprint should never be overlaid with the existing wide roads.
  const corners=(x,z,hx,hz)=>[[x-hx,z-hz],[x+hx,z-hz],[x+hx,z+hz],[x-hx,z+hz]];
  const building=corners(b.x,b.z,b.d/2,b.w/2);
  for(const road of roadQuads()){
   const axes=[[1,0],[0,1]];
   for(let i=0;i<road.length;i++){
    const p=road[i],q=road[(i+1)%road.length],dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz);
    axes.push([-dz/l,dx/l]);
   }
   const cross=axes.every(([ax,az])=>{
    const range=points=>{const vals=points.map(p=>p[0]*ax+p[1]*az);return [Math.min(...vals),Math.max(...vals)];};
    const [lo,hi]=range(building),[a,b]=range(road);
    return lo<b-.05&&a<hi-.05;
   });
   assert.equal(cross,false,'Street paving intersects Trade House walls');
  }
  assert.equal(blocked(8,64.5,.32),false,'west-facing Trade House doorway blocked');
  assert.equal(blocked(8,69,.32),true,'Trade House wall has no collision');
  assert.equal(blocked(service.npcX,service.npcZ,.3),false,'Trade Steward obstructed');
  const moved=moveOnGround({x:5.0,z:64.5,y:terrainHeight(5,64.5)},6.5,0,.3);
  assert.ok(moved.x>10.4,'entry path cannot reach trading floor');
  assert.equal(blocked(4.6,64.5,.30),false,'main avenue blocked');
  assert.equal(blocked(4.6,76,.30),false,'north avenue blocked');
  assert.equal(blocked(38,82,.30),true,'garden pond missing after relocation');
  assert.equal(blocked(22,66,.30),true,'Trade House east wall should occupy old pond position');
  const roof=scene.getObjectByName('trade-house removable roof');
  const root=roof?.parent;
  assert.ok(root,'Trade House roof missing');
  assert.ok(root.children.some(c=>c.name==='Trade House future auction board'));
  assert.ok(root.children.some(c=>c.name==='Trade House registry counter'));
  assert.ok(root.children.some(c=>c.name==='Trade House entry flagstone'));
  assert.ok(roof.getObjectByName('Trade House roof lantern tower'));
  assert.equal(root.children.filter(c=>c.name==='Trade House merchant display counter').length,4);
  const inside={x:15,z:64.5},camera={x:4,z:64.5};
  town.update(inside,0,camera);
  assert.equal(roof.visible,false,'Trade House roof obscures players indoors');
  assert.ok(root.children.filter(c=>c.userData.cutawaySide==='front').every(c=>!c.visible));
  town.update({x:4,z:64.5},0,camera);
  assert.equal(roof.visible,true,'Trade House facade does not restore after exit');
 }finally{clearWorldObstacles();}
});
test('Trade House visual and future auction board survive scenery batching without enabling auctions',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene();const town=buildOakrestTown(scene);
 const life=createOakrestTownLife(scene);
 try{
  const before=life.snapshot();
  batchScenery(scene);
  const roof=scene.getObjectByName('trade-house removable roof');
  assert.ok(roof);
  town.update({x:15,z:64.5},0,{x:2,z:64.5});
  const front=roof.parent.children.filter(o=>o.userData.cutawaySide==='front');
  assert.ok(front.length>=5);
  assert.ok(front.every(o=>!o.visible),'static batching swallowed the cutaway facade');
  // The auction-ready building is visual/physical only, not a second item
  // inventory or unapproved order/bid ledger.
  assert.ok(!service.price&&!service.buy&&!service.sell&&!service.listings);
  for(let k=0;k<100;k++)life.update(.1,k*.1,{x:0,z:64},true);
  assert.ok(life.snapshot().every(v=>!blocked(v.x,v.z,.22)),'new Trade House obstructed citizens');
  assert.ok(life.snapshot().filter((v,i)=>Math.hypot(v.x-before[i].x,v.z-before[i].z)>1).length>=5);
 }finally{clearWorldObstacles();}
});
