import * as THREE from 'three';
import {terrainHeight,blocked} from './terrain.js';
import {OAKREST_PATHS,roadCrossSections,reservedTownGround} from './town-layout.js';

/**
 * The completed Oakrest town has authored, walkable streets. These meshes are
 * visual-only: routing, street widths, foundations and collision remain owned
 * by the canonical town layout and terrain modules.
 */
const palette={
 earth:['#998b6f','#ab9776','#9d9175','#8f856c'],
 mortar:['#807766','#888070','#797565'],
 stone:['#c3b69b','#b7ae98','#ada78f','#c5bea8','#a99f8b','#bbad91'],
 grass:['#5d854d','#78965d','#8ba56b','#547c52','#9aaa6d','#65885b'],
 flowers:['#e7d590','#f4e3bf','#e2bad3','#c6cadf']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(a,b,c=0)=>{
 const x=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;
 return x-Math.floor(x);
};
const between=(a,b,t)=>a+(b-a)*t;

function meshFor(scene,name,positions,colors,indices,roughness=1){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness,metalness:0,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geo,material);
 mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=false;
 // Keep our four large, already merged surfaces out of scenery re-batching.
 mesh.userData.animated=true;
 scene.add(mesh);return mesh;
}
function addQuad(points,colours,faces,corners,colour,offset){
 const base=points.length/3,tint=new THREE.Color(colour);
 for(const [x,z] of corners){
  points.push(x,terrainHeight(x,z)+offset,z);
  colours.push(tint.r,tint.g,tint.b);
 }
 faces.push(base,base+1,base+2,base,base+2,base+3);
}
function crossSection(ends,from,to,t){
 return {left:[between(from.left[0],to.left[0],t),between(from.left[1],to.left[1],t)],
         right:[between(from.right[0],to.right[0],t),between(from.right[1],to.right[1],t)]};
}
function across(cross,v){
 return [between(cross.left[0],cross.right[0],v),between(cross.left[1],cross.right[1],v)];
}
function slab(a,b,start,end,gapU,gapV){
 const u0=start+gapU,u1=end-gapU,v0=gapV,v1=1-gapV;
 return [across(a,u0),across(a,u1),across(b,u1),across(b,u0)];
}

/** An efficient pair of continuous terrain-following foundations + a single
 * pooled mesh for thousands of irregular paving stones. */
export function buildOakrestCityPaths(scene){
 const layers=[{name:'Oakrest weathered path verges',width:5.4,offset:.023,palette:palette.earth},
               {name:'Oakrest cobblestone mortar paths',width:4.35,offset:.041,palette:palette.mortar}];
 const surfaces=layers.map(l=>({layer:l,points:[],colours:[],faces:[]}));
 const stones={points:[],colours:[],faces:[]};let stoneCount=0,segments=0;
 OAKREST_PATHS.forEach((route,routeIndex)=>{
  const cross=layers.map(l=>roadCrossSections(route,l.width));
  for(let k=1;k<route.length;k++){
   const d=Math.hypot(route[k][0]-route[k-1][0],route[k][1]-route[k-1][1]);
   const steps=Math.max(1,Math.ceil(d/1.05));
   for(let row=0;row<steps;row++){
    const start=row/steps,end=(row+1)/steps;
    surfaces.forEach(({layer,points,colours,faces},i)=>{
     const a=crossSection(cross[i],cross[i][k-1],cross[i][k],start);
     const b=crossSection(cross[i],cross[i][k-1],cross[i][k],end);
     addQuad(points,colours,faces,[a.left,a.right,b.right,b.left],
      layer.palette[Math.floor(hash(routeIndex,k,row+i*17)*layer.palette.length)],layer.offset);
    });
    // Each tile is inset into the mortar bed; subtle asymmetric widths,
    // staggered courses and multiple stone hues read as hand-laid paving.
    const at=t=>crossSection(cross[1],cross[1][k-1],cross[1][k],t);
    for(let col=0;col<5;col++){
     const skew=(hash(routeIndex*41+k,row*7+col,6)-.5)*.035;
     const inset=.075+.025*hash(routeIndex+k,row,col);
     const first=start+Math.min(.010,(end-start)*.06);
     const last=end-Math.min(.010,(end-start)*.06);
     const u0=col/5+inset/4.35,u1=(col+1)/5-inset/4.35;
     const front=at(clamp(first+skew*(end-start),start+.005,end-.006));
     const back=at(clamp(last+skew*(end-start),start+.006,end-.005));
     const colour=palette.stone[Math.floor(hash(k*29+routeIndex,row,col)*palette.stone.length)];
     addQuad(stones.points,stones.colours,stones.faces,
       [across(front,u0),across(front,u1),across(back,u1),across(back,u0)],
       colour,.056+routeIndex*.00004);
     stoneCount++;
    }
    segments++;
   }
  }
 });
 const verge=surfaces.map(({layer,points,colours,faces})=>
   meshFor(scene,layer.name,points,colours,faces));
 const paving=meshFor(scene,'Oakrest individual weathered paving stones',stones.points,stones.colours,stones.faces,.94);
 return {verge,mortar:verge[1],stones:paving,stoneCount,segments};
}

/** Repeatable ground cover placed only on walkable green ground; no spawning
 * inside completed buildings, thresholds, roads, the paved square or well. */
export function buildOakrestCityMeadows(scene,{seed=26091,grassTarget=820,flowerTarget=160}={}){
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
  -.16,0,0, .13,0,0, -.015,.61,.04,
   0,0,-.13, 0,0,.14, .09,.52,.01,
   -.11,0,-.07, .10,0,.09, -.08,.45,-.04
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
  const scale=.58+random()*.94;
  dummy.position.set(p.x,terrainHeight(p.x,p.z)+.006,p.z);
  dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(scale);dummy.updateMatrix();
  grass.setMatrixAt(grassCount,dummy.matrix);
  grass.setColorAt(grassCount,new THREE.Color(palette.grass[Math.floor(random()*palette.grass.length)]));
  grassCount++;
 }
 for(let i=0;i<flowerTarget;i++){
  const p=pick();if(!p)break;
  dummy.position.set(p.x,terrainHeight(p.x,p.z)+.23+random()*.14,p.z);
  dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(.72+random()*.65);dummy.updateMatrix();
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
