import test from 'node:test';
import assert from 'node:assert/strict';
import {characterFacingTarget} from '../src/controls.js';

test('standing idle preserves last movement-facing heading even if camera rotates',()=>{
 const wasFacingEast=-Math.PI/2;
 for(const mode of ['free','follow']){
  for(const cameraYaw of [0,.8,Math.PI,-Math.PI/3]){
   assert.equal(characterFacingTarget({mode,lastHeading:wasFacingEast,cameraYaw,velocityX:0,velocityZ:0}),wasFacingEast);
  }
 }
});
test('stopping after diagonal travel does not turn to front or camera',()=>{
 const travelling=characterFacingTarget({lastHeading:0,cameraYaw:0,velocityX:3,velocityZ:-3});
 assert.ok(Math.abs(travelling+Math.PI/4)<1e-6);
 const stopped=characterFacingTarget({lastHeading:travelling,cameraYaw:1.3,velocityX:.1,velocityZ:.04});
 assert.equal(stopped,travelling);
});
test('movement faces travel while melee and aiming deliberately face the attack',()=>{
 assert.equal(characterFacingTarget({lastHeading:1,velocityX:0,velocityZ:-5,cameraYaw:1.1}),0);
 assert.equal(characterFacingTarget({lastHeading:1,velocityX:3,velocityZ:0,cameraYaw:0}),-Math.PI/2);
 assert.equal(characterFacingTarget({lastHeading:1,cameraYaw:.4,combatFacing:true}),-.4);
 assert.equal(characterFacingTarget({lastHeading:1,cameraYaw:.4,combatFacing:true,strikeYaw:1.7}),-1.7);
 assert.equal(characterFacingTarget({mode:'follow',lastHeading:1,cameraYaw:.6,velocityX:2}),-.6);
});
test('attack heading remains visible once attack finishes and player is idle',()=>{
 const aimed=characterFacingTarget({lastHeading:0,cameraYaw:1.2,combatFacing:true});
 assert.equal(characterFacingTarget({lastHeading:aimed,cameraYaw:2.4}),aimed);
});
