import {classicGrip,mirroredDirection,classicBodyMotion} from './classic-sprite-rig.js';
import {classicVisualLoadout,classicVisualWeaponFamily,classicGarmentSilhouette} from './classic-avatar-art.js';
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
function renderActor({dir,step,style,coat,skin,hair,helm,shield,boots,offhand,weapon,arrows,chest,legs,amulet,ring,outfit,hairstyle,sex,pose,workSkill}){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const direction=mirroredDirection(dir);dir=direction.dir;
 if(direction.mirror){c.translate(W,0);c.scale(-1,1);}
 const grip=classicGrip(style,pose,step,weapon);
 const equipped=classicVisualLoadout({helm,chest,legs,boots,weapon,offhand,
  arrows,amulet,ring});
 const silhouette=classicGarmentSilhouette({chest});
 const family=classicVisualWeaponFamily(weapon);
 const front=[0,1,7].includes(dir),back=[3,4,5].includes(dir);
 const side=[1,2,3,5,6,7].includes(dir);
 const right=true,shift=side?4:0;
 // Gameplay and camera direction stay authoritative; subtle 2D animation
 // shifts never change collision, selection, pathfinding or attack windows.
 const motion=classicBodyMotion(pose,step);
 c.translate(motion.x,motion.y);
 const line='#292c2b';
 // Boots and alternating walk cycle, all actors share a consistent outline.
 const stride=step===1?6:step===2?-6:0;
 const isMoving=step!==0;
 const frontFabric=coat;
 const chestInk=equipped.chest?.shadow||line;
 const bootsArt=equipped.boots;
 const legsArt=equipped.legs;
 const plate=/plate|mail|recruit/i.test(chest||'');
 const leather=/leather|hide|scout/i.test(chest||'');
 const cloth=/robes|wraps|traveller/i.test(chest||'');
 const legPlate=/recruit|greaves/i.test(legs||'');
 const legLeather=/scout|chaps/i.test(legs||'');
 const legMage=/apprentice|legging/i.test(legs||'');
 for(const sign of [-1,1]){
  const x=48+sign*11+shift/2,foot=stride*sign;
  // Separately shaded ankle/toe shape makes the walking leg readable.
  outline(c,x-7,84+foot,14,19,line);
  fill(c,bootsArt?.base||'#654d3c',x-7,84+foot,14,19);
  fill(c,bootsArt?.shadow||'#584432',x-7,96+foot,17,7);
  fill(c,bootsArt?.shine||'#a99373',x-5,86+foot,10,3);
  fill(c,legsArt?.base||(legPlate?'#a3aeac':legLeather?'#9c7757':legMage?'#5d6787':coat),
   x-7,89+foot,14,12);
  if(legsArt){fill(c,legsArt.shadow,x-7,99+foot,14,3);fill(c,legsArt.shine,x-5,90+foot,3,8);}
  fill(c,'#c6a778',x-7,102+foot,17,6);
 }
 // Equipment that must appear behind the body.
 if(equipped.arrows&&style==='ranged'){
  const quiver=equipped.arrows;
  outline(c,right?20:66,47,11,29);
  fill(c,quiver.shadow,right?20:66,47,11,29);
  fill(c,quiver.base,right?21:67,50,9,25);
  for(let i=0;i<3;i++)fill(c,quiver.shine,(right?21:67)+i*3,41,2,11);
 }
 // Style alone never creates a cloak: empty loadouts always show starter clothes.
 // Left arm, body and moving right arm.
 outline(c,23+shift,49,14,37);fill(c,coat,23+shift,49,14,37);
 polygon(c,line,[[30,44],[66,44],[72,88],[24,88]]);
 polygon(c,frontFabric,sex==='female'?[[34,45],[62,45],[68,84],[28,84]]:[[31,45],[65,45],[69,84],[27,84]]);
 // Folds and sewn seams make the starter outfit a complete readable garment,
 // but never imply a chest armour piece on empty equipment slots.
 c.globalAlpha=.28;
 polygon(c,'#f6e9c7',[[36,47],[39,46],[36,82],[33,83]]);
 polygon(c,'#1a2a27',[[62,47],[65,49],[65,82],[61,84]]);
 c.globalAlpha=1;
 if(isMoving){fill(c,'#d4ba91',27,79,4,3);fill(c,'#d4ba91',66,79,4,3);}
 // Starter clothing remains consistent across every loadout; armour is layered over it.
 if(outfit==='wanderer'){fill(c,'#b8a17c',30,48,4,33);fill(c,'#aa8d66',63,48,4,33);}
 else if(outfit==='scholar'){fill(c,'#d1c8a6',31,46,34,6);fill(c,'#a69377',43,55,10,29);}
 else if(outfit==='traveller'){fill(c,'#554637',28,62,5,23);fill(c,'#76654c',64,62,5,23);}
 else {fill(c,'#9b8061',38,46,20,4);}
 fill(c,'#d8bf8d',28,78,41,5);
 fill(c,'#5a4636',32,81,33,5);
 if(equipped.chest){
  const armour=equipped.chest;
  if(silhouette==='armoured'){
   // Plate has a bevelled breastplate, distinct metal waist and shoulder caps.
   polygon(c,armour.shadow,[[30,50],[36,46],[61,46],[67,50],[65,76],[31,76]]);
   polygon(c,armour.base,[[34,49],[62,49],[63,70],[48,77],[33,70]]);
   fill(c,armour.shine,36,52,25,4);
   polygon(c,armour.shine,[[35,57],[40,59],[37,70],[33,68]]);
   fill(c,armour.shadow,46,54,4,21);
   fill(c,armour.trim,36,75,26,4);
   for(const x of [24,67]){fill(c,armour.shadow,x,48,9,11);fill(c,armour.base,x+1,48,7,8);}
  }else if(silhouette==='fitted'){
   polygon(c,armour.shadow,[[32,48],[64,48],[68,76],[30,76]]);
   polygon(c,armour.base,[[35,51],[61,51],[63,72],[33,72]]);
   fill(c,armour.shine,43,50,9,24);
   for(const x of [37,57])fill(c,armour.shadow,x,56,3,15);
   fill(c,armour.trim,33,73,32,4);
  }else{
   // Cloth reads as a broader layered robe with narrow contrast binding.
   polygon(c,armour.shadow,[[34,48],[62,48],[68,83],[28,83]]);
   polygon(c,armour.base,[[36,49],[60,49],[64,80],[32,80]]);
   fill(c,armour.shine,44,50,8,30);
   fill(c,armour.trim,31,78,35,3);
   for(const x of [34,62])fill(c,armour.shadow,x,59,3,18);
  }
 }
 const handOffset=grip.hand.y-84;
 polygon(c,line,[[61,47],[72,50],[grip.hand.x+6,grip.hand.y-4],[grip.hand.x-6,grip.hand.y+1],[60,61]]);
 polygon(c,equipped.chest?.base||coat,
  [[63,49],[70,52],[grip.hand.x+4,grip.hand.y-5],[grip.hand.x-4,grip.hand.y-2],[62,60]]);
 if(equipped.chest){
  fill(c,equipped.chest.shadow,65,50,5,4);
  fill(c,equipped.chest.shine,65,56,4,4);
 }
 // Head and neck; face/hair direction conveys facing.
 fill(c,skin,42,39,12,10);
 // Neckline/pale collar is part of the basic shirt, never equipped jewellery.
 fill(c,coat,40,45,16,3);
 c.fillStyle=line;c.beginPath();c.ellipse(48+shift/2,28,16,18,0,0,Math.PI*2);c.fill();
 c.fillStyle=skin;c.beginPath();c.ellipse(48+shift/2,28,14,16,0,0,Math.PI*2);c.fill();
 if(back){
  fill(c,hair,32+shift/2,12,32,hairstyle==='buzz'?7:23);
  if(['long','ponytail','curly'].includes(hairstyle))fill(c,hair,35+shift/2,32,26,hairstyle==='ponytail'?22:15);
  if(hairstyle==='ponytail')polygon(c,hair,[[60,31],[70,30],[73,51],[66,65],[61,53]]);
  if(hairstyle==='swept')polygon(c,'#2b2826',[[35,17],[65,16],[60,24],[39,27]]);
 }else{
  fill(c,hair,32+shift/2,12,32,hairstyle==='buzz'?4:10);
  if(hairstyle!=='buzz')fill(c,hair,32+shift/2,18,7,hairstyle==='short'?9:13);
  if(hairstyle==='swept')polygon(c,hair,[[33,17],[65,13],[59,24],[36,26]]);
  if(hairstyle==='curly')for(let i=0;i<5;i++){
   c.fillStyle=hair;c.beginPath();c.arc(35+shift/2+i*6,13+(i%2)*3,5,0,Math.PI*2);c.fill();
  }
  if(hairstyle==='long')for(const x of [30,62])fill(c,hair,x+shift/2,27,6,29);
  if(hairstyle==='ponytail')fill(c,hair,64+shift/2,26,6,31);
  if(front){
   fill(c,'#43312a',40+shift/2,31,4,3);
   fill(c,'#43312a',54+shift/2,31,4,3);
   fill(c,'#f4e4d4',41+shift/2,31,1,1);
   fill(c,'#f4e4d4',55+shift/2,31,1,1);
   fill(c,'#9d6b55',47+shift/2,40,4,2);
  }else fill(c,'#43312a',right?55:39,29,4,4);
 }
 if(equipped.helm){
  const helmet=equipped.helm;
  if(helmet.material==='metal'){
   polygon(c,helmet.shadow,[[31,18],[38,10],[60,10],[66,18],[66,27],[31,27]]);
   polygon(c,helmet.base,[[34,17],[40,12],[58,12],[63,17],[62,25],[34,25]]);
   fill(c,helmet.shine,38+shift/2,14,22,4);
   fill(c,helmet.trim,33,25,31,3);
   fill(c,helmet.base,31,25,7,13);fill(c,helmet.base,59,25,7,13);
   fill(c,helmet.shine,47,26,3,13);
  }else if(helmet.material==='leather'){
   polygon(c,helmet.shadow,[[30,18],[39,10],[58,11],[66,19],[64,32],[33,34]]);
   polygon(c,helmet.base,[[33,19],[40,13],[57,14],[62,20],[61,28],[36,30]]);
   fill(c,helmet.shine,34,18,26,4);
  }else{
   polygon(c,helmet.shadow,[[29,25],[36,10],[59,10],[67,25],[61,43],[34,43]]);
   polygon(c,helmet.base,[[33,23],[40,14],[55,14],[63,24],[59,40],[37,40]]);
   fill(c,helmet.trim,36,32,5,10);fill(c,helmet.trim,57,32,5,10);
  }
 }
 if(shield&&style==='melee'&&equipped.offhand){
  const sx=right?15:66,arm=equipped.offhand;
  polygon(c,line,[[sx,61],[sx+16,59],[sx+18,83],[sx+9,96],[sx-1,83]]);
  polygon(c,arm.shadow,[[sx+2,63],[sx+14,62],[sx+16,82],[sx+9,92],[sx+1,82]]);
  polygon(c,arm.base,[[sx+4,66],[sx+12,65],[sx+13,82],[sx+9,88],[sx+4,81]]);
  fill(c,arm.shine,sx+5,67,4,19);
  fill(c,arm.trim,sx+6,72,5,11);
 }
 // Equipment drawn after hands ensures correctly attached 2D silhouette.
 const wx=grip.weapon.x,wy=grip.weapon.y;
 c.save();
 if((style==='melee'&&weapon!=='none')||workSkill){c.translate(grip.hand.x,grip.hand.y);c.rotate(grip.angle);c.translate(-grip.hand.x,-grip.hand.y);}
 if(workSkill){
  // A temporary held work tool, never a weapon added to the player's loadout.
  // All seven current non-combat professions have their own visible silhouette.
  const handle='#8f6a49',steel='#c9d3d0',shine='#e7e6ce';
  if(workSkill==='woodcutting'){
   fill(c,handle,wx-3,wy-16,7,66);
   polygon(c,steel,[[wx-5,wy-14],[wx+22,wy-24],[wx+21,wy-2],[wx-5,wy-2]]);
   fill(c,shine,wx+15,wy-17,4,9);
  }else if(workSkill==='mining'){
   fill(c,handle,wx-3,wy-22,7,71);
   polygon(c,steel,[[wx-28,wy-24],[wx+27,wy-27],[wx+9,wy-15],[wx-10,wy-15]]);
   polygon(c,shine,[[wx-28,wy-24],[wx-12,wy-31],[wx-9,wy-21]]);
  }else if(workSkill==='foraging'){
   fill(c,handle,wx-3,wy+3,7,42);
   c.strokeStyle=steel;c.lineWidth=7;c.beginPath();c.arc(wx+8,wy-16,19,Math.PI*.65,Math.PI*1.83);c.stroke();
   polygon(c,'#92b989',[[wx+19,wy-9],[wx+13,wy-30],[wx+30,wy-23]]);
  }else if(workSkill==='blacksmithing'){
   fill(c,handle,wx-3,wy-10,7,62);
   fill(c,steel,wx-23,wy-20,43,19);fill(c,shine,wx-20,wy-17,35,5);
  }else if(workSkill==='fletching'){
   fill(c,handle,wx-2,wy-7,5,41);
   polygon(c,steel,[[wx-3,wy-8],[wx+18,wy-20],[wx+16,wy-2],[wx-3,wy+8]]);
   fill(c,'#d6bd86',wx-29,wy+24,32,4);
  }else if(workSkill==='inscription'){
   fill(c,'#ecddb3',wx-29,wy+18,42,19);
   fill(c,'#b48c60',wx-30,wy+18,4,19);fill(c,'#b48c60',wx+10,wy+18,4,19);
   polygon(c,'#e8f3d6',[[wx,wy-18],[wx+7,wy-32],[wx+9,wy-10]]);
   fill(c,'#6c9289',wx+2,wy-7,3,25);
  }else if(workSkill==='cooking'){
   c.fillStyle='#927b61';c.beginPath();c.ellipse(wx-10,wy+30,26,12,0,0,Math.PI*2);c.fill();
   c.fillStyle='#d5c3a1';c.beginPath();c.ellipse(wx-10,wy+27,20,7,0,0,Math.PI*2);c.fill();
   fill(c,handle,wx,wy-9,5,46);
  }
 }else if(family!=='none'&&style==='melee'){
  const metal=equipped.weapon||{base:'#b6c8c8',shine:'#e5e7dc',shadow:'#56636c',trim:'#bfa572'};
  if(family==='daggers'){
   polygon(c,metal.shadow,[[wx-4,wy-2],[wx+3,wy-7],[wx+3,wy+19],[wx-4,wy+19]]);
   polygon(c,metal.shine,[[wx,wy-5],[wx+3,wy-7],[wx+3,wy+15],[wx,wy+17]]);
   fill(c,'#785940',wx-2,wy+19,5,12);
  }else if(family==='axe'){
   fill(c,'#805c3d',wx-3,wy-16,7,65);
   polygon(c,metal.shadow,[[wx-5,wy-16],[wx+20,wy-28],[wx+21,wy-3],[wx-5,wy-2]]);
   polygon(c,metal.base,[[wx-3,wy-13],[wx+16,wy-23],[wx+17,wy-7],[wx-3,wy-6]]);
   fill(c,metal.shine,wx+14,wy-20,4,14);
  }else{
   const great=family==='greatsword';
   const length=great?45:30;
   polygon(c,metal.shadow,[[wx-4,wy+13],[wx-5,wy+13-length],[wx+1,wy+8-length],[wx+5,wy+13],[wx+4,wy+15]]);
   polygon(c,metal.base,[[wx-2,wy+11],[wx-3,wy+13-length],[wx+1,wy+10-length],[wx+3,wy+11]]);
   fill(c,metal.shine,wx,wy+10-length,2,length-2);
   fill(c,metal.trim,wx-(great?10:8),wy+13,great?21:17,5);
   fill(c,'#66503d',wx-2,wy+18,5,16);
   fill(c,metal.trim,wx-4,wy+32,9,4);
  }
 }else if(family!=='none'&&style==='magic'){
  const wand=family==='wand',ember=/ember|inferno/i.test(weapon);
  fill(c,'#382e2c',wx-(wand?2:4),wy-(wand?12:22),wand?5:8,wand?38:68);
  fill(c,'#b9a178',wx-(wand?1:2),wy-(wand?10:20),wand?2:4,wand?34:63);
  polygon(c,ember?'#ed9b59':'#a4d4ce',
   [[wx,wy-(wand?22:32)],[wx+(wand?8:12),wy-(wand?14:19)],[wx,wy-(wand?5:6)],[wx-(wand?8:12),wy-(wand?14:19)]]);
  fill(c,'#e4f1c9',wx-3,wy-(wand?17:22),6,7);
  c.strokeStyle='#c4e6cf';c.lineWidth=2;c.beginPath();
  c.arc(wx,wy-(wand?14:19),wand?9:13,0,Math.PI*2);c.stroke();
 }else if(family!=='none'&&style==='ranged'){
  if(family==='crossbow'){
   fill(c,'#92754b',wx-5,wy+5,9,37);
   polygon(c,'#bbc6c4',[[wx-19,wy-10],[wx+18,wy-10],[wx+22,wy-4],[wx-22,wy-4]]);
   fill(c,'#e1d3b7',wx-2,wy-14,4,40);
   fill(c,'#f5e7c6',wx-18,wy-7,36,2);
  }else{
  c.strokeStyle='#5a3a2a';c.lineWidth=5;
  c.beginPath();c.moveTo(wx-7,wy-23);c.quadraticCurveTo(wx+16,wy+4,wx-7,wy+39);c.stroke();
  c.strokeStyle='#e9e1ce';c.lineWidth=2;c.beginPath();c.moveTo(wx-7,wy-23);c.lineTo(wx-7-grip.bowDraw,wy+8);c.lineTo(wx-7,wy+39);c.stroke();
  if(!['strike','follow','recover'].includes(pose)){
   fill(c,'#aa986b',wx-14-grip.bowDraw,wy+4,23,3);
   polygon(c,'#d5ded7',[[wx+13-grip.bowDraw,wy+5],[wx+3-grip.bowDraw,wy-2],[wx+4-grip.bowDraw,wy+11]]);
  }
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
 if(['prepare','windup','swing'].includes(pose)&&style==='magic'&&weapon!=='none'){
  c.strokeStyle=/ember|inferno/.test(weapon)?'#edb27f':'#8dd7c2';c.lineWidth=2;c.beginPath();c.arc(wx,wy-19,pose==='prepare'?10:17,0,Math.PI*2);c.stroke();
 }else if(pose==='strike'&&weapon!=='none'){
  c.strokeStyle=style==='magic'?'#a7e4d5':style==='ranged'?'#eadcae':'#eee5ce';c.lineWidth=3;c.beginPath();
  if(style==='melee')c.arc(57,64,27,-Math.PI*.65,Math.PI*.3);
  else if(style==='ranged'){c.moveTo(wx+4,wy+8);c.lineTo(94,wy+8);}
  else {for(let i=0;i<6;i++){const a=i*Math.PI/3;c.moveTo(wx+Math.cos(a)*12,wy-19+Math.sin(a)*12);c.lineTo(wx+Math.cos(a)*20,wy-19+Math.sin(a)*20);}}
  c.stroke();
 }
 // Jewellery/pouch finishing touches, driven only by the worn slot IDs.
 if(equipped.offhand&&style==='magic'){
  fill(c,'#6d8d93',19,62,12,12);
  polygon(c,'#b2e5d7',[[25,60],[33,69],[25,80],[17,69]]);
  fill(c,'#e3f6d6',23,66,4,6);
 }
 if(equipped.amulet){
  fill(c,'#d5b66f',47,47,3,10);
  fill(c,'#a4c6b2',46,57,5,5);
 }
 if(equipped.ring)fill(c,'#e6c47a',right?69:24,83+handOffset,5,3);

 const tex=new THREE.CanvasTexture(canvas);
 tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
 tex.colorSpace=THREE.SRGBColorSpace;tex.generateMipmaps=false;
 return tex;
}
function keyFor(config,dir,step){
 return [config.coat,config.skin,config.hair,config.outfit,config.hairstyle,config.sex,
  config.helm,config.shield,config.boots,config.offhand,config.arrows,config.amulet,config.ring,
  config.weapon,config.chest,config.legs,config.style,config.pose,config.workSkill,dir,step].join('|');
}
export function makeClassicActor({style='melee',coat='#68867f',skin='#d9b08c',hair='#493529',
 outfit='tunic',hairstyle='short',sex='male',worn={},npc=false,armed=false,npcWeapon='sword'}={}){
 const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.07});
 const sprite=new THREE.Sprite(material);sprite.scale.set(2.65,3.55,1);
 sprite.center.set(.5,0);
 let lastKey='';
 function update({facing={x:0,z:1},cameraOffset,step=0,pose='idle',workSkill=null,style:nextStyle=style,worn:nextWorn=worn}={}){
  sprite.userData.pose=pose;sprite.userData.workSkill=workSkill;
  const config={style:workSkill?'melee':nextStyle,workSkill,coat,skin,hair,outfit,hairstyle,sex,
   helm:nextWorn.helm||null,shield:!!(!workSkill&&nextStyle==='melee'&&nextWorn.offhand),
   offhand:nextWorn.offhand||null,boots:nextWorn.boots||null,arrows:nextWorn.arrows||null,
   amulet:nextWorn.amulet||null,ring:nextWorn.ring||null,
   chest:nextWorn.chest||null,legs:nextWorn.legs||null,pose,
   weapon:workSkill?'work-'+workSkill:npc?(armed?npcWeapon:'none'):(nextWorn.weapon||'none')};
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
