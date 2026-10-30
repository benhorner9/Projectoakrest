import test from 'node:test';
import assert from 'node:assert/strict';
import {REGIONAL_BOUNDS,REGIONAL_HUBS,REGIONAL_ROADS,REGIONAL_BUILDINGS,
 REGIONAL_TREES,REGIONAL_CAMPS,REGIONAL_CAMP_TENTS,REGIONAL_GATHERING,REGIONAL_RESOURCE_TARGETS,
 REGIONAL_ENCOUNTERS,REGIONAL_HABITATS,regionalSolidAt,regionalLineClear,
 regionalSafeAt,distanceToPolyline,validateRegionalWorld} from '../src/classic-world-expansion.js';
import {CLASSIC_LIMITS,solidAt,clearClassicLine,findClassicPath} from '../src/classic-presentation.js';
import {CLASSIC_OVERWORLD_SPAWNS} from '../src/classic-world-spawns.js';
import {CLASSIC_WORLD_ZONES,worldZoneAt,validateWorldAtlas} from '../src/classic-world-atlas.js';
import {ADVENTURE_TARGETS} from '../src/adventure-content.js';
import {isOakrestSafe} from '../src/town-services.js';
import {CLASSIC_MAP_FEATURES,fullMapWorld,fullMapTransform} from '../src/classic-minimap.js';
import {CLASSIC_PERIMETER} from '../src/classic-town-plan.js';

const near=(a,b,epsilon=1e-6)=>Math.hypot(a.x-b.x,a.z-b.z)<epsilon;
test('the illustrated region has five cities, three towns, two farms and connected named roads',()=>{
 const result=validateRegionalWorld();
 assert.deepEqual(result,{cities:5,towns:3,farms:2,roads:15,camps:8,activeCamps:3,gathering:8});
 assert.deepEqual(REGIONAL_HUBS.filter(x=>x.kind==='city').map(h=>h.name),
  ['Oakrest City','Ironhold','Seabreach','Sunmere','Frostgate']);
 assert.equal(REGIONAL_HUBS.filter(h=>h.kind==='town').length,3);
 assert.equal(REGIONAL_HUBS.filter(h=>h.kind==='farm').length,2);
 assert.equal(REGIONAL_HUBS.find(h=>h.id==='oakrest').x,0);
 assert.equal(REGIONAL_HUBS.find(h=>h.id==='oakrest').z,39);
 for(const hub of REGIONAL_HUBS)assert.ok(REGIONAL_ROADS.some(r=>r.from===hub.id||r.to===hub.id),hub.id);
});

test('roads are derived from one physically renderable spline and all houses leave roads clear',()=>{
 for(const road of REGIONAL_ROADS){
  assert.ok(road.points.length>1,road.id);
  assert.ok(road.displayPoints.length>1,road.id);
  for(const p of road.points)assert.ok(p.every(Number.isFinite),road.id);
  const start=REGIONAL_HUBS.find(h=>h.id===road.from),end=REGIONAL_HUBS.find(h=>h.id===road.to);
  assert.ok(near({x:road.points[0][0],z:road.points[0][1]},start),road.id);
  assert.ok(near({x:road.points.at(-1)[0],z:road.points.at(-1)[1]},end),road.id);
  // Surface roads must not make their own destination physically inaccessible.
  for(const point of road.displayPoints.filter((_,i)=>i%Math.max(1,Math.floor(road.displayPoints.length/16))===0)){
   assert.equal(regionalSolidAt(point[0],point[1],.35),false,road.id+' is obstructed');
  }
 }
 for(const b of REGIONAL_BUILDINGS)for(const r of REGIONAL_ROADS)
  assert.ok(distanceToPolyline(b,r.points)>Math.max(b.w,b.d)*.5+4.4,'house blocks '+r.id+': '+b.id);
 assert.ok(REGIONAL_BUILDINGS.length>=20);
});

test('regional colliders and swept lines agree about houses and trees',()=>{
 for(const b of REGIONAL_BUILDINGS.slice(0,25)){
  assert.equal(regionalSolidAt(b.x,b.z),true,b.id);
  assert.equal(regionalLineClear({x:b.x-b.w,z:b.z},{x:b.x+b.w,z:b.z}),false,b.id);
 }
 for(const t of [...REGIONAL_TREES.slice(0,25),...REGIONAL_CAMP_TENTS]){
  assert.equal(regionalSolidAt(t.x,t.z),true,t.id||'tree');
  assert.equal(regionalLineClear({x:t.x-3,z:t.z},{x:t.x+3,z:t.z}),false);
 }
 assert.equal(regionalSolidAt(-370,-265),false);
 assert.equal(regionalLineClear({x:-370,z:-265},{x:-360,z:-265}),true);
});

