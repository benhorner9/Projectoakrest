import {classicGrip,mirroredDirection} from './classic-sprite-rig.js';
/** Lightweight directional sprite atlas created in-browser from a single art grammar.
 * Models are never skinned; all combat-style gear uses the same silhouette language.
 */
import * as THREE from 'three';
import {spriteDirection} from './classic-presentation.js';
const W=96,H=128;
const textureCache=new Map(),textureRefs=new Map();
function releaseTexture(key){if(!key)return;textureRefs.set(key,Math.max(0,(textureRefs.get(key)||1)-1));}
function trimTextures(){
 if(textureCache.size<=256)return;
 for(const [key,texture] of textureCache){if(!textureRefs.get(key)){texture.dispose();textureCache.delete(key);textureRefs.delete(key);if(textureCache.size<=192)break;}}
}
export const classicSpriteCacheStats=()=>({textures:textureCache.size,active:[...textureRefs.values()].filter(n=>n>0).length});
function fill(ctx,color,x,y,w,h){
 ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function polygon(ctx,color,points){
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();
}
function outline(ctx,x,y,w,h,c='#2c2b2a'){fill(ctx,c,x-2,y-2,w+4,h+4);}
function renderActor({dir,step,style,coat,skin,hair,helm,shield,boots,offhand,weapon,arrows,chest,legs,amulet,ring,outfit,hairstyle,sex,pose}){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const direction=mirroredDirection(dir);dir=direction.dir;
 if(direction.mirror){c.translate(W,0);c.scale(-1,1);}
 const grip=classicGrip(style,pose,step);
 const front=[0,1,7].includes(dir),back=[3,4,5].includes(dir);
 const side=[1,2,3,5,6,7].includes(dir);
 const right=true,shift=side?4:0;
 const line='#292c2b';
 // Boots and alternating walk cycle, all actors share a consistent outline.
 const stride=step===1?6:step===2?-6:0;
 const plate=/plate|mail|recruit/i.test(chest||'');
 const leather=/leather|hide|scout/i.test(chest||'');
 const cloth=/robes|wraps|traveller/i.test(chest||'');
 const legPlate=/recruit|greaves/i.test(legs||'');
 const legLeather=/scout|chaps/i.test(legs||'');
 const legMage=/apprentice|legging/i.test(legs||'');
 for(const sign of [-1,1]){
  const x=48+sign*11+shift/2,foot=stride*sign;
  outline(c,x-7,84+foot,14,19,line);fill(c,boots?(/scout/i.test(boots)?'#66563f':/apprentice/i.test(boots)?'#424c66':'#788281'):'#654d3c',x-7,84+foot,14,19);
  fill(c,legPlate?'#a3aeac':legLeather?'#9c7757':legMage?'#5d6787':coat,x-7,89+foot,14,12);
  fill(c,'#c6a778',x-7,102+foot,17,7);
 }
 // Equipment that must appear behind the body.
 if(arrows&&style==='ranged'){outline(c,right?20:66,47,11,29);fill(c,'#947b51',right?20:66,47,11,29);for(let i=0;i<3;i++)fill(c,'#d3c7a7',(right?21:67)+i*3,41,2,11);}
 // Style alone never creates a cloak: empty loadouts always show starter clothes.
 // Left arm, body and moving right arm.
 outline(c,23+shift,49,14,37);fill(c,coat,23+shift,49,14,37);
 polygon(c,line,[[30,44],[66,44],[72,88],[24,88]]);
 polygon(c,coat,sex==='female'?[[34,45],[62,45],[69,84],[27,84]]:[[31,45],[65,45],[69,84],[27,84]]);
 // Starter clothing remains consistent across every loadout; armour is layered over it.
 if(outfit==='wanderer'){fill(c,'#b8a17c',30,48,4,33);fill(c,'#aa8d66',63,48,4,33);}
 else if(outfit==='scholar'){fill(c,'#d1c8a6',31,46,34,6);fill(c,'#a69377',43,55,10,29);}
 else if(outfit==='traveller'){fill(c,'#554637',28,62,5,23);fill(c,'#76654c',64,62,5,23);}
 else {fill(c,'#9b8061',38,46,20,4);}
 fill(c,'#d8bf8d',28,78,41,5);
 fill(c,'#5a4636',32,81,33,5);
 if(plate){fill(c,'#9baaaa',32,49,32,24);fill(c,'#d2d4be',35,53,26,4);fill(c,'#687977',46,55,4,18);}
 else if(leather){fill(c,'#8b6548',33,49,30,26);fill(c,'#c29b69',43,48,9,29);}
 else if(cloth){fill(c,'#c1b39a',32,52,32,4);fill(c,'#4b6679',38,57,20,16);}
 const handOffset=grip.hand.y-84;
 polygon(c,line,[[61,47],[72,50],[grip.hand.x+6,grip.hand.y-4],[grip.hand.x-6,grip.hand.y+1],[60,61]]);
 polygon(c,coat,[[63,49],[70,52],[grip.hand.x+4,grip.hand.y-5],[grip.hand.x-4,grip.hand.y-2],[62,60]]);
 // Head and neck; face/hair direction conveys facing.
 fill(c,skin,42,39,12,10);
 c.fillStyle=line;c.beginPath();c.ellipse(48+shift/2,28,16,18,0,0,Math.PI*2);c.fill();
 c.fillStyle=skin;c.beginPath();c.ellipse(48+shift/2,28,14,16,0,0,Math.PI*2);c.fill();
 if(back){
  fill(c,hair,32+shift/2,12,32,hairstyle==='buzz'?7:23);
  if(['long','ponytail','curly'].includes(hairstyle))fill(c,hair,35+shift/2,32,26,hairstyle==='ponytail'?22:15);
 }else{
  fill(c,hair,32+shift/2,12,32,hairstyle==='buzz'?4:10);
  if(hairstyle!=='buzz')fill(c,hair,32+shift/2,18,7,hairstyle==='short'?9:13);
  if(hairstyle==='swept')polygon(c,hair,[[33,17],[65,13],[59,24],[36,26]]);
  if(hairstyle==='curly')for(let i=0;i<5;i++)fill(c,hair,31+shift/2+i*7,9+(i%2)*3,9,8);
  if(hairstyle==='long')for(const x of [30,62])fill(c,hair,x+shift/2,27,6,29);
  if(hairstyle==='ponytail')fill(c,hair,64+shift/2,26,6,31);
  if(front){
   fill(c,'#43312a',40+shift/2,31,4,4);
   fill(c,'#43312a',54+shift/2,31,4,4);
  }else fill(c,'#43312a',right?55:39,29,4,5);
 }
 if(helm){
  const metal=/recruit/i.test(helm),colour=metal?'#8e9e9c':/scout/i.test(helm)?'#806444':'#586385';
  fill(c,colour,30+shift/2,12,36,11);
  fill(c,metal?'#c7c9b8':'#baaa87',31+shift/2,23,34,4);
  fill(c,colour,30+shift/2,25,8,13);
  fill(c,colour,58+shift/2,25,8,13);
 }
 if(shield&&style==='melee'){
  const sx=right?15:66;
  polygon(c,line,[[sx,62],[sx+15,60],[sx+17,84],[sx+8,95],[sx-1,84]]);
  polygon(c,'#778e8a',[[sx+2,65],[sx+13,64],[sx+14,83],[sx+8,91],[sx+2,82]]);
  fill(c,'#c8ac73',sx+6,71,5,12);
 }
 // Equipment drawn after hands ensures correctly attached 2D silhouette.
 const wx=grip.weapon.x,wy=grip.weapon.y;
 c.save();
 if(style==='melee'&&weapon!=='none'){c.translate(grip.hand.x,grip.hand.y);c.rotate(pose==='windup'?.2:pose==='strike'?-1.05:0);c.translate(-grip.hand.x,-grip.hand.y);}
 if(weapon!=='none'&&style==='melee'){
  if(/dagger/i.test(weapon)){
   fill(c,'#e3ded1',wx-2,wy-3,4,25);fill(c,'#8a6b4a',wx-2,wy+20,4,12);
  }else if(/axe/i.test(weapon)){
   fill(c,'#8b6549',wx-3,wy-16,7,65);
   polygon(c,'#c1cbc9',[[wx-4,wy-16],[wx+19,wy-25],[wx+19,wy-2],[wx-4,wy-3]]);
  }else{
  fill(c,line,wx-3,wy-13,7,48);
  fill(c,'#d3dae0',wx-2,wy-20,5,33);
  fill(c,'#bca46f',wx-8,wy+13,17,5);
  fill(c,'#67503c',wx-2,wy+18,5,16);
  if(/greatsword/i.test(weapon))fill(c,'#e8e4d5',wx-4,wy-37,9,21);
  }
 }else if(weapon!=='none'&&style==='magic'){
  fill(c,'#382e2c',wx-4,wy-22,8,68);
  fill(c,'#b9a178',wx-2,wy-20,4,63);
  polygon(c,/ember|inferno/i.test(weapon)?'#ed9b59':'#a4d4ce',[[wx,wy-32],[wx+12,wy-19],[wx,wy-6],[wx-12,wy-19]]);
  fill(c,'#e4f1c9',wx-3,wy-22,6,7);
 }else if(weapon!=='none'&&style==='ranged'){
  if(/crossbow/i.test(weapon)){
   fill(c,'#92754b',wx-5,wy+5,9,37);fill(c,'#bbc6c4',wx-18,wy-8,37,6);fill(c,'#e1d3b7',wx-2,wy-14,4,40);
  }else{
  c.strokeStyle='#5a3a2a';c.lineWidth=5;
  c.beginPath();c.moveTo(wx-7,wy-23);c.quadraticCurveTo(wx+16,wy+4,wx-7,wy+39);c.stroke();
  c.strokeStyle='#e9e1ce';c.lineWidth=2;c.beginPath();c.moveTo(wx-7,wy-23);c.lineTo(wx-7-grip.bowDraw,wy+8);c.lineTo(wx-7,wy+39);c.stroke();
  fill(c,'#aa986b',wx-14,wy+4,23,3);
  polygon(c,'#d5ded7',[[wx+13,wy+5],[wx+3,wy-2],[wx+4,wy+11]]);
  }
 }
 c.restore();
 // The grip sits on top of the weapon handle at the same anchor in every pose.
 {
  fill(c,line,grip.hand.x-6,grip.hand.y-4,12,10);
  fill(c,skin,grip.hand.x-4,grip.hand.y-3,9,7);
  if(weapon!=='none'&&(style==='ranged'||/greatsword|staff/i.test(weapon))){
   c.strokeStyle=coat;c.lineWidth=9;c.beginPath();c.moveTo(30,57);c.lineTo(grip.hand.x-10,grip.hand.y+5);c.stroke();
   fill(c,skin,grip.hand.x-13,grip.hand.y+1,8,7);
  }
 }
 if(pose==='windup'&&style==='magic'&&weapon!=='none'){
  c.strokeStyle='#8dd7c2';c.lineWidth=2;c.beginPath();c.arc(wx,wy-19,17,0,Math.PI*2);c.stroke();
 }else if(pose==='strike'&&weapon!=='none'){
  c.strokeStyle=style==='magic'?'#a7e4d5':style==='ranged'?'#eadcae':'#eee5ce';c.lineWidth=3;c.beginPath();
  if(style==='melee')c.arc(57,64,27,-Math.PI*.65,Math.PI*.3);
  else if(style==='ranged'){c.moveTo(wx+4,wy+8);c.lineTo(94,wy+8);}
  else {for(let i=0;i<6;i++){const a=i*Math.PI/3;c.moveTo(wx+Math.cos(a)*12,wy-19+Math.sin(a)*12);c.lineTo(wx+Math.cos(a)*20,wy-19+Math.sin(a)*20);}}
  c.stroke();
 }
 // Jewellery/pouch finishing touches, drawn from the saved loadout's extra slots.
 if(offhand&&style==='magic')fill(c,'#d1deaa',19,66,8,8);
 if(amulet){fill(c,'#d5b66f',47,47,3,10);fill(c,'#a4c6b2',46,57,5,5);}
 if(ring)fill(c,'#e6c47a',right?69:24,83+handOffset,5,3);

 const tex=new THREE.CanvasTexture(canvas);
 tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
 tex.colorSpace=THREE.SRGBColorSpace;tex.generateMipmaps=false;
 return tex;
}
function keyFor(config,dir,step){
 return [config.coat,config.skin,config.hair,config.outfit,config.hairstyle,config.sex,
  config.helm,config.shield,config.boots,config.offhand,config.arrows,config.amulet,config.ring,
  config.weapon,config.chest,config.legs,config.style,config.pose,dir,step].join('|');
}
export function makeClassicActor({style='melee',coat='#68867f',skin='#d9b08c',hair='#493529',
 outfit='tunic',hairstyle='short',sex='male',worn={},npc=false,armed=false}={}){
 const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.07});
 const sprite=new THREE.Sprite(material);sprite.scale.set(2.65,3.55,1);
 sprite.center.set(.5,0);
 let lastKey='';
 function update({facing={x:0,z:1},cameraOffset,step=0,pose='idle',style:nextStyle=style,worn:nextWorn=worn}={}){
  const config={style:nextStyle,coat,skin,hair,outfit,hairstyle,sex,
   helm:nextWorn.helm||null,shield:!!(nextStyle==='melee'&&nextWorn.offhand),
   offhand:nextWorn.offhand||null,boots:nextWorn.boots||null,arrows:!!nextWorn.arrows,
   amulet:!!nextWorn.amulet,ring:!!nextWorn.ring,
   chest:nextWorn.chest||null,legs:nextWorn.legs||null,pose,
   weapon:npc?(armed?'sword':'none'):(nextWorn.weapon||'none')};
  const dir=spriteDirection(facing.x,facing.z,cameraOffset),frame=step%3,key=keyFor(config,dir,frame);
  if(key===lastKey)return;
  if(!textureCache.has(key))textureCache.set(key,renderActor({...config,dir,step:frame}));
  releaseTexture(lastKey);textureRefs.set(key,(textureRefs.get(key)||0)+1);
  sprite.material.map=textureCache.get(key);sprite.material.needsUpdate=true;lastKey=key;trimTextures();
 }
 update();
 return {sprite,update,dispose(){releaseTexture(lastKey);lastKey='';material.dispose();sprite.removeFromParent();trimTextures();}};
}
export function makeGroundShadow(){
 const material=new THREE.MeshBasicMaterial({color:'#23372d',transparent:true,opacity:.22,depthWrite:false});
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(.77,20),material);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.025;return mesh;
}
