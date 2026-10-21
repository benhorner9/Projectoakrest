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
/**
 * Authoritative world-space anchors for hard and decorative props.
 * Geometry and collision must consume these same coordinates.
 */
export const OAKREST_WELL=Object.freeze({x:18,z:36,r:1.7,roofRadius:2.30,courtyardRadius:3.10,roadSetback:1.25});
/** Small pedestrian stepping stones deliberately stop at the well's circular apron. */
export const OAKREST_WELL_STEPS=Object.freeze([[18,30.1],[18,31.2],[18,32.25],[18,39.75],[18,40.8],[18,41.9],[18,42.9]]);
export const OAKREST_MARKET_STALLS=Object.freeze([
 Object.freeze({x:-16,z:38,colour:'red'}),
 Object.freeze({x:-18,z:-7,colour:'blue'}),
 Object.freeze({x:19,z:-7,colour:'moss'})
]);
export const OAKREST_TRADE_TABLES=Object.freeze([
 Object.freeze({x:-19,z:35}),Object.freeze({x:9,z:22}),
 Object.freeze({x:-11,z:35}),Object.freeze({x:12,z:34})
]);
export const OAKREST_SQUARE_BENCHES=Object.freeze([[-17,51,.2],[-10,39,Math.PI],[10,37.2,Math.PI]]);
export const OAKREST_GARDEN_BENCHES=Object.freeze([
 Object.freeze({x:12,z:50,angle:.2}),Object.freeze({x:19,z:70,angle:Math.PI/2})
]);
export const OAKREST_CITY_LAMPS=Object.freeze([
 [-22,9],[22,9],[-23,38],[10,32],[-18,53],[22,60],[-9,81],[10,81]
]);
export const OAKREST_SIGNPOSTS=Object.freeze([
 [-11,37,.18],[9,49,-.6],[-15,70,.4]
]);
export const OAKREST_MARKET_CRATES=Object.freeze([
 [-7,16,.88],[-8.2,16.6,.6],[7.1,22.9,1],[7,21,.6],[-22,36,.85],[23,36,.7]
]);
export const OAKREST_MARKET_BARRELS=Object.freeze([
 [-18.5,15],[-18.5,16.2],[20,20.8],[21.1,20.5],[-12,39],[10.2,-5]
]);
export const OAKREST_VEGETABLE_BEDS=Object.freeze([[-10,51],[21,58],[-22,54]]);
export const OAKREST_PATHS=Object.freeze([
  [[0,-13],[0,29]], [[-4.6,29],[-4.6,50]], [[4.6,29],[4.6,50]], [[0,50],[0,69]],
  [[0,20],[-23,20],[-23,14]], [[0,17],[23,17],[24.4,14]],
  [[-4.6,46],[-24.4,46]], [[4.6,46],[19,46],[24.4,42]],
  [[0,12],[-9.4,12]], [[0,8],[9.4,8]], [[0,28],[-9.4,28]], [[0,27],[9.4,27]],
  [[0,0],[-24.4,0],[-24.4,-2]], [[0,2.8],[29,2.8],[29,1.6]],
  [[4.6,54],[20,54],[29,54.4]],
  [[-4.6,57],[-13,57]],
  [[0,69],[0,86]], [[0,76],[-22.9,76]], [[0,75],[24.4,75]],
  [[-4.6,31],[-24.4,31]], [[4.6,29],[4.6,26],[18,26],[24.4,30]],
  [[-4.6,65],[-4.6,79]],[[4.6,65],[4.6,79]]
]);

export const FACING=Object.freeze({north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2});
export function localBuildingPosition(build,x,z){
  const a=FACING[build.face],dx=x-build.x,dz=z-build.z;
  return {x:dx*Math.cos(a)-dz*Math.sin(a),z:dx*Math.sin(a)+dz*Math.cos(a)};
}
export function buildingAt(x,z,padding=0){
  for(const build of OAKREST_BUILDINGS){
    const lateral=(build.face==='east'||build.face==='west');
    const halfX=(lateral?build.d:build.w)*.5+padding;
    const halfZ=(lateral?build.w:build.d)*.5+padding;
    if(Math.abs(x-build.x)>halfX||Math.abs(z-build.z)>halfZ)continue;
    const p=localBuildingPosition(build,x,z);
    if(Math.abs(p.x)<=build.w*.5+padding&&Math.abs(p.z)<=build.d*.5+padding)return build;
  }
  return null;
}
export function nearestBuildingEdge(x,z){
  let nearest=null;
  for(const build of OAKREST_BUILDINGS){
    const lateral=(build.face==='east'||build.face==='west');
    if(Math.abs(x-build.x)>(lateral?build.d:build.w)*.5+3.1||
       Math.abs(z-build.z)>(lateral?build.w:build.d)*.5+3.1)continue;
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
  if(Math.hypot(x-OAKREST_WELL.x,z-OAKREST_WELL.z)<OAKREST_WELL.courtyardRadius+.40)return true;
  if(Math.hypot(x,z-39)<10)return true; // paved Heartwood Square
  for(const path of OAKREST_PATHS)for(let i=1;i<path.length;i++)
    if(distanceToSegment(x,z,path[i-1],path[i])<3.25)return true;
  return false;
}
