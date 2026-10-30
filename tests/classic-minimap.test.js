import test from 'node:test';
import assert from 'node:assert/strict';
import {OAKREST_BUILDINGS,OAKREST_PATHS} from '../src/town-layout.js';
import {CLASSIC_ROADS,CLASSIC_PERIMETER} from '../src/classic-town-plan.js';
import {OAKREST_SERVICES} from '../src/town-services.js';
import {CLASSIC_CAMERA,CLASSIC_LIMITS,classicScreenBasis} from '../src/classic-presentation.js';
import {CLASSIC_MAP_FEATURES,worldToMinimap,minimapToWorld,fullMapTransform,fullMapPoint,fullMapWorld} from '../src/classic-minimap.js';

test('minimap retains all original buildings/services and uses the shared Classic circuit/wall layout',()=>{
 assert.equal(CLASSIC_MAP_FEATURES.buildings,OAKREST_BUILDINGS);
 assert.equal(CLASSIC_MAP_FEATURES.roads,CLASSIC_ROADS);
 assert.ok(CLASSIC_ROADS.length>OAKREST_PATHS.length);
 assert.equal(CLASSIC_MAP_FEATURES.walls,CLASSIC_PERIMETER.walls);
 assert.equal(CLASSIC_MAP_FEATURES.gates,CLASSIC_PERIMETER.gates);
 assert.equal(CLASSIC_MAP_FEATURES.services,OAKREST_SERVICES);
 assert.equal(CLASSIC_MAP_FEATURES.bounds,CLASSIC_LIMITS);
 assert.equal(CLASSIC_MAP_FEATURES.buildings.length,16);
 for(const service of OAKREST_SERVICES){
  const building=OAKREST_BUILDINGS.find(b=>b.id===service.id);
  assert.ok(building,'every service has canonical building');
  assert.deepEqual([service.x,service.z],[building.x,building.z]);
 }
});
test('corner minimap matches screen-left, screen-right and screen-up controls',()=>{
 const player={x:-13,z:40};
 const {right,up}=classicScreenBasis();
 assert.deepEqual(worldToMinimap(player,player),{x:80,y:80});
 const left=worldToMinimap({x:player.x-right.x*6,z:player.z-right.z*6},player);
 const rightPoint=worldToMinimap({x:player.x+right.x*6,z:player.z+right.z*6},player);
 const forward=worldToMinimap({x:player.x+up.x*6,z:player.z+up.z*6},player);
 assert.ok(left.x<80,'joystick left must move left on minimap, never right');
 assert.ok(rightPoint.x>80,'joystick right must move right on minimap');
 assert.ok(forward.y<80,'joystick up must move up on minimap');
 assert.ok(Math.abs(left.y-80)<1e-8,'left input cannot cause diagonal minimap motion');
 assert.ok(Math.abs(rightPoint.y-80)<1e-8);
 assert.ok(Math.abs(forward.x-80)<1e-8);
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
   const pixel=fullMapPoint(target,w,h);
   const actual=fullMapWorld(pixel,w,h);
   assert.ok(Math.hypot(actual.x-target.x,actual.z-target.z)<1e-8);
  }
 }
});

test('camera-forward movement points straight up on aligned corner minimap',()=>{
 const camera=CLASSIC_CAMERA;
 const length=Math.hypot(camera.offsetX,camera.offsetZ);
 const forward={x:-camera.offsetX/length,z:-camera.offsetZ/length};
 const origin={x:0,z:39};
 const mapOrigin=worldToMinimap(origin,origin);
 const moved=worldToMinimap({x:origin.x+forward.x*4,z:origin.z+forward.z*4},origin);
 assert.ok(moved.y<mapOrigin.y,'W camera-forward movement rises on minimap');
 assert.ok(Math.abs(moved.x-mapOrigin.x)<1e-8,
  'camera-forward travel must be straight up on the small minimap');
});

test('expanded north-up map agrees with initial horizontal movement and inverse touch location',()=>{
 // Rightward movement in the default south-facing view decreases world X.
 // The full map reflects this, while the world coordinates remain unchanged.
 const origin={x:0,z:39},basis=classicScreenBasis();
 assert.ok(basis.right.x<0,'default camera right has negative world-X');
 for(const [w,h] of [[440,510],[620,600],[1200,800]]){
  const centre=fullMapPoint(origin,w,h);
  const screenRight={x:origin.x+basis.right.x*8,z:origin.z+basis.right.z*8};
  const screenLeft={x:origin.x-basis.right.x*8,z:origin.z-basis.right.z*8};
  assert.ok(fullMapPoint(screenRight,w,h).x>centre.x,'rightward travel shifts marker right');
  assert.ok(fullMapPoint(screenLeft,w,h).x<centre.x,'leftward travel shifts marker left');
  assert.ok(fullMapPoint({x:origin.x,z:origin.z+8},w,h).y<centre.y,'north stays up');
  assert.ok(fullMapPoint({x:-20,z:origin.z},w,h).x>centre.x);
  assert.ok(fullMapPoint({x:20,z:origin.z},w,h).x<centre.x);
  for(const location of [origin,screenRight,screenLeft,{x:-35,z:17},{x:35,z:165}]){
   const point=fullMapPoint(location,w,h),back=fullMapWorld(point,w,h);
   assert.ok(Math.hypot(back.x-location.x,back.z-location.z)<1e-8,
    'projecting to a touch position and back must recover the exact world point');
  }
 }
});
