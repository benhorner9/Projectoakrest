import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_CAMERA,classicScreenBasis,spriteDirection} from '../src/classic-presentation.js';
import {CLASSIC_CAMERA_DEFAULT,CLASSIC_CAMERA_RANGE,cameraOffsetFor,createClassicOrbitCamera} from '../src/classic-camera-controls.js';
import {worldToMinimap,minimapToWorld} from '../src/classic-minimap.js';

const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,JSON.stringify({a,b,tol}));
test('default Classic view has precisely the original horizontal offset, height and map directions',()=>{
 const cam=createClassicOrbitCamera();
 const {offset,basis}=cam.state();
 near(offset.x,CLASSIC_CAMERA.offsetX);
 near(offset.y,CLASSIC_CAMERA.elevation);
 near(offset.z,CLASSIC_CAMERA.offsetZ);
 const expected=classicScreenBasis();
 near(basis.right.x,expected.right.x);
 near(basis.up.z,expected.up.z);
 near(cam.state().pitch,CLASSIC_CAMERA_DEFAULT.pitch);
});
test('arrow input rotates around player without moving the world or changing save state',()=>{
 const cam=createClassicOrbitCamera();
 const before=cam.state();
 cam.step(new Set(['arrowright']),.1);
 const after=cam.state();
 assert.ok(after.yaw>before.yaw);
 near(after.pitch,before.pitch);
 const a=Math.hypot(before.offset.x,before.offset.y,before.offset.z);
 const b=Math.hypot(after.offset.x,after.offset.y,after.offset.z);
 near(a,b);
 cam.step(new Set(['arrowleft']),.1);
 near(cam.state().yaw,before.yaw);
 cam.step(new Set(['arrowup']),.1);
 assert.ok(cam.state().pitch>before.pitch);
 cam.step(new Set(['arrowdown']),.1);
 near(cam.state().pitch,before.pitch);
});
test('look up/down stops before ground horizon or exact top-down, and the orbit is continuous through 360',()=>{
 const cam=createClassicOrbitCamera();
 for(let i=0;i<500;i++)cam.step(new Set(['arrowup']),.1);
 near(cam.state().pitch,CLASSIC_CAMERA_RANGE.maxPitch);
 for(let i=0;i<500;i++)cam.step(new Set(['arrowdown']),.1);
 near(cam.state().pitch,CLASSIC_CAMERA_RANGE.minPitch);
 assert.ok(cam.state().offset.y>0);
 const start=createClassicOrbitCamera(),before=start.state().offset;
 start.turn(2*Math.PI);
 const after=start.state().offset;
 near(after.x,before.x);near(after.z,before.z);
 start.reset();
 near(start.state().yaw,CLASSIC_CAMERA_DEFAULT.yaw);
 near(start.state().pitch,CLASSIC_CAMERA_DEFAULT.pitch);
});
test('rotating camera drives the exact WASD and corner minimap basis including left/right',()=>{
 const cam=createClassicOrbitCamera(),origin={x:4,z:41};
 for(let i=0;i<12;i++){
  const {offset,basis}=cam.state();
  const rightWorld={x:origin.x+basis.right.x*5,z:origin.z+basis.right.z*5};
  const leftWorld={x:origin.x-basis.right.x*5,z:origin.z-basis.right.z*5};
  const forward={x:origin.x+basis.up.x*5,z:origin.z+basis.up.z*5};
  const right=worldToMinimap(rightWorld,origin,160,3.45,offset);
  const left=worldToMinimap(leftWorld,origin,160,3.45,offset);
  const up=worldToMinimap(forward,origin,160,3.45,offset);
  assert.ok(right.x>80&&left.x<80&&up.y<80);
  near(right.y,80);near(left.y,80);near(up.x,80);
  const back=minimapToWorld(right,origin,160,3.45,offset);
  near(back.x,rightWorld.x);near(back.z,rightWorld.z);
  cam.turn(Math.PI/6);
 }
});
test('all eight direction sprites rotate relative to the camera and reset correctly',()=>{
 const cam=createClassicOrbitCamera();
 const one=spriteDirection(0,1,cam.offset());
 cam.turn(Math.PI);
 const other=spriteDirection(0,1,cam.offset());
 assert.equal((one+4)%8,other);
 cam.reset();
 assert.equal(spriteDirection(0,1,cam.offset()),one);
 assert.equal(spriteDirection(0,1),one,'default rendering remains backward compatible');
});
test('invalid frame deltas and extreme tilt never expose NaNs',()=>{
 const cam=createClassicOrbitCamera();
 const start=cam.state().yaw;
 cam.step(new Set(['arrowright']),NaN);
 near(cam.state().yaw,start);
 const s=cam.step(new Set(['arrowright']),100);
 assert.ok(Number.isFinite(s.yaw));
 const p=cameraOffsetFor({yaw:s.yaw,pitch:s.pitch});
 for(const coordinate of [p.x,p.y,p.z])assert.ok(Number.isFinite(coordinate));
});
