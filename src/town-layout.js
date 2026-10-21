/**
 * Canonical footprint and street layout shared by geometry, terrain and scenery.
 * Keeping this independent of Three.js prevents grass placement and foundation
 * elevations from drifting away from the actual building meshes.
 */
export const OAKREST_BUILDINGS=Object.freeze([
  {id:'bank',x:-30,z:14,w:10,d:9,face:'east',kind:'bank'},
  {id:'store',x:30,z:14,w:10,d:9,face:'west',kind:'store'},
  {id:'forester',x:-30,z:46,w:11,d:9,face:'east',kind:'forester'},
  {id:'cottage-a',x:-14,z:12,w:8,d:7,face:'east',kind:'home'},
  {id:'cottage-b',x:14,z:8,w:8,d:7,face:'west',kind:'home'},
  {id:'cottage-c',x:-14,z:28,w:8,d:7,face:'east',kind:'home'},
  {id:'cottage-d',x:14,z:27,w:8,d:7,face:'west',kind:'home'},
  {id:'north-home',x:29,z:42,w:8,d:7,face:'west',kind:'home'},
  {id:'north-workshop',x:29,z:58,w:8,d:7,face:'north',kind:'workshop'},
  {id:'west-house',x:-29,z:-2,w:8,d:7,face:'east',kind:'home'},
  {id:'east-guardhouse',x:29,z:-2,w:8,d:7,face:'south',kind:'guard'},
  {id:'merchant-home',x:29,z:30,w:8,d:7,face:'west',kind:'home'},
  {id:'west-terrace',x:-29,z:31,w:8,d:7,face:'east',kind:'home'},
  {id:'wardens-hall',x:-30,z:76,w:12,d:11,face:'east',kind:'hall'},
  {id:'garden-house',x:29,z:75,w:8,d:8,face:'west',kind:'home'}
]);
export const OAKREST_PATHS=Object.freeze([
  [[0,-13],[0,29]], [[-4.6,29],[-4.6,50]], [[4.6,29],[4.6,50]], [[0,50],[0,69]],
  [[0,20],[-23,20],[-23,14]], [[0,17],[23,17],[24.4,14]],
  [[-4.6,46],[-24.4,46]], [[4.6,42],[24.4,42]],
  [[0,12],[-9.4,12]], [[0,8],[9.4,8]], [[0,28],[-9.4,28]], [[0,27],[9.4,27]],
  [[0,0],[-24.4,0],[-24.4,-2]], [[0,2.8],[29,2.8],[29,1.6]],
  [[4.6,54],[20,54],[29,54.4]],
  [[-4.6,57],[-13,57]],
  [[0,69],[0,86]], [[0,76],[-22.9,76]], [[0,75],[24.4,75]],
  [[-4.6,31],[-24.4,31]], [[4.6,30],[24.4,30]],
  [[-4.6,65],[-4.6,79]],[[4.6,65],[4.6,79]]
]);

export const FACING=Object.freeze({north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2});
export function localBuildingPosition(build,x,z){
  const a=FACING[build.face],dx=x-build.x,dz=z-build.z;
  return {x:dx*Math.cos(a)-dz*Math.sin(a),z:dx*Math.sin(a)+dz*Math.cos(a)};
}
export function buildingAt(x,z,padding=0){
  for(const build of OAKREST_BUILDINGS){
    const p=localBuildingPosition(build,x,z);
    if(Math.abs(p.x)<=build.w*.5+padding&&Math.abs(p.z)<=build.d*.5+padding)return build;
  }
  return null;
}
export function nearestBuildingEdge(x,z){
  let nearest=null;
  for(const build of OAKREST_BUILDINGS){
    const p=localBuildingPosition(build,x,z);
    // Rectangular distance outside the rotated footprint, zero inside.
    const dx=Math.max(0,Math.abs(p.x)-build.w*.5);
    const dz=Math.max(0,Math.abs(p.z)-build.d*.5);
    const distance=Math.hypot(dx,dz);
    if(!nearest||distance<nearest.distance)nearest={build,distance};
  }
  return nearest;
}
function distanceToSegment(x,z,a,b){
  const vx=b[0]-a[0],vz=b[1]-a[1],length=vx*vx+vz*vz;
  const t=length?Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/length)):0;
  return Math.hypot(x-a[0]-t*vx,z-a[1]-t*vz);
}
/** Roads, indoor floors and their thresholds should never sprout wild grass. */
export function reservedTownGround(x,z){
  if(buildingAt(x,z,1.15))return true;
  if(Math.hypot(x,z-39)<10)return true; // paved Heartwood Square
  for(const path of OAKREST_PATHS)for(let i=1;i<path.length;i++)
    if(distanceToSegment(x,z,path[i-1],path[i])<3.25)return true;
  return false;
}
