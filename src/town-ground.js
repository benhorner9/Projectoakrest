import * as THREE from 'three';
import {terrainHeight,blocked} from './terrain.js';
import {OAKREST_PATHS,reservedTownGround} from './town-layout.js';

/**
 * Civic paving is ONE painted, terrain-following surface. The old three meshes
 * followed each individual road segment, so crossroads rendered stone faces
 * repeatedly at almost the same depth (z fighting / checkerboard fragments).
 * One global, world-aligned material has exactly one answer per ground pixel.
 * Building access, streets and all physics still use their original layouts.
 */
const palette={
 mortar:[146,134,112],
 stone:[[197,188,166],[191,182,161],[186,178,155],[199,189,169],[193,184,164]],
 earth:[170,154,124],
 grass:['#678954','#76965d','#839a69','#668958','#91a06c'],
 flowers:['#e9dcad','#e0c7bf','#e7decd']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
const hash=(a,b)=>fract(Math.sin(a*127.1+b*311.7)*43758.5453);
const paintBounds=Object.freeze({minX:-46,maxX:46,minZ:-18,maxZ:91});
const roadRadius=2.20,vergeRadius=2.72,cellSize=8;
const gridKey=(x,z)=>x*65536+z;
const segments=[],cells=new Map();
for(const route of OAKREST_PATHS)for(let i=1;i<route.length;i++){
 const [ax,az]=route[i-1],[bx,bz]=route[i],dx=bx-ax,dz=bz-az;
 const item={ax,az,dx,dz,inv:1/(dx*dx+dz*dz)};
 segments.push(item);
 for(let gx=Math.floor((Math.min(ax,bx)-vergeRadius)/cellSize);gx<=Math.floor((Math.max(ax,bx)+vergeRadius)/cellSize);gx++)
  for(let gz=Math.floor((Math.min(az,bz)-vergeRadius)/cellSize);gz<=Math.floor((Math.max(az,bz)+vergeRadius)/cellSize);gz++){
   const key=gridKey(gx,gz),cell=cells.get(key)||[];
   cell.push(item);cells.set(key,cell);
  }
}

/** Squared distance to the union of authored paths, not to an individual mesh
 * layer. Crossing streets are never painted twice or flicker at intersections. */
export function cityRoadDistance(x,z){
 const cell=cells.get(gridKey(Math.floor(x/cellSize),Math.floor(z/cellSize)));
 if(!cell)return Infinity;
 let nearest=Infinity;
 for(const s of cell){
  const t=clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)*s.inv,0,1);
  const dx=x-(s.ax+t*s.dx),dz=z-(s.az+t*s.dz),d=dx*dx+dz*dz;
  if(d<nearest)nearest=d;
 }
 return Math.sqrt(nearest);
}

/** A pure testable paint function; fills the caller's RGBA buffer in-place. */
export function cityRoadColour(x,z,out){
 const distance=cityRoadDistance(x,z);
 if(distance>=vergeRadius){
  out[0]=palette.earth[0];out[1]=palette.earth[1];out[2]=palette.earth[2];out[3]=0;return out;
 }
 const row=Math.floor(z/.64),col=Math.floor((x+(row&1)*.38)/.76);
 const u=fract((x+(row&1)*.38)/.76),v=fract(z/.64);
 // A modest mortar joint is a grounded visual recess, not another polygon.
 const joint=u<.075||u>.925||v<.080||v>.92;
 const colour=joint?palette.mortar:palette.stone[Math.floor(hash(col,row)*palette.stone.length)];
 const variation=joint?1:.97+.055*hash(col+41,row-17);
 // Toward grass, warm weathered soil softly replaces the clean civic stones.
 const blend=clamp((distance-roadRadius)/(vergeRadius-roadRadius),0,1);
 const wear=blend*blend*(3-2*blend);
 for(let c=0;c<3;c++)out[c]=Math.round(colour[c]*variation*(1-wear)+palette.earth[c]*wear);
 out[3]=Math.round(255*(1-wear));
 return out;
}

/** One mipmapped material and one vertex-following mesh for the whole road
 * network. No duplicate coplanar quads, scattered tile fragments or z fighting.
 * The GPU sees only one additional road draw call at intersections. */
