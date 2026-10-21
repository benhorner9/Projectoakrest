import {localBuildingPosition} from './town-layout.js';
/** Shared building cutaway rules. Hiding geometry never changes collision. */
export function playerInBuilding(build,x,z){
 const p=localBuildingPosition(build,x,z);
 return Math.abs(p.x)<build.w*.48&&Math.abs(p.z)<build.d*.48;
}
export function buildingCutaway(build,player,camera){
 const p=localBuildingPosition(build,player.x,player.z);
 const inside=Math.abs(p.x)<build.w*.48&&Math.abs(p.z)<build.d*.48;
 // Open the sightline just before crossing the threshold as well as inside.
 const atDoor=Math.abs(p.x)<1.6&&p.z>=build.d*.42&&p.z<=build.d*.5+1.15;
 const active=inside||atDoor;
 if(!active)return {active:false,inside:false,hidden:[]};
 const view=camera?localBuildingPosition(build,camera.x,camera.z):{x:0,z:build.d};
 // Always remove the facade: merchants and their actions should be visible
 // from the road. Hide the back if the camera is behind it, and the near
 // side wall. Retain the far walls and all low masonry/collision boundaries.
 return {active,inside,hidden:[
  'front',
  ...(view.z<0?['back']:[]),
  view.x>=0?'right':'left'
 ]};
}
export function indoorViewHeight(build){
 return Math.min(11.25,Math.max(7.5,Math.max(build.w,build.d)*.76));
}
