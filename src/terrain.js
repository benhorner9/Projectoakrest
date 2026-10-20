/** One continuous height field for geometry, actors, loot and telegraphs. */
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function terrainHeight(x,z){
 const wilderness=smooth((-z-5)/24),edge=smooth((Math.abs(x)-18)/22);
 const hills=1.5+Math.sin(x*.068+z*.032)*1.7+Math.sin(z*.105)*.9+Math.cos(x*.12-z*.045)*.55;
 return (wilderness+edge*(1-wilderness))*hills;
}
export function terrainNormal(x,z){const e=.08,dx=(terrainHeight(x+e,z)-terrainHeight(x-e,z))/(2*e),dz=(terrainHeight(x,z+e)-terrainHeight(x,z-e))/(2*e),len=Math.hypot(dx,1,dz);return {x:-dx/len,y:1/len,z:-dz/len};}
export function roadCentre(z){return z> -8?0:Math.sin((z+8)*.07)*1.2;}
export const OBSTACLES=[{x:-14,z:12,hx:4.8,hz:3.8,height:7},{x:14,z:8,hx:4.8,hz:3.8,height:7},{x:-14,z:28,hx:4.8,hz:3.8,height:7},{x:14,z:27,hx:4.8,hz:3.8,height:7},{x:6,z:19,r:2.6,height:6}];
// World geometry can register lightweight solid footprints without expensive mesh physics.
// Radius-aware collision prevents the hero's body clipping through walls and trunks.
const worldObstacles=[];
export function addWorldObstacle(o){
 if(!o||![o.x,o.z,o.height].every(Number.isFinite)||o.height<=0)return false;
 if(!(o.r>0)&&!(o.hx>0&&o.hz>0))return false;
 worldObstacles.push({x:o.x,z:o.z,height:o.height,...(o.r>0?{r:o.r}:{hx:o.hx,hz:o.hz})});
 return true;
}
export function clearWorldObstacles(){worldObstacles.length=0;}
function footprintsOverlap(o,x,z,r=0){
 if(o.r)return Math.hypot(x-o.x,z-o.z)<o.r+r;
 const dx=Math.max(0,Math.abs(x-o.x)-o.hx),dz=Math.max(0,Math.abs(z-o.z)-o.hz);
 return r===0?(dx===0&&dz===0):dx*dx+dz*dz<r*r;
}
function allSolids(){return [...OBSTACLES,...worldObstacles];}
export function blocked(x,z,radius=0){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return true;
 if(Math.abs(x)+radius>70||Math.abs(z)+radius>70)return true;
 return OBSTACLES.some(o=>footprintsOverlap(o,x,z,radius))||
   worldObstacles.some(o=>footprintsOverlap(o,x,z,radius));
}
export function moveOnGround(pos,dx,dz,radius=.42){
 let x=pos.x,z=pos.z;
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return {x,z,y:terrainHeight(x,z)};
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=0;i<n;i++){
  if(!blocked(x+dx/n,z,radius))x+=dx/n;
  if(!blocked(x,z+dz/n,radius))z+=dz/n;
 }
 return {x,z,y:terrainHeight(x,z)};
}
// Swept collision: a magic bolt or arrow must stop at terrain, walls or tree trunks.
export function segmentWorldHit(a,b,radius=.1){
 const distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
 if(!Number.isFinite(distance)||distance===0)return null;
 const steps=Math.max(1,Math.ceil(distance/.2));
 const solids=allSolids();
 for(let i=0;i<=steps;i++){
  const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
  if(y<=terrainHeight(x,z)+radius)return t;
  for(const o of solids){
   const base=terrainHeight(o.x,o.z);
   if(y>=base-radius&&y<=base+o.height+radius&&footprintsOverlap(o,x,z,radius))return t;
  }
 }
 return null;
}
export function safeCamera(focus,desired){
 let result={...desired};
 for(let i=1;i<=32;i++){const t=i/32,x=focus.x+(desired.x-focus.x)*t,z=focus.z+(desired.z-focus.z)*t,y=focus.y+(desired.y-focus.y)*t;
 const obstruction=allSolids().some(o=>{const base=terrainHeight(o.x,o.z);return y>=base-.3&&y<base+o.height+.3&&footprintsOverlap(o,x,z,.3);});
 if(obstruction||y<terrainHeight(x,z)+.55){const s=Math.max(0,(i-2)/32);result={x:focus.x+(desired.x-focus.x)*s,y:focus.y+(desired.y-focus.y)*s,z:focus.z+(desired.z-focus.z)*s};break;}
 }result.y=Math.max(result.y,terrainHeight(result.x,result.z)+.65);return result;
}
export function createTerrain(THREE,scene){
 const geo=new THREE.PlaneGeometry(160,160,80,80);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,colors=[];
 const meadow=new THREE.Color('#6b8956'),forest=new THREE.Color('#466c50'),dirt=new THREE.Color('#b3a080'),stone=new THREE.Color('#879087');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=terrainHeight(x,z);p.setY(i,y-.055);const c=meadow.clone().lerp(forest,smooth((-z-15)/50)*.52);const n=(Math.sin(x*1.7+z*.9)*Math.sin(z*.73)+1)*.5;c.multiplyScalar(.92+n*.14);const d=Math.abs(x-roadCentre(z));c.lerp(dirt,1-smooth((d-2.5)/2));if(y>3.5)c.lerp(stone,(y-3.5)*.12);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
/** Raise legacy scenery in place; instanced meshes keep their low draw-call cost. */
export function groundScenery(THREE,scene,exclude=[]){
 const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(const obj of scene.children){if(exclude.includes(obj)||obj.isLight||obj.isPoints||obj.material?.side===THREE.BackSide)continue;
 if(obj.isInstancedMesh){for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,matrix);matrix.decompose(pos,q,scale);pos.y+=terrainHeight(pos.x,pos.z);matrix.compose(pos,q,scale);obj.setMatrixAt(i,matrix);}obj.instanceMatrix.needsUpdate=true;obj.computeBoundingSphere();}
 else obj.position.y+=terrainHeight(obj.position.x,obj.position.z);
 }
}
