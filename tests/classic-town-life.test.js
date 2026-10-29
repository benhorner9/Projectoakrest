import test from 'node:test';
import assert from 'node:assert/strict';
import {OAKREST_BUILDINGS,localBuildingPosition} from '../src/town-layout.js';
import {interiorFixtures,insideFixture} from '../src/classic-interior-fixtures.js';
import {solidAt,clearClassicLine,findClassicPath,CLASSIC_NPCS} from '../src/classic-presentation.js';
import {citizenRoutine} from '../src/classic-world-life.js';

const world=(b,p)=>{const a={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2}[b.face];
 return {x:b.x+p.x*Math.cos(a)+p.z*Math.sin(a),z:b.z-p.x*Math.sin(a)+p.z*Math.cos(a)};};
test('each bank/store/trade counter and shelf is physically solid at its exact rendered position',()=>{
 for(const id of ['bank','store','trade-house','forester']){
  const b=OAKREST_BUILDINGS.find(b=>b.id===id),f=interiorFixtures(b);
  assert.ok(f.length>=2,id);
  for(const fixture of f){
   const p=world(b,fixture),local=localBuildingPosition(b,p.x,p.z);
   assert.ok(insideFixture(local,fixture,.38),fixture.id);
   assert.ok(solidAt(p.x,p.z,.38),id+': '+fixture.id);
   const left=world(b,{x:fixture.x-fixture.w/2,z:fixture.z});
   const right=world(b,{x:fixture.x+fixture.w/2,z:fixture.z});
   assert.equal(clearClassicLine(left,right,.3),false,'swept line crosses '+id+'/'+fixture.id);
  }
 }
});
test('service doorways and staff approach remain navigable instead of being sealed by furniture',()=>{
 for(const id of ['bank','store','trade-house']){
  const b=OAKREST_BUILDINGS.find(b=>b.id===id),outside=world(b,{x:0,z:b.d/2+1.7});
  const inside=world(b,{x:0,z:.7});
  assert.equal(solidAt(inside.x,inside.z,.38),false,id+' interior aisle');
  assert.equal(solidAt(outside.x,outside.z,.38),false,id+' doorway');
  const route=findClassicPath(outside,inside);
  assert.ok(route.length>0,id+' reachable from door');
  assert.ok(route.every(p=>!solidAt(p.x,p.z,.38)),id+' route must avoid furnishings');
 }
});
test('service NPCs and guard remain fixed, town workers travel actual unobstructed streets',()=>{
 const stationary=CLASSIC_NPCS.filter(n=>['bank','store','skill','trade','guard','citizen'].includes(n.role));
 assert.equal(stationary.length,6);
 for(const npc of stationary)for(const time of [0,9,40]){
  const p=citizenRoutine(npc,time,{x:0,z:39});
  assert.equal(p.moving,false,npc.id);
  assert.deepEqual([p.x,p.z],[npc.x,npc.z]);
 }
 const walkers=CLASSIC_NPCS.filter(n=>n.route?.length>=2);
 assert.ok(walkers.length>=6,'town must have several working, moving civilians');
 for(const npc of walkers){
  for(const waypoint of npc.route)assert.equal(solidAt(waypoint[0],waypoint[1],.38),false,npc.id+' waypoint blocked');
  for(const [a,b] of npc.route.slice(1).map((p,i)=>[npc.route[i],p]))
   assert.equal(clearClassicLine({x:a[0],z:a[1]},{x:b[0],z:b[1]},.38),true,npc.id+' route crosses obstacle');
  const start=citizenRoutine(npc,0,{x:0,z:39});
  const moved=citizenRoutine(npc,4,{x:0,z:39});
  assert.ok(Math.hypot(moved.x-start.x,moved.z-start.z)>1.5,npc.id+' walks instead of stepping on spot');
  for(const time of [0,4,14,44]){const p=citizenRoutine(npc,time,{x:0,z:39});
   assert.equal(solidAt(p.x,p.z,.38),false,npc.id+' traversed wall/furniture');
  }
 }
});
