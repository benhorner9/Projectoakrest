import test from 'node:test';
import assert from 'node:assert/strict';
import {stickFromOffset,cameraKeyDirection,cameraSensitivity} from '../src/controls.js';
test('joystick centre has a deadzone',()=>{const s=stickFromOffset(1,2,40);assert.equal(s.x,0);assert.equal(s.y,0);});
test('joystick clamp and direction',()=>{const s=stickFromOffset(0,-80,40);assert.equal(s.y,-1);assert.equal(s.knobY,-40);const d=stickFromOffset(40,40,40);assert.ok(Math.hypot(d.x,d.y)<=1.0001);});
test('invalid joystick inputs never create NaN',()=>{assert.deepEqual(stickFromOffset(NaN,0,40),{x:0,y:0,knobX:0,knobY:0});});
test('arrow keys turn in opposite directions',()=>{assert.equal(cameraKeyDirection(true,false),-1);assert.equal(cameraKeyDirection(false,true),1);assert.equal(cameraKeyDirection(true,true),0);});
test('camera sensitivity is constrained',()=>{assert.equal(cameraSensitivity('bad'),1);assert.equal(cameraSensitivity(0),.6);assert.equal(cameraSensitivity(3),1.8);});
