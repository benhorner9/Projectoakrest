/** Lightweight directional sprite atlas created in-browser from a single art grammar.
 * Models are never skinned; all combat-style gear uses the same silhouette language.
 */
import * as THREE from 'three';
import {spriteDirection} from './classic-presentation.js';
const PIX=4, W=96,H=128;
const textureCache=new Map();
function fill(ctx,color,x,y,w,h){
 ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function polygon(ctx,color,points){
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();
}
function outline(ctx,x,y,w,h,c='#2c2b2a'){fill(ctx,c,x-2,y-2,w+4,h+4);}
function renderActor({dir,step,style,coat,skin,hair,helm,shield,boots,offhand,weapon,arrows}){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const front=[0,1,7].includes(dir),back=[3,4,5].includes(dir);
 const side=[1,2,3,5,6,7].includes(dir);
 const right=dir<4,shift=side?(right?4:-4):0;
 const line='#292c2b';
 // Boots and alternating walk cycle, all actors share a consistent outline.
 const stride=step===1?6:step===2?-6:0;
 for(const sign of [-1,1]){
  const x=48+sign*11+shift/2,foot=stride*sign;
  outline(c,x-7,84+foot,14,19,line);fill(c,boots,x-7,84+foot,14,19);
  fill(c,'#c6a778',x-7,102+foot,17,7);
 }
 // Equipment that must appear behind the body.
 if(arrows&&style==='ranged'){outline(c,right?20:66,47,11,29);fill(c,'#947b51',right?20:66,47,11,29);for(let i=0;i<3;i++)fill(c,'#d3c7a7',(right?21:67)+i*3,41,2,11);}
 if(style==='magic'){polygon(c,'#303f57',[[27,63],[69,63],[78,104],[18,104]]);}
 // Left arm, body and moving right arm.
 outline(c,23+shift,49,14,37);fill(c,coat,23+shift,49,14,37);
 polygon(c,line,[[30,44],[66,44],[72,88],[24,88]]);
 polygon(c,coat,[[31,45],[65,45],[69,84],[27,84]]);
 fill(c,'#d8bf8d',28,78,41,5);
 fill(c,'#5a4636',32,81,33,5);
 const handOffset=step===1?4:step===2?-4:0;
 outline(c,61+shift,48+handOffset,14,34);fill(c,coat,61+shift,48+handOffset,14,34);
 fill(c,skin,62+shift,80+handOffset,12,9);
 // Head and neck; face/hair direction conveys facing.
 fill(c,skin,42,39,12,10);
 outline(c,32+shift/2,12,32,32);
 fill(c,skin,32+shift/2,12,32,32);
 if(back){
  fill(c,hair,32+shift/2,12,32,23);
  fill(c,hair,35+shift/2,32,26,11);
 }else{
  fill(c,hair,32+shift/2,12,32,10);
  fill(c,hair,32+shift/2,18,7,13);
  if(front){
   fill(c,'#43312a',40+shift/2,31,4,4);
   fill(c,'#43312a',54+shift/2,31,4,4);
  }else fill(c,'#43312a',right?55:39,29,4,5);
 }
 if(helm){
  fill(c,'#697b7d',30+shift/2,12,36,11);
  fill(c,'#c7b9a0',31+shift/2,23,34,4);
  fill(c,'#5e7473',30+shift/2,25,8,13);
  fill(c,'#5e7473',58+shift/2,25,8,13);
 }
 if(shield&&style==='melee'){
  const sx=right?15:66;
  polygon(c,line,[[sx,62],[sx+15,60],[sx+17,84],[sx+8,95],[sx-1,84]]);
  polygon(c,'#778e8a',[[sx+2,65],[sx+13,64],[sx+14,83],[sx+8,91],[sx+2,82]]);
  fill(c,'#c8ac73',sx+6,71,5,12);
 }
 // Equipment drawn after hands ensures correctly attached 2D silhouette.
 const wx=right?79:14,wy=step===2?39:45;
 if(style==='melee'){
  fill(c,line,wx-3,wy-13,7,48);
  fill(c,'#d3dae0',wx-2,wy-20,5,33);
  fill(c,'#bca46f',wx-8,wy+13,17,5);
  fill(c,'#67503c',wx-2,wy+18,5,16);
 }else if(style==='magic'){
  fill(c,'#382e2c',wx-4,wy-22,8,68);
  fill(c,'#b9a178',wx-2,wy-20,4,63);
  polygon(c,'#a4d4ce',[[wx,wy-32],[wx+12,wy-19],[wx,wy-6],[wx-12,wy-19]]);
  fill(c,'#e4f1c9',wx-3,wy-22,6,7);
 }else{
  c.strokeStyle='#5a3a2a';c.lineWidth=5;
  c.beginPath();c.moveTo(wx-7,wy-23);c.quadraticCurveTo(wx+16,wy+4,wx-7,wy+39);c.stroke();
  c.strokeStyle='#e9e1ce';c.lineWidth=2;c.beginPath();c.moveTo(wx-7,wy-23);c.lineTo(wx-7,wy+39);c.stroke();
  fill(c,'#aa986b',wx-14,wy+4,23,3);
  polygon(c,'#d5ded7',[[wx+13,wy+5],[wx+3,wy-2],[wx+4,wy+11]]);
 }
 // Jewellery/pouch finishing touches, drawn from the saved loadout's extra slots.
 if(offhand&&style==='magic')fill(c,'#d1deaa',19,66,8,8);
 if(weapon==='none'){/* The preview still shows a practice silhouette for the currently selected style. */}
 const tex=new THREE.CanvasTexture(canvas);
 tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
 tex.colorSpace=THREE.SRGBColorSpace;tex.generateMipmaps=false;
 return tex;
}
function keyFor(config,dir,step){
 return [config.coat,config.skin,config.hair,config.helm,config.shield,config.boots,
  config.offhand,config.arrows,config.weapon,config.style,dir,step].join('|');
}
export function makeClassicActor({style='melee',coat='#68867f',skin='#d9b08c',hair='#493529',worn={}}={}){
 const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.07});
 const sprite=new THREE.Sprite(material);sprite.scale.set(2.65,3.55,1);
 sprite.center.set(.5,0);
 let lastKey='';
 function update({facing={x:0,z:1},step=0,style:nextStyle=style,worn:nextWorn=worn}={}){
  const config={style:nextStyle,coat:nextStyle==='melee'?'#916b5c':nextStyle==='magic'?'#62758f':nextStyle==='ranged'?'#668069':coat,
   skin,hair,helm:!!nextWorn.helm,shield:!!nextWorn.offhand,offhand:!!nextWorn.offhand,
   boots:nextWorn.boots?'#5f4a3b':'#795f4a',arrows:!!nextWorn.arrows,weapon:nextWorn.weapon};
  const dir=spriteDirection(facing.x,facing.z),frame=step%3,key=keyFor(config,dir,frame);
  if(key===lastKey)return;
  if(!textureCache.has(key))textureCache.set(key,renderActor({...config,dir,step:frame}));
  sprite.material.map=textureCache.get(key);sprite.material.needsUpdate=true;lastKey=key;
 }
 update();
 return {sprite,update};
}
export function makeGroundShadow(){
 const material=new THREE.MeshBasicMaterial({color:'#23372d',transparent:true,opacity:.22,depthWrite:false});
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(.77,20),material);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.025;return mesh;
}
