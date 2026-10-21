import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMERA_DEFAULTS,normalizeCameraSettings,readCameraSettings,applyGamepadDeadzone,gamepadSnapshot,
 firstStandardGamepad,gamepadEdges,cameraOrbitVector,frameDamping} from '../src/control-config.js';

const pad=(options={})=>{
 const {axes=[0,0,0,0],pressed=[],index=0,mapping='standard'}=options;
 return {connected:true,mapping,index,id:'Test standard pad',axes,
  buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))};
};
test('camera settings validate and clamp extreme or corrupt persisted values',()=>{
 assert.deepEqual(normalizeCameraSettings({}),CAMERA_DEFAULTS);
 const settings=normalizeCameraSettings({zoom:500,fov:5,height:0,invertY:'true',smoothing:200,gamepadDeadzone:.01});
 assert.equal(settings.zoom,13);assert.equal(settings.fov,50);assert.equal(settings.height,1);
 assert.equal(settings.smoothing,20);assert.equal(settings.gamepadDeadzone,.1);assert.equal(settings.invertY,true);
 assert.equal(settings.mode,'free');
 assert.equal(normalizeCameraSettings({mode:'follow'}).mode,'follow');
 assert.equal(normalizeCameraSettings({mode:'locked'}).mode,'free');
 assert.equal(readCameraSettings({getItem:()=>JSON.stringify({mode:'follow',zoom:10})},'saved').mode,'follow');
 assert.deepEqual(readCameraSettings({getItem:()=>'{broken'},'test'),CAMERA_DEFAULTS);
 assert.deepEqual(readCameraSettings({getItem:()=>JSON.stringify({zoom:10})},'test').zoom,10);
});
test('camera orbit moves behind facing, respects distance and pitch',()=>{
 const base=cameraOrbitVector(0,0,8,3);
 assert.ok(Math.abs(base.x)<.001);assert.equal(base.z,8);assert.equal(base.y,3);
 const turn=cameraOrbitVector(Math.PI/2,0,8,3);
 assert.ok(turn.x< -7.9);assert.ok(Math.abs(turn.z)<1e-6);
 const elevated=cameraOrbitVector(0,.5,8,3);
 assert.ok(elevated.y>base.y);assert.ok(elevated.z<base.z);
 assert.ok(frameDamping(10,1/60)>0&&frameDamping(10,1/60)<1);
});
test('deadzones remove drift and restore responsive outer stick movement',()=>{
 assert.equal(applyGamepadDeadzone(.09,.18),0);assert.equal(applyGamepadDeadzone(-.09,.18),0);
 assert.equal(applyGamepadDeadzone(1,.18),1);assert.equal(applyGamepadDeadzone(-1,.18),-1);
 assert.ok(applyGamepadDeadzone(.65,.18)>.5);
 assert.equal(applyGamepadDeadzone(NaN,.18),0);
});
test('standard pad maps sticks, ABXY, bumpers and D-pad, rejects unsupported mapping',()=>{
 const s=gamepadSnapshot(pad({axes:[-.8,-1,.5,-.4],pressed:[0,1,2,3,4,5,8,9,12,14]}));
 assert.equal(s.moveY,-1);assert.ok(s.moveX<0);
 assert.ok(s.lookX>0&&s.lookY<0);
 for(const key of ['attack','dodge','swap','interact','previousStyle','nextStyle','inventory','menu'])assert.equal(s[key],true,key);
 assert.deepEqual(s.abilities,[true,false,true,false]);
 assert.equal(firstStandardGamepad([null,pad({mapping:'unknown'}),pad({index:2})]).index,2);
 assert.equal(gamepadSnapshot(pad({mapping:'unknown'})),null);
});
test('button actions are only triggered on press edges, not every frame',()=>{
 const current=gamepadSnapshot(pad({pressed:[1,2,3,9,13]}));
 const edges=gamepadEdges(null,current);
 assert.equal(edges.dodge,true);assert.equal(edges.swap,true);assert.equal(edges.interact,true);assert.equal(edges.menu,true);
 assert.deepEqual(edges.abilities,[false,true,false,false]);
 assert.equal(gamepadEdges(current,current).swap,false);
 assert.deepEqual(gamepadEdges(current,null).abilities,[false,false,false,false]);
});