test('the original town, story positions, save map orientation and dungeon remain in their coordinates',()=>{
 assert.deepEqual(CLASSIC_LIMITS,REGIONAL_BOUNDS);
 assert.equal(worldZoneAt({x:0,z:39})?.id,'OAK-VL-001');
 assert.equal(worldZoneAt({x:0,z:91})?.id,'OAK-WD-001');
 assert.equal(worldZoneAt({x:0,z:305})?.id,'OAK-DG-004');
 assert.equal(solidAt(18,36),true,'the old well must not disappear');
 for(const gate of CLASSIC_PERIMETER.gates){
  const approach=gate.id==='north'?{x:gate.x,z:gate.z+2}:gate.id==='south'?{x:gate.x,z:gate.z-2}:
    {x:gate.x+(gate.id==='east'?2:-2),z:gate.z};
  assert.equal(regionalSolidAt(approach.x,approach.z),false,'capital gate obstructed');
 }
 for(const [width,height] of [[320,500],[1024,768],[1440,820]]){
  const t=fullMapTransform(width,height),pos={x:285,z:-210};
  const result=fullMapWorld({x:t.x+(pos.x-CLASSIC_LIMITS.minX)*t.scale,
   y:t.y+(CLASSIC_LIMITS.maxZ-pos.z)*t.scale},width,height);
  assert.ok(near(result,pos,1e-6));
 }
 assert.equal(CLASSIC_MAP_FEATURES.regionalHubs,REGIONAL_HUBS);
 assert.equal(CLASSIC_MAP_FEATURES.regionalRoads,REGIONAL_ROADS);
});

test('only actually supported enemy species are active; new spawns keep stable IDs and habitats',()=>{
 assert.equal(REGIONAL_CAMPS.filter(c=>c.live).length,3);
 assert.equal(REGIONAL_ENCOUNTERS.length,6);
 const ids=new Set();
 for(const enemy of REGIONAL_ENCOUNTERS){
  assert.equal(ids.has(enemy.id),false);ids.add(enemy.id);
  assert.ok(['bandit','boar','mossling'].includes(enemy.type));
  assert.ok(CLASSIC_OVERWORLD_SPAWNS.some(s=>s.id===enemy.id));
  assert.ok(REGIONAL_HABITATS[enemy.habitat]);
  assert.equal(regionalSafeAt(enemy.x,enemy.z),false);
 }
 for(const c of REGIONAL_CAMPS.filter(c=>!c.live))
  assert.ok(!REGIONAL_ENCOUNTERS.some(e=>e.habitat==='region-'+c.id));
});

test('gathering sites never imply unsupported fishing, hunting, farming or herbalism gameplay',()=>{
 assert.equal(REGIONAL_GATHERING.filter(g=>g.live).length,3);
 for(const t of REGIONAL_RESOURCE_TARGETS){
  assert.equal(ADVENTURE_TARGETS.find(x=>x.id===t.id),t,'resource must connect to existing live interaction');
  assert.ok(['mining','woodcutting','foraging'].includes(t.profession));
  assert.equal(solidAt(t.x,t.z,.38),true,'existing resources remain solid to navigation');
 }
 for(const g of REGIONAL_GATHERING.filter(g=>!g.live))
  assert.ok(['fishing','hunting','herbalism','farming'].includes(g.skill));
});

test('named regional zones are inside the actual bounds and new safe centres are not hostile',()=>{
 assert.deepEqual(validateWorldAtlas(),{zones:33,entities:validateWorldAtlas().entities});
 for(const hub of REGIONAL_HUBS.filter(h=>!h.existing)){
  assert.equal(worldZoneAt(hub)?.name,hub.name);
  assert.equal(isOakrestSafe(hub.x,hub.z),true);
 }
 assert.equal(isOakrestSafe(0,39),true);
 assert.equal(isOakrestSafe(-150,183),false);
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.minX,-53);
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.maxX,53);
});

test('the west gate can navigate into the newly expanded reachable world',()=>{
 const westGate={x:-49,z:39},outerRoad={x:-70,z:39};
 assert.equal(solidAt(westGate.x,westGate.z),false);
 assert.equal(solidAt(outerRoad.x,outerRoad.z),false);
 const path=findClassicPath(westGate,outerRoad);
 assert.ok(path.length>0,'expanded world must be navigable from capital');
 assert.ok(near(path.at(-1),outerRoad,1e-5));
 assert.equal(clearClassicLine(westGate,outerRoad,.38),true);
});