export function buildOakrestCityPaths(scene){
 const width=1024,height=1024,bounds=paintBounds;
 const bytes=new Uint8Array(width*height*4),sample=new Uint8Array(4);
 const painted=new Set();
 for(let py=0;py<height;py++){
  const z=bounds.minZ+(py+.5)/height*(bounds.maxZ-bounds.minZ);
  for(let px=0;px<width;px++){
   const x=bounds.minX+(px+.5)/width*(bounds.maxX-bounds.minX);
   cityRoadColour(x,z,sample);
   const index=(py*width+px)*4;
   bytes[index]=sample[0];bytes[index+1]=sample[1];bytes[index+2]=sample[2];bytes[index+3]=sample[3];
   if(sample[3]>225){
    const row=Math.floor(z/.64),col=Math.floor((x+(row&1)*.38)/.76);
    painted.add(col*1024+row);
   }
  }
 }
 const tex=new THREE.DataTexture(bytes,width,height,THREE.RGBAFormat);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
 tex.generateMipmaps=true;tex.anisotropy=4;tex.needsUpdate=true;
 const nx=92,nz=109,points=[],uvs=[],faces=[];
 for(let j=0;j<=nz;j++){
  const z=bounds.minZ+j/nz*(bounds.maxZ-bounds.minZ);
  for(let i=0;i<=nx;i++){
   const x=bounds.minX+i/nx*(bounds.maxX-bounds.minX);
   points.push(x,terrainHeight(x,z)+.053,z);
   uvs.push(i/nx,j/nz);
  }
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const k=j*(nx+1)+i;
  faces.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geo.setIndex(faces);geo.computeVertexNormals();
 const paving=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
  map:tex,color:'#ffffff',roughness:.98,metalness:0,
  transparent:true,alphaTest:.09,depthWrite:false,side:THREE.DoubleSide
 }));
 paving.name='Oakrest continuous civic paving';paving.receiveShadow=true;paving.castShadow=false;
 paving.userData.animated=true;paving.frustumCulled=false;
 scene.add(paving);
 const stoneCount=painted.size;
 const segmentCount=OAKREST_PATHS.reduce((sum,route)=>sum+route.length-1,0);
 return {verge:[paving],mortar:paving,stones:paving,stoneCount,segments:segmentCount,roadLayers:1};
}

/** Repeatable ground cover placed only on walkable green ground; no spawning
 * inside completed buildings, thresholds, roads, the paved square or well. */
export function buildOakrestCityMeadows(scene,{seed=26091,grassTarget=630,flowerTarget=96}={}){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 function pick(){
  for(let i=0;i<80;i++){
   const x=-43+random()*86,z=-10+random()*100;
   if(reservedTownGround(x,z)||blocked(x,z,.19))continue;
   return {x,z};
  }
  return null;
 }
 const tuftGeo=new THREE.BufferGeometry();
 // Crossed irregular blades produce volume from several angles without
 // individually drawing each stem.
 tuftGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.115,0,0, .105,0,0, -.015,.34,.03,
   0,0,-.10, 0,0,.10, .06,.31,.01,
   -.09,0,-.06, .09,0,.06, -.05,.27,-.04
 ],3));
 tuftGeo.computeVertexNormals();
 const material=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide,vertexColors:false});
 const grass=new THREE.InstancedMesh(tuftGeo,material,grassTarget);
 grass.name='Oakrest city meadow grass';grass.castShadow=false;grass.receiveShadow=false;
 grass.userData.cityGroundCover=true;
 const flowerMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true});
 const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.12,0),flowerMaterial,flowerTarget);
 flowers.name='Oakrest city wildflowers';flowers.castShadow=false;flowers.userData.cityGroundCover=true;
 const dummy=new THREE.Object3D();let grassCount=0,flowerCount=0;
 for(let i=0;i<grassTarget;i++){
  const p=pick();if(!p)break;
  const scale=.57+random()*.47;
  dummy.position.set(p.x,terrainHeight(p.x,p.z)+.006,p.z);
  dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(scale);dummy.updateMatrix();
  grass.setMatrixAt(grassCount,dummy.matrix);
  grass.setColorAt(grassCount,new THREE.Color(palette.grass[Math.floor(random()*palette.grass.length)]));
  grassCount++;
 }
 for(let i=0;i<flowerTarget;i++){
  const p=pick();if(!p)break;
  dummy.position.set(p.x,terrainHeight(p.x,p.z)+.095+random()*.06,p.z);
  dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(.58+random()*.48);dummy.updateMatrix();
  flowers.setMatrixAt(flowerCount,dummy.matrix);
  flowers.setColorAt(flowerCount,new THREE.Color(palette.flowers[Math.floor(random()*palette.flowers.length)]));
  flowerCount++;
 }
 grass.count=grassCount;flowers.count=flowerCount;
 grass.instanceMatrix.needsUpdate=true;flowers.instanceMatrix.needsUpdate=true;
 if(grass.instanceColor)grass.instanceColor.needsUpdate=true;
 if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;
 grass.computeBoundingSphere();flowers.computeBoundingSphere();
 scene.add(grass,flowers);
 return {grass,flowers,grassCount,flowerCount};
}
