import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 OAKREST_WELL,OAKREST_WELL_STEPS,OAKREST_PATHS,OAKREST_BUILDINGS,OAKREST_MARKET_STALLS,roadQuads,roadCrossSections,
 OAKREST_TRADE_TABLES,OAKREST_GARDEN_BENCHES,OAKREST_SQUARE_BENCHES,
 OAKREST_CITY_LAMPS,OAKREST_SIGNPOSTS,OAKREST_MARKET_CRATES,
 OAKREST_MARKET_BARRELS,OAKREST_VEGETABLE_BEDS
} from '../src/town-layout.js';
import {buildOakrestTown} from '../src/town-world.js';
import {createOakrestTownLife} from '../src/town-life.js';
import {OAKREST_SERVICES,townInteraction} from '../src/town-services.js';
import {blocked,terrainHeight,moveOnGround,clearWorldObstacles} from '../src/terrain.js';

/** Paving tests inspect the same mitred polygons as the actual Three.js road renderer. */
const allRoadQuads=roadQuads();
function corners(x,z,hx,hz){return [[x-hx,z-hz],[x+hx,z-hz],[x+hx,z+hz],[x-hx,z+hz]];}
function projections(pts,axis){
 const values=pts.map(v=>v[0]*axis[0]+v[1]*axis[1]);
 return [Math.min(...values),Math.max(...values)];
}
function pointToSegment(x,z,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;
 const t=len2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/len2)):0;
 return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
function pointInPolygon(x,z,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a[1]>z)!==(b[1]>z) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function distanceToPavedRoad(x,z,quad){
 if(pointInPolygon(x,z,quad))return 0;
 return Math.min(...quad.map((p,i)=>pointToSegment(x,z,p,quad[(i+1)%quad.length])));
}
function roadIntersectsFixture(x,z,hx,hz,road,clearance=.10){
 const item=corners(x,z,hx+clearance,hz+clearance);
 const axes=[[1,0],[0,1]];
 for(let i=0;i<road.length;i++){
  const a=road[i],b=road[(i+1)%road.length];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  axes.push([-dz/length,dx/length]);
 }
 return axes.every(axis=>{
  const [al,ah]=projections(road,axis),[bl,bh]=projections(item,axis);
  return al<bh&&bl<ah;
 });
}
const fixtures=[
 ...OAKREST_MARKET_STALLS.map((v,i)=>({name:'canopy '+i,...v,hx:2.05,hz:1.35})),
 ...OAKREST_TRADE_TABLES.map((v,i)=>({name:'trade '+i,...v,hx:1.1,hz:.75})),
 ...OAKREST_MARKET_CRATES.map(([x,z,scale],i)=>({name:'crate '+i,x,z,hx:scale*.5,hz:scale*.5})),
 ...OAKREST_MARKET_BARRELS.map(([x,z],i)=>({name:'barrel '+i,x,z,hx:.48,hz:.48})),
 ...OAKREST_VEGETABLE_BEDS.map(([x,z],i)=>({name:'garden bed '+i,x,z,hx:1.55,hz:.78})),
 ...OAKREST_CITY_LAMPS.map(([x,z],i)=>({name:'lamp '+i,x,z,hx:.22,hz:.22})),
 ...OAKREST_SIGNPOSTS.map(([x,z],i)=>({name:'signpost '+i,x,z,hx:.18,hz:.18})),
 ...OAKREST_SQUARE_BENCHES.map(([x,z,a],i)=>({name:'square bench '+i,x,z,hx:1.43,hz:.78})),
 ...OAKREST_GARDEN_BENCHES.map((v,i)=>({name:'park bench '+i,x:v.x,z:v.z,
    hx:Math.abs(Math.cos(v.angle))*1.4+Math.abs(Math.sin(v.angle))*.42,
    hz:Math.abs(Math.sin(v.angle))*1.4+Math.abs(Math.cos(v.angle))*.42}))
];

