/** Canvas-space weapon grip shared by preparation, contact and recovery.
 * Directions 5–7 mirror the entire rig rather than swapping a floating weapon. */
export function classicGrip(style,pose='idle',step=0){
 const lift=pose==='windup'?-10:pose==='strike'?7:step===1?4:step===2?-4:0;
 const hand={x:72,y:84+lift};
 return {hand,weapon:{x:hand.x,y:hand.y-(style==='magic'?35:style==='ranged'?8:26)},
  bowDraw:pose==='windup'?10:0,cast:style==='magic'&&pose==='strike'};
}
export function mirroredDirection(dir){
 const n=((Math.round(dir)%8)+8)%8;return {dir:n>4?8-n:n,mirror:n>4};
}
