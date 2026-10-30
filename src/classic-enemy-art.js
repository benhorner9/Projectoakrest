/** Oakrest Classic creature art. Visual-only cached canvas poses, never simulation state.
 * One texture per (species, pose); no per-frame canvas allocations after warmup. */
import * as THREE from 'three';

export const CLASSIC_CREATURE_POSES=Object.freeze(['idle','stride','brace','lunge','hurt','fall']);
export const CLASSIC_CREATURE_TYPES=Object.freeze(['mossling','boar','keeper','guardian']);

export function classicCreaturePose({
 moving=false,hit=false,warning=false,releasing=false,dying=false,time=0,reducedMotion=false
}={}){
 if(dying)return 'fall';
 if(hit)return 'hurt';
 if(releasing)return 'lunge';
 if(warning)return 'brace';
 if(moving)return reducedMotion?'stride':Math.floor(Math.max(0,time)*7)%2?'stride':'idle';
 return 'idle';
}

/** These are visual design tokens, never drop or combat rarity information. */
export const CREATURE_PALETTE=Object.freeze({
 mossling:Object.freeze({edge:'#293e34',base:'#5c805a',light:'#8db47b',detail:'#c2d8a0',eye:'#f5e1a0'}),
 boar:Object.freeze({edge:'#382e2a',base:'#7c5542',light:'#ad805e',detail:'#e0cb9c',eye:'#f2d6a0'}),
 keeper:Object.freeze({edge:'#253d35',base:'#526d5e',light:'#86ab8e',detail:'#c0e2c6',eye:'#b9f9df'}),
 guardian:Object.freeze({edge:'#334534',base:'#6e8663',light:'#a0ad73',detail:'#e0c28d',eye:'#fff1bc'})
});

