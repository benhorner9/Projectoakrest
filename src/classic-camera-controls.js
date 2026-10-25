/** Smooth, bounded player-centred Classic orbit camera.
 * Renderer-free, deterministic and independent from game save data.
 * Yaw is around the north-up world Y axis; pitch is measured up from ground.
 */
import {CLASSIC_CAMERA,classicScreenBasis,clamp} from './classic-presentation.js';
const DEG=Math.PI/180;
const horizontal=Math.hypot(CLASSIC_CAMERA.offsetX,CLASSIC_CAMERA.offsetZ);
const RADIUS=Math.hypot(horizontal,CLASSIC_CAMERA.elevation);
export const CLASSIC_CAMERA_DEFAULT=Object.freeze({
 yaw:Math.atan2(CLASSIC_CAMERA.offsetX,CLASSIC_CAMERA.offsetZ),
 pitch:Math.atan2(CLASSIC_CAMERA.elevation,horizontal)
});
export const CLASSIC_CAMERA_RANGE=Object.freeze({
 minPitch:25*DEG,maxPitch:78*DEG,yawSpeed:105*DEG,pitchSpeed:68*DEG,
 yawNudge:20*DEG,pitchNudge:10*DEG
});
const normalise=yaw=>Math.atan2(Math.sin(yaw),Math.cos(yaw));
export function cameraOffsetFor({yaw,pitch}){
 const flat=RADIUS*Math.cos(pitch);
 return {x:Math.sin(yaw)*flat,y:Math.sin(pitch)*RADIUS,z:Math.cos(yaw)*flat};
}
export function createClassicOrbitCamera(){
 let yaw=CLASSIC_CAMERA_DEFAULT.yaw,pitch=CLASSIC_CAMERA_DEFAULT.pitch;
 const offset=()=>cameraOffsetFor({yaw,pitch});
 const state=()=>({yaw,pitch,offset:offset(),basis:classicScreenBasis(offset())});
 const reset=()=>{yaw=CLASSIC_CAMERA_DEFAULT.yaw;pitch=CLASSIC_CAMERA_DEFAULT.pitch;return state();};
 const turn=(leftRight=0,upDown=0)=>{
  yaw=normalise(yaw+leftRight);
  pitch=clamp(pitch+upDown,CLASSIC_CAMERA_RANGE.minPitch,CLASSIC_CAMERA_RANGE.maxPitch);
  return state();
 };
 const step=(keys,dt)=>{
  const elapsed=clamp(Number(dt)||0,0,.1);
  if(elapsed<=0)return state();
  const horizontal=Number(keys.has('arrowright'))-Number(keys.has('arrowleft'));
  const vertical=Number(keys.has('arrowup'))-Number(keys.has('arrowdown'));
  return turn(horizontal*CLASSIC_CAMERA_RANGE.yawSpeed*elapsed,
   vertical*CLASSIC_CAMERA_RANGE.pitchSpeed*elapsed);
 };
 return {state,offset,reset,turn,step,nudge:key=>{
  if(key==='left')return turn(-CLASSIC_CAMERA_RANGE.yawNudge,0);
  if(key==='right')return turn(CLASSIC_CAMERA_RANGE.yawNudge,0);
  if(key==='up')return turn(0,CLASSIC_CAMERA_RANGE.pitchNudge);
  if(key==='down')return turn(0,-CLASSIC_CAMERA_RANGE.pitchNudge);
  return state();
 }};
}
