import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAKREST_BUILDINGS,buildOakrestTown} from '../src/town-world.js';
import {FACING} from '../src/town-layout.js';
import {buildingCutaway,playerInBuilding,indoorViewHeight} from '../src/building-visibility.js';
import {clearWorldObstacles,blocked,moveOnGround,terrainHeight} from '../src/terrain.js';
import {batchScenery} from '../src/environment.js';

function world(build,x,z){
 const a=FACING[build.face];
 return {x:build.x+x*Math.cos(a)+z*Math.sin(a),
         z:build.z-x*Math.sin(a)+z*Math.cos(a)};
}
test('all 15 town buildings allow view-dependent roof/front/near-wall cutaways without losing collision',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  scene.updateMatrixWorld(true);
  assert.equal(town.buildings,15);
  for(const b of OAKREST_BUILDINGS){
   const player=world(b,0,0),camera=world(b,b.w+2,b.d+4);
   const roof=scene.getObjectByName(b.id+' removable roof');
   assert.ok(roof,b.id+' roof missing');
   assert.equal(playerInBuilding(b,player.x,player.z),true);
   assert.deepEqual(buildingCutaway(b,player,camera).hidden,['front','right']);
   assert.ok(indoorViewHeight(b)>=7.5,'indoor camera must show most of the room');
   town.update(player,0,camera);
   assert.equal(roof.visible,false,b.id+' roof must be removed from view indoors');
   const root=roof.parent;
   const pieces=Object.fromEntries(['front','back','left','right'].map(side=>[
    side,root.children.filter(m=>m.userData.cutawaySide===side)
   ]));
   for(const side of Object.keys(pieces))assert.ok(pieces[side].length>=1,b.id+' '+side+' has no distinct drawable wall');
   assert.ok(pieces.front.every(m=>!m.visible),b.id+' facade still blocks view');
   assert.ok(pieces.right.every(m=>!m.visible),b.id+' camera-side wall blocks view');
   assert.ok(pieces.left.every(m=>m.visible),b.id+' far side missing');
   assert.ok(pieces.back.every(m=>m.visible),b.id+' rear wall missing');
   const behind=world(b,-b.w-2,-b.d-4);
   town.update(player,0,behind);
   assert.ok(pieces.left.every(m=>!m.visible),b.id+' cannot open opposite viewpoint');
   assert.ok(pieces.back.every(m=>!m.visible),b.id+' rear view remains obscured');
   const outside=world(b,0,b.d+8);
   town.update(outside,0,camera);
   assert.equal(roof.visible,true,b.id+' roof not restored outdoors');
   assert.ok(Object.values(pieces).flat().every(m=>m.visible),b.id+' facade fails to restore outside');
   const justOutside=world(b,0,b.d*.5+.6);
   town.update(justOutside,0,camera);
   assert.equal(roof.visible,false,b.id+' entering door should open the view before collision');
   // Solid wall colliders must continue working even when the wall is invisible.
   const door=world(b,0,b.d/2),wing=world(b,b.w*.36,b.d/2);
   assert.equal(blocked(door.x,door.z,.30),false,b.id+' door blocked');
   assert.equal(blocked(wing.x,wing.z,.30),true,b.id+' invisible wall lost collision');
   const start=world(b,0,b.d/2+1.35);
   const end=world(b,0,b.d/2-1.35);
   const moved=moveOnGround({x:start.x,z:start.z,y:terrainHeight(start.x,start.z)},
    end.x-start.x,end.z-start.z,.30);
   assert.ok(Math.hypot(moved.x-end.x,moved.z-end.z)<.55,b.id+' doorway is hard to enter');
  }
 }finally{clearWorldObstacles();}
});
test('camera-facing cutaway is not destroyed by static mesh batching',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  batchScenery(scene);
  for(const b of OAKREST_BUILDINGS){
   const player=world(b,0,0),camera=world(b,0,b.d+4);
   town.update(player,0,camera);
   const roof=scene.getObjectByName(b.id+' removable roof');
   const front=roof.parent.children.filter(m=>m.userData.cutawaySide==='front');
   assert.ok(front.length>5,b.id+' front geometry was merged into the static world');
   assert.ok(front.every(m=>!m.visible),b.id+' front not hidden after mesh batching');
  }
 }finally{clearWorldObstacles();}
});
test('all room types have visible finished architecture and a clean, unobstructed central aisle',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),town=buildOakrestTown(scene);
 try{
  const kinds=new Set(OAKREST_BUILDINGS.map(b=>b.kind));
  assert.ok(['home','bank','store','forester','guard','workshop','hall'].every(k=>kinds.has(k)));
  for(const b of OAKREST_BUILDINGS){
   const roof=scene.getObjectByName(b.id+' removable roof');
   const main=roof.parent;
   assert.ok(main.children.some(m=>m.name===b.id+' finished interior floor'),b.id+' no floor');
   const sections=main.children.filter(m=>m.userData.cutawaySide);
   assert.ok(sections.length>=8,b.id+' has missing cutaway geometry');
   assert.ok(new Set(sections.map(m=>m.userData.cutawaySide)).size===4,
    b.id+' should have independently hideable walls on all four sides');
   assert.ok(sections.length<=100,b.id+' architectural detail exceeds the intended iPad draw budget');
   const indoors=world(b,0,b.d*.18);
   assert.equal(blocked(indoors.x,indoors.z,.30),false,b.id+' furnished entrance aisle obstructed');
  }
  assert.ok(scene.getObjectByName('Oakrest Bank Grand Hall'));
  assert.ok(scene.getObjectByName('Oakrest iron vault door'));
  assert.ok(scene.getObjectByName('Bank three teller counter'));
 }finally{clearWorldObstacles();}
});
