/**
 * Oakrest visual fidelity system.
 *
 * Art direction: tactile storybook surfaces, directional sunlight and local
 * practical lighting. All textures are generated once, shipped without network
 * requests and shared between meshes. No per-frame geometry/material allocation.
 *
 * Keep the renderer WebGL-based for iPad Safari compatibility.
 */
import {OAKREST_CITY_LAMPS} from './town-layout.js';

export const SURFACE_PRESETS=Object.freeze({
  plaster:Object.freeze({roughness:.97,metalness:0,bumpScale:.025}),
  limestone:Object.freeze({roughness:.92,metalness:0,bumpScale:.038}),
  timber:Object.freeze({roughness:.86,metalness:0,bumpScale:.025}),
  slate:Object.freeze({roughness:.78,metalness:0,bumpScale:.027}),
  cloth:Object.freeze({roughness:.98,metalness:0,bumpScale:.012}),
  road:Object.freeze({roughness:1,metalness:0,bumpScale:.025})
});
const textures=new Map();
const hash=(x,y,seed=0)=>{
  let n=Math.imul((x|0)+seed*31,374761393)^Math.imul((y|0)-seed*17,668265263);
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
};
const ink=(n)=>{const v=Math.max(0,Math.min(255,Math.round(n)));return 'rgb('+v+','+v+','+v+')';};

/** Deterministic tileable patterns; grayscale lets the material tint carry identity. */
export function paintSurface(ctx,kind,size=256){
  const stroke=(x1,y1,x2,y2,w,shade)=>{ctx.strokeStyle=ink(shade);ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  ctx.fillStyle=ink(kind==='plaster'?241:kind==='cloth'?245:232);ctx.fillRect(0,0,size,size);
  if(kind==='slate'){
    const h=size/10,w=size/5;
    for(let row=0;row<10;row++)for(let col=-1;col<6;col++){
      const x=(col+(row%2)*.5)*w,y=row*h;
      ctx.fillStyle=ink(226+hash(col,row,11)*28);
      ctx.fillRect(x+1,y+1,w-2,h-3);
      stroke(x+1,y+h-2,x+w-1,y+h-2,2,139+hash(col,row,14)*18);
      stroke(x+2,y+2,x+w-2,y+2,1,250);
    }
  }else if(kind==='timber'){
    const w=size/7;
    for(let col=0;col<7;col++){
      const x=col*w;ctx.fillStyle=ink(222+hash(col,3,8)*27);ctx.fillRect(x+1,0,w-2,size);
      stroke(x+.75,0,x+.75,size,2,161);
      for(let row=0;row<23;row++){
        const y=(row+hash(col,row,19)*.6)*size/23;
        stroke(x+3,y,x+w-3,y+2,hash(col,row,17)*.85+.35,206+hash(col,row,2)*38);
      }
      for(const y of [size*.25,size*.75])stroke(x+3,y,x+w-3,y,1.4,154);
    }
  }else if(kind==='limestone'||kind==='road'){
    const h=size/(kind==='road'?9:7),w=size/(kind==='road'?7:4);
    for(let row=0;row<Math.ceil(size/h);row++)for(let col=-1;col<Math.ceil(size/w)+1;col++){
      const x=(col+(row%2)*.5)*w,y=row*h;
      const v=216+hash(col,row,23)*35;
      ctx.fillStyle=ink(v);ctx.fillRect(x+2,y+2,w-4,h-4);
      stroke(x+3,y+h-3,x+w-3,y+h-3,1.5,158+hash(col,row,4)*22);
      for(let k=0;k<4;k++){
        const px=x+5+hash(col,k+row*4,5)*(w-10),py=y+4+hash(col,k+row*4,6)*(h-8);
        ctx.fillStyle=ink(v-12);ctx.fillRect(px,py,2,1);
      }
    }
  }else if(kind==='cloth'){
    for(let i=0;i<size;i+=5){
      stroke(i,0,i,size,.7,220);stroke(0,i,size,i,.7,231);
    }
  }else{
    for(let y=0;y<size;y+=8)for(let x=0;x<size;x+=8){
      const speck=hash(x,y,91),shade=213+speck*39;
      ctx.fillStyle=ink(shade);ctx.fillRect(x+speck*4,y+hash(y,x,42)*4,2,2);
    }
    for(let i=0;i<24;i++){
      const x=hash(i,2,13)*size,y=hash(i,3,14)*size;
      stroke(x,y,x+hash(i,5,10)*12,y+2,.55,222);
    }
  }
}
/** Shared color & data textures, two small 256px maps per surface type. */
function surfaceMaps(THREE,kind){
  if(textures.has(kind))return textures.get(kind);
  if(typeof document==='undefined')return {map:null,bumpMap:null};
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx)return {map:null,bumpMap:null};
  paintSurface(ctx,kind);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  const bumpMap=new THREE.CanvasTexture(canvas);bumpMap.colorSpace=THREE.NoColorSpace;
  bumpMap.wrapS=bumpMap.wrapT=THREE.RepeatWrapping;bumpMap.anisotropy=2;
  const pair={map,bumpMap};textures.set(kind,pair);return pair;
}
export function createSurfaceMaterial(THREE,color,kind,overrides={}){
  const preset=SURFACE_PRESETS[kind];
  if(!preset)throw new Error('Unknown Oakrest material surface: '+kind);
  const {map,bumpMap}=surfaceMaps(THREE,kind);
  return new THREE.MeshStandardMaterial({color,...preset,...(map?{map,bumpMap}:{}),...overrides});
}
export const GRAPHICS_QUALITY=Object.freeze({
  low:Object.freeze({pixelRatio:1,shadowSize:512,practicalLights:0}),
  balanced:Object.freeze({pixelRatio:1.35,shadowSize:1024,practicalLights:1}),
  high:Object.freeze({pixelRatio:1.8,shadowSize:2048,practicalLights:2})
});
export function graphicsProfile(quality){
  return GRAPHICS_QUALITY[quality]||GRAPHICS_QUALITY.balanced;
}

