import test from 'node:test';
import assert from 'node:assert/strict';
import {OAKREST_BUILDINGS,localBuildingPosition} from '../src/town-layout.js';
import {interiorFixtures,insideFixture} from '../src/classic-interior-fixtures.js';
import {solidAt,clearClassicLine,findClassicPath,CLASSIC_NPCS} from '../src/classic-presentation.js';
import {citizenRoutine} from '../src/classic-world-life.js';
import {organicRoadPolygons} from '../src/classic-art-direction.js';

const face={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2};
const world=(b,x,z)=>({x:b.x+x*Math.cos(face[b.face])+z*Math.sin(face[b.face]),
 z:b.z-x*Math.sin(face[b.face])+z*Math.cos(face[b.face])});

test('Block 3: actual visible bank and store displays share renderer and collision footprints',()=>{
 for(const [id,fixtureId] of [['bank','ledger-lectern'],['store','display-stand'],['trade-house','display-stand']]){
  const b=OAKREST_BUILDINGS.find(x=>x.id===id);
  const f=interiorFixtures(b).find(f=>f.id===fixtureId);
  assert.ok(f,id+' must expose its distinctive new fixture');
  const point=world(b,f.x,f.z);
  const local=localBuildingPosition(b,point.x,point.z);
  assert.ok(insideFixture(local,f,.38));
  assert.equal(solidAt(point.x,point.z),true,id+' fixture cannot be walked through');
  const a=world(b,f.x-f.w/2-.6,f.z),c=world(b,f.x+f.w/2+.6,f.z);
  assert.equal(clearClassicLine(a,c,.12),false,'line of sight must not cross physical '+id+' furniture');
  const door=world(b,0,b.d/2+1.5),aisle=world(b,0,.7);
  assert.equal(solidAt(door.x,door.z),false,id+' entrance remains open');
  assert.equal(solidAt(aisle.x,aisle.z),false,id+' interior corridor remains open');
  assert.ok(findClassicPath(door,aisle).length,id+' service building can be entered');
 }
});
test('Block 3: walking workers follow collision-clear routes and pause instead of animating in place',()=>{
 const workers=CLASSIC_NPCS.filter(n=>n.route);
 assert.ok(workers.length>=6);
 for(const npc of workers){
  const original=JSON.stringify(npc);
  const samples=[0,3,8,19,42].map(t=>citizenRoutine(npc,t,{x:0,z:39}));
  for(const sample of samples){
   assert.ok(Number.isFinite(sample.x)&&Number.isFinite(sample.z));
   assert.equal(solidAt(sample.x,sample.z),false,'worker '+npc.id+' should not enter solids');
   assert.equal(typeof sample.moving,'boolean');
  }
  for(let i=1;i<npc.route.length;i++){
   const a={x:npc.route[i-1][0],z:npc.route[i-1][1]},
    b={x:npc.route[i][0],z:npc.route[i][1]};
   assert.equal(clearClassicLine(a,b,.38),true,npc.id+' must not pass through wall');
  }
  assert.ok(samples.some(p=>p.moving),npc.id+' must actually travel');
  assert.equal(JSON.stringify(npc),original,'routine must never change authoritative locations');
 }
 const guard=CLASSIC_NPCS.find(x=>x.id==='guard');
 assert.deepEqual([citizenRoutine(guard,200).x,citizenRoutine(guard,200).z],[guard.x,guard.z]);
 assert.equal(citizenRoutine(guard,200).moving,false,'guard must not moonwalk in place');
});
test('Block 3: painted paths wind subtly and meet exactly at original world coordinates',()=>{
 const route=[[-7,0],[-7,20],[13,20]],width=4.65;
 const polygons=organicRoadPolygons([route],width);
 assert.ok(polygons.length>10);
 const centers=polygons.slice(0,10).map(q=>(q[0][0]+q[3][0])/2);
 assert.ok(centers.some(x=>Math.abs(x+7)>.004),'road should not be a ruler straight strip');
 const vertices=polygons.flat(2);
 assert.ok(vertices.every(Number.isFinite));
 const first=polygons[0],last=polygons.at(-1);
 assert.ok(Math.abs((first[0][0]+first[3][0])/2-route[0][0])<.001);
 assert.ok(Math.abs((last[1][0]+last[2][0])/2-route.at(-1)[0])<.001);
 assert.ok(Math.abs((last[1][1]+last[2][1])/2-route.at(-1)[1])<.001);
 for(let i=1;i<polygons.length;i++){
  assert.ok(Math.hypot(polygons[i-1][1][0]-polygons[i][0][0],polygons[i-1][1][1]-polygons[i][0][1])<1e-5);
  assert.ok(Math.hypot(polygons[i-1][2][0]-polygons[i][3][0],polygons[i-1][2][1]-polygons[i][3][1])<1e-5);
 }
});
