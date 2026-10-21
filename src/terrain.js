import {segmentBox,segmentCylinder} from './combat-physics.js';
import {nearestBuildingEdge} from './town-layout.js';
/** One continuous height field for geometry, actors, loot and telegraphs. */
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function naturalTerrainHeight(x,z){
 const wilderness=smooth((-z-5)/24),edge=smooth((Math.abs(x)-18)/22);
 const hills=1.5+Math.sin(x*.068+z*.032)*1.7+Math.sin(z*.105)*.9+Math.cos(x*.12-z*.045)*.55;
 return (wilderness+edge*(1-wilderness))*hills;
}
/** Flatten the actual ground inside *every* building, then ease back to hills
 * beyond the exterior foundation. The renderer, character and loot all sample
 * the same height function so grass cannot poke through a raised floor.
 */
export function terrainHeight(x,z){
 const natural=naturalTerrainHeight(x,z),near=nearestBuildingEdge(x,z);
 if(!near||near.distance>=3)return natural;
 const base=naturalTerrainHeight(near.build.x,near.build.z);
 return base+(natural-base)*smooth(near.distance/3);
}
export function terrainNormal(x,z){const e=.08,dx=(terrainHeight(x+e,z)-terrainHeight(x-e,z))/(2*e),dz=(terrainHeight(x,z+e)-terrainHeight(x,z-e))/(2*e),len=Math.hypot(dx,1,dz);return {x:-dx/len,y:1/len,z:-dz/len};}
export function roadCentre(z){return z> -8?0:Math.sin((z+8)*.07)*1.2;}
// Legacy cottages were solid blocks. Their enterable replacements register
// accurate individual walls in town-world.js; retain only the older well.
export const OBSTACLES=[{x:6,z:19,r:2.6,height:6}];
// World geometry can register lightweight solid footprints without expensive mesh physics.
// Radius-aware collision prevents the hero's body clipping through walls and trunks.
const worldObstacles=[];let collisionArea='world',solidCache=null,grid=null;
export function setCollisionArea(area){collisionArea=['world','tutorial','realm'].includes(area)?area:'world';solidCache=null;grid=null;}
const groundHeight=(x,z)=>collisionArea==='world'?terrainHeight(x,z):0;
export function addWorldObstacle(o){
 if(!o||![o.x,o.z,o.height].every(Number.isFinite)||o.height<=0)return false;
 if(!(o.r>0)&&!(o.hx>0&&o.hz>0))return false;
 solidCache=null;grid=null;worldObstacles.push({area:o.area||'world',x:o.x,z:o.z,height:o.height,...(o.r>0?{r:o.r}:{hx:o.hx,hz:o.hz})});
 return true;
}
export function clearWorldObstacles(){worldObstacles.length=0;setCollisionArea('world');}
function footprintsOverlap(o,x,z,r=0){
 if(o.r)return Math.hypot(x-o.x,z-o.z)<o.r+r;
 const dx=Math.max(0,Math.abs(x-o.x)-o.hx),dz=Math.max(0,Math.abs(z-o.z)-o.hz);
 return r===0?(dx===0&&dz===0):dx*dx+dz*dz<r*r;
}
function allSolids(){return solidCache??=(collisionArea==='world'?OBSTACLES:[]).concat(worldObstacles.filter(o=>o.area===collisionArea));}
function gridForSolids(){
 if(grid)return grid;grid=new Map();
 for(const o of allSolids()){
  const hx=o.r||o.hx,hz=o.r||o.hz;
  for(let x=Math.floor((o.x-hx)/8);x<=Math.floor((o.x+hx)/8);x++)for(let z=Math.floor((o.z-hz)/8);z<=Math.floor((o.z+hz)/8);z++){
   const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(o);
  }
 }return grid;
}
export function blocked(x,z,radius=0){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return true;
 if(Math.abs(x)+radius>120||Math.abs(z)+radius>120)return true;
 const cells=gridForSolids();
 for(let gx=Math.floor((x-radius)/8);gx<=Math.floor((x+radius)/8);gx++)for(let gz=Math.floor((z-radius)/8);gz<=Math.floor((z+radius)/8);gz++){
  const list=cells.get(gx+','+gz);if(list?.some(o=>footprintsOverlap(o,x,z,radius)))return true;
 }return false;
}
export function moveOnGround(pos,dx,dz,radius=.42){
 let x=pos.x,z=pos.z;
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return {x,z,y:terrainHeight(x,z)};
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=0;i<n;i++){
  if(!blocked(x+dx/n,z,radius)&&terrainNormal(x+dx/n,z).y>=.70)x+=dx/n;
  if(!blocked(x,z+dz/n,radius)&&terrainNormal(x,z+dz/n).y>=.70)z+=dz/n;
 }
 return {x,z,y:terrainHeight(x,z)};
}
// Swept collision: a magic bolt or arrow must stop at terrain, walls or tree trunks.
export function segmentWorldHit(a,b,radius=.1){
 if(![a.x,a.y,a.z,b.x,b.y,b.z,radius].every(Number.isFinite)||radius<0)return 0;
 let first=null;
 const test=o=>{
  const base=groundHeight(o.x,o.z);
  const t=o.r?segmentCylinder(a,b,o,o.r+radius,base-radius,base+o.height+radius):
   segmentBox(a,b,{x:o.x-o.hx-radius,y:base-radius,z:o.z-o.hz-radius},{x:o.x+o.hx+radius,y:base+o.height+radius,z:o.z+o.hz+radius});
  if(t!==null&&(first===null||t<first))first=t;
 };
 for(const o of allSolids())test(o);
 const distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.1));
 for(let i=0;i<=steps;i++){
  const t=i/steps;if(first!==null&&t>first)break;
  const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;
  if(y<=groundHeight(x,z)+radius){
   let lo=Math.max(0,(i-1)/steps),hi=t;
   for(let n=0;n<8;n++){const m=(lo+hi)/2,mx=a.x+(b.x-a.x)*m,mz=a.z+(b.z-a.z)*m;
    if(a.y+(b.y-a.y)*m<=groundHeight(mx,mz)+radius)hi=m;else lo=m;}
   first=first===null?hi:Math.min(first,hi);break;
  }
 }
 return first;
}
export function groundSegmentClear(a,b,radius=.42){
 const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.15));
 for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
  if(blocked(x,z,radius)||terrainNormal(x,z).y<.70)return false;
 }
 return true;
}
export function safeCamera(focus,desired){
 let result={...desired};
 for(let i=1;i<=32;i++){const t=i/32,x=focus.x+(desired.x-focus.x)*t,z=focus.z+(desired.z-focus.z)*t,y=focus.y+(desired.y-focus.y)*t;
 const obstruction=allSolids().some(o=>{const base=groundHeight(o.x,o.z);return y>=base-.3&&y<base+o.height+.3&&footprintsOverlap(o,x,z,.3);});
 if(obstruction||y<groundHeight(x,z)+.55){const s=Math.max(0,(i-2)/32);result={x:focus.x+(desired.x-focus.x)*s,y:focus.y+(desired.y-focus.y)*s,z:focus.z+(desired.z-focus.z)*s};break;}
 }result.y=Math.max(result.y,groundHeight(result.x,result.z)+.65);return result;
}
export function createTerrain(THREE,scene){
 const geo=new THREE.PlaneGeometry(260,260,208,208);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,colors=[];
 const meadow=new THREE.Color('#6b8956'),forest=new THREE.Color('#466c50'),dirt=new THREE.Color('#b3a080'),stone=new THREE.Color('#879087');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=terrainHeight(x,z);p.setY(i,y-.055);const c=meadow.clone().lerp(forest,smooth((-z-15)/50)*.52);const n=(Math.sin(x*1.7+z*.9)*Math.sin(z*.73)+1)*.5;c.multiplyScalar(.92+n*.14);const d=Math.abs(x-roadCentre(z));c.lerp(dirt,1-smooth((d-2.5)/2));if(y>3.5)c.lerp(stone,(y-3.5)*.12);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
/** Raise legacy scenery in place; instanced meshes keep their low draw-call cost. */
export function groundScenery(THREE,scene,exclude=[]){
 const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(const obj of scene.children){if(exclude.includes(obj)||obj.isLight||obj.isPoints||obj.material?.side===THREE.BackSide)continue;
 if(obj.isInstancedMesh){for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,matrix);matrix.decompose(pos,q,scale);pos.y+=terrainHeight(pos.x,pos.z);matrix.compose(pos,q,scale);obj.setMatrixAt(i,matrix);}obj.instanceMatrix.needsUpdate=true;obj.computeBoundingSphere();}
 else obj.position.y+=terrainHeight(obj.position.x,obj.position.z);
 }
}