/**
 * A small moving shadow cascade surrogate (one directional-light shadow map):
 * recenter after travelled distance, rather than spreading a 1024px map over
 * the entire city. Never changes the gameplay camera or world collision.
 * Two recycled non-shadow-casting lights illuminate only nearby lanterns.
 */
/**
 * Find the closest two world-space lanterns without allocating on each frame.
 * The caller owns the two-item output buffer, including when no light is near.
 * Strict distance cutoff and stable source ordering match the old stable-sort
 * selection. Keep the radius squared to avoid square-root work.
 */
export function selectPracticalLightIndices(positions,x,z,out,maxDistanceSq=196){
 if(!out||out.length<2)throw new RangeError('Expected a two-index scratch buffer');
 let a=-1,b=-1,da=maxDistanceSq,db=maxDistanceSq;
 for(let i=0;i<positions.length;i++){
  const pair=positions[i],dx=pair[0]-x,dz=pair[1]-z,d=dx*dx+dz*dz;
  if(d>=maxDistanceSq)continue;
  if(d<da){b=a;db=da;a=i;da=d;}
  else if(d<db){b=i;db=d;}
 }
 out[0]=a;out[1]=b;
 return out;
}
export function createOakrestLighting({THREE,scene,sun,quality='balanced',terrainHeight}){
  const practicals=[0,1].map(()=>{
    const p=new THREE.PointLight('#ffcb87',13,10,2);
    p.visible=false;p.castShadow=false;scene.add(p);return p;
  });
  const interior=new THREE.PointLight('#ffdfb2',19,14,2);
  interior.castShadow=false;interior.visible=false;scene.add(interior);
  const positions=[...OAKREST_CITY_LAMPS,
    [-7.1,5.3],[7.2,5.3],[-6.7,-9.5],[7.1,-9.5],[-5.9,-33],[5.9,-50],
    ...[-18,-27,-37,-46].flatMap(z=>[[-5.8,z],[5.8,z]])];
  const target=sun.target;scene.add(target);
  const halfWidth=25;
  Object.assign(sun.shadow.camera,{left:-halfWidth,right:halfWidth,top:halfWidth,bottom:-halfWidth});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;
  const lightIndices=new Int32Array(2);
  let level='balanced',anchorX=NaN,anchorZ=NaN,activeLights=0;
  function setQuality(next){
    level=GRAPHICS_QUALITY[next]?next:'balanced';
    const size=graphicsProfile(level).shadowSize;
    if(sun.shadow.mapSize.x!==size){
      // Release the old render target before the renderer allocates the new
      // resolution; keeping a disposed target attached causes resize faults.
      sun.shadow.dispose();
      sun.shadow.map=null;
      sun.shadow.mapPass=null;
      sun.shadow.mapSize.set(size,size);
      sun.shadow.needsUpdate=true;
    }
    practicals.forEach((p,i)=>{if(i>=graphicsProfile(level).practicalLights)p.visible=false;});
    return level;
  }
  setQuality(quality);
  function update(player,building=null,active=true){
    if(!active){
      interior.visible=false;for(const p of practicals)p.visible=false;activeLights=0;return;
    }
    const x=player.x,z=player.z;
    if(!Number.isFinite(anchorX)||Math.hypot(x-anchorX,z-anchorZ)>8){
      anchorX=Math.round(x/8)*8;anchorZ=Math.round(z/8)*8;
      target.position.set(anchorX,0,anchorZ);
      sun.position.set(anchorX-26,47,anchorZ+21);
      target.updateMatrixWorld();
    }
    interior.visible=!!building;
    if(building){
      interior.position.set(building.x,terrainHeight(building.x,building.z)+3,building.z);
    }
    activeLights=0;
    const budget=building?0:graphicsProfile(level).practicalLights;
    if(budget)selectPracticalLightIndices(positions,x,z,lightIndices);
    for(let i=0;i<practicals.length;i++){
      const p=practicals[i],index=budget>i?lightIndices[i]:-1;
      p.visible=index>=0;
      if(p.visible){
        const pair=positions[index],lx=pair[0],lz=pair[1];
        p.position.set(lx,terrainHeight(lx,lz)+2.72,lz);activeLights++;
      }
    }
  }
  return {update,setQuality,metrics:()=>({shadowResolution:sun.shadow.mapSize.x,practicalLights:activeLights,interiorLight:interior.visible})};
}