test('merchant well lives in its own courtyard rather than the east-west street',()=>{
 assert.deepEqual([OAKREST_WELL.x,OAKREST_WELL.z],[18,36]);
 for(const quad of allRoadQuads){
  const distance=distanceToPavedRoad(OAKREST_WELL.x,OAKREST_WELL.z,quad);
  assert.ok(distance>OAKREST_WELL.courtyardRadius+OAKREST_WELL.roadSetback,
   'whole WELL COURTYARD requires a generous verge from the REAL paving polygon '+JSON.stringify(quad)+', distance '+distance);
 }
 clearWorldObstacles();
 const scene=new THREE.Scene();
 buildOakrestTown(scene);
 try{
  const well=scene.getObjectByName('Merchant Quarter Well');
  assert.ok(well,'missing actual relocated well');
  assert.deepEqual([well.position.x,well.position.z],[OAKREST_WELL.x,OAKREST_WELL.z]);
  assert.equal(blocked(6,19,.30),false,'ghost collision from the former road well');
  assert.equal(blocked(OAKREST_WELL.x,OAKREST_WELL.z,.25),true);
  for(const z of [32.8,39.2])assert.equal(blocked(18,z,.30),false,'well access is blocked at '+z);
  assert.equal(blocked(0,-13,.32),false,'the Southgate passage stays open');
  assert.equal(blocked(0,86,.32),false,'the Northgate passage stays open');
  for(const z of [-13,85])for(const x of [-44,44])
   assert.equal(blocked(x,z,.30),true,'outer wall corner must be joined at '+x+','+z);
  assert.equal(scene.getObjectByName('Southgate')?.userData.cityLandmark,'southgate');
  assert.equal(scene.getObjectByName('Well cobblestone courtyard')?.geometry.type,'CircleGeometry');
  assert.equal(scene.children.filter(o=>o.name==='Well approach stepping stone').length,OAKREST_WELL_STEPS.length,
   'approach must use narrow stones rather than full-width paved roads');
  for(const [sx,sz] of OAKREST_WELL_STEPS){
   assert.ok(Math.hypot(sx-OAKREST_WELL.x,sz-OAKREST_WELL.z)>OAKREST_WELL.courtyardRadius+.30,
    'stepping stones must remain outside the well apron');
  }
 }finally{clearWorldObstacles();}
});
test('market furniture, benches and planters have real setbacks from roads and buildings',()=>{
 for(const v of fixtures){
  for(const quad of allRoadQuads){
   assert.equal(roadIntersectsFixture(v.x,v.z,v.hx,v.hz,quad),false,
    v.name+' intersects the rendered street paving '+JSON.stringify(quad));
  }
  for(const house of OAKREST_BUILDINGS){
   const sideways=house.face==='east'||house.face==='west';
   const hx=(sideways?house.d:house.w)/2,hz=(sideways?house.w:house.d)/2;
   const dx=Math.abs(v.x-house.x),dz=Math.abs(v.z-house.z);
   assert.ok(dx>=v.hx+hx+.12||dz>=v.hz+hz+.12,
    v.name+' crosses the wall of '+house.id);
  }
 }
});
test("city's main route, both interiors and townfolk remain accessible after prop moves",()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene();buildOakrestTown(scene);
 const life=createOakrestTownLife(scene);
 try{
  for(const staff of OAKREST_SERVICES){
   assert.equal(townInteraction(staff.npcX,staff.npcZ)?.id,staff.id);
   assert.equal(blocked(staff.npcX,staff.npcZ,.30),false,staff.id+' worker was obstructed');
  }
  let pos={x:0,z:18,y:terrainHeight(0,18)};
  for(let i=0;i<90;i++)pos=moveOnGround(pos,.25,0,.30);
  assert.ok(pos.x>21,'merchant quarter east-west main road no longer navigable');
  const start=life.snapshot();
  for(let i=0;i<120;i++)life.update(.1,i*.1,{x:0,z:24},true);
  assert.ok(life.snapshot().filter((v,i)=>Math.hypot(v.x-start[i].x,v.z-start[i].z)>1).length>=5,
   'town routes stop when stalls are positioned correctly');
  assert.ok(life.snapshot().every(v=>!blocked(v.x,v.z,.22)),
   'townfolk walk through placed obstacles');
 }finally{clearWorldObstacles();}
});


test('decorative props do not overlap one another or the well court',()=>{
 for(let i=0;i<fixtures.length;i++){
  const a=fixtures[i];
  // Check the actual footprint of each prop, not only the point at its centre.
  const dx=Math.max(0,Math.abs(a.x-OAKREST_WELL.x)-a.hx);
  const dz=Math.max(0,Math.abs(a.z-OAKREST_WELL.z)-a.hz);
  assert.ok(Math.hypot(dx,dz)>OAKREST_WELL.courtyardRadius+.30,
   a.name+' visually crowds or clips into well courtyard');
  for(let j=i+1;j<fixtures.length;j++){
   const b=fixtures[j];
   const touches=Math.abs(a.x-b.x)<a.hx+b.hx+.06&&
     Math.abs(a.z-b.z)<a.hz+b.hz+.06;
   assert.equal(touches,false,a.name+' and '+b.name+' overlap or lack a clear visual join');
  }
 }
});


test('street bends are connected mitres rather than individually capped rectangles',()=>{
 for(const route of OAKREST_PATHS){
  const joins=roadCrossSections(route);
  assert.equal(joins.length,route.length);
  for(const section of joins){
   const width=Math.hypot(section.left[0]-section.right[0],section.left[1]-section.right[1]);
   assert.ok(width>=5.39&&width<=8.1,'road join is missing or blows up at corner');
  }
 }
 assert.equal(allRoadQuads.length,OAKREST_PATHS.reduce((sum,path)=>sum+path.length-1,0));
});
