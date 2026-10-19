/** Frame independent input easing. Gameplay aim remains immediate. */
export function damp(current,target,rate,dt){const t=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));return current+(target-current)*(1-Math.exp(-Math.max(0,rate)*t));}
export function smoothMotion(previous,inputX,inputZ,speed,dt){const len=Math.hypot(inputX,inputZ),scale=len>1?1/len:1,rate=len>.03?13:16;
 const x=damp(previous.x,inputX*scale*speed,rate,dt),z=damp(previous.z,inputZ*scale*speed,rate,dt);
 return {x:Math.abs(x)<.012?0:x,z:Math.abs(z)<.012?0:z};
}
export function dampAngle(angle,target,rate,dt){const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));return angle+delta*(1-Math.exp(-Math.max(0,rate)*Math.max(0,Math.min(.1,dt))));}
