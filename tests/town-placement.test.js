import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 OAKREST_WELL,OAKREST_PATHS,OAKREST_BUILDINGS,OAKREST_MARKET_STALLS,
 OAKREST_TRADE_TABLES,OAKREST_GARDEN_BENCHES,OAKREST_SQUARE_BENCHES,
 OAKREST_CITY_LAMPS,OAKREST_SIGNPOSTS,OAKREST_MARKET_CRATES,
 OAKREST_MARKET_BARRELS,OAKREST_VEGETABLE_BEDS
} from '../src/town-layout.js';
import {buildOakrestTown} from '../src/town-world.js';
import {createOakrestTownLife} from '../src/town-life.js';
import {OAKREST_SERVICES,townInteraction} from '../src/town-services.js';
import {blocked,terrainHeight,moveOnGround,clearWorldObstacles} from '../src/terrain.js';

/** Road paving occupies an oriented width-5.4 rectangle, with flat ends. */
function pointToRoad(x,z,a,b,width=5.4){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
 const ux=dx/len,uz=dz/len,px=x-a[0],pz=z-a[1];
 const longitudinal=px*ux+pz*uz,lateral=Math.abs(px*(-uz)+pz*ux);
 return Math.hypot(Math.max(0,-longitudinal,longitudinal-len),Math.max(0,lateral-width/2));
}
function corners(x,z,hx,hz){return [[x-hx,z-hz],[x+hx,z-hz],[x+hx,z+hz],[x-hx,z+hz]];}
function projections(pts,axis){const p=pts.map(v=>v[0]*axis[0]+v[1]*axis[1]);return [Math.min(...p),Math.max(...p)];}
function roadIntersectsFixture(x,z,hx,hz,a,b,clearance=.10){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
 const nx=-uz, nz=ux,w=2.7;
 const road=[[a[0]+nx*w,a[1]+nz*w],[b[0]+nx*w,b[1]+nz*w],
  [b[0]-nx*w,b[1]-nz*w],[a[0]-nx*w,a[1]-nz*w]];
 const item=corners(x,z,hx+clearance,hz+clearance);
 return [[1,0],[0,1],[ux,uz],[nx,nz]].every(axis=>{
  const [al,ah]=projections(road,axis),[bl,bh]=projections(item,axis);
  return al<bh&&bl<ah;
 });
}
const allSegments=OAKREST_PATHS.flatMap(path=>path.slice(1).map((p,i)=>[path[i],p]));
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
 for(const [a,b] of allSegments){
  const distance=pointToRoad(OAKREST_WELL.x,OAKREST_WELL.z,a,b);
  assert.ok(distance>OAKREST_WELL.roofRadius+.30,
   'well canopy intersects road '+JSON.stringify([a,b])+', distance '+distance);
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
  assert.equal(scene.getObjectByName('Southgate')?.userData.cityLandmark,'southgate');
  assert.equal(scene.getObjectByName('Well cobblestone courtyard')?.geometry.type,'CircleGeometry');
 }finally{clearWorldObstacles();}
});
test('market furniture, benches and planters have real setbacks from roads and buildings',()=>{
 for(const v of fixtures){
  for(const [a,b] of allSegments){
   assert.equal(roadIntersectsFixture(v.x,v.z,v.hx,v.hz,a,b),false,
    v.name+' intersects the walking path '+JSON.stringify([a,b]));
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
test('city's main route, both interiors and townfolk remain accessible after prop moves',()=>{
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
