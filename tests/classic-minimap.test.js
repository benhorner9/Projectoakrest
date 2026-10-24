import test from 'node:test';
import assert from 'node:assert/strict';
import {OAKREST_BUILDINGS,OAKREST_PATHS} from '../src/town-layout.js';
import {OAKREST_SERVICES} from '../src/town-services.js';
import {CLASSIC_CAMERA,CLASSIC_LIMITS} from '../src/classic-presentation.js';
import {CLASSIC_MAP_FEATURES,worldToMinimap,minimapToWorld,fullMapTransform,fullMapWorld} from '../src/classic-minimap.js';

test('minimap uses original Oakrest building, road and service definitions (not copies)',()=>{
 assert.equal(CLASSIC_MAP_FEATURES.buildings,OAKREST_BUILDINGS);
 assert.equal(CLASSIC_MAP_FEATURES.roads,OAKREST_PATHS);
 assert.equal(CLASSIC_MAP_FEATURES.services,OAKREST_SERVICES);
 assert.equal(CLASSIC_MAP_FEATURES.bounds,CLASSIC_LIMITS);
 assert.equal(CLASSIC_MAP_FEATURES.buildings.length,16);
 for(const service of OAKREST_SERVICES){
  const building=OAKREST_BUILDINGS.find(b=>b.id===service.id);
  assert.ok(building,'every service has canonical building');
  assert.deepEqual([service.x,service.z],[building.x,building.z]);
 }
});
test('minimap geographic projection is north-up with stable player centre',()=>{
 const player={x:-13,z:40};
 assert.deepEqual(worldToMinimap(player,player),{x:80,y:80});
 const north=worldToMinimap({x:player.x,z:player.z+6},player);
 assert.ok(north.y<80);
 const east=worldToMinimap({x:player.x+6,z:player.z},player);
 assert.ok(east.x>80);
 for(const target of [{x:-30,z:14},{x:30,z:14},{x:15,z:64.5},{x:2,z:77}]){
  const px=worldToMinimap(target,player,160,3.3),back=minimapToWorld(px,player,160,3.3);
  assert.ok(Math.abs(back.x-target.x)<1e-8);
  assert.ok(Math.abs(back.z-target.z)<1e-8);
 }
});
test('expanded map screen location converts back to canonical world space',()=>{
 for(const [w,h] of [[440,510],[620,600],[1200,800]]){
  const t=fullMapTransform(w,h);
  assert.ok(t.scale>0&&Number.isFinite(t.scale));
  for(const target of OAKREST_SERVICES){
   const pixel={x:t.x+(target.x-CLASSIC_LIMITS.minX)*t.scale,
    y:t.y+(CLASSIC_LIMITS.maxZ-target.z)*t.scale};
   const actual=fullMapWorld(pixel,w,h);
   assert.ok(Math.hypot(actual.x-target.x,actual.z-target.z)<1e-8);
  }
 }
});

test('camera-relative forward movement agrees with fixed north-up minimap',()=>{
 const camera=CLASSIC_CAMERA;
 const length=Math.hypot(camera.offsetX,camera.offsetZ);
 const forward={x:-camera.offsetX/length,z:-camera.offsetZ/length};
 const origin={x:0,z:39};
 const mapOrigin=worldToMinimap(origin,origin);
 const moved=worldToMinimap({x:origin.x+forward.x*4,z:origin.z+forward.z*4},origin);
 assert.ok(moved.y<mapOrigin.y,'W/northward movement rises on map, not down');
 assert.ok(Math.abs(moved.x-mapOrigin.x)<(mapOrigin.y-moved.y)*.5,
  'forward travel should be visibly northward, not a diagonal');
});
