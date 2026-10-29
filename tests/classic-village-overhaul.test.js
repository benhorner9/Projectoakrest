import test from 'node:test';
import assert from 'node:assert/strict';
import {OAKREST_BUILDINGS,OAKREST_PATHS,localBuildingPosition} from '../src/town-layout.js';
import {OAKREST_SERVICES} from '../src/town-services.js';
import {CLASSIC_ROADS,CLASSIC_LOOP_PATHS,CLASSIC_DISTRICTS,CLASSIC_PERIMETER,wallSolidAt} from '../src/classic-town-plan.js';
import {solidAt,occupantBuilding,slideMove,findClassicPath,CLASSIC_TREES} from '../src/classic-presentation.js';

test('four gated stone wall runs join every corner with no unplanned entrances',()=>{
 assert.equal(CLASSIC_PERIMETER.gates.length,4);
 assert.equal(CLASSIC_PERIMETER.walls.length,8);
 for(const gate of CLASSIC_PERIMETER.gates){
  assert.equal(wallSolidAt(gate.x,gate.z),false,gate.id+' gap admits players');
  assert.equal(solidAt(gate.x,gate.z),false,gate.id+' is an actual navigable passage');
  const horizontal=gate.orientation==='horizontal';
  const nearSide={x:gate.x+(horizontal?5.5:0),z:gate.z+(horizontal?0:5.5)};
  assert.equal(solidAt(nearSide.x,nearSide.z),true,gate.id+' is defended beside entrance');
 }
 for(const [x,z] of [[-46,-16],[-46,86],[46,-16],[46,86],[-46,5],[46,60],[20,-16],[-20,86]]){
  assert.equal(solidAt(x,z),true,'wall closed at '+[x,z]);
 }
 assert.equal(solidAt(0,-16),false,'southern gateway open');
 assert.equal(solidAt(0,86),false,'northern gateway open');
 assert.equal(solidAt(46,39),false,'eastern gateway open');
 assert.equal(solidAt(-46,39),false,'western gateway open');
});
test('reduced village lanes connect four gates and keep the green commons open',()=>{
 assert.ok(CLASSIC_LOOP_PATHS.length>=4&&CLASSIC_LOOP_PATHS.length<=8);
 assert.ok(CLASSIC_ROADS.length<=24,'the old road mesh dominated the village');
 assert.equal(CLASSIC_ROADS.length,OAKREST_PATHS.length+CLASSIC_LOOP_PATHS.length);
 assert.equal(CLASSIC_ROADS[0],OAKREST_PATHS[0]);
 assert.equal(CLASSIC_DISTRICTS.length,5);
 assert.ok(CLASSIC_ROADS.some(route=>route.some(([x,z])=>x===-46&&z===39)));
 assert.ok(CLASSIC_ROADS.some(route=>route.some(([x,z])=>x===46&&z===39)));
 for(const service of OAKREST_SERVICES){
  const b=OAKREST_BUILDINGS.find(b=>b.id===service.id);
  assert.ok(b);
  assert.deepEqual([b.x,b.z],[service.x,service.z]);
  assert.equal(occupantBuilding(service.npcX,service.npcZ)?.id,service.id);
 }
 for(const tree of CLASSIC_TREES){
  assert.ok(!(tree.x>-44&&tree.x<44&&tree.z>-14&&tree.z<84),
    'wild tree may not puncture the inner wall and side routes');
 }
});
test('every facade and corner is solid apart from each deliberately open doorway',()=>{
 for(const b of OAKREST_BUILDINGS){
  const project=(x,z)=>{
   // inverse of localBuildingPosition rotation
   const a={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2}[b.face];
   return {x:b.x+x*Math.cos(a)+z*Math.sin(a),z:b.z-x*Math.sin(a)+z*Math.cos(a)};
  };
  // Every perimeter has a closed back wall, both side walls and two
  // front shoulders. This tests real collision, not mesh counts.
  for(const [x,z] of [[0,-b.d/2],[-b.w/2,0],[b.w/2,0],
   [-b.w/2,b.d/2],[b.w/2,b.d/2],[-b.w/2+.55,b.d/2],[b.w/2-.55,b.d/2]]){
   const p=project(x,z);
   assert.equal(solidAt(p.x,p.z),true,b.id+' must have a closed wall/corner at '+[x,z]);
  }
  const door=project(0,b.d/2);
  assert.equal(solidAt(door.x,door.z),false,b.id+' entrance cannot be filled in');
 }
});
test('gates allow physical routes across the town wall, but closed wall blocks direct travel',()=>{
 const north=slideMove({x:0,z:84},0,5);
 assert.ok(north.z>86.8,'north gate leads into the training frontier');
 const closed=slideMove({x:18,z:84},0,5);
 assert.ok(closed.z<86,'solid north parapet blocks walking through');
 const path=findClassicPath({x:0,z:80},{x:0,z:91});
 assert.ok(path.length>0,'walk from village to northern monsters via gate');
 let start={x:0,z:80};
 for(const point of path){
  const d=Math.hypot(point.x-start.x,point.z-start.z);
  for(let i=1;i<=Math.ceil(d/.2);i++){
   const t=i/Math.ceil(d/.2);
   assert.equal(solidAt(start.x+(point.x-start.x)*t,start.z+(point.z-start.z)*t),false);
  }
  start=point;
 }
});