function paintCreature(ctx,type,pose){
 const c=CREATURE_PALETTE[type],boar=type==='boar',moss=type==='mossling',
  keeper=type==='keeper',guardian=type==='guardian';
 const p=(color,points,outline=true)=>{
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);
  for(const point of points.slice(1))ctx.lineTo(...point);
  ctx.closePath();ctx.fill();
  if(outline){ctx.strokeStyle=c.edge;ctx.lineWidth=3;ctx.lineJoin='round';ctx.stroke();}
 };
 const box=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const stride=pose==='stride',brace=pose==='brace',lunge=pose==='lunge',
  hurt=pose==='hurt',fall=pose==='fall';
 ctx.save();
 // Art-only offsets: enemy.x/z and authoritative hit regions never change.
 ctx.translate(lunge?5:hurt?-4:0,fall?16:stride?-3:brace?3:0);
 if(fall){ctx.translate(48,78);ctx.rotate(-.65);ctx.translate(-48,-78);}
 if(moss){
  p(c.edge,[[16,89],[10,66],[22,39],[34,22],[49,14],[66,24],[79,42],[87,69],[78,89]]);
  p(c.base,[[21,84],[17,64],[28,41],[40,27],[51,22],[66,34],[77,62],[74,83]]);
  for(let i=0;i<5;i++)p(i%2?c.light:c.base,[[24+i*12,38],[26+i*12,19-(i%2)*6],[36+i*12,36]],false);
  p(c.light,[[31,53],[43,42],[65,45],[71,65],[60,77],[35,72]]);
  box(c.edge,34,51,8,10);box(c.edge,57,51,8,10);
  box(c.eye,36,52,3,4);box(c.eye,59,52,3,4);
  p(c.detail,[[43,70],[48,74],[54,70]],false);
  for(const [x,y] of [[24,82],[70,82]])p(c.edge,[[x-5,y],[x+8,y],[x+11,y+9],[x-8,y+9]],false);
 }else if(boar){
  // Low broad flank and four weighted hooves distinguish boar from biped foes.
  for(const x of [22,38,61,75])p(c.edge,[[x-6,72],[x+4,72],[x+4+(stride?3:0),94],[x-9,94]]);
  p(c.edge,[[9,50],[22,33],[53,31],[78,45],[85,67],[73,81],[23,81]]);
  p(c.base,[[13,52],[27,38],[54,38],[74,46],[80,64],[69,76],[26,75]]);
  for(let i=0;i<6;i++)p(c.light,[[17+i*9,45],[22+i*9,26-(i%2)*5],[29+i*9,42]],false);
  p(c.light,[[27,40],[45,33],[67,42],[76,55],[68,68],[38,69],[27,59]]);
  p(c.base,[[36,53],[63,51],[73,64],[62,76],[38,73]]);
  p(c.light,[[39,59],[69,56],[67,69],[42,70]],false);
  box(c.edge,44,64,5,5);box(c.edge,58,63,5,5);
  p(c.detail,[[34,66],[22,60],[27,76],[37,73]]);
  p(c.detail,[[67,66],[79,60],[75,77],[65,73]]);
  box(c.eye,33,50,5,4);box(c.eye,63,49,5,4);
 }else{
  // Keeper is hooded and spectral. Guardian has branching antlers and plate bark.
  p(c.edge,[[20,94],[24,62],[17,39],[32,23],[48,13],[65,22],[80,41],[72,64],[85,94]]);
  p(c.base,[[25,89],[31,60],[26,40],[39,26],[48,22],[61,28],[70,45],[65,64],[76,89]]);
  if(guardian){
   for(const side of [-1,1]){
    const x=48+side*17;
    p(c.detail,[[x,39],[x+side*9,21],[x+side*5,7],[x+side*13,17],[x+side*20,10],[x+side*17,28],[x+side*7,47]]);
   }
   p(c.light,[[29,50],[40,34],[57,34],[69,51],[66,82],[48,90],[30,82]]);
   for(let i=0;i<3;i++)p(c.base,[[34+i*11,55],[41+i*11,47],[47+i*11,58],[42+i*11,71]],false);
  }else{
   p(c.light,[[34,37],[48,25],[64,39],[67,56],[56,71],[39,68],[31,53]]);
   p(c.base,[[23,72],[36,65],[48,75],[62,66],[75,79],[80,94],[15,94]]);
  }
  box(c.eye,36,44,7,5);box(c.eye,55,44,7,5);
  p(c.detail,[[48,55],[57,66],[48,76],[39,66]]);
  if(keeper)for(const side of [-1,1])
   p(c.detail,[[48+side*17,39],[48+side*31,18],[48+side*25,7],[48+side*17,28]]);
 }
 // A single bounded pose overlay gives contact/anticipation readable silhouettes.
 if(brace)p(c.detail,[[17,84],[23,77],[27,84],[23,90]],false);
 if(lunge)p(c.detail,[[76,75],[88,68],[83,82],[92,87],[78,85]],false);
 if(hurt){box('#f8cda0',27,40,8,4);box('#f8cda0',67,62,7,4);}
 ctx.restore();
}

/** Lazily generated, shared across creatures of the same species. */
export function createClassicEnemyAtlas(){
 const textures=new Map();
 function get(type,pose='idle'){
  const species=CREATURE_PALETTE[type]?type:'mossling';
  const frame=CLASSIC_CREATURE_POSES.includes(pose)?pose:'idle';
  const key=species+':'+frame;
  if(!textures.has(key)){
   const canvas=document.createElement('canvas');canvas.width=96;canvas.height=112;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   paintCreature(ctx,species,frame);
   const texture=new THREE.CanvasTexture(canvas);
   texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
   texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
   textures.set(key,texture);
  }
  return textures.get(key);
 }
 return {get,stats:()=>({textures:textures.size,limit:CLASSIC_CREATURE_POSES.length*CLASSIC_CREATURE_TYPES.length}),
  dispose(){for(const texture of textures.values())texture.dispose();textures.clear();}};
}
